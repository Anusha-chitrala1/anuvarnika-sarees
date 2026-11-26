import React from 'react';
import { Heart, ArrowLeft } from 'lucide-react';
import { ProductDTO } from '@anuvarnika/shared';
import { ProductCard } from '../components/ProductCard.js';
import { useWishlistStore } from '../store/useWishlistStore.js';

interface WishlistViewProps {
  products: ProductDTO[];
  onSelectProduct: (product: ProductDTO) => void;
  onExplore: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  products,
  onSelectProduct,
  onExplore,
}) => {
  const { wishlistIds } = useWishlistStore();
  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-accent/20">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-primary">Your Saved Sarees</h1>
          <p className="text-xs text-ink-muted mt-1">{wishlistedProducts.length} saree(s) saved</p>
        </div>
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-accent/20 p-8 space-y-4">
          <Heart className="w-12 h-12 text-accent/40 mx-auto" />
          <h3 className="font-serif text-xl font-semibold text-primary">Your Wishlist is Empty</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            Click the heart icon on any saree to save it for your bridal or festive celebrations.
          </p>
          <button
            onClick={onExplore}
            className="bg-primary text-canvas px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-primary-hover shadow"
          >
            Explore Sarees
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistedProducts.map((p) => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  );
};
