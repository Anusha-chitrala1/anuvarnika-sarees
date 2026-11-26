-- AnuVarnika Sarees Initial Seed Migration

-- 1. Theme Settings (Extracted from AnuVarnika logo.jpeg)
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
  '{"storeName":"AnuVarnika Sarees","tagline":"Timeless Handcrafted Silks & Heritage Weaves","upiId":"anuvarnika@okaxis","payeeName":"AnuVarnika Sarees","supportEmail":"care@anuvarnika.com","adminNotificationEmail":"anuvarnika.sarees@gmail.com","supportPhone":"+91 98401 23456","freeShippingThresholdPaise":299900,"defaultShippingChargePaise":15000,"delhiveryEnabled":true,"announcementText":"✨ Festive Heritage Weaves: Use code FESTIVE10 for 10% off | Free Insured Shipping across India on orders above ₹2,999"}',
  1740000000000
);

-- 3. Users (Admin and Demo customer)
INSERT OR IGNORE INTO users (id, email, name, phone, role, created_at, updated_at)
VALUES 
  ('usr_admin_01', 'anuvarnika.sarees@gmail.com', 'AnuVarnika Store Owner', '9840123456', 'admin', 1738000000000, 1740000000000),
  ('usr_customer_01', 'priya.sharma@example.com', 'Priya Sharma', '9876543210', 'customer', 1739000000000, 1740000000000);

