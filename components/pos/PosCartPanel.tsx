'use client';

import { ShoppingCart, User, Trash2, Minus, Plus } from 'lucide-react';
import type { CartItem, Customer } from './pos-types';

interface PosCartPanelProps {
  cart: CartItem[];
  customer: Customer;
  openCustomerDialog: () => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeCartItem: (itemId: string) => void;
  clearCart: () => void;
}

export default function PosCartPanel({
  cart,
  customer,
  openCustomerDialog,
  updateCartItem,
  removeCartItem,
  clearCart,
}: PosCartPanelProps) {
  return (
    <div className="w-[35%] flex flex-col bg-white dark:bg-gray-900 border-r-2 border-gray-300 dark:border-gray-700 overflow-hidden">
      {/* Cart Header - Fixed */}
      <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Current Order</h2>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                {cart.length}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer */}
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{customer.name}</span>
          </div>
          <button
            onClick={openCustomerDialog}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Change
          </button>
        </div>
      </div>

      {/* Cart Items - Scrollable */}
      <div className="flex-1 overflow-y-auto p-1 min-h-0 overscroll-contain scrollbar-thin">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="w-16 h-16 mb-3" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs">Add products to start</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {cart.map((item, idx) => (
              <div
                key={item.id}
                className="px-1.5 py-1 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-1 flex items-start gap-1">
                    <span className="shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-500 w-4 pt-px">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                        {item.product_name}
                      </h4>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.sku}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-0.5 rounded shrink-0"
                    aria-label="Delete" title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() =>
                        updateCartItem(item.id, {
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        updateCartItem(item.id, {
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-8 text-center py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
                    />
                    <button
                      onClick={() =>
                        updateCartItem(item.id, {
                          quantity: item.quantity + 1,
                        })
                      }
                      disabled={item.stock !== undefined && item.quantity >= item.stock}
                      className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      ৳{item.unit_price.toFixed(2)} × {item.quantity}
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      ৳{item.line_total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}