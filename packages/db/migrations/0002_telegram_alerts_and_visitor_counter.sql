ALTER TABLE theme_settings ADD COLUMN show_visitor_counter integer DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id text PRIMARY KEY NOT NULL,
  order_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  deep_link text NOT NULL,
  is_read integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_notifications_order_idx ON admin_notifications (order_id);
CREATE INDEX IF NOT EXISTS admin_notifications_read_idx ON admin_notifications (is_read);

CREATE TABLE IF NOT EXISTS site_metrics (
  key text PRIMARY KEY NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  updated_at integer NOT NULL
);

INSERT OR IGNORE INTO site_metrics (key, count, updated_at) VALUES ('total_visitors', 0, 0);

CREATE TABLE IF NOT EXISTS daily_visits (
  visit_date text PRIMARY KEY NOT NULL,
  unique_visitors integer DEFAULT 0 NOT NULL,
  page_views integer DEFAULT 0 NOT NULL
);
