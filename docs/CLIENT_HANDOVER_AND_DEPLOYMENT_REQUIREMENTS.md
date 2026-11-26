# AnuVarnika Sarees — Project Overview, End-to-End Flow & Client Deployment Requirements

**Prepared for:** AnuVarnika Sarees (`anuvarnika.sarees@gmail.com`)  
**Platform:** Cloudflare Serverless Stack (Zero Monthly Infrastructure Cost)

---

## 1. What We Implemented (Complete Feature Summary)

### A. Customer Storefront (`apps/web`)
- **Brand Identity & Live Theme Engine:** Extracted from `logo.jpeg` (Warm Ivory `#FAF5EB`, Deep Crimson `#7A231E`, Heritage Gold `#A8793E`, `Playfair Display` + `Inter` typography) with smooth animations across all pages and mobile devices.
- **Sarees Page & Catalogue View:** Clean **Grid / List Row** layout switcher, quick-tap **Price Range** pills (`₹0–₹1,000`, `₹1,000–₹2,000`, `₹2,000–₹5,000`, `₹5,000–₹10,000`, `₹10,000+`), **New Arrivals Only** filter, and sorting. Empty product/category sections hide automatically until sarees are published.
- **Product Detail Page:** High-resolution gallery, color variant swatches with per-variant pricing/stock, live **Delivery PIN Code Check**, wishlist toggle, and verified post-delivery reviews.
- **Cart & Promo Coupons:** Slide-over bag drawer with live free-shipping progress bar and coupon validation (`FESTIVE10`, `WELCOME500`, etc.).
- **Email Verification (OTP) Gate:** Shoppers browse freely, then verify their email via a 6-digit code before placing an order or initiating UPI payment.
- **Direct UPI QR Checkout (0% Gateway Fee):** Dynamic NPCI UPI QR code for the exact payable amount, 12-digit UTR bank reference submission, optional payment screenshot upload, and duplicate-UTR protection.
- **My Orders & Direct Delhivery Tracking:** Shows each ordered saree's image, title, shade, quantity, item price, order total, Delhivery AWB, and a 1-tap direct **"Track on Delhivery ↗"** button that redirects customers straight to Delhivery's official live tracking portal.
- **Verified Post-Delivery Reviews:** Strictly unlocked only after an order reaches `delivered`.

### B. Admin Command Hub (`anuvarnika.sarees@gmail.com` Only)
- **Full-Width Left-Sidebar Dashboard:**
  1. **Analytics & Trends:** Verified revenue, order counts, 7-day revenue chart, clickable **Most Viewed Sarees** (opens saree page), **Top Ordered Sarees**, and **Low Stock Alerts** with one-click Restock.
  2. **Pending UPI Approvals:** Instant email + header badge alert on UTR submission, uploaded proof viewer, **Approve & Confirm** (deducts real stock) or **Reject with Reason** (releases hold).
  3. **Delhivery & Orders:** Enter Delhivery AWB ID (or tracking link); customers track directly on Delhivery's live portal with 1 tap.
  4. **Saree Catalog & Dedicated Add/Edit Saree Page:** Full-page editor with `(Optional)` field labels, photo upload, multi-variant builder (**Add Variant** / **Delete Variant**), Pin-to-Top, Sold-Out, and Archive controls.
  5. **Coupons & Offers:** Create flat/percentage promo codes, pause/activate, or delete coupons.
  6. **Settings & Reviews:** Live edit Store UPI ID, Payee Name, Announcement Bar text, Free Shipping threshold, Default Shipping fee, and moderate customer reviews.
  7. **Theme Studio (Exclusive to `anuvarnika.sarees@gmail.com`):** Live color/font/radius customizer in the header that saves directly without redeploys.

### C. Backend & Deadlock-Safe Engine (`apps/api` & `packages/db`)
- **Integer Paise Math:** Eliminates rounding issues (`₹1 = 100 paise`).
- **Deadlock-Safe Stock Reservations:** Atomic conditional D1 updates lock `reserved_stock` for **15 minutes** on checkout and auto-release expired holds, logging every movement in `inventory_transactions`.
- **Automated Emails:** Transactional emails for OTP verification, Order Placed, Instant Admin Payment Alert, Payment Approved, Order Shipped (with AWB), and Order Delivered.

---

## 2. What Happens End-to-End (Order Lifecycle)

1. **Browse & Add to Bag:** Customer selects a saree variant, checks PIN serviceability, applies a coupon, and clicks **Proceed to UPI Payment**.
2. **Email OTP Verification:** Customer verifies their email via a 6-digit code; a secure `HttpOnly` session cookie is issued.
3. **Order Placed & 15-Minute Stock Hold:** Submitting the shipping form atomically reserves stock (`reserved_stock + qty`), sets order status to `awaiting_payment`, and emails order details.
4. **UPI Payment & UTR Submission:** Customer scans the UPI QR, pays directly to the store UPI ID, and submits their 12-digit UTR (+ optional receipt image). Duplicate UTRs are blocked (`409 Conflict`). Order status becomes `payment_submitted`, and an **instant alert** is sent to `anuvarnika.sarees@gmail.com`.
5. **Admin Verification:** Store owner checks bank credit and clicks **Approve & Confirm**. Real stock is deducted (`stock_qty - qty`), hold is cleared, status moves to `payment_verified`, and the customer receives a confirmation email. *(If rejected, stock hold is released back to inventory.)*
6. **Delhivery Dispatch & Direct Tracking Link:** Admin enters the Delhivery AWB ID (or parcel tracking link). The system automatically generates a direct official Delhivery tracking link (`https://www.delhivery.com/track/package/${awb}`) for the customer. Customers track their parcel directly on Delhivery's official portal with 1 tap from **My Orders** and **Order Details**, completely eliminating third-party tracking API dependencies and token costs.
7. **Post-Delivery Review:** Once `delivered`, the customer can submit a verified star rating and review.

