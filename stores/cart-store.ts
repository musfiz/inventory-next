'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/storefront';
import { PRODUCTS } from '@/lib/storefront/mock-data';

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  couponCode: string | null;
  couponDiscount: number;
  freeShippingOverride: boolean;
  addItem: (
    productId: string,
    variationId: string,
    quantity?: number
  ) => { ok: boolean; message?: string };
  removeItem: (variationId: string) => void;
  updateQuantity: (variationId: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  setFreeShipping: (override: boolean) => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      couponCode: null,
      couponDiscount: 0,
      freeShippingOverride: false,

      addItem: (productId, variationId, quantity = 1) => {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) {
          return { ok: false, message: 'Product not found' };
        }
        const variation = product.variations.find(v => v.id === variationId);
        if (!variation) {
          return { ok: false, message: 'Variation not found' };
        }

        const items = get().items;
        const existing = items.find(i => i.variationId === variationId);

        const newQty = (existing?.quantity || 0) + quantity;
        if (newQty > variation.stock) {
          return { ok: false, message: `Only ${variation.stock} in stock` };
        }

        if (existing) {
          set({
            items: items.map(i =>
              i.variationId === variationId
                ? {
                    ...i,
                    quantity: newQty,
                    lineTotal: i.unitPrice * newQty,
                  }
                : i
            ),
          });
        } else {
          const newItem: CartItem = {
            variationId: variation.id,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            image: variation.image || product.images[0],
            unitPrice: variation.sellingPrice,
            mrp: variation.mrp,
            quantity,
            attributes: variation.attributes,
            stock: variation.stock,
            lineTotal: variation.sellingPrice * quantity,
          };
          set({
            items: [...items, newItem],
          });
        }
        return { ok: true };
      },

      removeItem: variationId => {
        set(state => ({
          items: state.items.filter(i => i.variationId !== variationId),
        }));
      },

      updateQuantity: (variationId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variationId);
          return;
        }
        set(state => ({
          items: state.items.map(i => {
            if (i.variationId !== variationId) return i;
            const capped = Math.min(quantity, i.stock);
            return { ...i, quantity: capped, lineTotal: i.unitPrice * capped };
          }),
        }));
      },

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0 }),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set(state => ({ drawerOpen: !state.drawerOpen })),

      applyCoupon: (code, discount) =>
        set({ couponCode: code, couponDiscount: discount }),

      removeCoupon: () => set({ couponCode: null, couponDiscount: 0 }),

      setFreeShipping: override => set({ freeShippingOverride: override }),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.lineTotal, 0),

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'uims-cart',
      partialize: state => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
);
