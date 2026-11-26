# AnuVarnika Sarees — Local & UAT End-to-End Verification Guide (Zero Real Orders / Zero Real Money)

This guide walks you step-by-step through verifying **every single customer, admin, payment, inventory, email, Delhivery tracking, review, and analytics flow** in **Local** (100% offline, no Cloudflare account needed) or **UAT** (`anuvarnika-db-uat` + `anuvarnika-assets-uat`), without spending any real money or booking real couriers.

---

## 0. Booting Local or UAT Environment

### Option A: Local Verification (No Cloudflare Account Needed)
```bash
# 1. Copy local dev secrets (leave GMAIL_REFRESH_TOKEN blank for console fallback)
cp apps/api/.dev.vars.example apps/api/.dev.vars

# 2. Apply schema migrations & sample UAT data to local D1 emulator
pnpm db:migrate:local
pnpm db:seed:local

# 3. Start Local API (http://127.0.0.1:8787) + Web Storefront (http://localhost:5173)
pnpm dev
```

### Option B: UAT Verification (Cloudflare UAT Environment)
1. Deploy UAT API & Web following [`docs/DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md).
2. Ensure `pnpm db:migrate:uat` and `pnpm db:seed:uat` have been applied.
3. Open your UAT Pages URL (e.g., `https://anuvarnika-web-uat.pages.dev`).

> **How to inspect D1 rows at any step:**
> - **Local:** `pnpm --filter @anuvarnika/api exec wrangler d1 execute anuvarnika-db --local --command="<SQL>"`
> - **UAT:** `pnpm --filter @anuvarnika/api exec wrangler d1 execute anuvarnika-db-uat --env uat --remote --command="<SQL>"`

---

## 1. Gmail REST API OTP Login Verification (Customer & Admin)

### How Mock/UAT OTP Works
- **Local (without `GMAIL_REFRESH_TOKEN` and `ENVIRONMENT=development`):**
  - `POST /api/auth/send-otp` logs `[GmailMailer DEV] To: <email> | Subject: ...` in your API terminal **and** returns `devOtp` in the response so the **Sign In** modal displays a clickable **"Dev Test OTP"** auto-fill badge.
- **UAT (with real `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`):**
  - Gmail REST API sends a real HTML verification email from `GMAIL_SENDER_EMAIL` to the inbox you enter.

### Step-by-Step Test
1. **Customer Login:**
   - Click **Sign In** in the header.
   - Enter a test customer email (e.g., `priya.sharma@example.com`) and click **Send Verification Code**.
   - Enter an **incorrect** 6-digit code (`000000`) first → verify it returns an error (`4 attempts remaining`).
   - Enter the **valid** 6-digit OTP → verify you are signed in, **My Orders** appears, and the **Theme Studio** (`Sliders`) icon is **hidden** in the header.
2. **Rate-Limit Test:**
   - Request OTP **4 times within 5 minutes** for the same email → verify the 4th request is blocked with HTTP `429 Too Many Requests`.
3. **Admin Login (`anuvarnika.sarees@gmail.com`):**
   - Sign out, click **Sign In**, and sign in with `anuvarnika.sarees@gmail.com`.
   - Verify the header now unlocks **Admin Hub** AND the **Theme Studio** (`Sliders`) icon.

### Exact D1 Rows to Check
```sql
SELECT id, email, attempts, verified_at, expires_at FROM otp_verifications ORDER BY created_at DESC LIMIT 5;
SELECT id, user_id, expires_at FROM sessions ORDER BY created_at DESC LIMIT 5;
SELECT id, email, role FROM users;
```
- **Expected:** `otp_verifications.verified_at` is populated (non-null); `sessions` has a hashed `token_hash` (never plaintext); `users.role` is `'admin'` only for `anuvarnika.sarees@gmail.com`.

---

## 2. PIN/Location Serviceability, Festival Discounts & Coupons

### Step-by-Step Test
1. Open **Sarees** (or **Catalogue** for List Row view).
2. Test **Price Range Pills** (`₹0 – ₹1,000`, `₹1,000 – ₹2,000`, `₹2,000 – ₹5,000`, `₹5,000 – ₹10,000`, `₹10,000+`) and **New Arrivals Only** toggle.
3. Click into **Swarna Kamalam Pure Zari Kanjeevaram Silk** (`₹18,999`, MRP `₹24,500` — automatic 22% festival MRP-to-sale discount).
4. **PIN Code Check:**
   - Enter `600040` (Chennai, Tamil Nadu) → verify serviceable (`2-3 Business Days`, `₹99` shipping, free above `₹2,999`).
   - Enter `560001` (Bangalore, Karnataka) → verify serviceable (`2-3 Business Days`).
   - Enter `999999` or any valid 6-digit PIN → falls back to national zone `sz_national` (`4-6 Business Days`, `₹150`).
   - Enter an invalid PIN (`123`) → blocked with validation error.
5. **Cart & Coupon Validation:**
   - Click **Add to Bag**, open the **Your Saree Bag** drawer.
   - Test seeded coupons:
     - `FESTIVE10` → 10% off, capped at `₹1,500` (`150000` paise), min order `₹3,000`.
     - `WELCOME500` → flat `₹500` off, min order `₹4,000`.
     - `SILK15` → 15% off, capped at `₹2,500`, min order `₹6,000`.
     - Invalid code `FAKE99` → rejected with clean error message.

### Exact D1 Rows to Check
```sql
SELECT id, state, pin_code_prefix, is_serviceable, shipping_charge_paise, free_shipping_threshold_paise FROM shipping_zones;
SELECT code, discount_type, discount_value, min_order_paise, max_discount_paise, usage_count, is_active FROM coupons;
```

---

## 3. Deadlock-Safe Stock Holds & 15-Minute Expiry

### Step-by-Step Test: Reservation Hold
1. Check the variant's initial stock in D1 before ordering:
   ```sql
   SELECT id, sku, stock_qty, reserved_stock, (stock_qty - reserved_stock) AS available FROM product_variants WHERE id = 'var_kanj_crimson_01';
   ```
2. Signed in as customer (`priya.sharma@example.com`), proceed to **Checkout**, fill shipping address, and click **Place Order & Proceed to UPI**.
3. **Verify Hold:**
   - `reserved_stock` increments by `1`.
   - `orders.status` is `'awaiting_payment'` and `orders.reservation_expires_at` is `created_at + 900000` (15 minutes).
   - `inventory_transactions` has a new row with `transaction_type = 'reservation'` and `quantity_change = -1` (or reserved delta).

### Step-by-Step Test: Stock Contention (Preventing Oversell)
1. Try ordering more units than `(stock_qty - reserved_stock)` (e.g., open a second browser/incognito window as a second customer and attempt to buy the remaining stock + 1).
2. **Expected:** API returns HTTP `409 Conflict` (`Insufficient stock available`) and rolls back any partial reservation in that order.

### Step-by-Step Test: 15-Minute Reservation Expiry (No Waiting Required)
Instead of waiting 15 minutes, fast-forward `reservation_expires_at` in Local/UAT D1:
```sql
UPDATE orders
SET reservation_expires_at = 1000000
WHERE status = 'awaiting_payment';
```
Now trigger any product read or checkout (`GET /api/products` or reload the Storefront).
- **Expected:** `cleanupExpiredReservations()` automatically marks that order `'expired'`, decrements `reserved_stock` back to `0`, and logs a `'release'` row in `inventory_transactions`.

### Exact D1 Rows to Check
```sql
SELECT id, sku, stock_qty, reserved_stock FROM product_variants;
SELECT id, variant_id, order_id, transaction_type, quantity_change, previous_stock, new_stock FROM inventory_transactions ORDER BY created_at DESC LIMIT 10;
SELECT id, order_number, status, reservation_expires_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

---

## 4. Simulated UPI QR / UTR Submission, Duplicate Blocking, Admin Alerts & Approval

### Step-by-Step Test (Zero Real Money Spent)
1. Place a fresh order as customer → you land on the **Direct UPI Payment** screen.
2. **Verify UI:**
   - Dynamic QR code is rendered for `upi://pay?pa=anuvarnika@okaxis&pn=AnuVarnika+Sarees&am=<INR>&cu=INR&tn=Order+<AVS-...>`.
   - **Do NOT pay real money.**
3. **Optional Screenshot Upload (R2):**
   - Select any sample `.jpg` or `.png` image as payment proof.
   - Verify `POST /api/upload` returns `{ success: true, key: "uploads/..." }`.
4. **Submit Simulated 12-Character UTR:**
   - Enter `TEST12345678` (12 alphanumeric characters) and submit.
   - **UI State:** Customer sees confirmation that payment reference is submitted (`payment_submitted`).
   - **Terminal / Telegram:** `[TelegramOwnerAlert DEV] Order #AVS-... | UTR: TEST12345678 | DeepLink: .../admin/orders/...?action=verify` locally, or a live Telegram Bot message with `✅ Open & Approve Order` button in UAT/Prod (plus a matching D1 `admin_notifications` row).
5. **Test Duplicate UTR Rejection:**
   - Place a second order and submit the **exact same UTR** `TEST12345678`.
   - **Expected:** Blocked with HTTP `409 Conflict` (`This UTR reference has already been submitted for another order`).

### Step-by-Step Test: Instant Admin Alert & Manual Approval (or Rejection)
1. Sign in as `anuvarnika.sarees@gmail.com` and open **Admin Hub**.
2. **Instant Alert Check:**
   - Verify the **Pending Approvals** notification badge/bell shows the new submission immediately.
   - View the submitted UTR (`TEST12345678`) and click the uploaded proof preview (served via `/api/upload/uploads/...`).
3. **Test Approval:**
   - Click **Approve Payment**.
   - **Expected:**
     - `payments.status` → `'approved'` (`verified_by = 'anuvarnika.sarees@gmail.com'`).
     - `orders.status` → `'confirmed'`.
     - `product_variants.stock_qty` decreases by `qty` AND `reserved_stock` decreases by `qty` (real deduction, no double-charge!).
     - `inventory_transactions` logs `'sale'`.
     - Customer receives **Payment Approved & Order Confirmed** email (`[GmailMailer DEV]` locally / Gmail REST API in UAT).
4. *(Optional Rejection Test on a 2nd Order):*
   - Click **Reject** with reason `"Credit not reflected in bank statement"` → `payments.status = 'rejected'`, `orders.status = 'cancelled'`, `reserved_stock` is released back to available stock, and `inventory_transactions` logs `'cancellation'`.

### Exact D1 Rows & R2 Objects to Check
```sql
SELECT id, order_id, utr_reference, amount_paise, proof_r2_key, status, verified_by, rejection_reason FROM payments ORDER BY created_at DESC LIMIT 5;
SELECT id, action, entity_type, entity_id, details_json FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```
- **Local R2 Objects:** Stored in `apps/api/.wrangler/state/v3/r2/anuvarnika-assets/`.
- **UAT R2 Objects:** Visible in Cloudflare Dashboard → **R2** → `anuvarnika-assets-uat` → `uploads/<timestamp>_<id>.<ext>`.

---

## 5. Manual Delhivery Tracking Verification (Using Test/Sample AWB Numbers)

You **do not** need a real Delhivery account or real courier pickup to verify the entire shipping and tracking workflow.

### Step-by-Step Test in Admin Hub
1. In **Admin Hub**, open the **Shipments & Delhivery** tab.
2. Locate your `'confirmed'` order (`#AVS-...`) and click **Book Delhivery** / **Update Status / AWB**.
3. Enter a **sample/test AWB number** (minimum 8 characters), for example:
   - AWB Number: `DEL1234567890` (or `19827364551234`)
   - Courier Name: `Delhivery`
   - Tracking URL: Leave blank to auto-generate `https://www.delhivery.com/track/package/DEL1234567890`, or paste a custom URL.
4. Step through the shipment statuses one by one and click **Save**:
   1. `booked` → `orders.status` remains `'confirmed'` (or `'processing'`), `shipments.awb_number = 'DEL1234567890'`.
   2. `picked_up` → `orders.status` advances to `'shipped'`. **Gmail REST API / `[GmailMailer DEV]`** sends the **Order Shipped** email containing the AWB number and Delhivery tracking link!
   3. `in_transit` → updates `shipments.status` and location remarks.
   4. `out_for_delivery` → updates `shipments.status`.
   5. `delivered` → `orders.status` advances to `'delivered'`. **Gmail REST API / `[GmailMailer DEV]`** sends the **Order Delivered** email!

### Customer UI Verification (My Orders & Order Tracking)
1. Switch back to the customer session (`priya.sharma@example.com`).
2. Open **My Orders**:
   - Confirm each item displays its **thumbnail image**, **saree title**, **shade**, **quantity (`Qty: 1`)**, and **price**.
   - Confirm the **Delhivery AWB** badge (`DEL1234567890`) is visible.
3. Click **Track & Details**:
   - Verify the visual progress stepper highlights up to **Delivered**.
   - Click the **Copy AWB** button → verify clipboard copies `DEL1234567890`.
   - Hover/click **Track on Delhivery** → verify it points to `https://www.delhivery.com/track/package/DEL1234567890`.

### Exact D1 Rows to Check
```sql
SELECT id, order_id, courier_name, awb_number, tracking_url, status, shipped_at, delivered_at FROM shipments ORDER BY updated_at DESC LIMIT 5;
SELECT id, order_number, status FROM orders ORDER BY updated_at DESC LIMIT 5;
```

---

## 6. Post-Delivery Verified Reviews & Admin Analytics

### Step-by-Step Test: Verified Review Gating
1. **Before Delivery:** On an order whose status is `awaiting_payment`, `payment_submitted`, `confirmed`, or `shipped`, verify the **Write a Verified Review** button is locked/hidden, and calling `POST /api/orders/:id/review` returns HTTP `403 Forbidden`.
2. **After Delivery:** On the `delivered` order from Section 5:
   - Open **Track & Details** → click **Write a Verified Review**.
   - Submit a 5-star rating, title, and review text (`>= 10` chars).
   - Verify the review is saved with `is_verified_buyer = 1` and appears on the Saree's Product Detail page.

### Step-by-Step Test: Admin Analytics Dashboard
1. Sign in as `anuvarnika.sarees@gmail.com` → open **Admin Hub → Analytics**.
2. Verify all metrics reflect your test actions:
   - **Total Orders & Net Revenue / Discounts:** Includes your `confirmed` / `delivered` test order (excludes cancelled/expired).
   - **Pending Approvals:** `0` once all UTRs are approved/rejected.
   - **Most Viewed Sarees:** Incremented whenever you opened a Product Detail page (`POST /api/products/:id/view`).
   - **Most Ordered Sarees:** Reflects quantity sold from `order_items`.
   - **Low-Stock Alerts:** Highlights variants where `(stock_qty - reserved_stock) <= 2`.

### Exact D1 Rows to Check
```sql
SELECT id, product_id, order_id, rating, is_verified_buyer, is_approved FROM reviews ORDER BY created_at DESC LIMIT 5;
SELECT id, title, views_count FROM products ORDER BY views_count DESC LIMIT 5;
SELECT COUNT(*) AS view_events FROM product_views;
```

---

## 7. Complete Order Lifecycle State Summary

| Step | Actor | Order Status | Payment Status | Shipment Status | Stock Effect | Email Sent |
|---|---|---|---|---|---|---|
| 1 | Customer | `awaiting_payment` | — | — | `reserved_stock + qty` (15m hold) | Order Placed |
| 2 | System (Timeout) | `expired` | — | — | `reserved_stock - qty` | — |
| 3 | Customer submits UTR | `payment_submitted` | `pending_verification` | — | Held | Instant Alert to Admin |
| 4a | Admin Rejects UTR | `cancelled` | `rejected` | — | `reserved_stock - qty` | Status Update |
| 4b | Admin Approves UTR | `confirmed` | `approved` | — | `stock_qty - qty`, `reserved_stock - qty` | Payment Approved |
| 5 | Admin enters AWB (`picked_up`) | `shipped` | `approved` | `picked_up` | Deducted | Shipped + AWB Link |
| 6 | Admin marks `delivered` | `delivered` | `approved` | `delivered` | Deducted | Order Delivered (Unlocks Review) |

---

## 8. Pre-Go-Live Checklist (Before Production Deploy)
- [ ] All 24 automated API & unit tests pass (`pnpm test`).
- [ ] Full flow (Sections 1–6) verified manually in Local and/or UAT.
- [ ] `apps/api/wrangler.jsonc` has your real `anuvarnika-db-prod` `database_id`.
- [ ] Production secrets (`SESSION_SECRET`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`) are set with `--env production`.
- [ ] Production DB is seeded with **`pnpm db:seed:prod`** (clean store, zero test orders, zero demo products, admin `anuvarnika.sarees@gmail.com` ready).
