# AnuVarnika Sarees — Full-Stack Developer Guide, Architecture, Testing & Troubleshooting

## 1. End-to-End Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (apps/web — Cloudflare Pages / Static Assets)                  │
│ React 18 • TypeScript • Tailwind CSS • Framer Motion • Zustand • Recharts│
│ • Navbar (Home, Sarees, OTP Sign-In, Admin-only Theme Studio)           │
│ • Storefront Views: Home, Sarees (Grid/List, Price Pills, New Arrivals) │
│ • Product Detail, Cart Drawer (Coupons), Checkout (UPI QR + UTR + R2)   │
│ • My Orders (Image/Name/Qty) & Live Delhivery Order Tracking + Reviews  │
│ • Full-Width Left-Sidebar Admin Hub (Analytics, UPI, Delhivery, Sarees, │
│   Dedicated Add/Edit Saree Page, Coupons, Store Settings & Reviews)     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS /api/* (Signed HttpOnly Session Cookie)
┌──────────────────────────────▼──────────────────────────────────────────┐
│ BACKEND API (apps/api — Hono on Cloudflare Workers)                     │
│ • auth.routes.ts    (OTP generation, SHA-256 verify, rate limits, cookie│
│ • catalog.routes.ts (Products, price/new filters, PIN check, coupons)   │
│ • orders.routes.ts  (Atomic stock holds, UTR submit, Delhivery auto-sync│
│ • admin.routes.ts   (Approve/reject UPI, AWB sync, Saree/Variant CRUD,  │
│                      Coupons CRUD, Settings, Reviews, Analytics)        │
│ • theme.routes.ts   (Public theme read; anuvarnika.sarees@gmail.com PUT)│
│ • upload.routes.ts  (Cloudflare R2 upload & asset serving)              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌───────────────────────┐
│ Cloudflare D1   │   │ Cloudflare R2   │   │ External Integrations │
│ (packages/db)   │   │ (BUCKET)        │   │ • Gmail REST API      │
│ 23 SQLite Tables│   │ Product Photos  │   │ • Delhivery Tracking  │
│ Drizzle ORM     │   │ Payment Proofs  │   │   API (Free Token)    │
└─────────────────┘   └─────────────────┘   └───────────────────────┘
```

### Monorepo Packages
- **`packages/shared`**: Shared TypeScript DTOs (`types.ts`), Zod validation schemas (`schemas.ts`), logo-extracted theme tokens & presets (`theme.ts`), integer paise formatting (`formatRupees`), NPCI UPI URI generator (`generateUpiUrl`), and Delhivery tracking URL builder (`generateDelhiveryTrackingUrl`).
- **`packages/db`**: Drizzle ORM schema (`schema.ts`, 23 tables), SQL schema migration (`migrations/0000_steady_mordo.sql`), UAT sample seed (`seeds/seed-uat.sql`), and clean Production seed (`seeds/seed-prod.sql`).
- **`apps/api`**: Hono serverless API running on Cloudflare Workers (`src/index.ts`) with services for deadlock-safe stock (`services/stock.ts`), Web Crypto OTP & sessions (`services/auth.ts`), Gmail REST API HTML emails (`lib/gmail-mailer.ts` & `services/email.ts`), Telegram Bot-Only owner alerts (`lib/telegram-owner-alert.ts`), atomic D1 visitor counter & traffic analytics (`routes/analytics.ts`), and Delhivery live tracking sync (`services/delhivery.ts`).
- **`apps/web`**: React 18 storefront & Admin Hub with Zustand state (`useThemeStore`, `useAuthStore`, `useCartStore`, `useWishlistStore`), CSS custom-property live theme injection, Framer Motion page/card/drawer animations, and Recharts analytics.

---

## 2. Frontend Architecture Details
- **CSS Design Token Engine**: `useThemeStore.initTheme()` fetches `GET /api/theme` and writes `--bg-canvas`, `--surface-card`, `--brand-primary`, `--brand-accent`, `--brand-secondary`, `--ink-primary`, `--ink-muted`, `--font-heading`, and `--font-body` onto `:root`. Default typography is `Playfair Display` + `Inter`.
- **Admin-Only Header Customizer**: `Navbar.tsx` shows the Theme Studio icon (`Sliders`) **only** when `user.role === 'admin' && user.email === 'anuvarnika.sarees@gmail.com'`.
- **Storefront**:
  - `HomeView.tsx`: Hero banner + featured/new-arrival sections (automatically hidden when empty).
  - `ShopView.tsx`: Sarees page with **Grid / List Row** layout switcher, **Price Range** pills (`All`, `₹0–₹1,000`, `₹1,000–₹2,000`, `₹2,000–₹5,000`, `₹5,000–₹10,000`, `₹10,000+`), **New Arrivals Only** toggle, and Sort selector.
  - `MyOrdersView.tsx`: Displays each ordered item's thumbnail, title, shade, quantity, item total, order total, Delhivery AWB, and **Track & Details**.
- **Full-Width Left-Sidebar Admin Hub (`AdminDashboardView.tsx`)**:
  - **Analytics & Trends**: Revenue/order KPIs, 7-day revenue line chart, Most Viewed Sarees bar chart + clickable list (opens product detail), Top Ordered Sarees, and Low Stock alerts.
  - **UPI Approvals**: Instant 15s notification polling, UTR inspection, R2 payment screenshot preview, Approve / Reject with reason.
  - **Delhivery & Orders**: Enter AWB ID + one-click **Sync Delhivery** or manual status override.
  - **Saree Catalog & Dedicated Add/Edit Saree Page**: Full-page editor (not a modal) with `(Optional)` badges on optional fields, R2 photo upload, multi-variant builder with **Add Variant** and **Delete Variant**, and Pin/Out-of-Stock/Archive controls.
  - **Coupons & Offers**: Create, toggle Active/Paused, and delete coupons.
  - **Settings & Reviews**: Live edit UPI ID, announcement bar text, shipping thresholds, and approve/hide customer reviews.

---

## 3. Backend & Database Architecture Details
- **Integer Paise**: All monetary values (`price_paise`, `mrp_paise`, `total_paise`, `discount_paise`) are stored as integers (`₹1 = 100 paise`).
- **Deadlock-Safe Stock Engine (`services/stock.ts`)**:
  - Order creation atomically executes `UPDATE product_variants SET reserved_stock = reserved_stock + ? WHERE id = ? AND is_active = 1 AND (stock_qty - reserved_stock) >= ?`.
  - Any contention returns HTTP `409 Conflict` and rolls back prior items in the batch.
  - Holds expire automatically after 15 minutes (`cleanupExpiredReservations`).
  - Every stock change is recorded in `inventory_transactions`.
- **Auth & Security (`services/auth.ts`, `middleware/auth.ts`)**:
  - 6-digit OTPs hashed with SHA-256 (`10m` expiry, max `5` wrong attempts, max `3` sends / `5m`).
  - Signed `HttpOnly`, `Secure` (hosted), `SameSite=None` (cross-origin UAT/Prod) or `SameSite=Lax` (local) session cookies.
  - `PUT /api/theme` strictly enforces `user.email === ADMIN_EMAIL` (`anuvarnika.sarees@gmail.com`).
- **Delhivery Tracking (`DELHIVERY_PERSONAL` vs `DELHIVERY_API_TOKEN`)**:
  - When `DELHIVERY_PERSONAL="true"` (default in `wrangler.jsonc` for personal Delhivery accounts): Admin simply pastes the Delhivery tracking link (and optional AWB) in Admin Hub; customers see the direct tracking link in **My Orders** and **Order Tracking** without needing a Delhivery One API token.
  - When `DELHIVERY_PERSONAL="false"` and `DELHIVERY_API_TOKEN` secret is set: `GET /api/orders/:orderNumber`, `POST /api/admin/orders/:id/shipment`, and `POST /api/admin/orders/:id/sync-delhivery` fetch live Delhivery scans and auto-sync shipment + order status.

---

## 4. Environment Setup (Local, UAT, Production)

### A. Local Environment (No Cloudflare Account Required)
```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:migrate:local
pnpm db:seed:local            # Sample sarees for E2E testing
# OR: pnpm db:seed:local:clean  # Empty store baseline (matches Prod)
pnpm dev                     # API (http://127.0.0.1:8787) + Web (http://localhost:5173)
```

### B. UAT Environment (Verify End-to-End Before Going Live)
```bash
npx wrangler login
pnpm --filter @anuvarnika/api exec wrangler d1 create anuvarnika-db-uat
# Paste database_id into apps/api/wrangler.jsonc -> env.uat.d1_databases[0].database_id
pnpm --filter @anuvarnika/api exec wrangler r2 bucket create anuvarnika-assets-uat

cd apps/api
npx wrangler secret put SESSION_SECRET --env uat
npx wrangler secret put GMAIL_CLIENT_ID --env uat
npx wrangler secret put GMAIL_CLIENT_SECRET --env uat
npx wrangler secret put GMAIL_REFRESH_TOKEN --env uat
npx wrangler secret put TELEGRAM_BOT_TOKEN --env uat
npx wrangler secret put TELEGRAM_OWNER_CHAT_ID --env uat
# Optional: npx wrangler secret put DELHIVERY_API_TOKEN --env uat

cd ../..
pnpm db:migrate:uat
pnpm db:seed:uat
pnpm deploy:api:uat
cp apps/web/.env.uat.example apps/web/.env.uat   # Set VITE_API_URL to UAT Worker URL
pnpm deploy:web:uat
```

### C. Production Environment (Clean Live Store)
```bash
pnpm --filter @anuvarnika/api exec wrangler d1 create anuvarnika-db-prod
# Paste database_id into apps/api/wrangler.jsonc -> env.production.d1_databases[0].database_id
pnpm --filter @anuvarnika/api exec wrangler r2 bucket create anuvarnika-assets-prod

cd apps/api
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put GMAIL_CLIENT_ID --env production
npx wrangler secret put GMAIL_CLIENT_SECRET --env production
npx wrangler secret put GMAIL_REFRESH_TOKEN --env production
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_OWNER_CHAT_ID --env production
# Optional: npx wrangler secret put DELHIVERY_API_TOKEN --env production

cd ../..
pnpm db:migrate:prod
pnpm db:seed:prod            # Clean DB: 0 demo products, admin anuvarnika.sarees@gmail.com ready
pnpm deploy:api:prod
cp apps/web/.env.production.example apps/web/.env.production  # Set VITE_API_URL to Prod Worker URL
pnpm deploy:web:prod
```

---

## 5. Testing Guide
- **Automated API E2E Suite (12/12 Tests)**:
  ```bash
  pnpm test
  ```
  Covers: Health & Theme tokens, Customer OTP flow & wrong-OTP rejection, Admin OTP login, Catalog filtering & coupon validation, Deadlock-safe 15-min stock hold, Over-reservation `409` blocking, Direct UPI UTR submission & duplicate UTR blocking, Admin payment approval & real stock deduction, Delhivery AWB tracking, Post-delivery review `403` gating before delivery & `200` after delivery, and Admin analytics.
- **Full Build Check**:
  ```bash
  pnpm build
  ```
- **Manual Local/UAT End-to-End Walkthrough**: Follow [`docs/LOCAL_AND_UAT_E2E_VERIFICATION_GUIDE.md`](./LOCAL_AND_UAT_E2E_VERIFICATION_GUIDE.md).

---

## 6. Troubleshooting Playbook

| Issue | Root Cause | Solution |
|---|---|---|
| `ERR_PNPM_IGNORED_BUILDS` on `pnpm install` | pnpm 11+ blocks postinstall scripts by default | Ensure `allowBuilds` is present in `pnpm-workspace.yaml` for `esbuild`, `sharp`, `workerd`, `better-sqlite3`. |
| Login succeeds in UAT/Prod, but `/api/auth/me` returns `null` | Cross-origin cookies blocked when Pages (`*.pages.dev`) and Workers (`*.workers.dev`) are on different domains | Ensure `CROSS_ORIGIN_COOKIES="true"` in `wrangler.jsonc` (`uat`/`production`) and `VITE_API_URL` uses `https://`. |
| `403 Forbidden` when saving Theme Studio | Logged-in user is not `anuvarnika.sarees@gmail.com` | Sign in with `anuvarnika.sarees@gmail.com` (or update `ADMIN_EMAIL` in `wrangler.jsonc`). |
| `429 Too Many Requests` on OTP | More than 3 OTP requests within 5 minutes for the same email | Wait 5 minutes or clear `otp_verifications` in local D1 during testing. |
| `409 Conflict` when placing order | Stock held by unexpired `awaiting_payment` orders (`reserved_stock`) | Wait 15 minutes for auto-expiry or reset local `reservation_expires_at` via SQL. |
| `409 Conflict` on UTR submission | Unique constraint on `payments.utr_reference` blocked duplicate UTR | Use a new unique 12-character UTR for each test order. |
| Delhivery status stays `booked` after entering AWB | `DELHIVERY_API_TOKEN` is not set in Worker secrets | Either add `DELHIVERY_API_TOKEN` via `wrangler secret put` or use the optional status dropdown in Admin Hub. |
| R2 image returns 404 locally | Local Wrangler state cleared or `BUCKET` not bound | Re-upload image in Admin Hub while `pnpm dev` is running (stored in `.wrangler/state/v3/r2/`). |
