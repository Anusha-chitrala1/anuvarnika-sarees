-- AnuVarnika Sarees Clean Production Baseline Seed
-- Contains ONLY theme settings, store settings, admin account (anuvarnika.sarees@gmail.com), and shipping zones.
-- ZERO demo products, ZERO demo categories, ZERO demo customer orders.

-- 1. Theme Settings (Extracted from AnuVarnika logo.jpeg, refined Playfair Display + Inter typography)
INSERT OR IGNORE INTO theme_settings (id, active_preset, colors_json, fonts_json, border_radius, hero_style, updated_at, updated_by)
VALUES (
  'theme_default',
  'anu-signature',
  '{"bgCanvas":"#FAF5EB","surfaceCard":"#FFFDF9","brandPrimary":"#7A231E","brandAccent":"#A8793E","brandSecondary":"#D98273","inkPrimary":"#2B1E1A","inkMuted":"#6E5A52"}',
  '{"heading":"Lora","body":"DM Sans"}',
  'md',
  'editorial',
  1740000000000,
  'system'
);

-- 2. Store Settings
INSERT OR IGNORE INTO store_settings (id, key, value_json, updated_at)
VALUES (
  'setting_general',
  'general',
  '{"storeName":"AnuVarnika Sarees","tagline":"Timeless Silk Sarees","upiId":"anuvarnika@okaxis","payeeName":"AnuVarnika Sarees","supportEmail":"anuvarnika.sarees@gmail.com","adminNotificationEmail":"anuvarnika.sarees@gmail.com","supportPhone":"+91 70136 22760","instagramHandle":"@anuvarnika_sarees","freeShippingThresholdPaise":299900,"defaultShippingChargePaise":15000,"delhiveryEnabled":true,"announcementText":"✨ Free Insured Shipping across Andhra Pradesh & Telangana on orders above ₹2,999"}',
  1740000000000
);

-- 3. Authorized Admin User (anuvarnika.sarees@gmail.com)
INSERT OR IGNORE INTO users (id, email, name, phone, role, created_at, updated_at)
VALUES 
  ('usr_admin_01', 'anuvarnika.sarees@gmail.com', 'AnuVarnika Store Owner', null, 'admin', 1740000000000, 1740000000000);

-- 4. Shipping Zones (Andhra Pradesh & Telangana Only)
INSERT OR IGNORE INTO shipping_zones (id, state, pin_code_prefix, pin_code_exact, is_serviceable, shipping_charge_paise, free_shipping_threshold_paise, estimated_days, created_at)
VALUES
  ('sz_ts_50', 'Telangana', '50', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_51', 'Andhra Pradesh', '51', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_52', 'Andhra Pradesh', '52', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_53', 'Andhra Pradesh', '53', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000);
