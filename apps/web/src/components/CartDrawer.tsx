import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '../store/useCartStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { api } from '../lib/api.js';
import { formatRupees } from '@anuvarnika/shared';
import { X, Trash2, Plus, Minus, Tag, ShieldCheck, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppFloat.js';

interface CartDrawerProps {
  onNavigate?: (view: string, payload?: any) => void;
  onProceedToCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate, onProceedToCheckout }) => {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    getSubtotalPaise,
    couponCode,
    couponDiscountPaise,
    setCoupon,
  } = useCartStore();

  const { user, openLoginModal } = useAuthStore();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Lock background body scroll when drawer is open on mobile/desktop
  useEffect(() => {
    if (isDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isDrawerOpen]);

  const subtotalPaise = getSubtotalPaise();
  const freeShippingThresholdPaise = 299900; // ₹2,999
  const amountNeededForFreeShipping = Math.max(0, freeShippingThresholdPaise - subtotalPaise);
  const progressPercent = Math.min(100, Math.round((subtotalPaise / freeShippingThresholdPaise) * 100));

  const shippingFeePaise = subtotalPaise >= freeShippingThresholdPaise || subtotalPaise === 0 ? 0 : 15000;
  const totalPayablePaise = Math.max(0, subtotalPaise - couponDiscountPaise + shippingFeePaise);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!inputCoupon.trim()) return;

    try {
      setCouponLoading(true);
      const res = await api.validateCoupon(inputCoupon.trim().toUpperCase(), subtotalPaise);
      setCoupon(res.coupon.code, res.discountPaise);
      setInputCoupon('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired promo code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    closeDrawer();
    const proceed = () => {
      if (onProceedToCheckout) onProceedToCheckout();
      else if (onNavigate) onNavigate('checkout');
    };

    if (!user) {
      openLoginModal(() => {
        proceed();
      });
    } else {
      proceed();
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full sm:w-[440px] sm:max-w-md h-full h-[100dvh] max-h-[100dvh] bg-surface sm:border-l border-accent/20 shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-accent/20 flex items-center justify-between bg-canvas/40">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-primary">Your Saree Bag</h2>
                <p className="text-xs text-ink-muted">
                  {items.length} {items.length === 1 ? 'drape' : 'drapes'} selected
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-full transition-colors"
                aria-label="Close bag"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            <div className="shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 bg-canvas/60 border-b border-accent/15 text-xs">
              {amountNeededForFreeShipping > 0 ? (
                <p className="text-ink-muted mb-1.5">
                  Add <strong className="text-primary">{formatRupees(amountNeededForFreeShipping)}</strong> more to unlock <span className="text-emerald-700 font-bold">FREE Insured Express Shipping</span>!
                </p>
              ) : (
                <p className="text-emerald-700 font-semibold mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Yay! You have unlocked FREE Express Delivery across India.
                </p>
              )}
              <div className="w-full bg-accent/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Scrollable Items List & Coupon */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              {items.length === 0 ? (
                <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6 text-ink-muted">
                  <div className="w-16 h-16 rounded-full bg-canvas flex items-center justify-center mb-4 border border-accent/30 text-accent">
                    <Tag className="w-8 h-8 opacity-40" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink-primary mb-1">
                    Your bag is currently empty
                  </h3>
                  <p className="text-xs max-w-xs mb-6">
                    Explore our curated Kanjeevarams, Banarasis, and handlooms crafted with pure certified zari.
                  </p>
                  <button
                    onClick={() => {
                      closeDrawer();
                      onNavigate?.('shop');
                    }}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-surface text-xs font-semibold rounded-full shadow-sm transition-colors"
                  >
                    Browse Handloom Silks
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex gap-3.5 p-3 rounded-xl border border-accent/15 bg-canvas/30 hover:bg-canvas/50 transition-colors"
                      >
                        {/* Thumbnail */}
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-18 h-22 sm:w-20 sm:h-24 object-cover object-top rounded-lg border border-accent/20 shrink-0"
                        />

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-serif font-bold text-sm text-ink-primary truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-muted">
                              <span
                                className="w-3 h-3 rounded-full border border-black/20"
                                style={{ backgroundColor: item.colorHex }}
                              />
                              <span className="truncate">{item.colorName}</span>
                            </div>
                          </div>

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-accent/10">
                            <div className="font-serif font-bold text-sm text-primary">
                              {formatRupees(item.pricePaise * item.quantity)}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-accent/30 rounded-lg bg-surface">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                  className="p-1 hover:text-primary transition-colors text-ink-muted"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-semibold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                  disabled={item.quantity >= item.availableStock}
                                  className="p-1 hover:text-primary transition-colors text-ink-muted disabled:opacity-30"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItem(item.variantId)}
                                className="p-1.5 text-ink-muted hover:text-red-700 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Form inside scroll area */}
                  <div className="pt-2">
                    {couponCode ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="font-bold text-emerald-800 font-mono tracking-wider">
                              {couponCode}
                            </span>
                            <span className="text-emerald-700 ml-1.5 font-medium">
                              (-{formatRupees(couponDiscountPaise)} saved)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setCoupon(null, 0)}
                          className="text-emerald-800 hover:text-red-700 font-semibold underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputCoupon}
                            onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                            placeholder="Coupon Code (e.g. FESTIVE10)"
                            className="flex-1 px-3 py-2 text-xs uppercase font-mono tracking-wider rounded-xl border border-accent/30 bg-canvas/40 text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <button
                            type="submit"
                            disabled={couponLoading || !inputCoupon.trim()}
                            className="px-4 py-2 bg-accent hover:bg-accent-hover text-surface text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-xs"
                          >
                            {couponLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                          </button>
                        </div>
                        {couponError && <p className="text-[11px] text-red-700">{couponError}</p>}
                      </form>
                    )}
                  </div>

                  {/* 15-Minute Reservation Disclaimer */}
                  <div className="flex items-center gap-2 text-[11px] text-accent bg-accent/10 p-2.5 rounded-xl border border-accent/20">
                    <Clock className="w-4 h-4 shrink-0 text-accent" />
                    <span>
                      Items are placed on a <strong>15-minute deadlock-safe hold</strong> upon initiating payment.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Drawer Footer with Price Breakdown & Action Buttons */}
            {items.length > 0 && (
              <div
                className="shrink-0 p-4 sm:p-5 border-t border-accent/20 bg-surface/95 backdrop-blur-md space-y-3 shadow-[0_-4px_20px_rgba(43,30,26,0.06)]"
                style={{
                  position: 'sticky',
                  bottom: 0,
                  transform: 'translate3d(0, 0, 0)',
                  WebkitTransform: 'translate3d(0, 0, 0)',
                  paddingBottom: 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))',
                }}
              >
                {/* Price Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>Bag Subtotal</span>
                    <span>{formatRupees(subtotalPaise)}</span>
                  </div>
                  {couponDiscountPaise > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Festival Coupon Discount</span>
                      <span>-{formatRupees(couponDiscountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink-muted">
                    <span>Insured Delhivery Shipping</span>
                    <span className="text-emerald-700 font-semibold">
                      {shippingFeePaise === 0 ? 'FREE' : formatRupees(shippingFeePaise)}
                    </span>
                  </div>
                  <div className="flex justify-between font-serif font-bold text-base sm:text-lg text-primary pt-1.5 border-t border-accent/15">
                    <span>Total Payable</span>
                    <span>{formatRupees(totalPayablePaise)}</span>
                  </div>
                </div>

                {/* Checkout & WhatsApp Buttons */}
                <div className="space-y-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-surface rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <span>Proceed to UPI Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <motion.a
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    href={`https://wa.me/917013622760?text=${encodeURIComponent(
                      [
                        'Hi AnuVarnika Sarees! I would like to order these sarees from my bag:',
                        ...items.map(
                          (i, idx) =>
                            `${idx + 1}. ${i.title} (${i.sku}) | Shade: ${i.colorName} | Qty: ${i.quantity} | ${formatRupees(i.pricePaise * i.quantity)}`
                        ),
                        couponCode ? `Coupon Applied: ${couponCode} (-${formatRupees(couponDiscountPaise)})` : '',
                        `Total Payable: ${formatRupees(totalPayablePaise)}`,
                      ]
                        .filter(Boolean)
                        .join('\n')
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Order Bag on WhatsApp</span>
                  </motion.a>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
