/**
 * Format paise (e.g. 249900) into INR currency string: "₹2,499" or "₹2,499.50"
 */
export function formatRupees(paise: number, options?: { showPenceIfZero?: boolean }): string {
  if (isNaN(paise) || paise === null || paise === undefined) {
    return '₹0';
  }
  const rupees = paise / 100;
  const hasDecimals = paise % 100 !== 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: hasDecimals || options?.showPenceIfZero ? 2 : 0,
    minimumFractionDigits: hasDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Generate UPI Payment URL compliant with NPCI specifications
 * e.g., upi://pay?pa=anuvarnikasarees@okaxis&pn=AnuVarnika+Sarees&am=2499.00&cu=INR&tn=Order+AVS-1001
 */
export function generateUpiUrl(params: {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  orderNumber: string;
  note?: string;
}): string {
  const amountRupees = (params.amountPaise / 100).toFixed(2);
  const note = params.note || `Order ${params.orderNumber}`;

  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: amountRupees,
    cu: 'INR',
    tn: note,
  });

  return `upi://pay?${query.toString()}`;
}

/**
 * Calculate reservation expiry timestamp (15 minutes from now)
 */
export const RESERVATION_HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function calculateReservationExpiry(fromTime: number = Date.now()): number {
  return fromTime + RESERVATION_HOLD_DURATION_MS;
}

export function isReservationExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() > expiresAt;
}

/**
 * Standard Delhivery tracking URL helper
 */
export function generateDelhiveryTrackingUrl(awb: string): string {
  return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
}

/**
 * Slugify a title
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}