-- 4. Categories
INSERT OR IGNORE INTO categories (id, name, slug, description, image_url, display_order, is_active, created_at)
VALUES
  ('cat_kanjeevaram', 'Kanjeevaram Silk', 'kanjeevaram-silk', 'Pure mulberry silk woven with authentic gold and silver zari in traditional Korvai temples and grand pallus.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', 1, 1, 1740000000000),
  ('cat_banarasi', 'Banarasi Brocade', 'banarasi-silk', 'Opulent Kadhwa jaals, meenakari motifs, and vintage Mughal-inspired golden brocades from Varanasi.', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80', 2, 1, 1740000000000),
  ('cat_chanderi', 'Chanderi Handloom', 'chanderi-silk', 'Gossamer sheer textures woven with silk and fine cotton yarns, embellished with delicate gold booti work.', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', 3, 1, 1740000000000),
  ('cat_tussar', 'Tussar & Wild Silk', 'tussar-silk', 'Earthy textured wild silk adorned with organic vegetable dyes, handblock prints, and heritage embroidery.', 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80', 4, 1, 1740000000000),
  ('cat_organza', 'Organza & Tissue', 'organza-silk', 'Airy translucent silk organza featuring hand-painted botanical florals, scalloped borders, and delicate sequin highlights.', 'https://images.unsplash.com/photo-1610030470298-05244516ff83?auto=format&fit=crop&w=800&q=80', 5, 1, 1740000000000),
  ('cat_linen', 'Linen & Cotton Silk', 'linen-cotton-silk', 'Breathable handcrafted linens and soft temple-border cotton silks tailored for understated elegance.', 'https://images.unsplash.com/photo-1601055283742-8b27e81b5553?auto=format&fit=crop&w=800&q=80', 6, 1, 1740000000000);

-- 5. Products
INSERT OR IGNORE INTO products (id, category_id, title, slug, subtitle, description, specifications_json, care_instructions, blouse_details, weave_type, occasion, fabric, base_mrp_paise, base_price_paise, display_order, is_pinned, is_featured, is_new_arrival, is_out_of_stock, status, views_count, created_at, updated_at)
VALUES
  (
    'prod_kanjeevaram_crimson',
    'cat_kanjeevaram',
    'Swarna Kamalam Pure Zari Kanjeevaram Silk',
    'swarna-kamalam-pure-zari-kanjeevaram-silk',
    'Woven with certified pure silver zari electroplated with 24k gold',
    'A masterpiece from the master weavers of Kanchipuram. The Swarna Kamalam saree features an opulent Korvai border interlaced with sacred temple gopuram motifs, twin peacock chakras along the body, and an intricately brocaded heavy bridal pallu. Woven with double-warp 3-ply pure mulberry silk for an unmatched drape, regal sheen, and heirloom longevity.',
    '{"Fabric":"100% Pure Mulberry Silk (Silk Mark Certified)","Weave Technique":"Traditional Korvai Handloom Weave","Zari Quality":"Pure Silver Zari with 24K Gold Polish (Tested)","Saree Length":"5.5 Metres","Blouse Piece":"0.8 Metres (Unstitched running brocade)","Weight":"850 grams approximately","Origin":"Kanchipuram, Tamil Nadu"}',
    'Strictly dry clean only. Wrap in unbleached muslin fabric and store in a cool, dry place. Periodically air out in mild shade.',
    'Includes matching Crimson Red brocade blouse piece with identical zari temple borders for sleeves.',
    'Korvai Double Warp Handloom',
    'Bridal / Muhurtham, Grand Reception, Temple Festivities',
    'Pure Mulberry Silk',
    2450000,
    1899900,
    1,
    1,
    1,
    1,
    0,
    'published',
    248,
    1740000000000,
    1740000000000
  ),
  (
    'prod_banarasi_kadhwa',
    'cat_banarasi',
    'Varanasi Meenakari Kadhwa Bridal Silk',
    'varanasi-meenakari-kadhwa-bridal-silk',
    'Hand-loomed with individually etched Shikargah and Floral Jaal motifs',
    'Woven over 65 days by master generational craftsmen of Varanasi, this Kadhwa saree displays breathtaking meenakari flora inlaid with tested gold and silver Roopa-Sona zari. The drape sits with sublime royalty, fluid yet structured, shimmering gently in ceremonial lights.',
    '{"Fabric":"Pure Katan Silk (Silk Mark)","Weave Technique":"Traditional Kadhwa Handloom (no loose threads on reverse)","Zari Type":"Tested Gold & Silver Roopa Sona Zari","Saree Length":"5.5 Metres","Blouse Piece":"1 Metre Brocade Blouse Piece included","Weight":"780 grams","Origin":"Varanasi, Uttar Pradesh"}',
    'Dry clean only. Roll fold along the zari reverse to avoid creases. Store in breathable cotton bag.',
    'Unstitched Katan Silk blouse in Deep Vermilion with dense floral meenakari sleeves.',
    'Kadhwa Meenakari',
    'Weddings, Sangeet, Festive Gala',
    'Pure Katan Silk',
    2100000,
    1649900,
    2,
    1,
    1,
    0,
    0,
    'published',
    312,
    1740000000000,
    1740000000000
  ),
  (
    'prod_chanderi_ashrafi',
    'cat_chanderi',
    'Ashrafi Booti Handwoven Chanderi Silk Cotton',
    'ashrafi-booti-handwoven-chanderi-silk-cotton',
    'Featherlight pure silk warp interlaced with gossamer hand-spun mallow cotton',
    'Echoing the royal courts of Scindia royalty, this Chanderi saree is adorned with micro coin (Ashrafi) bootis delicately hand-woven in gold zari across a luminous ivory expanse. Finished with a pastel dual-tone Nakshi border and translucent gossamer sheen.',
    '{"Fabric":"Silk by Cotton (70% Mulberry Silk, 30% Fine Cotton)","Weave Technique":"Handloom Eknaliya Chanderi","Zari":"Lightweight Micro Zari","Saree Length":"5.5 Metres","Blouse Piece":"80 cm unstitched","Weight":"390 grams (Featherlight)","Origin":"Chanderi, Madhya Pradesh"}',
    'Dry clean recommended. Gentle hand steam ironing.',
    'Running ivory chanderi blouse with border accents.',
    'Eknaliya Handloom',
    'Daytime Weddings, Housewarmings, Pujas, Festive Brunches',
    'Chanderi Silk Cotton',
    950000,
    689900,
    3,
    0,
    1,
    1,
    0,
    'published',
    184,
    1740000000000,
    1740000000000
  ),
  (
    'prod_tussar_madhubani',
    'cat_tussar',
    'Madhubani Handpainted Bhagalpuri Desi Tussar',
    'madhubani-handpainted-bhagalpuri-desi-tussar',
    'Narrating tales of Mithila nature hand-painted with organic bamboo nibs',
    'Rustic yet regal, this Bhagalpuri Desi Tussar silk is handcrafted with indigenous wild cocoon fibers that retain natural thermal adaptability and golden undertones. Authentic Mithila art depicting the Tree of Life and sacred fish motifs flourishes across the pallu in earthy pigments.',
    '{"Fabric":"100% Desi Wild Tussar Silk (Silk Mark)","Art Form":"Mithila / Madhubani Freehand Kalam Painting","Texture":"Rich Organic Slub with Natural Golden Sheen","Saree Length":"5.5 Metres","Blouse Piece":"85 cm unstitched natural tussar","Weight":"520 grams","Origin":"Bhagalpur & Madhubani, Bihar"}',
    'Dry clean only. Store wrapped in cotton away from moisture.',
    'Natural tussar blouse piece with handpainted sleeve border.',
    'Handloom Slub Tussar',
    'Literary Gatherings, Cultural Soirées, Art Exhibits, Festive Lunch',
    'Pure Desi Tussar Silk',
    1199900,
    849900,
    4,
    0,
    1,
    0,
    0,
    'published',
    165,
    1740000000000,
    1740000000000
  ),
  (
    'prod_organza_floral',
    'cat_organza',
    'Gulmarg Jardin Embroidered Pure Silk Organza',
    'gulmarg-jardin-embroidered-pure-silk-organza',
    'Botanical blossom embroidery with scalloped cutwork borders',
    'Crisp, translucent, and ethereal. This pure silk organza saree embodies contemporary poetry with vintage charm. Delicate English garden blossoms are needle-embroidered with fine silk threads, framed by hand-cut scalloped borders kissed with tiny champagne seed beads.',
    '{"Fabric":"100% Pure Kora Silk Organza","Embroidery":"Resham Threadwork & Hand Cutwork Scallops","Translucency":"Sheer gossamer drape with crisp flare","Saree Length":"5.5 Metres","Blouse Piece":"1 Metre Raw Silk in matching shade with embroidery","Weight":"380 grams","Origin":"Varanasi Weave, Handcrafted in Kashmir Studio"}',
    'Dry clean only. Roll loosely; do not fold sharply.',
    '1 Metre Heavy Raw Silk blouse piece with floral hand-embroidery.',
    'Kora Organza',
    'Cocktails, Summer Weddings, Reception, High Tea',
    'Pure Silk Organza',
    1350000,
    999900,
    5,
    0,
    1,
    1,
    0,
    'published',
    220,
    1740000000000,
    1740000000000
  ),
  (
    'prod_linen_jamdani',
    'cat_linen',
    'Shantiniketan Jamdani Handspun Linen Silk',
    'shantiniketan-jamdani-handspun-linen-silk',
    'Breathable organic 100-count French flax woven with natural mulberry silk',
    'Crafted for effortless grace in warm tropical climates, this saree combines the cool breathability of pure organic flax with the subtle gloss of handspun silk. Hand-woven discontinuous weft Jamdani geometric florals flow across the body, completed with delicate self-tassels on the pallu.',
    '{"Fabric":"60% Organic Linen, 40% Handspun Silk","Weave Technique":"Discontinuous Weft Bengal Jamdani","Border":"Woven Silver-Gilt Temple Border","Saree Length":"5.5 Metres (with handcrafted tassels)","Blouse Piece":"80 cm unstitched running fabric","Weight":"440 grams","Origin":"Fulia, West Bengal"}',
    'Gentle hand wash with mild baby shampoo or dry clean. Iron while slightly damp.',
    'Matching running striped linen silk blouse piece.',
    'Bengal Jamdani Handloom',
    'Smart Casual, Workwear, Literary Evenings, Temple Visits',
    'Linen Silk',
    650000,
    449900,
    6,
    0,
    0,
    0,
    0,
    'published',
    142,
    1740000000000,
    1740000000000
  );

-- 6. Product Variants
INSERT OR IGNORE INTO product_variants (id, product_id, color_name, color_hex, sku, stock_qty, reserved_stock, price_paise, mrp_paise, is_default, is_active, created_at, updated_at)
VALUES
  ('var_kanj_crimson_01', 'prod_kanjeevaram_crimson', 'Royal Crimson Maroon', '#7A231E', 'AVS-KNJ-01-CRM', 5, 0, 1899900, 2450000, 1, 1, 1740000000000, 1740000000000),
  ('var_kanj_crimson_02', 'prod_kanjeevaram_crimson', 'Antique Brass Gold', '#A8793E', 'AVS-KNJ-01-GLD', 4, 0, 1899900, 2450000, 0, 1, 1740000000000, 1740000000000),
  ('var_kanj_crimson_03', 'prod_kanjeevaram_crimson', 'Deep Emerald Green', '#1B4D3E', 'AVS-KNJ-01-EMR', 3, 0, 1949900, 2450000, 0, 1, 1740000000000, 1740000000000),
  
  ('var_banar_01', 'prod_banarasi_kadhwa', 'Vermilion Sindoori Red', '#932722', 'AVS-BNR-02-RED', 4, 0, 1649900, 2100000, 1, 1, 1740000000000, 1740000000000),
  ('var_banar_02', 'prod_banarasi_kadhwa', 'Royal Magenta Plum', '#581138', 'AVS-BNR-02-PLM', 3, 0, 1649900, 2100000, 0, 1, 1740000000000, 1740000000000),

  ('var_chan_01', 'prod_chanderi_ashrafi', 'Warm Ivory & Heritage Gold', '#FAF5EB', 'AVS-CHN-03-IVR', 8, 0, 689900, 950000, 1, 1, 1740000000000, 1740000000000),
  ('var_chan_02', 'prod_chanderi_ashrafi', 'Blush Rose Petal', '#D98273', 'AVS-CHN-03-BLS', 6, 0, 689900, 950000, 0, 1, 1740000000000, 1740000000000),

  ('var_tuss_01', 'prod_tussar_madhubani', 'Honey Ochre Mustard', '#C59341', 'AVS-TUS-04-OCH', 4, 0, 849900, 1199900, 1, 1, 1740000000000, 1740000000000),
  ('var_tuss_02', 'prod_tussar_madhubani', 'Earthy Rust Terracotta', '#9E4B33', 'AVS-TUS-04-RST', 2, 0, 849900, 1199900, 0, 1, 1740000000000, 1740000000000),

  ('var_org_01', 'prod_organza_floral', 'Dusty Rose Blossom', '#D98273', 'AVS-ORG-05-ROS', 5, 0, 999900, 1350000, 1, 1, 1740000000000, 1740000000000),
  ('var_org_02', 'prod_organza_floral', 'Sage Mint Mist', '#9BB59B', 'AVS-ORG-05-MNT', 3, 0, 999900, 1350000, 0, 1, 1740000000000, 1740000000000),

  ('var_lin_01', 'prod_linen_jamdani', 'Deep Indigo Sapphire', '#1F3A52', 'AVS-LIN-06-IND', 7, 0, 449900, 650000, 1, 1, 1740000000000, 1740000000000),
  ('var_lin_02', 'prod_linen_jamdani', 'Mineral Slate Charcoal', '#4A4E51', 'AVS-LIN-06-SLT', 5, 0, 449900, 650000, 0, 1, 1740000000000, 1740000000000);

-- 7. Product Images
INSERT OR IGNORE INTO product_images (id, product_id, variant_id, image_url, r2_key, alt_text, display_order, is_primary, created_at)
VALUES
  ('img_kanj_01', 'prod_kanjeevaram_crimson', 'var_kanj_crimson_01', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80', 'catalog/kanj_crimson_1.jpg', 'Swarna Kamalam Pure Zari Kanjeevaram Pallu & Pleats', 1, 1, 1740000000000),
  ('img_kanj_02', 'prod_kanjeevaram_crimson', null, 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80', 'catalog/kanj_crimson_2.jpg', 'Intricate Korvai Border and Temple Gopuram Zari Details', 2, 0, 1740000000000),
  ('img_bnr_01', 'prod_banarasi_kadhwa', 'var_banar_01', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80', 'catalog/banarasi_kadhwa_1.jpg', 'Banarasi Meenakari Kadhwa Silk Drapery', 1, 1, 1740000000000),
  ('img_chan_01', 'prod_chanderi_ashrafi', 'var_chan_01', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80', 'catalog/chanderi_ashrafi_1.jpg', 'Ashrafi Booti Chanderi Silk Cotton Handloom', 1, 1, 1740000000000),
  ('img_tuss_01', 'prod_tussar_madhubani', 'var_tuss_01', 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80', 'catalog/tussar_madhubani_1.jpg', 'Desi Tussar Silk with Madhubani Folk Artistry', 1, 1, 1740000000000),
  ('img_org_01', 'prod_organza_floral', 'var_org_01', 'https://images.unsplash.com/photo-1610030470298-05244516ff83?auto=format&fit=crop&w=1000&q=80', 'catalog/organza_gulmarg_1.jpg', 'Gulmarg Jardin Embroidered Pure Silk Organza Saree', 1, 1, 1740000000000),
  ('img_lin_01', 'prod_linen_jamdani', 'var_lin_01', 'https://images.unsplash.com/photo-1601055283742-8b27e81b5553?auto=format&fit=crop&w=1000&q=80', 'catalog/linen_jamdani_1.jpg', 'Shantiniketan Jamdani Linen Silk Drapery', 1, 1, 1740000000000);

-- 8. Coupons
INSERT OR IGNORE INTO coupons (id, code, discount_type, discount_value, min_order_paise, max_discount_paise, usage_limit_total, usage_limit_per_user, usage_count, valid_from, valid_until, is_active, applies_to, conditions_json, created_at)
VALUES
  ('cp_festive10', 'FESTIVE10', 'percentage', 10, 300000, 150000, 500, 2, 14, 1700000000000, 2500000000000, 1, 'all', '{}', 1740000000000),
  ('cp_welcome500', 'WELCOME500', 'flat', 50000, 400000, null, 200, 1, 8, 1700000000000, 2500000000000, 1, 'all', '{}', 1740000000000),
  ('cp_silk15', 'SILK15', 'percentage', 15, 600000, 250000, 100, 1, 5, 1700000000000, 2500000000000, 1, 'all', '{}', 1740000000000);

-- 9. Shipping Zones (Andhra Pradesh & Telangana Only)
INSERT OR IGNORE INTO shipping_zones (id, state, pin_code_prefix, pin_code_exact, is_serviceable, shipping_charge_paise, free_shipping_threshold_paise, estimated_days, created_at)
VALUES
  ('sz_ts_50', 'Telangana', '50', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_51', 'Andhra Pradesh', '51', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_52', 'Andhra Pradesh', '52', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000),
  ('sz_ap_53', 'Andhra Pradesh', '53', null, 1, 9900, 299900, 'Standard Insured Dispatch', 1740000000000);

-- 9b. Demo Delivered Order for Verified Review
INSERT OR IGNORE INTO orders (id, order_number, user_id, status, subtotal_paise, discount_paise, shipping_fee_paise, total_paise, shipping_name, shipping_phone, shipping_email, shipping_address_line1, shipping_city, shipping_state, shipping_pincode, created_at, updated_at)
VALUES (
  'ord_demo_delivered',
  'AVS-100001',
  'usr_customer_01',
  'delivered',
  1899900,
  0,
  0,
  1899900,
  'Priya Sharma',
  '9876543210',
  'priya.sharma@example.com',
  'Flat 402, Lotus Residency, Anna Nagar',
  'Chennai',
  'Tamil Nadu',
  '600040',
  1739400000000,
  1739500000000
);

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, title, color_name, sku, price_paise, quantity, total_paise, image_url)
VALUES (
  'oit_demo_01',
  'ord_demo_delivered',
  'prod_kanjeevaram_crimson',
  'var_kanj_crimson_01',
  'Swarna Kamalam Pure Zari Kanjeevaram Silk',
  'Royal Crimson Maroon',
  'AVS-KNJ-01-CRM',
  1899900,
  1,
  1899900,
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80'
);

-- 10. Sample Verified Review
INSERT OR IGNORE INTO reviews (id, product_id, user_id, order_id, rating, review_title, review_text, is_verified_buyer, is_approved, created_at)
VALUES (
  'rev_sample_01',
  'prod_kanjeevaram_crimson',
  'usr_customer_01',
  'ord_demo_delivered',
  5,
  'Heirloom quality! The Korvai zari work is breathtaking',
  'Purchased this for my sister’s wedding reception. The drape of the pure mulberry silk is unmatched, and the crimson color is deep and royal, exactly matching the photos. Truly heirloom craftsmanship!',
  1,
  1,
  1739500000000
);
