import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { RecordVisitSchema } from '@anuvarnika/shared';
import * as schema from '@anuvarnika/db';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const analyticsRouter = new Hono<AppContext>();

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30

export function getTodayIstDateString(nowMs = Date.now()): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isCrawlerUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /bot|crawl|spider|headless|preview/i.test(userAgent);
}

async function getTotalVisitorsCount(env: AppContext['Bindings']): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT count FROM site_metrics WHERE key = 'total_visitors' LIMIT 1`,
  )
    .first<{ count: number }>()
    .catch(() => null);
  return typeof row?.count === 'number' ? row.count : 0;
}

/**
 * Public: Record a storefront session visit atomically in D1.
 */
analyticsRouter.post('/metrics/visit', async (c) => {
  const ua = c.req.header('User-Agent');
  if (isCrawlerUserAgent(ua)) {
    const totalVisitors = await getTotalVisitorsCount(c.env);
    return c.json({ counted: false, reason: 'bot_ignored', totalVisitors });
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = RecordVisitSchema.safeParse(body);
  const isUniqueToday = parsed.success ? parsed.data.isUniqueToday : false;

  const now = Date.now();
  const visitDate = getTodayIstDateString(now);
  const uniqueDelta = isUniqueToday ? 1 : 0;

  await c.env.DB.prepare(
    `INSERT INTO daily_visits (visit_date, unique_visitors, page_views)
     VALUES (?, ?, 1)
     ON CONFLICT(visit_date) DO UPDATE SET
       unique_visitors = unique_visitors + excluded.unique_visitors,
       page_views = page_views + 1`,
  )
    .bind(visitDate, uniqueDelta)
    .run();

  let totalVisitors: number;
  if (isUniqueToday) {
    const row = await c.env.DB.prepare(
      `INSERT INTO site_metrics (key, count, updated_at)
       VALUES ('total_visitors', 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
       RETURNING count`,
    )
      .bind(now)
      .first<{ count: number }>();
    totalVisitors = typeof row?.count === 'number' ? row.count : 1;
  } else {
    totalVisitors = await getTotalVisitorsCount(c.env);
  }

  return c.json({
    counted: true,
    totalVisitors,
    visitDate,
  });
});

/**
 * Public (edge-cached 30s): Get total storefront visitor count.
 */
analyticsRouter.get('/metrics/visitors', async (c) => {
  const totalVisitors = await getTotalVisitorsCount(c.env);
  c.header('Cache-Control', 'public, max-age=30, s-maxage=30');
  return c.json({ totalVisitors });
});

/**
 * Admin-only: Get total visitors, today's IST traffic, and last 30 days traffic history.
 */
analyticsRouter.get('/admin/analytics/traffic', requireAdmin, async (c) => {
  const db = getDb(c.env);
  const todayIst = getTodayIstDateString();

  const [totalRow, recentDays] = await Promise.all([
    db.query.siteMetrics.findFirst({
      where: eq(schema.siteMetrics.key, 'total_visitors'),
    }),
    db.query.dailyVisits.findMany({
      orderBy: [desc(schema.dailyVisits.visitDate)],
      limit: 30,
    }),
  ]);

  const todayRow = recentDays.find((d) => d.visitDate === todayIst);

  return c.json({
    totalVisitors: totalRow?.count ?? 0,
    todayDate: todayIst,
    todayUnique: todayRow?.uniqueVisitors ?? 0,
    todayPageViews: todayRow?.pageViews ?? 0,
    last30Days: [...recentDays].reverse(),
  });
});
