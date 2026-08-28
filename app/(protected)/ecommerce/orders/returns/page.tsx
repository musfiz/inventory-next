'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RotateCcw, RefreshCw, Eye, CheckCircle, XCircle, Undo2, Loader2, Search, Filter, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { ReturnRequest, ReturnKPIs, ReturnRequestStatus, ReturnRequestReason } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';
import ecommerceReturnService from '@/services/ecommerceReturnService';

// ── Constants ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'refunded', label: 'Refunded', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
];

const REASON_OPTIONS = [
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'damaged_in_transit', label: 'Damaged in Transit' },
  { value: 'customer_changed_mind', label: 'Changed Mind' },
  { value: 'overcharged', label: 'Overcharged' },
  { value: 'other', label: 'Other' },
];

const STATUS_FLOW: { status: ReturnRequestStatus; label: string; icon: string }[] = [
  { status: 'pending', label: 'Pending', icon: '⏳' },
  { status: 'approved', label: 'Approved', icon: '✅' },
  { status: 'refunded', label: 'Refunded', icon: '💰' },
];

const defaultFilters = {
  status: '', reason: '', date_from: '', date_to: '', search: '',
};

// ── Helpers ───────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch { return ''; }
}

const reasonLabels: Record<string, string> = {
  defective: 'Defective Product', wrong_item: 'Wrong Item', not_as_described: 'Not as Described',
  damaged_in_transit: 'Damaged in Transit', customer_changed_mind: 'Changed Mind',
  overcharged: 'Overcharged', other: 'Other',
};

// ── Return Detail Panel Component ─────────────────────────────────────

