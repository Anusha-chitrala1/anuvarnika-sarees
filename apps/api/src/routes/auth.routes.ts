import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, gt, desc } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import {
  SendOtpSchema,
  VerifyOtpSchema,
  UpdateProfileSchema,
} from '@anuvarnika/shared';
import {
  generateOtp,
  sha256,
  generateSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
} from '../services/auth.js';
import { sendOtpEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = new Hono<AppContext>();

// Send OTP
authRouter.post('/send-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = SendOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid input' }, 400);
  }

  const { email, name } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb(c.env);
  const now = Date.now();

  // Rate limiting: maximum 3 requests within 5 minutes for the same email
  const recentOtps = await db.query.otpVerifications.findMany({
    where: and(
      eq(schema.otpVerifications.email, normalizedEmail),
      gt(schema.otpVerifications.createdAt, now - 5 * 60 * 1000)
    ),
  });

  if (recentOtps.length >= 3) {
    return c.json(
      { error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
      429
    );
  }

  const otp = generateOtp();
  const otpHash = await sha256(otp);
  const expiresAt = now + OTP_EXPIRY_MS;

  await db.insert(schema.otpVerifications).values({
    id: `otp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    email: normalizedEmail,
    otpHash,
    attempts: 0,
    expiresAt,
    createdAt: now,
  });

  // Send via Gmail REST API (or console log in dev without refresh token)
  await sendOtpEmail(c.env, { email: normalizedEmail, name }, otp);

  // In development, or if Gmail refresh token is not configured, include devOtp so local tests/demo work smoothly
  const isDev = !c.env.GMAIL_REFRESH_TOKEN || c.env.ENVIRONMENT === 'development';

  return c.json({
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    ...(isDev ? { devOtp: otp } : {}),
  });
});

// Verify OTP
authRouter.post('/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VerifyOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid input' }, 400);
  }

  const { email, otp, name } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb(c.env);
  const now = Date.now();

  // Find latest pending OTP
  const latestOtp = await db.query.otpVerifications.findFirst({
    where: and(
      eq(schema.otpVerifications.email, normalizedEmail),
      gt(schema.otpVerifications.expiresAt, now)
    ),
    orderBy: [desc(schema.otpVerifications.createdAt)],
  });

  if (!latestOtp || latestOtp.verifiedAt) {
    return c.json({ error: 'No active OTP found or OTP has expired. Please request a new one.' }, 400);
  }

  if (latestOtp.attempts >= MAX_OTP_ATTEMPTS) {
    return c.json({ error: 'Too many incorrect attempts. This OTP is locked. Request a new one.' }, 400);
  }

  const submittedHash = await sha256(otp);
  if (submittedHash !== latestOtp.otpHash) {
    await db
      .update(schema.otpVerifications)
      .set({ attempts: latestOtp.attempts + 1 })
      .where(eq(schema.otpVerifications.id, latestOtp.id));

    const remaining = MAX_OTP_ATTEMPTS - (latestOtp.attempts + 1);
    return c.json({ error: `Incorrect code. ${remaining} attempts remaining.` }, 400);
  }

  // Mark OTP verified
  await db
    .update(schema.otpVerifications)
    .set({ verifiedAt: now })
    .where(eq(schema.otpVerifications.id, latestOtp.id));

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(schema.users.email, normalizedEmail),
  });

  const isAdminEmail =
    normalizedEmail === (c.env.ADMIN_EMAIL || 'anuvarnika.sarees@gmail.com').toLowerCase();

  if (!user) {
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await db.insert(schema.users).values({
      id: newUserId,
      email: normalizedEmail,
      name: name || (isAdminEmail ? 'AnuVarnika Admin' : null),
      role: isAdminEmail ? 'admin' : 'customer',
      createdAt: now,
      updatedAt: now,
    });

    user = await db.query.users.findFirst({
      where: eq(schema.users.id, newUserId),
    });
  } else {
    const updates: Partial<typeof schema.users.$inferInsert> = {};
    if (name && !user.name) updates.name = name;
    if (isAdminEmail && user.role !== 'admin') updates.role = 'admin';
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, user.id));
      user = { ...user, ...updates } as typeof user;
    }
  }

  if (!user) {
    return c.json({ error: 'Failed to create or retrieve user profile.' }, 500);
  }

  // Create session
  const sessionToken = generateSessionToken();
  const tokenHash = await sha256(sessionToken);
  const sessionExpiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  await db.insert(schema.sessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash,
    expiresAt: sessionExpiresAt,
    userAgent: c.req.header('user-agent'),
    ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
    createdAt: now,
  });

  // Set secure signed cookie (use SameSite=None; Secure when frontend and API are on separate Cloudflare domains in UAT/Prod)
  const isHostedEnv = c.env.ENVIRONMENT === 'production' || c.env.ENVIRONMENT === 'uat';
  const useCrossOrigin = c.env.CROSS_ORIGIN_COOKIES === 'true' && isHostedEnv;

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    path: '/',
    httpOnly: true,
    secure: isHostedEnv,
    sameSite: useCrossOrigin ? 'None' : 'Lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

// Logout
authRouter.post('/logout', async (c) => {
  const sessionId = c.get('sessionId');
  if (sessionId) {
    const db = getDb(c.env);
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

// Current User Profile
authRouter.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ user: null });
  }
  return c.json({ user });
});

// Update Profile
authRouter.put('/profile', requireAuth, async (c) => {
  const currentUser = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parseResult = UpdateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid input' }, 400);
  }

  const { name, phone } = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();

  await db
    .update(schema.users)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      updatedAt: now,
    })
    .where(eq(schema.users.id, currentUser.id));

  const updatedUser = await db.query.users.findFirst({
    where: eq(schema.users.id, currentUser.id),
  });

  return c.json({ success: true, user: updatedUser });
});
