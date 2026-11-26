import React, { useState } from 'react';
import { ProductDTO, ProductVariantDTO, formatRupees } from '@anuvarnika/shared';
import { useCartStore } from '../store/useCartStore.js';
import { useWishlistStore } from '../store/useWishlistStore.js';
import { ShoppingBag, Eye, Check, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: ProductDTO;
  onSelect: (product: ProductDTO) => void;
  layoutMode?: 'grid' | 'row';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  layoutMode = 'grid',
}) => {
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDTO>(
    product.variants.find((v) => v.isDefault) || product.variants[0]
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  const variantImage = product.images.find((img) => img.variantId === selectedVariant?.id);
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const secondaryImage = product.images.length > 1 ? product.images[1] : primaryImage;

  const currentDisplayImage =
    variantImage?.imageUrl ||
    (isHovered && secondaryImage ? secondaryImage.imageUrl : primaryImage?.imageUrl);

  const pricePaise = selectedVariant ? selectedVariant.pricePaise : product.basePricePaise;
  const mrpPaise = selectedVariant ? selectedVariant.mrpPaise : product.baseMrpPaise;
  const discountPercent =
    mrpPaise > pricePaise ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100) : 0;

  const isAvailable =
    !product.isOutOfStock && selectedVariant && selectedVariant.availableStock > 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable || !selectedVariant) return;
    addItem(product, selectedVariant, 1);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 2000);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  if (layoutMode === 'row') {
    return (
      <motion.div
        layout
        whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(122,35,30,0.1)' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={() => onSelect(product)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex flex-row gap-3.5 sm:gap-5 p-3 sm:p-4 bg-surface rounded-2xl border border-accent/20 hover:border-accent/60 transition-all duration-300 cursor-pointer"
      >
        {/* Left Thumbnail */}
        <div className="relative w-28 sm:w-40 aspect-[3/4] rounded-xl overflow-hidden bg-canvas shrink-0 silk-shimmer-wrapper">
          <img
            src={currentDisplayImage}
            alt={product.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
            loading="lazy"
          />
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-2">
              <span className="px-2.5 py-1 rounded-full bg-white/95 text-primary text-[10px] font-bold uppercase tracking-wider">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Right Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {product.isPinned && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary text-surface">
                    ★ Featured
                  </span>
                )}
                {product.isNewArrival && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent text-surface">
                    New Arrival
                  </span>
                )}
                {product.fabric && (
                  <span className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                    {product.fabric}
                  </span>
                )}
              </div>

              {/* Wishlist Heart */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={handleToggleWishlist}
                className="p-1.5 rounded-full bg-canvas/80 hover:bg-canvas text-ink-muted hover:text-primary transition-colors"
                aria-label="Wishlist"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isWishlisted ? 'text-primary fill-primary' : ''
                  }`}
                />
              </motion.button>
            </div>

            <h3 className="font-serif font-semibold text-base sm:text-xl text-ink-primary line-clamp-2 group-hover:text-primary transition-colors leading-snug">
              {product.title}
            </h3>

            <p className="hidden sm:block text-xs text-ink-muted line-clamp-2 font-light">
              {product.subtitle || product.description}
            </p>

            {/* Color Swatches */}
            {product.variants.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariant(v);
                    }}
                    title={v.colorName}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      selectedVariant?.id === v.id
                        ? 'scale-125 border-primary ring-2 ring-accent/40'
                        : 'border-black/20 hover:scale-110'
                    }`}
                    style={{ backgroundColor: v.colorHex }}
                  />
                ))}
                <span className="text-[10px] text-ink-muted ml-1">
                  {product.variants.length} shades
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-accent/15 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-bold tabular-nums text-base sm:text-lg text-primary">
                {formatRupees(pricePaise)}
              </span>
              {mrpPaise > pricePaise && (
                <span className="font-sans text-xs text-ink-muted line-through tabular-nums">
                  {formatRupees(mrpPaise)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-[10px] font-bold text-rose-700">
                  ({discountPercent}% OFF)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(product);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-canvas hover:bg-accent/15 border border-accent/25 text-xs font-medium text-ink-primary transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              {isAvailable && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={handleQuickAdd}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                    isAddedRecently
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary hover:bg-primary-hover text-surface hover:shadow-md'
                  }`}
                >
                  {isAddedRecently ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  <span>{isAddedRecently ? 'Added' : 'Add'}</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -5, boxShadow: '0 16px 36px -10px rgba(122,35,30,0.14)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col bg-surface rounded-2xl overflow-hidden border border-accent/25 hover:border-accent/60 transition-all duration-300 cursor-pointer h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas silk-shimmer-wrapper">
        <img
          src={currentDisplayImage}
          alt={product.title}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.isPinned && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-surface shadow-xs">
              ★ Featured
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-surface shadow-xs">
              New Arrival
            </span>
          )}
          {discountPercent > 0 && !product.isPinned && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-700 text-surface shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Wishlist Button (Top-Right) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={handleToggleWishlist}
          className="absolute top-2.5 right-2.5 z-10 p-2 rounded-full bg-surface/90 hover:bg-surface text-ink-muted hover:text-primary shadow-xs backdrop-blur-xs transition-colors"
          aria-label="Wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'text-primary fill-primary' : ''
            }`}
          />
        </motion.button>

        {/* Out of Stock Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
            <span className="px-4 py-1.5 rounded-full bg-white/95 text-primary text-xs font-bold uppercase tracking-widest shadow-md">
              Sold Out
            </span>
          </div>
        )}

        {/* Quick View / Add Buttons Overlay */}
        <div className="absolute bottom-3 inset-x-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="hidden sm:flex flex-1 py-2 px-3 rounded-lg bg-surface/95 hover:bg-surface text-ink-primary text-xs font-medium items-center justify-center gap-1.5 shadow-md backdrop-blur-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Saree
          </button>
          {isAvailable && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleQuickAdd}
              className={`ml-auto sm:ml-0 p-2.5 sm:p-2 rounded-full sm:rounded-lg text-xs font-medium flex items-center justify-center shadow-md transition-all ${
                isAddedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary hover:bg-primary-hover text-surface'
              }`}
              title="Add to Bag"
            >
              {isAddedRecently ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            </motion.button>
          )}
        </div>
      </div>

      {/* Saree Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {product.fabric && (
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-1">
              {product.fabric}
            </div>
          )}

          <h3 className="font-serif font-semibold text-base sm:text-lg text-ink-primary line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {product.title}
          </h3>

          {/* Color Swatches */}
          {product.variants.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  title={v.colorName}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    selectedVariant?.id === v.id
                      ? 'scale-125 border-primary ring-2 ring-accent/40'
                      : 'border-black/20 hover:scale-110'
                  }`}
                  style={{ backgroundColor: v.colorHex }}
                />
              ))}
              <span className="text-[10px] text-ink-muted ml-1">
                {product.variants.length} shades
              </span>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-3 pt-3 border-t border-accent/15 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-sans font-bold tabular-nums text-base sm:text-lg text-primary">
              {formatRupees(pricePaise)}
            </span>
            {mrpPaise > pricePaise && (
              <span className="font-sans text-xs text-ink-muted line-through tabular-nums">
                {formatRupees(mrpPaise)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
