'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Printer, MoreHorizontal, ChevronDown, Mail, MapPin, CreditCard, Package, Truck, Edit3, AlertCircle, Loader2 } from 'lucide-react';
import type { EcommerceOrder, OrderDetail, OrderTimeline as OrderTimelineType } from '@/types/ecommerce';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import OrderTimeline from './order-timeline';
import { notify } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: EcommerceOrder['status']; label: string; color: string }[] = [
  { value: 'placed', label: 'Placed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'packed', label: 'Packed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'shipped', label: 'Shipped', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'returned', label: 'Returned', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
];

const PAYMENT_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

interface OrderDetailPanelProps {
  orderId: string;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

export default function OrderDetailPanel({ orderId, onClose, onStatusUpdate }: OrderDetailPanelProps) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EcommerceOrder['status'] | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ecommerceOrderService.getById(orderId);
      if (!result) {
        setError('Order not found');
        return;
      }
      setDetail(result);
      setTrackingNumber(result.tracking_number || '');
      setCourierName(result.courier || '');
    } catch {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleStatusChange = useCallback(async () => {
    if (!pendingStatus || !detail) return;
    setUpdatingStatus(true);
    try {
      await ecommerceOrderService.updateStatus(detail.id, pendingStatus, statusNote);
      notify.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === pendingStatus)?.label}`);
      setShowStatusConfirm(false);
      setStatusNote('');
      setPendingStatus(null);
      onStatusUpdate?.();
      loadDetail();
    } catch {
      notify.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [pendingStatus, detail, statusNote, onStatusUpdate, loadDetail]);

  const handleTrackingUpdate = useCallback(async () => {
    if (!detail) return;
    try {
      await ecommerceOrderService.updateTracking(detail.id, trackingNumber, courierName);
      notify.success('Tracking info updated');
      setShowTrackingForm(false);
      loadDetail();
    } catch {
      notify.error('Failed to update tracking');
    }
  }, [detail, trackingNumber, courierName, loadDetail]);

  const handleAddNote = useCallback(async () => {
    if (!detail || !noteText.trim()) return;
    try {
      await ecommerceOrderService.addNote(detail.id, noteText.trim());
      notify.success('Note added');
      setNoteText('');
      setShowNoteInput(false);
    } catch {
      notify.error('Failed to add note');
    }
  }, [detail, noteText]);

  const getBadge = (value: string, options: typeof STATUS_OPTIONS | Record<string, string>) => {
    if (Array.isArray(options)) {
      const o = options.find(s => s.value === value);
      return <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${o?.color || ''}`}>{o?.label || value}</span>;
    }
    return <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${options[value] || 'bg-gray-100 text-gray-800'}`}>{value}</span>;
  };

  // ── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 w-full max-w-3xl animate-pulse">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="p-4 space-y-4">
            <div className="h-32 bg-gray-100 dark:bg-gray-700/50 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded" />
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
            <div className="h-48 bg-gray-100 dark:bg-gray-700/50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────

  if (error || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 w-full max-w-3xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order Details</h2>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{error || 'Order not found'}</p>
            <p className="text-xs text-gray-500 mt-1">The order may have been deleted or you may not have permission.</p>
            <button onClick={loadDetail} className="mt-4 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedConfig = STATUS_OPTIONS.find(s => s.value === detail.status);
  const allowedTransitions: { value: EcommerceOrder['status']; label: string }[] = [];
  if (detail.status === 'placed') allowedTransitions.push({ value: 'confirmed', label: 'Confirm Order' }, { value: 'cancelled', label: 'Cancel Order' });
  else if (detail.status === 'confirmed') allowedTransitions.push({ value: 'packed', label: 'Start Packing' }, { value: 'cancelled', label: 'Cancel Order' });
  else if (detail.status === 'packed') allowedTransitions.push({ value: 'shipped', label: 'Mark Shipped' }, { value: 'cancelled', label: 'Cancel Order' });
  else if (detail.status === 'shipped') allowedTransitions.push({ value: 'delivered', label: 'Mark Delivered' });
  else if (detail.status === 'delivered') allowedTransitions.push({ value: 'returned', label: 'Initiate Return' });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 w-full max-w-3xl flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{detail.order_number}</span>
            </h2>
            {getBadge(detail.status, STATUS_OPTIONS)}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg z-20 py-1">
                  <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> Print Invoice
                  </button>
                  <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                    <Mail className="w-3.5 h-3.5" /> Email Customer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Status Timeline */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Status Timeline
            </h3>
            <OrderTimeline entries={detail.timeline} />
          </div>

          {/* Order Info + Customer + Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Order Info */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <CreditCard className="w-3 h-3 inline mr-1" /> Order Info
              </h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Placed</span><span>{formatDate(detail.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{detail.items_count}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{detail.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span>{getBadge(detail.payment_status, PAYMENT_BADGES)}</div>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <Mail className="w-3 h-3 inline mr-1" /> Customer
              </h3>
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-gray-900 dark:text-gray-100">{detail.customer_name}</p>
                <p className="text-gray-500">{detail.customer_email}</p>
                <p className="text-gray-500">{detail.customer_phone}</p>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <Truck className="w-3 h-3 inline mr-1" /> Shipping
              </h3>
              <div className="text-xs space-y-0.5">
                <p className="text-gray-500">{detail.shipping_method}</p>
                <p className="text-gray-500">
                  {detail.courier && detail.tracking_number
                    ? `${detail.courier}: ${detail.tracking_number}`
                    : 'Not shipped yet'}
                </p>
                <p className="text-gray-500 truncate" title={detail.shipping_address}>
                  <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
                  {detail.shipping_address}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              <Package className="w-3 h-3 inline mr-1" /> Order Items ({detail.items?.length || 0})
            </h3>
            {detail.items && detail.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">#</th>
                      <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">Product</th>
                      <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">SKU</th>
                      <th className="text-center py-1.5 pr-2 text-gray-500 font-medium">Qty</th>
                      <th className="text-right py-1.5 pr-2 text-gray-500 font-medium">Price</th>
                      <th className="text-right py-1.5 text-gray-500 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-1.5 pr-2 text-gray-400">{idx + 1}</td>
                        <td className="py-1.5 pr-2 text-gray-900 dark:text-gray-100">{item.product_name}</td>
                        <td className="py-1.5 pr-2 text-gray-500 font-mono">{item.product_sku}</td>
                        <td className="py-1.5 pr-2 text-center">{item.quantity}</td>
                        <td className="py-1.5 pr-2 text-right">৳{item.unit_price.toLocaleString('en-IN')}</td>
                        <td className="py-1.5 text-right font-medium">৳{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">No items data available</p>
            )}

            {/* Price Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 space-y-1 text-xs max-w-[280px] ml-auto">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>৳{detail.subtotal.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>৳{detail.shipping.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>৳{detail.tax.toLocaleString('en-IN')}</span></div>
              {detail.discount > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">-৳{detail.discount.toLocaleString('en-IN')}</span></div>
              )}
              <div className="flex justify-between font-semibold text-sm pt-1 border-t border-gray-200 dark:border-gray-600">
                <span>Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">৳{detail.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {allowedTransitions.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                <Edit3 className="w-3 h-3 inline mr-1" /> Actions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {allowedTransitions.map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setPendingStatus(t.value);
                      setStatusNote('');
                      if (t.value === 'shipped') {
                        setShowTrackingForm(true);
                      }
                      setShowStatusConfirm(true);
                    }}
                    className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-2.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span><Edit3 className="w-3 h-3 inline mr-1" /> Notes</span>
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {showNoteInput ? 'Cancel' : '+ Add Note'}
              </button>
            </h3>
            {showNoteInput && (
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Type a note..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            )}
            {detail.notes ? (
              <p className="text-xs text-gray-600 dark:text-gray-400">{detail.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No internal notes</p>
            )}
          </div>
        </div>

        {/* ── Status Confirm Dialog ───────────────────────────────────── */}
        {showStatusConfirm && pendingStatus && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-xl border border-gray-200 dark:border-gray-700 p-4 m-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Update Status to {STATUS_OPTIONS.find(s => s.value === pendingStatus)?.label}
              </h3>

              {showTrackingForm && (
                <div className="space-y-1.5 mb-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Tracking Number *</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="e.g., TRK-123-2025"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Courier</label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={e => setCourierName(e.target.value)}
                      placeholder="e.g., Pathao, Steadfast"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Note (optional)</label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Reason for this change..."
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowStatusConfirm(false); setPendingStatus(null); setShowTrackingForm(false); }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm cursor-pointer"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={updatingStatus || (showTrackingForm && !trackingNumber.trim())}
                  className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