function ReturnDetailPanel({
  returnReq,
  onClose,
  onStatusUpdate,
}: {
  returnReq: ReturnRequest;
  onClose: () => void;
  onStatusUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    const result = await confirm({
      title: 'Approve Return',
      html: `Approve return <strong>${returnReq.return_number}</strong> for <strong>৳${returnReq.refund_amount.toLocaleString('en-IN')}</strong>?`,
      confirmButtonText: 'Approve',
      icon: 'question',
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await ecommerceReturnService.updateStatus(returnReq.id, 'approved');
      notify.success('Return request approved');
      onStatusUpdate();
    } catch { notify.error('Failed to approve'); }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      notify.warning('Please provide a reason for rejection');
      return;
    }
    setLoading(true);
    try {
      await ecommerceReturnService.updateStatus(returnReq.id, 'rejected', rejectNote);
      notify.success('Return request rejected');
      setShowRejectForm(false);
      setRejectNote('');
      onStatusUpdate();
    } catch { notify.error('Failed to reject'); }
    setLoading(false);
  };

  const handleRefund = async () => {
    const result = await confirm({
      title: 'Process Refund',
      html: `Process refund of <strong>৳${returnReq.refund_amount.toLocaleString('en-IN')}</strong> for <strong>${returnReq.return_number}</strong>?`,
      confirmButtonText: 'Process Refund',
      icon: 'question',
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await ecommerceReturnService.updateStatus(returnReq.id, 'refunded');
      notify.success('Refund processed successfully');
      onStatusUpdate();
    } catch { notify.error('Failed to process refund'); }
    setLoading(false);
  };

  const canApprove = returnReq.status === 'pending';
  const canReject = returnReq.status === 'pending';
  const canRefund = returnReq.status === 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {returnReq.return_number}
            </h2>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
              STATUS_OPTIONS.find(s => s.value === returnReq.status)?.color || ''
            }`}>
              {returnReq.status.charAt(0).toUpperCase() + returnReq.status.slice(1)}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{returnReq.customer_name}</p>
              <p className="text-xs text-gray-500">{returnReq.customer_email}</p>
              <p className="text-xs text-gray-500">{returnReq.customer_phone}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order</p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{returnReq.order_number}</p>
              <p className="text-xs text-gray-500">Items: {returnReq.items_count}</p>
              <p className="text-xs text-gray-500">Created: {formatDate(returnReq.created_at)}</p>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Return Reason</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{reasonLabels[returnReq.reason] || returnReq.reason}</p>
            {returnReq.reason_note && <p className="text-xs text-gray-500 mt-0.5">{returnReq.reason_note}</p>}
          </div>

          {/* Items */}
          {returnReq.items && returnReq.items.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Return Items</p>
              <div className="space-y-1">
                {returnReq.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-md px-2.5 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500">SKU: {item.product_sku} × {item.quantity}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">৳{item.total.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                        item.condition === 'good' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        item.condition === 'damaged' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subtotal</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">৳{returnReq.subtotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Refund Amount</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">৳{returnReq.refund_amount.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-500">via {returnReq.refund_method}</p>
            </div>
          </div>

          {/* Admin Note */}
          {returnReq.admin_note && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Admin Note</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{returnReq.admin_note}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {returnReq.rejected_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Rejection Reason</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{returnReq.rejected_reason}</p>
            </div>
          )}

          {/* Status Timeline */}
          <div>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status Timeline</p>
            <div className="flex items-center gap-0">
              {STATUS_FLOW.map((step, idx) => {
                const statusOrder = { pending: 0, approved: 1, rejected: 1, refunded: 2, cancelled: 0 };
                const currentOrder = statusOrder[returnReq.status] ?? 0;
                const stepOrder = statusOrder[step.status] ?? 0;
                const isComplete = stepOrder <= currentOrder && returnReq.status !== 'rejected' && returnReq.status !== 'cancelled';
                const isRejected = returnReq.status === 'rejected' || returnReq.status === 'cancelled';
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                      isRejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      isComplete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 ${isComplete ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {(canApprove || canReject || canRefund) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center gap-2 flex-wrap">
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve Return
                </button>
              )}
              {canApprove && !showRejectForm && (
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-sm cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              )}
              {canRefund && (
                <button
                  onClick={handleRefund}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  Process Refund
                </button>
              )}
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 border border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">Rejection Reason</p>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Provide a reason for rejecting this return request..."
                rows={3}
                className="w-full px-2 py-1.5 text-xs border border-red-300 dark:border-red-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectNote.trim()}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Confirm Reject
                </button>
                <button
                  onClick={() => { setShowRejectForm(false); setRejectNote(''); }}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Return Stats Card Component ───────────────────────────────────────

function ReturnStatCards({ kpis, loading }: { kpis: ReturnKPIs | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 animate-pulse">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (!kpis) return null;

  const cards = [
    { label: 'Total Returns', value: kpis.total_returns, color: 'text-gray-900 dark:text-gray-100' },
    { label: 'Pending', value: kpis.pending_returns, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Approved', value: kpis.approved_returns, color: 'text-green-600 dark:text-green-400' },
    { label: 'Rejected', value: kpis.rejected_returns, color: 'text-red-600 dark:text-red-400' },
    { label: 'Refunded', value: kpis.total_refunded, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Refunded Amount', value: `৳${kpis.refunded_amount.toLocaleString('en-IN')}`, color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2.5">
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Filter Bar Component ──────────────────────────────────────────────

function ReturnFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: typeof defaultFilters;
  onChange: (f: typeof defaultFilters) => void;
  onReset: () => void;
}) {
  const hasFilters = filters.status || filters.reason || filters.date_from || filters.date_to;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <select
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.reason}
          onChange={e => onChange({ ...filters, reason: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Reasons</option>
          {REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={e => onChange({ ...filters, date_from: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="From"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={e => onChange({ ...filters, date_to: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="To"
        />
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────

export default function ReturnsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [kpis, setKpis] = useState<ReturnKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  // ── Build filterParams for DataTable ─────────────────────────────────

  const filterParams = useMemo(() => {
    const p: Record<string, string | number | undefined | null> = {};
    if (filters.status) p.status = filters.status;
    if (filters.reason) p.reason = filters.reason;
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to) p.date_to = filters.date_to;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  // ── Load KPIs ────────────────────────────────────────────────────────

  const loadKPIs = useCallback(async () => {
    try {
      const data = await ecommerceReturnService.getKPIs();
      setKpis(data);
    } catch { /* silently fail */ }
    finally { setKpiLoading(false); }
  }, []);

  useEffect(() => { loadKPIs(); }, [loadKPIs, refreshKey]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleView = useCallback(async (ret: ReturnRequest) => {
    setSelectedReturnId(ret.id);
    // Try to load full detail with items
    try {
      const detail = await ecommerceReturnService.getById(ret.id);
      setSelectedReturn(detail || ret);
    } catch {
      setSelectedReturn(ret);
    }
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedReturnId(null);
    setSelectedReturn(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadKPIs();
    notify.success('Returns refreshed');
  }, [loadKPIs]);

  const handleStatusUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadKPIs();
    setShowDetail(false);
    setSelectedReturnId(null);
    setSelectedReturn(null);
  }, [loadKPIs]);

  // ── Table columns ───────────────────────────────────────────────────

  const columns: ColumnDef<ReturnRequest>[] = useMemo(() => [
    {
      id: 'serial',
      header: '#',
      meta: { width: '3%' },
      cell: ({ row, table }) => {
        const p = table.getState().pagination;
        return <span className="text-xs text-gray-500 dark:text-gray-400">{(p?.pageIndex || 0) * (p?.pageSize || 15) + row.index + 1}</span>;
      },
    },
    {
      accessorKey: 'return_number',
      header: 'Return #',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
        >
          {row.original.return_number}
        </button>
      ),
    },
    {
      accessorKey: 'order_number',
      header: 'Order',
      meta: { width: '9%' },
      cell: ({ row }) => (
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{row.original.order_number}</span>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      meta: { width: '13%' },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs text-gray-900 dark:text-gray-100">{row.original.customer_name}</span>
          <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{row.original.customer_email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{reasonLabels[row.original.reason] || row.original.reason}</span>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      meta: { width: '3%' },
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.items_count}</span>,
    },
    {
      accessorKey: 'refund_amount',
      header: 'Refund',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          ৳{row.original.refund_amount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const o = STATUS_OPTIONS.find(s => s.value === row.original.status);
        return <span className={`px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${o?.color || ''}`}>{o?.label || row.original.status}</span>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      meta: { width: '7%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400" title={row.original.created_at ? formatDate(row.original.created_at) : ''}>
          {row.original.created_at ? formatRelativeTime(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '4%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
          title="View details"
         aria-label="View details">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ], [handleView]);

  return (
    <div className="space-y-2">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Returns & Refunds
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <ReturnStatCards kpis={kpis} loading={kpiLoading} />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <ReturnFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {/* ── Return Table ────────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(params: any) => ecommerceReturnService.list({
          ...params,
          search: params.search || filterParams.search || undefined,
          filterParams,
        })}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search return #, order #, customer..."
        filterParams={filterParams}
      />

      {/* ── Return Detail Panel ─────────────────────────────────────── */}
      {showDetail && selectedReturn && (
        <ReturnDetailPanel
          returnReq={selectedReturn}
          onClose={handleCloseDetail}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
