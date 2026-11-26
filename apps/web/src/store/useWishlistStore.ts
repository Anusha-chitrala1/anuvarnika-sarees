import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  wishlistIds: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistIds: [],
      toggleWishlist: (productId) => {
        const ids = get().wishlistIds;
        if (ids.includes(productId)) {
          set({ wishlistIds: ids.filter((id) => id !== productId) });
        } else {
          set({ wishlistIds: [...ids, productId] });
        }
      },
      isInWishlist: (productId) => get().wishlistIds.includes(productId),
    }),
    {
      name: 'anuvarnika_wishlist_v1',
    }
  )
);
