# AnuVarnika Sarees — Client & Admin User Flows

**Authorized Store Admin Email:** `anuvarnika.sarees@gmail.com`

---

## 1. Client (Customer) End-to-End Flow

```
[Home / Storefront]
   │
   ├─► [Sarees Page]
   │     ├─► Switch View: Grid View or List Row View
   │     └─► Filter: Price Range (₹0–₹1k, ₹1k–₹2k, ₹2k–₹5k, ₹5k–₹10k, ₹10k+) & New Arrivals
   │
   ▼
[Product Detail Page]
   ├─► Select Color Variant Swatch & View Available Stock
   ├─► Check Delivery PIN Code Serviceability & Shipping Fee
   └─► Add to Bag / Wishlist
          │
          ▼
[Your Saree Bag (Cart Drawer)]
   ├─► Adjust Quantities
   ├─► Apply Promo Coupon (e.g. FESTIVE10, WELCOME500)
   └─► Click "Proceed to UPI Payment"
          │
          ▼
[Checkout Step 1: Email Verification]
   ├─► Enter Email → Receive 6-Digit Verification Code
   └─► Verify Code → Secure Session Started
          │
          ▼
[Checkout Step 2: Shipping Address & 15-Min Stock Hold]
   ├─► Fill Delivery Address & Submit Order
   └─► Stock Atomically Reserved for 15 Minutes → Order Placed Email Sent
          │
          ▼
[Checkout Step 3: Direct UPI QR & UTR Submission]
   ├─► Scan UPI QR Code or Copy UPI ID (Exact INR Amount)
   ├─► Pay via GPay / PhonePe / Paytm
   └─► Enter 12-Digit Bank UTR Reference (+ Optional Screenshot)
          │
          ▼
[My Orders & Direct Delhivery Tracking]
   ├─► View Ordered Items (Image, Saree Title, Shade, Qty, Price)
   ├─► Receive Email when Admin Approves Payment
   ├─► Direct 1-Tap "Track on Delhivery" Redirection Link
   └─► Unlock "Write a Verified Review" Once Delivered
```

---

## 2. Admin (`anuvarnika.sarees@gmail.com`) End-to-End Flow

The Admin Command Hub uses a **full-width Left-Sidebar dashboard** unlocked when signed in as `anuvarnika.sarees@gmail.com`:

1. **Theme Studio (Header Icon — Restricted to `anuvarnika.sarees@gmail.com`)**:
   - Preview color palettes, fonts (`Playfair Display`, `Inter`, etc.), and border radius live and save directly to the store without redeploys.
2. **Analytics & Trends**:
   - View Verified Revenue, Total Orders, Pending Approvals badge, Inventory Alerts, and **Store Traffic** (Total Visitors, Today's Unique Visitors, Today's Page Views).
   - Click any saree in **Most Viewed Sarees** or **Top Ordered Sarees** to open its product page, or click **Restock** on Low-Stock alerts.
3. **Pending UPI Approvals (Telegram Bot Deep-Link Flow)**:
   - Receive an instant **Telegram Bot Alert** with Order Number, Saree Details, `₹` Amount, UTR Reference, Customer Name & Phone, and a **1-tap `✅ Open & Approve Order`** button (`/admin/orders/:orderId?action=verify`), plus a matching notification in the Admin Hub bell.
   - Tapping the Telegram link while logged out redirects to `/admin/login?redirect=...` and returns straight to the highlighted verification card after Owner OTP login.
   - View uploaded payment screenshot, copy UTR, verify bank credit, and **Approve Payment** (commits real stock & emails customer) or **Reject Payment** (releases stock hold & emails customer rejection reason).
4. **Delhivery & Orders**:
   - Admin enters the Delhivery AWB number (or courier tracking link) upon booking.
   - The platform automatically generates the official Delhivery tracking redirect link (`https://www.delhivery.com/track/package/${awbNumber}`) for order confirmation emails, the **My Orders** list, and **Order Details**.
   - Customers tap **"Track on Delhivery ↗"** and are redirected straight to Delhivery's live portal for real-time milestones, delivery agent contacts, and arrival updates—zero API token complexity or polling latency.
5. **Saree Catalog & Dedicated Add / Edit Saree Page**:
   - Manage Pin-to-Top, Sold-Out toggle, Archive, or open the full-page **Add / Edit Saree** editor:
     - Required fields (`*`): Title, Description, at least 1 Color Variant (Color, SKU, Stock, Sale Price ₹, MRP ₹).
     - Optional fields clearly labeled `(Optional)`: Subtitle, Fabric, Weave Type, Occasion, Blouse Details, Care Instructions, Saree Photo (Upload or URL).
     - Add or **Delete Variant** anytime.
6. **Coupons & Offers**:
   - Create Percentage or Flat promo coupons, toggle **Active / Paused**, or delete coupons.
7. **Settings & Reviews**:
   - Live edit **Store UPI ID**, **Payee Name**, **Announcement Bar Message**, **Free Shipping Threshold**, **Default Shipping Fee**, and moderate customer reviews (**Visible / Hidden**).