---

## 3. Complete Configuration Reference

| Configuration / Secret | Where It Is Set | Purpose |
|---|---|---|
| `ENVIRONMENT` | `apps/api/wrangler.jsonc` (`development` / `uat` / `production`) | Controls environment behavior & HTTPS cookie flags |
| `ADMIN_EMAIL` | `apps/api/wrangler.jsonc` (`anuvarnika.sarees@gmail.com`) | Grants Admin Hub, payment alerts & exclusive Theme Studio access |
| `UPI_ID` | `wrangler.jsonc` & Admin Settings | Store UPI ID used to generate NPCI UPI QR codes |
| `SESSION_SECRET` | `wrangler secret put SESSION_SECRET` (32+ random chars) | Signs & secures session cookies (use separate keys for UAT & Prod) |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | `wrangler secret put ...` | Sends OTP & transactional order/shipping emails via Gmail REST API (zero domain cost) |
| `GMAIL_SENDER_EMAIL` / `GMAIL_SENDER_NAME` | `apps/api/wrangler.jsonc` (`anuvarnika.sarees@gmail.com`) | Sender identity for customer transactional emails |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_OWNER_CHAT_ID` | `wrangler secret put ...` | Sends instant Telegram Bot-Only UPI payment alerts with 1-tap deep link to store owner |
| `APP_BASE_URL` | `apps/api/wrangler.jsonc` (`https://anuvarnikasarees.pages.dev`) | Base URL used to build `/admin/orders/:orderId?action=verify` Telegram deep links |
| `CROSS_ORIGIN_COOKIES` | `apps/api/wrangler.jsonc` (`"true"` in UAT/Prod) | Enables `SameSite=None; Secure` cookies across `pages.dev` & `workers.dev` |
| `VITE_API_URL` | `apps/web/.env.uat` / `.env.production` | Points the frontend build to the UAT or Production Worker API URL |
| `DB` (D1 Binding) | `apps/api/wrangler.jsonc` (`anuvarnika-db-uat` / `-prod`) | Serverless SQLite database (23 tables) |
| `BUCKET` (R2 Binding) | `apps/api/wrangler.jsonc` (`anuvarnika-assets-uat` / `-prod`) | Stores saree photos & customer payment proof screenshots |

---

## 4. What We Need From the Client for Deployment

Please share or confirm the following items before we provision UAT and Production live:

1. **Cloudflare Account (Free Plan):**
   - A Cloudflare account (or invite/API token with Workers, Pages, D1, and R2 permissions) so all hosting, database, and image storage stay under your own zero-cost account.
   - *(Optional)* Custom domain name (e.g., `anuvarnikasarees.com`) added to Cloudflare DNS if you want a custom domain instead of `*.pages.dev`.
2. **Gmail REST API OAuth2 Credentials (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`):**
   - Zero domain cost: sends directly from `anuvarnika.sarees@gmail.com` via the official Gmail REST API.
   - Follow the step-by-step Google Cloud Console + OAuth Playground guide in [`README.md`](../README.md) (ensure the OAuth Consent Screen is published **In Production** so the refresh token does not expire after 7 days).
3. **Telegram Bot Owner Alerts (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`):**
   - Message `@BotFather` on Telegram → `/newbot` → copy the Bot Token (`TELEGRAM_BOT_TOKEN`).
   - Send `/start` to your new bot, then get your numeric Chat ID (e.g., via `@userinfobot` or `getUpdates`) and set `TELEGRAM_OWNER_CHAT_ID`. Every UPI UTR submission sends an instant Telegram card with a 1-tap **Open & Approve Order** button.
4. **Delhivery Shipping (Zero API Token Needed):**
   - Ship using your existing Delhivery personal or merchant account.
   - Upon parcel booking, copy the Waybill / AWB Number (e.g., `1234567890123`) and paste it into **Admin Hub → Delhivery & Orders**.
   - The store automatically generates the direct official Delhivery tracking portal link (`https://www.delhivery.com/track/package/${awb}`) for customers on their **My Orders** screen.
5. **Official Business UPI & Contact Details:**
   - Exact **UPI ID** (e.g., `anuvarnika@okaxis`) and **Payee Name** to receive payments.
   - Official **Support Phone Number** & **Announcement Bar Message** (can also be edited anytime inside Admin Settings).
6. **Initial Saree Catalog (Optional for Launch):**
   - Production starts completely clean (`0` demo products). You can add your sarees directly after launch from **Admin Hub → Add New Saree**, or share photos, titles, prices, and stock counts if you want them pre-loaded.
