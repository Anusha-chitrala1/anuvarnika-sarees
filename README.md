# AnuVarnika Sarees — Production Full-Stack Cloudflare E-Commerce Platform

A production-ready, zero-maintenance-cost full-stack e-commerce web application for **AnuVarnika Sarees** deployed exclusively on **Cloudflare** (`Cloudflare Workers` / `Cloudflare Pages`, `Hono` API, `Cloudflare D1` with `Drizzle ORM`, and `Cloudflare R2` for product images and payment proof uploads), built with `pnpm` and `wrangler` inside a monorepo.

---

## 🏛️ Monorepo Architecture

```
├── apps/
│   ├── api/                    # Hono API on Cloudflare Workers
│   │   ├── src/
│   │   │   ├── lib/            # Zero-SDK Gmail REST API mailer & Telegram owner alerts
│   │   │   ├── middleware/     # Signed HttpOnly cookie session auth & Admin check
│   │   │   ├── routes/         # auth, catalog, orders, admin, theme, upload, analytics
│   │   │   ├── services/       # Deadlock-safe stock engine, Gmail transactional emails, Web Crypto auth
│   │   │   ├── db.ts           # Drizzle D1 database client
│   │   │   └── types.ts        # Cloudflare Workers environment bindings (D1, R2, vars)
│   │   ├── test/               # Comprehensive in-memory D1 & unit test suite (24/24 passing)
│   │   └── wrangler.jsonc      # Cloudflare Workers configuration with D1 & R2 bindings
│   │
│   └── web/                    # Editorial React 18 + Vite + Tailwind Storefront
│       ├── src/
│       │   ├── components/     # AnnouncementBar, Navbar, Hero, CartDrawer, AuthOtpModal, ThemeStudio
│       │   ├── views/          # HomeView, ShopView, ProductDetailView, CheckoutView, OrderTrackingView, AdminDashboardView
│       │   ├── store/          # Zustand stores (useThemeStore, useAuthStore, useCartStore, useWishlistStore)
│       │   └── lib/api.ts      # Typed backend API client
│       ├── public/logo.jpeg    # Extracted AnuVarnika brand mark
│       └── wrangler.jsonc      # Cloudflare Pages / Workers static assets deployment
│
├── packages/
│   ├── db/                     # Drizzle ORM schema, SQL migrations & authentic saree seed data
│   │   ├── migrations/         # 0000_steady_mordo.sql (23 tables) & 0001_seed.sql
│   │   └── src/schema.ts       # 23 relational tables with SQLite indexes and foreign keys
│   │
│   └── shared/                 # Shared TypeScript types, Zod schemas, paise helpers, UPI generators
│       └── src/                # theme.ts, types.ts, schemas.ts, utils.ts
│
├── logo/logo.jpeg              # Provided brand mark image
└── pnpm-workspace.yaml         # PNPM workspace configuration
```

---

## 🎨 1. Visual Theme Extracted from `logo.jpeg` & Live Customizer

The visual identity is derived directly from the AnuVarnika brand mark:
- **Canvas background**: `#FAF5EB` (warm ivory)
- **Surface / Elevated Card**: `#FFFDF9`
- **Primary Brand Color**: `#7A231E` (deep crimson maroon)
- **Accent Gold / Brass**: `#A8793E`
- **Secondary Blush / Floral Accent**: `#D98273`
- **Primary Ink**: `#2B1E1A` | **Muted Ink**: `#6E5A52`
- **Editorial Heading Typography**: `Cormorant Garamond` / `Playfair Display`
- **Body & UI Typography**: `Plus Jakarta Sans` / `Inter`

### Live Theme Customizer (Configurable Anytime)
- Stored directly in Cloudflare D1 table `theme_settings`.
- Injected as CSS custom properties (`--bg-canvas`, `--surface-card`, `--brand-primary`, `--brand-accent`, `--brand-secondary`, `--ink-primary`, `--ink-muted`, `--font-heading`, `--font-body`, `--border-radius`) on page load.
- Store owner can open the **Theme Studio** from the Navbar or Admin Hub to live preview palette adjustments and save to D1 without any code changes or redeployments.

---

## ⚙️ 2. Core Business Engine & Architectural Highlights

