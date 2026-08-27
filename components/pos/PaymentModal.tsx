'use client';

import { useState, useEffect, useRef } from 'react';
import Spinner from '@/components/ui/spinner';
import {
  X,
  DollarSign,
  CreditCard,
  Smartphone,
  Building2,
  FileText,
  BookOpen,
  MoreHorizontal,
  CheckCircle2,
  ChevronRight,
  Receipt,
  Printer,
} from 'lucide-react';
import type { PaymentMethod, Payment } from '@/types/api.types';
import posService, { type PosOrderPayload, type PrintSettings } from '@/services/posService';
import { notify } from '@/lib/notifications';
import DatePicker from 'react-datepicker';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

interface Customer {
  id?: string;
  name: string;
  phone?: string;
}

interface OrderTotals {
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
}

interface PaymentModalProps {
  open: boolean;
  cart: CartItem[];
  customer: Customer;
  totals: OrderTotals;
  sessionId: string | number;
  registerId: string | number;
  tenantId?: string | number;
  discountType: 'percent' | 'amount';
  discountValue: number;
  notes?: string;
  defaultMethod?: PaymentMethod;
  onSuccess: (payment: Payment, order: { id: string; uuid?: string; invoice_number?: string }, printSettings?: PrintSettings) => void;
  onCancel: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: PaymentMethod; label: string; Icon: React.ElementType; color: string }[] = [
  { value: 'cash', label: 'Cash', Icon: DollarSign, color: 'emerald' },
  { value: 'card', label: 'Card', Icon: CreditCard, color: 'blue' },
  { value: 'bkash', label: 'bKash', Icon: Smartphone, color: 'pink' },
  { value: 'nagad', label: 'Nagad', Icon: Smartphone, color: 'orange' },
  { value: 'rocket', label: 'Rocket', Icon: Smartphone, color: 'purple' },
  { value: 'bank_transfer', label: 'Bank', Icon: Building2, color: 'sky' },
  { value: 'check', label: 'Cheque', Icon: BookOpen, color: 'amber' },
  { value: 'credit', label: 'Credit', Icon: FileText, color: 'red' },
  // { value: 'other', label: 'Other', Icon: MoreHorizontal, color: 'gray' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const COLOR_CLASSES: Record<string, { active: string; hover: string; icon: string; badge: string }> = {
  emerald: { active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', hover: 'hover:border-emerald-300 dark:hover:border-emerald-700', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500' },
  blue: { active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', hover: 'hover:border-blue-300 dark:hover:border-blue-700', icon: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500' },
  pink: { active: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20', hover: 'hover:border-pink-300 dark:hover:border-pink-700', icon: 'text-pink-600 dark:text-pink-400', badge: 'bg-pink-500' },
  orange: { active: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', hover: 'hover:border-orange-300 dark:hover:border-orange-700', icon: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-500' },
  purple: { active: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', hover: 'hover:border-purple-300 dark:hover:border-purple-700', icon: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-500' },
  sky: { active: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20', hover: 'hover:border-sky-300 dark:hover:border-sky-700', icon: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-500' },
  amber: { active: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', hover: 'hover:border-amber-300 dark:hover:border-amber-700', icon: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-500' },
  red: { active: 'border-red-500 bg-red-50 dark:bg-red-900/20', hover: 'hover:border-red-300 dark:hover:border-red-700', icon: 'text-red-600 dark:text-red-400', badge: 'bg-red-500' },
  gray: { active: 'border-gray-500 bg-gray-100 dark:bg-gray-700/40', hover: 'hover:border-gray-400 dark:hover:border-gray-500', icon: 'text-gray-600 dark:text-gray-400', badge: 'bg-gray-500' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentModal({
  open,
  cart,
  customer,
  totals,
  sessionId,
  registerId,
  tenantId,
  discountType,
  discountValue,
  notes,
  defaultMethod = 'cash',
  onSuccess,
  onCancel,
}: PaymentModalProps) {
  const { grandTotal, subTotal, discountAmount, taxAmount } = totals;

  // ── Payment form state ──────────────────────────────────────────────────────
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [amountTendered, setAmountTendered] = useState<string>('');
  // Card
  const [cardLastFour, setCardLastFour] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [txnReference, setTxnReference] = useState('');
  // Mobile money
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileTxnId, setMobileTxnId] = useState('');
  // Bank
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  // Check
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDate, setCheckDate] = useState('');
  // Meta
  const [paymentNotes, setPaymentNotes] = useState('');
  // Partial payment (cash only)
  const [allowDue, setAllowDue] = useState(false);
  const [paymentDueDate, setPaymentDueDate] = useState<Date | null>(null);

  // ── Submission & success state ──────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ payment: Payment; order: { id: string; uuid?: string; invoice_number?: string }; balanceDue: number; isPartial: boolean; printSettings?: PrintSettings } | null>(null);

  const tenderInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens or method changes
  useEffect(() => {
    if (open) {
      setMethod(defaultMethod);
      setAmountTendered('');
      setCardLastFour('');
      setProcessingFee('');
      setTxnReference('');
      setMobileNumber('');
      setMobileTxnId('');
      setBankName('');
      setBankAccount('');
      setCheckNumber('');
      setCheckDate('');
      setPaymentNotes('');
      setAllowDue(false);
      setPaymentDueDate(null);
      setSuccess(null);
    }
  }, [open, defaultMethod]);

  // Auto-focus tender input when Cash is selected
  useEffect(() => {
    if (method === 'cash' && open && !success) {
      setTimeout(() => tenderInputRef.current?.focus(), 50);
    }
  }, [method, open, success]);

  if (!open) return null;

  // ── Derived values ─────────────────────────────────────────────────────────
  const tendered = parseFloat(amountTendered) || 0;
  const change = Math.max(0, tendered - grandTotal);
  const balanceDue = Math.max(0, grandTotal - tendered);
  const isExact = tendered === grandTotal;
  const canPay = method === 'cash'
    ? (allowDue ? tendered > 0 : tendered >= grandTotal)
    : true;

  const methodMeta = PAYMENT_METHODS.find(m => m.value === method)!;
  const colors = COLOR_CLASSES[methodMeta.color];

  // ── Date helpers (DD/MM/YYYY) ──────────────────────────────────────────────
  // Date → YYYY-MM-DD for API
  const toIsoDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  };

  // Date → DD/MM/YYYY for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) { notify.error('Cart is empty'); return; }
    if (method === 'cash' && !allowDue && tendered < grandTotal) {
      notify.error('Amount tendered must be ≥ grand total');
      return;
    }
    if (method === 'cash' && allowDue && tendered <= 0) {
      notify.error('Amount tendered must be greater than 0');
      return;
    }

    const payload: PosOrderPayload = {
      session_id: sessionId,
      register_id: registerId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      payment_method: method,
      discount_type: discountType === 'percent' ? 'percentage' : 'fixed',
      discount_value: discountValue,
      notes: notes || undefined,
      payment_notes: paymentNotes || undefined,
      items: cart.map(item => ({
        variation_id: item.product_id ?? item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
      })),
    };

    // Method-specific fields
    // `is_partial` and `tendered_amount` apply to ANY method, not just
    // cash. Previously these were set only inside the `method === 'cash'`
    // branch, so a partial bKash / card / cheque sales silently fell
    // through to `is_partial=false` on the backend — which then wrote
    // `paid_amount = grand_total` and a Payment row with `amount = 0`
    // even though the customer only paid a fraction. That was a
    // revenue bug, not just a display bug.
    if (allowDue && tendered > 0 && tendered < grandTotal) {
      payload.is_partial = true;
      payload.tendered_amount = tendered;
      if (paymentDueDate) payload.payment_due_date = toIsoDate(paymentDueDate);
    } else if (method === 'cash') {
      payload.tendered_amount = tendered;
    }

    if (method === 'card') {
      if (cardLastFour) payload.card_last_four = cardLastFour;
      if (processingFee) payload.processing_fee = parseFloat(processingFee);
      if (txnReference) payload.transaction_reference = txnReference;
    } else if (['bkash', 'nagad', 'rocket'].includes(method)) {
      if (mobileNumber) payload.mobile_number = mobileNumber;
      if (mobileTxnId) payload.mobile_transaction_id = mobileTxnId;
    } else if (method === 'bank_transfer') {
      if (bankName) payload.bank_name = bankName;
      if (bankAccount) payload.bank_account = bankAccount;
      if (txnReference) payload.transaction_reference = txnReference;
    } else if (method === 'check') {
      if (checkNumber) payload.check_number = checkNumber;
      if (checkDate) payload.check_date = checkDate;
    }

    setIsSubmitting(true);
    try {
      const result = await posService.createOrder(payload);
      setSuccess({
        payment: result.payment,
        order: {
          id: String(result.order?.id ?? ''),
          uuid: (result.order as any)?.uuid,
          invoice_number: result.order?.invoice_number,
        },
        balanceDue: result.balance_due,
        isPartial: result.is_partial,
        printSettings: result.print_settings,
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.errors;
      if (typeof msg === 'object') {
        const first = Object.values(msg as Record<string, string[]>).flat()[0];
        notify.error(String(first || 'Payment failed'));
      } else {
        notify.error(String(msg || 'Payment failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4 ${success.isPartial ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
            <CheckCircle2 className={`w-10 h-10 ${success.isPartial ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {success.isPartial ? 'Partial Payment Recorded' : 'Payment Successful!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {customer.name} · {methodMeta.label}
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Receipt #</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {success.payment?.receipt_number ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Grand Total</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">৳{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">৳{tendered.toFixed(2)}</span>
            </div>
            {success.isPartial && success.balanceDue > 0 && (
              <div className="flex justify-between pt-1 border-t border-amber-200 dark:border-amber-800">
                <span className="font-semibold text-amber-700 dark:text-amber-400">Balance Due</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">৳{success.balanceDue.toFixed(2)}</span>
              </div>
            )}
            {!success.isPartial && method === 'cash' && success.payment?.change_amount != null && Number(success.payment.change_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Change Given</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ৳{Number(success.payment.change_amount).toFixed(2)}
                </span>
              </div>
            )}
            {success.isPartial && paymentDueDate && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatDisplayDate(paymentDueDate)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onSuccess(success.payment, success.order, success.printSettings)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={() => onSuccess(success.payment, success.order, success.printSettings)}
              className="flex-1 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Modal ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Complete Payment</h2>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: Order Summary ─────────────────────────────────────────── */}
          <div className="w-100 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-800/50">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Summary</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 truncate">{customer.name}</p>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {cart.map((item, idx) => (
                <div key={item.id} className="flex items-start justify-between gap-1 py-1.5">
                  <span className="shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-500 w-4 pt-px">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight truncate">{item.product_name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">৳{item.line_total.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.quantity} × ৳{item.unit_price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5 shrink-0">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span>৳{subTotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span>−৳{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Tax</span>
                  <span>+৳{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-300 dark:border-gray-600">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">৳{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Right: Payment Entry ────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Method Tabs */}
            <div className="px-5 pt-4 shrink-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Payment Method</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(pm => {
                  const c = COLOR_CLASSES[pm.color];
                  const isActive = method === pm.value;
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setMethod(pm.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${isActive
                        ? `${c.active} ${c.icon}`
                        : `border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 ${c.hover}`
                        }`}
                    >
                      <pm.Icon className="w-3.5 h-3.5 shrink-0" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific inputs */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">

              {/* ── CASH ──────────────────────────────────────────────────── */}
              {method === 'cash' && (
                <div className="space-y-1">
                  {/* Allow Due toggle */}
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Allow Partial Payment (Due)</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Customer pays part now, rest later</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAllowDue(v => !v); setPaymentDueDate(null); }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${allowDue ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      role="switch"
                      aria-checked={allowDue}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${allowDue ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Amount Tendered */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {allowDue ? 'Amount Paying Now' : 'Amount Tendered'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">৳</span>
                      <input
                        ref={tenderInputRef}
                        type="number"
                        min={allowDue ? 0.01 : grandTotal}
                        max={allowDue ? grandTotal : undefined}
                        step="0.01"
                        value={amountTendered}
                        onChange={e => setAmountTendered(e.target.value)}
                        onFocus={e => (e.target as HTMLInputElement).select()}
                        placeholder={allowDue ? '0.00' : grandTotal.toFixed(2)}
                        className={`w-full pl-8 pr-4 py-2 text-xl font-bold bg-gray-50 dark:bg-gray-800 border-2 rounded-xl outline-none text-right text-gray-900 dark:text-gray-100 transition-colors ${allowDue ? 'border-amber-300 dark:border-amber-700 focus:border-amber-500 dark:focus:border-amber-500' : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-500'}`}
                      />
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Quick Amount</p>
                    <div className="grid grid-cols-6 gap-2">
                      {QUICK_AMOUNTS.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountTendered(String(amt))}
                          className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${parseFloat(amountTendered) === amt
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                            }`}
                        >
                          ৳{amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmountTendered(grandTotal.toFixed(2))}
                        className={`py-2 rounded-lg border text-sm font-semibold transition-colors col-span-3 ${isExact && amountTendered !== ''
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                          }`}
                      >
                        Exact Amount (৳{grandTotal.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Change / Balance Due display */}
                  {amountTendered && (
                    allowDue && tendered < grandTotal ? (
                      <div className="rounded-xl p-2 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Balance Due</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">৳{balanceDue.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className={`rounded-xl p-2 flex items-center justify-between ${change >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Due</span>
                        <span className={`text-2xl font-bold ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          ৳{change.toFixed(2)}
                        </span>
                      </div>
                    )
                  )}

                  {/* Due date (only when allowDue enabled) */}
                  {allowDue && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Payment Due Date <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <DatePicker
                        selected={paymentDueDate}
                        onChange={(date: Date | null) => setPaymentDueDate(date)}
                        dateFormat="dd/MM/yyyy"
                        minDate={new Date()}
                        placeholderText="DD/MM/YYYY"
                        wrapperClassName="w-full"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 dark:text-gray-100 font-mono cursor-pointer"
                        calendarClassName="shadow-xl rounded-xl border border-gray-200 dark:border-gray-700"
                        isClearable
                        showPopperArrow={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── CARD ──────────────────────────────────────────────────── */}
              {method === 'card' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last 4 Digits</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLastFour}
                        onChange={e => setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="XXXX"
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Processing Fee</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={processingFee}
                          onChange={e => setProcessingFee(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Transaction Reference</label>
                    <input
                      type="text"
                      value={txnReference}
                      onChange={e => setTxnReference(e.target.value)}
                      placeholder="e.g. TXN-123456"
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* ── MOBILE MONEY (bKash / Nagad / Rocket) ─────────────────── */}
              {['bkash', 'nagad', 'rocket'].includes(method) && (
                <div className="space-y-3">
                  <div className={`rounded-xl p-3 border ${method === 'bkash' ? 'bg-pink-50   dark:bg-pink-900/10   border-pink-200   dark:border-pink-800' :
                    method === 'nagad' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' :
                      'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800'
                    }`}>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Paying ৳{grandTotal.toFixed(2)} via {methodMeta.label}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mobile Number</label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Transaction ID</label>
                    <input
                      type="text"
                      value={mobileTxnId}
                      onChange={e => setMobileTxnId(e.target.value)}
                      placeholder="e.g. 8N7AK96JK0"
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* ── BANK TRANSFER ─────────────────────────────────────────── */}
              {method === 'bank_transfer' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder="e.g. Dutch-Bangla Bank"
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Account Number</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={e => setBankAccount(e.target.value)}
                        placeholder="Account no."
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Transaction Reference</label>
                    <input
                      type="text"
                      value={txnReference}
                      onChange={e => setTxnReference(e.target.value)}
                      placeholder="Transfer reference number"
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* ── CHEQUE ────────────────────────────────────────────────── */}
              {method === 'check' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cheque Number</label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={e => setCheckNumber(e.target.value)}
                        placeholder="e.g. 001234"
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cheque Date</label>
                      <input
                        type="date"
                        value={checkDate}
                        onChange={e => setCheckDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── CREDIT ────────────────────────────────────────────────── */}
              {method === 'credit' && (
                <div className="rounded-xl p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 space-y-2">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Credit Sale</p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    This sales will be recorded as a credit. The amount of ৳{grandTotal.toFixed(2)} is due from the customer.
                  </p>
                </div>
              )}

              {/* ── OTHER ─────────────────────────────────────────────────── */}
              {/* {method === 'other' && (
                <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Record payment of ৳{grandTotal.toFixed(2)} via other method.
                  </p>
                </div>
              )} */}

              {/* Notes (all methods) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Any notes about this payment..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Footer: summary + action buttons */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 space-y-3 bg-gray-50 dark:bg-gray-800/50">
              {/* Summary bar */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">৳{grandTotal.toFixed(2)}</span>
                </div>
                {method === 'cash' && amountTendered && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    <div className="flex-1 flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Paid</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">৳{tendered.toFixed(2)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    {allowDue && tendered < grandTotal ? (
                      <div className="flex-1 flex justify-between">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Due</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">৳{balanceDue.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Change</span>
                        <span className={`font-bold ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          ৳{change.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="px-5 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canPay}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold rounded-xl text-sm transition-all ${canPay && !isSubmitting
                    ? `${colors.badge} hover:opacity-90 text-white shadow-md`
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" tone="white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {method === 'cash' && allowDue && tendered < grandTotal
                        ? `Partial Pay · ৳${tendered.toFixed(2)} (Due ৳${balanceDue.toFixed(2)})`
                        : `Confirm Payment · ৳${grandTotal.toFixed(2)}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
