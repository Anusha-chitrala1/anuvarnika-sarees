import { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, gt } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import { sha256, SESSION_COOKIE_NAME } from '../services/auth.js';

export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return next();
  }

  try {
    const tokenHash = await sha256(token);
    const db = getDb(c.env);
    const now = Date.now();

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(schema.sessions.tokenHash, tokenHash),
        gt(schema.sessions.expiresAt, now)
      ),
      with: {
        // user query
      },
    });

    if (session) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, session.userId),
      });

      if (user) {
        c.set('user', {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        });
        c.set('sessionId', session.id);
      }
    }
  } catch (error) {
    console.error('Session lookup error:', error);
  }

  await next();
};

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required. Please sign in with OTP.' }, 401);
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  if (user.role !== 'admin') {
    return c.json({ error: 'Access denied: Admin privileges required.' }, 403);
  }
  await next();
};
