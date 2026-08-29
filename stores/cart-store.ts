'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/types/storefront';

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  couponCode: string | null;
  couponDiscount: number;
  freeShippingOverride: boolean;
  addItem: (
    product: Product,
    variationId: string,
    quantity?: number
  ) => { ok: boolean; message?: string };
  removeItem: (variationId: string) => void;
  updateItemVariation: (
    oldVariationId: string,
    product: Product,
    newVariationId: string
  ) => { ok: boolean; message?: string };
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

      addItem: (product, variationId, quantity = 1) => {
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

      updateItemVariation: (oldVariationId, product, newVariationId) => {
        const items = get().items;
        const oldItem = items.find(i => i.variationId === oldVariationId);
        if (!oldItem) {
          return { ok: false, message: 'Item not found in cart' };
        }

        const variation = product.variations.find(v => v.id === newVariationId);
        if (!variation) {
          return { ok: false, message: 'Variation not found' };
        }

        const qty = Math.min(oldItem.quantity, variation.stock);

        const duplicate = items.find(
          i => i.variationId === newVariationId && i.variationId !== oldVariationId
        );

        if (duplicate) {
          const merged = Math.min(duplicate.quantity + qty, variation.stock);
          set({
            items: items
              .filter(
                i => i.variationId !== oldVariationId && i.variationId !== newVariationId
              )
              .concat({
                ...duplicate,
                quantity: merged,
                lineTotal: duplicate.unitPrice * merged,
              }),
          });
          return { ok: true };
        }

        set({
          items: items.map(i =>
            i.variationId === oldVariationId
              ? {
                  ...i,
                  variationId: variation.id,
                  image: variation.image || product.images[0],
                  unitPrice: variation.sellingPrice,
                  mrp: variation.mrp,
                  stock: variation.stock,
                  attributes: variation.attributes,
                  quantity: qty,
                  lineTotal: variation.sellingPrice * qty,
                }
              : i
          ),
        });
        return { ok: true };
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
