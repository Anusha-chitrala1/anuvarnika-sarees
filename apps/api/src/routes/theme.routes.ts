import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import {
  DEFAULT_THEME_TOKENS,
  THEME_PRESETS,
  ThemeSettingsUpdateSchema,
  ThemeTokens,
} from '@anuvarnika/shared';
import { requireAdmin } from '../middleware/auth.js';

export const themeRouter = new Hono<AppContext>();

// Public: Get active theme tokens
themeRouter.get('/', async (c) => {
  const db = getDb(c.env);
  const row = await db.query.themeSettings.findFirst({
    where: eq(schema.themeSettings.id, 'theme_default'),
  });

  if (!row) {
    return c.json({ theme: DEFAULT_THEME_TOKENS });
  }

  try {
    const colors = JSON.parse(row.colorsJson);
    const fonts = JSON.parse(row.fontsJson);
    const theme: ThemeTokens = {
      activePreset: row.activePreset as any,
      colors,
      fonts,
      borderRadius: row.borderRadius as any,
      heroStyle: row.heroStyle as any,
      showVisitorCounter: row.showVisitorCounter ?? true,
    };
    return c.json({ theme, presets: THEME_PRESETS });
  } catch (error) {
    return c.json({ theme: DEFAULT_THEME_TOKENS, presets: THEME_PRESETS });
  }
});

// Admin: Update theme tokens in D1 (strictly restricted to authorized admin email)
themeRouter.put('/', requireAdmin, async (c) => {
  const user = c.get('user')!;
  const authorizedAdminEmail = (c.env.ADMIN_EMAIL || 'anuvarnika.sarees@gmail.com').toLowerCase();
  if (user.email.toLowerCase() !== authorizedAdminEmail) {
    return c.json({ error: 'Theme customization is restricted to the primary store admin.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parseResult = ThemeSettingsUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid theme tokens' }, 400);
  }

  const { activePreset, colors, fonts, borderRadius, heroStyle, showVisitorCounter } = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();

  const colorsJson = JSON.stringify(colors);
  const fontsJson = JSON.stringify(fonts);

  const existing = await db.query.themeSettings.findFirst({
    where: eq(schema.themeSettings.id, 'theme_default'),
  });

  if (existing) {
    await db
      .update(schema.themeSettings)
      .set({
        activePreset,
        colorsJson,
        fontsJson,
        borderRadius,
        heroStyle,
        showVisitorCounter: showVisitorCounter ?? true,
        updatedAt: now,
        updatedBy: user.email,
      })
      .where(eq(schema.themeSettings.id, 'theme_default'));
  } else {
    await db.insert(schema.themeSettings).values({
      id: 'theme_default',
      activePreset,
      colorsJson,
      fontsJson,
      borderRadius,
      heroStyle,
      showVisitorCounter: showVisitorCounter ?? true,
      updatedAt: now,
      updatedBy: user.email,
    });
  }

  // Record audit log
  await db.insert(schema.auditLogs).values({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    action: 'update_theme_settings',
    entityType: 'theme',
    entityId: 'theme_default',
    detailsJson: JSON.stringify({ activePreset, borderRadius, heroStyle }),
    ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
    createdAt: now,
  });

  return c.json({
    success: true,
    message: 'Theme settings updated successfully',
    theme: {
      activePreset,
      colors,
      fonts,
      borderRadius,
      heroStyle,
    },
  });
});
