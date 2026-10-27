'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Client-side cart.
 *
 * IMPORTANT: the prices stored here are for DISPLAY ONLY.
 *
 * This state lives in the visitor's browser and is trivially editable, so the
 * checkout endpoint ignores every money field sent from the client and
 * recomputes the order from the database using `variantId` and `quantity`.
 * Treating this as the source of truth for price would let anyone buy a
 * Rs. 38,999 bundle for one rupee.
 */

export interface CartLine {
  /** The purchasable SKU. The only field the server actually trusts. */
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  /** Display price in whole PKR, as shown when the item was added. */
  priceRs: number;
  quantity: number;
  imageUrl?: string;
  imageAlt?: string;
  /** Stock at the time of adding; the server re-checks before accepting. */
  maxStock: number;
}

interface CartState {
  lines: CartLine[];
  /** Cart drawer visibility. */
  isOpen: boolean;
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,

      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? {
                      ...l,
                      // Adding a line already in the cart tops it up, but never
                      // past the stock we last saw.
                      quantity: Math.min(l.quantity + quantity, l.maxStock || 99),
                    }
                  : l,
              ),
              isOpen: true,
            };
          }
          return {
            lines: [
              ...state.lines,
              { ...line, quantity: Math.min(quantity, line.maxStock || 99) },
            ],
            isOpen: true,
          };
        }),

      remove: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId
                    ? { ...l, quantity: Math.min(quantity, l.maxStock || 99) }
                    : l,
                ),
        })),

      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'kites92:cart',
      storage: createJSONStorage(() => localStorage),
      // The drawer must never be restored open on a fresh page load.
      partialize: (state) => ({ lines: state.lines }) as CartState,
      version: 1,
    },
  ),
);

/** Total item count, for the header badge. */
export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Indicative subtotal for display. The server computes the real one. */
export function cartSubtotalRs(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.priceRs * line.quantity, 0);
}
