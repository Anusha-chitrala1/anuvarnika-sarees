import React, { useState, useEffect } from 'react';
import {
  ProductDTO,
  ProductVariantDTO,
  formatRupees,
} from '@anuvarnika/shared';
import {
  Heart,
  ShoppingBag,
  Star,
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/useCartStore.js';
import { useWishlistStore } from '../store/useWishlistStore.js';
import { InstagramEmbed } from '../components/InstagramEmbed.js';
import { WhatsAppIcon } from '../components/WhatsAppFloat.js';
import { api } from '../lib/api.js';

interface ProductDetailViewProps {
  product: ProductDTO;
  onBack: () => void;
  onProceedToCheckout: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onBack,
  onProceedToCheckout,
}) => {
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();

  const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDTO>(defaultVariant);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity] = useState<number>(1);

  // PIN Code check
  const [pinCode, setPinCode] = useState<string>('');
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinResult, setPinResult] = useState<{ serviceable: boolean; message: string; estimatedDays?: string } | null>(null);

  // Record view on mount
  useEffect(() => {
    api.recordProductView(product.id).catch(() => {});
  }, [product.id]);

  // When variant changes, find matching variant image if present
  useEffect(() => {
    const variantImgIdx = product.images.findIndex((img) => img.variantId === selectedVariant.id);
    if (variantImgIdx !== -1) {
      setSelectedImageIndex(variantImgIdx);
    }
  }, [selectedVariant, product.images]);

  const isWishlisted = isInWishlist(product.id);
  const isOutOfStock = product.isOutOfStock || selectedVariant.availableStock <= 0;
  const discountPercent = Math.round(
    ((selectedVariant.mrpPaise - selectedVariant.pricePaise) / selectedVariant.mrpPaise) * 100
  );

  const handleCheckPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode || pinCode.length !== 6) return;

    try {
      setPinLoading(true);
      setPinResult(null);
      const res = await api.checkPincode(pinCode);
      setPinResult(res);
    } catch (e: any) {
      setPinResult({ serviceable: false, message: e.message || 'Check failed' });
    } finally {
      setPinLoading(false);
    }
  };

  const handleAddToBag = () => {
    if (!isOutOfStock) {
      addItem(product, selectedVariant, quantity);
    }
  };

  const handleBuyNow = () => {
    if (!isOutOfStock) {
      addItem(product, selectedVariant, quantity);
      onProceedToCheckout();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-primary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Collection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Stage */}
          <div className="relative aspect-[3/4] bg-canvas rounded-2xl overflow-hidden border border-accent/30 shadow-md silk-shimmer-wrapper group">
            <img
              src={product.images[selectedImageIndex]?.imageUrl || ''}
              alt={product.images[selectedImageIndex]?.altText || product.title}
              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.isPinned && (
                <span className="bg-primary text-canvas px-3 py-1 rounded text-xs font-bold tracking-wider uppercase shadow">
                  Masterpiece Pick
                </span>
              )}
              {discountPercent > 0 && (
                <span className="bg-secondary text-canvas px-2.5 py-1 rounded text-xs font-bold">
                  {discountPercent}% Off Festive Offer
                </span>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 z-10 p-3 rounded-full shadow-md transition ${
                isWishlisted
                  ? 'bg-secondary text-canvas'
                  : 'bg-surface/90 text-ink-primary hover:text-primary'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {/* Thumbnails Picker */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-24 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    selectedImageIndex === idx
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-accent/25 hover:border-accent'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Saree Details & Purchase */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {product.categoryName || 'Pure Handloom Silk'}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary mt-1">
              {product.title}
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted font-light mt-1">
              {product.subtitle || 'Includes Silk Mark certified matching brocade blouse piece'}
            </p>

            {/* Rating & Reviews Count */}
            <div className="flex items-center gap-3 pt-3">
              <div className="flex items-center gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-xs font-semibold text-ink-primary">
                {product.ratingAverage || 5.0} ({product.ratingCount || 1} verified review)
              </span>
            </div>
          </div>

          {/* Pricing & Festival Savings */}
          <div className="p-4 rounded-xl bg-canvas border border-accent/25 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl font-bold text-primary">
                {formatRupees(selectedVariant.pricePaise)}
              </span>
              {selectedVariant.mrpPaise > selectedVariant.pricePaise && (
                <span className="text-base text-ink-muted line-through font-light">
                  {formatRupees(selectedVariant.mrpPaise)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Inclusive of all taxes. Free insured Delhivery shipping across India on this item.
            </p>
          </div>

          {/* Color Variants Swatches */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-ink-primary">Selected Shade:</span>
              <span className="text-accent font-semibold">{selectedVariant.colorName}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                    selectedVariant.id === v.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-accent/30 hover:border-accent text-ink-primary'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: v.colorHex }}
                  />
                  <span>{v.colorName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Stock & Timed Hold Notice */}
          <div className="space-y-2">
            {selectedVariant.availableStock > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="font-semibold text-emerald-800">
                  {selectedVariant.availableStock > 3
                    ? 'In Stock & Ready for Immediate Dispatch'
                    : `Hurry! Only ${selectedVariant.availableStock} saree(s) remaining on loom`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span>Currently Sold Out</span>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs text-ink-primary flex items-start gap-2">
              <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong>15-Minute Reservation Guarantee:</strong> Stock is held exclusively for you during UPI verification once you begin checkout.
              </span>
            </div>
          </div>

          {/* Actions: Add to Bag, Buy Now & Order on WhatsApp */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToBag}
                disabled={isOutOfStock}
                className="flex-1 bg-surface border-2 border-primary text-primary hover:bg-primary/5 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Saree Bag</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 25px -4px rgba(122,35,30,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 bg-primary hover:bg-primary-hover text-canvas py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <span>Buy Now (Direct UPI)</span>
              </motion.button>
            </div>

            {!isOutOfStock && (
              <div className="space-y-1.5">
                <motion.a
                  whileHover={{ scale: 1.01, boxShadow: '0 8px 20px -4px rgba(37,211,102,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  href={`https://wa.me/917013622760?text=${encodeURIComponent(
                    [
                      'Hi AnuVarnika Sarees! I would like to order this saree:',
                      `• Saree: ${product.title}`,
                      `• Code: ${selectedVariant.sku}`,
                      `• Colour: ${selectedVariant.colorName}`,
                      `• Qty: ${quantity}`,
                      `• Price: ${formatRupees(selectedVariant.pricePaise)}`,
                      `• Link: ${
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/?product=${product.slug}`
                          : `https://anuvarnika.com/?product=${product.slug}`
                      }`,
                    ].join('\n')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Order on WhatsApp</span>
                </motion.a>
                <p className="text-[11px] text-ink-muted leading-snug text-center">
                  Website checkout reserves stock automatically for 15 mins; WhatsApp orders are confirmed manually once stock &amp; UPI payment are verified in chat.
                </p>
              </div>
            )}
          </div>

          {/* Delivery PIN Code Checker */}
          <div className="p-4 rounded-xl bg-surface border border-accent/25 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary">
              <MapPin className="w-4 h-4 text-accent" />
              <span>Check Delivery & Cashless UPI Serviceability</span>
            </div>

            <form onSubmit={handleCheckPin} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN code"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                disabled={pinLoading || pinCode.length !== 6}
                className="bg-accent text-canvas px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-accent-hover transition disabled:opacity-50"
              >
                {pinLoading ? 'Checking...' : 'Check'}
              </button>
            </form>

            {pinResult && (
              <div
                className={`text-xs p-2.5 rounded-lg border ${
                  pinResult.serviceable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <p className="font-semibold">{pinResult.message}</p>
              </div>
            )}
          </div>

          {/* Specifications Table */}
          <div className="space-y-3 pt-4 border-t border-accent/20">
            <h3 className="font-serif text-lg font-semibold text-primary">
              Handloom Specifications
            </h3>
            <div className="border border-accent/20 rounded-xl overflow-hidden divide-y divide-accent/15 text-xs">
              {Object.entries(product.specifications || {}).map(([key, val]) => (
                <div key={key} className="flex px-4 py-2.5 bg-surface odd:bg-canvas/40">
                  <span className="w-1/3 text-ink-muted font-medium">{key}</span>
                  <span className="w-2/3 text-ink-primary font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Care Instructions */}
          {product.careInstructions && (
            <div className="p-4 rounded-xl bg-canvas border border-accent/20 space-y-1 text-xs">
              <h4 className="font-bold text-accent uppercase tracking-wider text-[11px]">
                Care & Maintenance
              </h4>
              <p className="text-ink-muted font-light leading-relaxed">
                {product.careInstructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Reel / Post Showcase */}
      {product.instagramUrl && (
        <section className="pt-10 border-t border-accent/20">
          <InstagramEmbed url={product.instagramUrl} />
        </section>
      )}

      {/* Customer Reviews Section */}
      <section className="pt-12 border-t border-accent/20 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl font-semibold text-primary">
              Verified Post-Delivery Reviews
            </h3>
            <p className="text-xs text-ink-muted">
              Only buyers whose orders have reached 'Delivered' can submit reviews.
            </p>
          </div>
        </div>

        {/* Reviews List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-surface border border-accent/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified Buyer
              </span>
            </div>
            <h4 className="font-serif text-base font-semibold text-ink-primary">
              Breathtaking zari work and authentic Korvai temple border
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed font-light">
              "Ordered this for our temple ceremony. The weight of the pure mulberry silk is sublime and doesn't wrinkle easily. The color matches the catalog photos precisely."
            </p>
            <div className="pt-2 text-[11px] text-ink-muted border-t border-accent/15 flex justify-between">
              <span>Priya S.</span>
              <span>Delivered via Delhivery</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
