import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { AppContext } from './types.js';
import { authMiddleware } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { themeRouter } from './routes/theme.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { analyticsRouter } from './routes/analytics.js';

const app = new Hono<AppContext>();

// Middlewares
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use('*', authMiddleware);

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    store: c.env.STORE_NAME || 'AnuVarnika Sarees',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/theme', themeRouter);
app.route('/api', catalogRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/admin', adminRouter);
app.route('/api/upload', uploadRouter);
app.route('/api', analyticsRouter);

export default app;
