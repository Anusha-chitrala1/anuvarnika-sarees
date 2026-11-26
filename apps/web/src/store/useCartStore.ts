import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductVariantDTO, ProductDTO } from '@anuvarnika/shared';

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  colorName: string;
  colorHex: string;
  sku: string;
  pricePaise: number;
  mrpPaise: number;
  quantity: number;
  imageUrl: string;
  availableStock: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  couponCode: string | null;
  couponDiscountPaise: number;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: ProductDTO, variant: ProductVariantDTO, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  setCoupon: (code: string | null, discountPaise: number) => void;
  clearCart: () => void;
  getSubtotalPaise: () => number;
  getTotalPaise: (shippingFeePaise?: number) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      couponCode: null,
      couponDiscountPaise: 0,

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      addItem: (product, variant, quantity = 1) => {
        const primaryImg =
          product.images.find((img) => img.variantId === variant.id) ||
          product.images.find((img) => img.isPrimary) ||
          product.images[0];

        const existing = get().items.find((i) => i.variantId === variant.id);

        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, variant.availableStock);
          set({
            items: get().items.map((i) =>
              i.variantId === variant.id ? { ...i, quantity: newQty } : i
            ),
            isDrawerOpen: true,
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                variantId: variant.id,
                productId: product.id,
                title: product.title,
                colorName: variant.colorName,
                colorHex: variant.colorHex,
                sku: variant.sku,
                pricePaise: variant.pricePaise,
                mrpPaise: variant.mrpPaise,
                quantity: Math.min(quantity, variant.availableStock),
                imageUrl: primaryImg?.imageUrl || '',
                availableStock: variant.availableStock,
              },
            ],
            isDrawerOpen: true,
          });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.min(quantity, i.availableStock) }
              : i
          ),
        });
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter((i) => i.variantId !== variantId),
        });
      },

      setCoupon: (code, discountPaise) => {
        set({ couponCode: code, couponDiscountPaise: discountPaise });
      },

      clearCart: () => {
        set({ items: [], couponCode: null, couponDiscountPaise: 0 });
      },

      getSubtotalPaise: () => {
        return get().items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
      },

      getTotalPaise: (shippingFeePaise = 0) => {
        const subtotal = get().getSubtotalPaise();
        const discount = get().couponDiscountPaise;
        return Math.max(0, subtotal - discount + shippingFeePaise);
      },
    }),
    {
      name: 'anuvarnika_cart_v1',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscountPaise: state.couponDiscountPaise,
      }),
    }
  )
);