### 🛡️ Deadlock-Safe Stock Handling & 15-Minute Reservation Hold
- All monetary amounts are handled strictly in integer **paise** (1 INR = 100 paise) to prevent floating-point inaccuracies.
- Concurrency contention is prevented at the database level using atomic conditional D1 statements:
  ```sql
  UPDATE product_variants 
  SET reserved_stock = reserved_stock + ? 
  WHERE id = ? 
    AND is_active = 1 
    AND (stock_qty - reserved_stock) >= ?
  ```
- If any concurrent buyer reserves the last available item, the engine automatically rolls back earlier reservations for that order and returns HTTP `409 Conflict`.
- Each order places a **15-minute reservation hold** that automatically releases `reserved_stock` back to the available pool upon timeout.
- Every single stock movement is logged in `inventory_transactions` (`reservation`, `release`, `sale`, `manual_adjustment`, `cancellation`, `return`).
- Upon Admin Payment Approval, actual stock is deducted (`stock_qty = stock_qty - qty`) and reservation is cleared without double-charging stock.

### 🔐 Mandatory Email + OTP Login (Gmail REST API)
- Customers browse freely, add items to cart, and enter delivery details.
- Before initiating direct UPI payment or placing an order, customers must sign in and verify their email via a short-lived 6-digit OTP sent via the **Gmail REST API** (zero SDK, zero custom domain cost).
- Sessions use `HttpOnly`, `Secure`, `SameSite=Lax` signed cookies with SHA-256 hashed tokens and rate limiting.

### 💳 Direct UPI QR + Instant Admin Alert + Manual Approval Workflow
- Zero payment gateway commission or fees.
- NPCI-compliant UPI payment URL and dynamic QR code generated with payee name ("AnuVarnika Sarees"), recipient UPI ID (`anuvarnika@okaxis`), order reference, and payable amount in INR.
- Customer submits their **12-digit UTR / transaction reference number** (and optional proof screenshot uploaded to Cloudflare R2).
- Unique database constraint on `utr_reference` blocks duplicate or replay submissions.
- Submission triggers an **Instant Telegram Bot Owner Alert** (with a 1-tap `✅ Open & Approve Order` deep link to `/admin/orders/:orderId?action=verify`) + an in-app D1 `admin_notifications` bell alert in Admin Hub (no owner alert emails are sent for UTR submissions).
- Admin verifies actual bank credit and clicks **Approve Payment** (deducts real stock, confirms order, triggers Gmail confirmation email) or **Reject Payment** (releases stock hold back to inventory and emails rejection reason + resubmit instructions).

### 🚚 Direct Delhivery Tracking Link Redirection
- Admin enters Delhivery AWB number (or tracking link) upon parcel booking.
- System automatically generates the official Delhivery tracking portal URL (`https://www.delhivery.com/track/package/${awbNumber}`).
- In **My Orders**, customers tap **"Track on Delhivery ↗"** and are redirected directly to Delhivery's live tracking portal for real-time location milestones and delivery agent details.
- In **Order Details**, customers see their verified order milestones, copyable AWB, and a 1-tap **"Track on Delhivery Official Portal ↗"** redirect button.
- Zero courier API token maintenance or brittle polling scans required—100% reliable direct courier tracking.
- Automatic Gmail transactional emails dispatched with the direct tracking link upon dispatch.

### ⭐ Verified Post-Delivery Reviews
- Customer review submission is strictly restricted by backend database checks to buyers whose order has reached status `delivered`.

### 📊 Admin Analytics Dashboard (Recharts)
- Most viewed sarees (incremented via backend view event tracking).
- Most ordered sarees & top categories.
- Total net revenue & discount trends visualized with Recharts.
- Pending payment approvals queue and low-stock (< 3 left) contention alerts.
- **Atomic D1 Website Visitor Counter:** Tracks session-throttled storefront visits (`POST /api/metrics/visit` with bot filtering) into `site_metrics` & IST `daily_visits`, displays a toggleable luxury footer badge (`GET /api/metrics/visitors`, `showVisitorCounter` in Theme Studio), and powers the **Store Traffic** KPI card in `/admin` (`GET /api/admin/analytics/traffic`).

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js >= 20
- PNPM >= 9 (`npm install -g pnpm`)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build Monorepo Packages
```bash
pnpm build
```

### 3. Run Automated E2E Test Suite (12 Tests)
```bash
pnpm test
```
*Verifies OTP login, concurrent last-item stock contention, 15-minute hold release, duplicate UTR blocking, UPI approval stock deduction, Delhivery tracking, and post-delivery review gating.*

