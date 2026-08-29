'use client';

import { CheckCircle, Printer, Mail, XCircle } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import type { CartItem } from './pos-types';

interface PosOrderSummaryProps {
  cart: CartItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  grandTotal: number;
  discount: number;
  setDiscount: (v: number) => void;
  discountType: 'percent' | 'amount';
  setDiscountType: (v: 'percent' | 'amount') => void;
  taxRate: number;
  setTaxRate: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: boolean) => void;
  handlePayment: () => void;
  holdOrder: () => Promise<void>;
  clearCart: () => void;
  printReceipt: () => void;
  printOrder: any;
  setPrintOrder: (v: any) => void;
  printLoading: boolean;
}

export default function PosOrderSummary({
  cart,
  subtotal,
  totalDiscount,
  taxAmount,
  grandTotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  taxRate,
  setTaxRate,
  note,
  setNote,
  showPaymentModal,
  setShowPaymentModal,
  handlePayment,
  holdOrder,
  clearCart,
  printReceipt,
  printOrder,
  setPrintOrder,
  printLoading,
}: PosOrderSummaryProps) {
  return (
    <div className="w-[20%] flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Price Breakdown - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain scrollbar-thin">
        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Discount</span>
                <span>-৳{totalDiscount.toFixed(2)}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax ({taxRate}%)</span>
                <span>৳{taxAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-1 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-bold text-lg">
              <span className="text-gray-900 dark:text-gray-100">Grand Total</span>
              <span className="text-blue-600 dark:text-blue-400">৳{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Discount Input */}
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Order Discount
            </label>
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'percent' | 'amount')}
                className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
              >
                <option value="percent">%</option>
                <option value="amount">৳</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                onFocus={e => (e.target as HTMLInputElement).select()}
                className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Tax Input */}
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              onFocus={e => (e.target as HTMLInputElement).select()}
              className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Order Notes */}
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Order Notes
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note to this order..."
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Action Buttons - Always Visible at Bottom */}
      <div className="p-2 space-y-1.5 border-t-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button
          onClick={handlePayment}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
        >
          <CheckCircle className="w-4 h-4" />
          PAY NOW
        </button>

        <button
          onClick={holdOrder}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-sm transition-colors disabled:opacity-50 text-sm shadow-md"
        >
          <GiSave className="w-4 h-4" />
          HOLD
        </button>

        <button
          onClick={clearCart}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-sm transition-colors disabled:opacity-50 text-sm shadow-md"
        >
          <XCircle className="w-4 h-4" />
          VOID
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={printReceipt}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={async () => {
              const Swal = (await import('sweetalert2')).default;
              Swal.fire({
                icon: 'info',
                title: 'Email Receipt',
                text: 'Email feature coming soon',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
              });
            }}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-sm transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 select-none">
          Shortcuts: <kbd>F1</kbd> New · <kbd>F2</kbd> Hold · <kbd>F3</kbd> Pay · <kbd>F4</kbd> Customer
        </p>
      </div>
    </div>
  );
}