### 4. Start Local Development Environment
In separate terminal windows:
```bash
# Terminal 1: Run Hono API on Cloudflare Workers local runtime
pnpm dev:api

# Terminal 2: Run Vite + React Storefront
pnpm dev:web
```
Access the application at `http://localhost:5173`.

---

## ☁️ Cloudflare Deployment Guide

### Step 1: Create Cloudflare D1 Database
```bash
pnpm wrangler d1 create anuvarnika-db
```
Paste the returned `database_id` into `apps/api/wrangler.jsonc`.

### Step 2: Apply Database Migrations & Seeds
```bash
pnpm wrangler d1 migrations apply anuvarnika-db --remote
```

### Step 3: Create Cloudflare R2 Storage Bucket
```bash
pnpm wrangler r2 bucket create anuvarnika-assets
```

### Step 4: Configure Gmail REST API OAuth2 Credentials & Cloudflare Workers Secrets

AnuVarnika Sarees sends transactional emails directly from your store Gmail account via the **Gmail REST API** (`fetch`, zero Node SDKs, zero domain cost on `*.pages.dev`):

1. **Create a Google Cloud Project & Enable Gmail API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g., `anuvarnika-sarees-mail`), and enable the **Gmail API** (`APIs & Services -> Library -> Gmail API`).
2. **Configure OAuth Consent Screen (Important: Publish to Production):**
   - Go to `APIs & Services -> OAuth consent screen`, choose **External**, fill in app name (`AnuVarnika Sarees`) and support email (`anuvarnika.sarees@gmail.com`).
   - Add scope `https://www.googleapis.com/auth/gmail.send`.
   - Click **Publish App** so the status is **In Production** (otherwise Google expires OAuth refresh tokens every 7 days in Testing mode).
3. **Create OAuth Client ID:**
   - Go to `APIs & Services -> Credentials -> Create Credentials -> OAuth client ID` -> **Web application**.
   - Add `https://developers.google.com/oauthplayground` under **Authorized redirect URIs**.
   - Copy your `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`.
4. **Generate `GMAIL_REFRESH_TOKEN` via Google OAuth Playground:**
   - Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
   - Click the **Gear icon** (top-right) -> check **Use your own OAuth credentials** -> enter your `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`.
   - In Step 1, enter `https://www.googleapis.com/auth/gmail.send` -> click **Authorize APIs** -> sign in with `anuvarnika.sarees@gmail.com`.
   - In Step 2, click **Exchange authorization code for tokens** -> copy the **Refresh token** (`GMAIL_REFRESH_TOKEN`).
5. **Verify locally & push secrets to Cloudflare:**
   ```bash
   # Test MIME base64url encoding + Gmail REST API send locally
   pnpm test:email

   # Configure Cloudflare Workers secrets
   cd apps/api
   pnpm wrangler secret put GMAIL_CLIENT_ID --env production
   pnpm wrangler secret put GMAIL_CLIENT_SECRET --env production
   pnpm wrangler secret put GMAIL_REFRESH_TOKEN --env production
   pnpm wrangler secret put SESSION_SECRET --env production
   pnpm wrangler secret put ADMIN_EMAIL --env production
   pnpm wrangler secret put TELEGRAM_BOT_TOKEN --env production
   pnpm wrangler secret put TELEGRAM_OWNER_CHAT_ID --env production
   ```

### Step 5: Deploy Workers API & Pages Frontend
```bash
# Deploy Backend API to Cloudflare Workers
pnpm --filter @anuvarnika/api exec wrangler deploy --env production

# Deploy Frontend to Cloudflare Pages
pnpm --filter @anuvarnika/web build
pnpm wrangler pages deploy apps/web/dist --project-name anuvarnika-sarees
```

---

## 📜 Verified Accounts & Seed Credentials

- **Admin Account**: `admin@anuvarnika.com` (Receives instant UTR alerts and has full access to the Admin Command Hub & Theme Studio).
- **Demo Customer**: `priya.sharma@example.com` (Pre-seeded with delivered orders for testing verified reviews).
- **Default Owner UPI ID**: `anuvarnika@okaxis`
- **Active Promotional Coupons**:
  - `FESTIVE10`: 10% off up to ₹1,500 on minimum order ₹3,000
  - `WELCOME500`: Flat ₹500 off on minimum order ₹4,000
  - `SILK15`: 15% off up to ₹2,500 on minimum order ₹6,000
