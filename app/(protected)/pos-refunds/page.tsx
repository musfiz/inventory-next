'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, CheckCircle, Check, Printer } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posRefundService } from '@/services';
import type { PosRefund } from '@/services/posRefundService';
import type { PosOrderItemForRefund, PosRefundItem } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api/axios';
import { PosRefundCreditNote } from '@/components/invoices/CreditNote';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  { value: 'return', label: 'Return' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'customer_dissatisfaction', label: 'Customer Dissatisfaction' },
  { value: 'expired', label: 'Expired' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'other', label: 'Other' },
];

const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'exchange', label: 'Exchange' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
    completed: 'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200',
    rejected: 'bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-200',
    cancelled: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>{status ?? '-'}</span>;
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function fmtNum(n?: string | number | null) {
  if (n === null || n === undefined || n === '') return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reasonLabel(v?: string) {
  return REFUND_REASONS.find(r => r.value === v)?.label ?? v ?? '-';
}

function methodLabel(v?: string) {
  return REFUND_METHODS.find(r => r.value === v)?.label ?? v ?? '-';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RefundLine {
  variation_id: number;
  quantity: number;
  max_returnable: number;
  item_name: string;
  unit_price: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosRefundsPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-pos-refund')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const authUser = useAuthStore(s => s.user);

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [tenantId, setTenantId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('return');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reasonDetails, setReasonDetails] = useState('');
  const [orderItems, setOrderItems] = useState<PosOrderItemForRefund[]>([]);
  const [refundLines, setRefundLines] = useState<RefundLine[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Print
  const [printRefund, setPrintRefund] = useState<PosRefund | null>(null);
  const [printItems, setPrintItems] = useState<Array<{ item_name: string; item_code?: string; quantity: number; unit_price: number; variation?: { sku?: string; name?: string } }>>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Settle
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTarget, setSettleTarget] = useState<PosRefund | null>(null);
  const [settleForm, setSettleForm] = useState({ action: 'collect', amount: '', payment_method: 'cash', notes: '' });
  const [settling, setSettling] = useState(false);

  // ── Dropdown loaders ──────────────────────────────────────────────────────

  const loadOrderOptions = async (input: string) => {
    try {
      const res = await apiClient.get('/api/v1/pos/orders', { params: { search: input, per_page: input ? 20 : 10 } });
      const items = res.data?.data?.data ?? res.data?.data ?? [];
      return items.map((o: any) => ({
        value: o.id,
        label: o.invoice_number ?? o.order_number ?? `#${o.id}`,
      }));
    } catch { return []; }
  };

  // When order selected: load its items
  const handleOrderChange = async (opt: any) => {
    setSelectedOrder(opt);
    setRefundLines([]);
    setOrderItems([]);
    if (!opt?.value) return;
    setLoadingItems(true);
    try {
      const items = await posRefundService.getOrderItems(opt.value);
      const arr: PosOrderItemForRefund[] = Array.isArray(items) ? items : [];
      setOrderItems(arr);
      const lines: RefundLine[] = arr
        .filter(i => i.max_returnable > 0)
        .map(i => ({
          variation_id: i.variation_id,
          quantity: i.max_returnable,
          max_returnable: i.max_returnable,
          item_name: i.item_name,
          unit_price: i.unit_price,
        }));
      setRefundLines(lines);
    } catch { notify.error('Failed to load order items'); }
    finally { setLoadingItems(false); }
  };

  const updateLine = (idx: number, quantity: number) => {
    setRefundLines(lines => lines.map((l, i) => i === idx ? { ...l, quantity } : l));
  };

  const removeLine = (idx: number) => {
    setRefundLines(lines => lines.filter((_, i) => i !== idx));
  };

  const totalRefund = refundLines.reduce(
    (sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0
  );

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !tenantId) errs.tenant_id = 'Tenant is required';
    if (!selectedOrder?.value) errs.pos_order_id = 'POS order is required';
    if (!refundReason) errs.refund_reason = 'Refund reason is required';
    if (!refundMethod) errs.refund_method = 'Refund method is required';
    if (refundLines.length === 0) errs.items = 'Add at least one item to refund';
    refundLines.forEach((line, i) => {
      if (!line.quantity || Number(line.quantity) <= 0)
        errs[`items.${i}.qty`] = 'Qty must be > 0';
      if (Number(line.quantity) > line.max_returnable)
        errs[`items.${i}.qty`] = `Max returnable: ${line.max_returnable}`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setTenantId(isSuperAdmin ? '' : (authUser?.tenant_id ?? ''));
    setSelectedOrder(null);
    setRefundReason('return');
    setRefundMethod('cash');
    setReasonDetails('');
    setOrderItems([]);
    setRefundLines([]);
    setErrors({});
  };

  const handleAdd = () => { resetForm(); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setErrors({}); };

  const handleError = (err: any) => {
    const msg = err?.response?.data?.message || err?.response?.data?.errors;
    if (typeof msg === 'object') {
      const flat: Record<string, string> = {};
      Object.entries(msg).forEach(([k, v]) => { flat[k] = Array.isArray(v) ? v[0] as string : String(v); });
      setErrors(flat);
    } else { notify.error(String(msg || 'An error occurred')); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await posRefundService.quickCreate({
        pos_order_id: selectedOrder!.value,
        refund_reason: refundReason,
        refund_method: refundMethod,
        reason_details: reasonDetails || undefined,
        tenant_id: isSuperAdmin ? tenantId : undefined,
        items: refundLines.map(l => ({ variation_id: l.variation_id, quantity: Number(l.quantity) })),
      });
      notify.success('Refund created successfully');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Approve & Restock',
      html: `Approve refund <strong>${refund.refund_number}</strong> and restore stock immediately?`,
      confirmButtonText: 'Approve & Restock', cancelButtonText: 'Cancel', icon: 'question',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.approve(refund.id);
      await posRefundService.complete(refund.id);
      notify.success('Refund approved & stock restored');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to approve refund'); }
  };

  const handleComplete = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Complete Refund',
      html: `Mark refund <strong>${refund.refund_number}</strong> as completed? Stock will be restored.`,
      confirmButtonText: 'Complete & Restock', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.complete(refund.id);
      notify.success('Refund completed — stock restored');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to complete'); }
  };

  const handleDelete = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Delete Refund',
      html: `Delete refund <strong>${refund.refund_number}</strong>? This cannot be undone.`,
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.destroy(refund.id);
      notify.success('Refund deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to delete'); }
  };

  const handlePrint = async (refund: PosRefund) => {
    try {
      const full = await posRefundService.show(refund.id);
      if (!full) return;
      const items = (full.items ?? []).map((item: PosRefundItem) => ({
        item_name: (item.product as any)?.name ?? `Product #${item.product_id}`,
        item_code: undefined,
        quantity: Number(item.quantity_returned),
        unit_price: Number(item.unit_price),
        variation: item.variation ?? undefined,
      }));
      setPrintRefund(full);
      setPrintItems(items);
      setTimeout(() => {
        if (printRef.current) {
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(`<html><head><title>Credit Note</title>
              <style>body{font-family:sans-serif;margin:0;padding:16px}@media print{body{padding:0}}</style>
              </head><body>${printRef.current.innerHTML}</body></html>`);
            win.document.close();
            win.focus();
            win.print();
            win.close();
          }
        }
      }, 150);
    } catch { notify.error('Failed to load refund details'); }
  };

  const openSettle = (refund: PosRefund) => {
    const po = refund.pos_order as any;
    const grandTotal = Number(po?.grand_total ?? 0);
    const returnedAmount = Number(po?.returned_amount ?? 0);
    const paidAmount = Number(po?.paid_amount ?? 0);
    const effectiveTotal = Math.max(0, grandTotal - returnedAmount);
    const balance = effectiveTotal - paidAmount;
    setSettleTarget(refund);
    setSettleForm({
      action: balance >= 0 ? 'collect' : 'refund',
      amount: Math.abs(balance).toFixed(2),
      payment_method: 'cash',
      notes: '',
    });
    setShowSettleDialog(true);
  };

  const handleSettleSubmit = async () => {
    if (!settleTarget) return;
    setSettling(true);
    try {
      await posRefundService.settlePayment(settleTarget.id, {
        action: settleForm.action,
        amount: settleForm.amount,
        payment_method: settleForm.payment_method,
        notes: settleForm.notes || undefined,
      });
      notify.success(settleForm.action === 'refund' ? 'Refund issued successfully' : 'Payment recorded successfully');
      setShowSettleDialog(false);
      setSettleTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to settle payment');
    } finally {
      setSettling(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<PosRefund>[] = [
    {
      id: 'serial', header: 'SL',
      cell: ({ row, table }) => table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
    },
    {
      accessorKey: 'refund_number', header: 'Refund #',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.refund_number ?? '-'}</span>,
    },
    {
      accessorKey: 'pos_order_id', header: 'POS Order',
      cell: ({ row }) => (
        <span className="text-xs">{(row.original as any).pos_order?.invoice_number ?? (row.original as any).pos_order?.order_number ?? row.original.pos_order_id ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'refund_date', header: 'Refund Date',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.refund_date)}</span>,
    },
    {
      accessorKey: 'refund_reason', header: 'Reason',
      cell: ({ row }) => <span className="text-xs">{reasonLabel(row.original.refund_reason)}</span>,
    },
    {
      accessorKey: 'total_refund_amount', header: 'Amount',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{fmtNum(row.original.total_refund_amount)}</span>,
    },
    {
      accessorKey: 'refund_method', header: 'Method',
      cell: ({ row }) => <span className="text-xs">{methodLabel(row.original.refund_method)}</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'approved_by', header: 'Approved By',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).approved_by_user?.name ?? '-'}</span>,
    },
    {
      accessorKey: 'completed_at', header: 'Completed At',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.completed_at)}</span>,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            {r.status === 'pending' && (
              <button onClick={() => handleApprove(r)} title="Approve"
                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {r.status === 'approved' && (
              <button onClick={() => handleComplete(r)} title="Complete & Restock"
                className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer">
                <Check className="w-4 h-4" />
              </button>
            )}
            {r.status === 'completed' && (
              <button onClick={() => handlePrint(r)} title="Print Credit Note"
                className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer">
                <Printer className="w-4 h-4" />
              </button>
            )}
            {r.status === 'completed' && (
              <button onClick={() => openSettle(r)} title="Settle Payment"
                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                  <path d="M9 15l2 2 4-4" />
                </svg>
              </button>
            )}
            {r.status === 'pending' && (
              <button onClick={() => handleDelete(r)} title="Delete"
                className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputCls = 'w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5';
  const errCls = 'text-xs text-red-500 mt-0.5';
  const sectionCls = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 pb-1 mb-2 mt-3';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Hidden print area */}
      <div ref={printRef} style={{ display: 'none' }}>
        {printRefund && <PosRefundCreditNote refund={printRefund} items={printItems} />}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Refunds</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Refund
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Create POS Refund
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">

            {/* ── Tenant Selection - Only for Super Admin ── */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Tenant <span className="text-red-500">*</span></label>
                  <TenantSelect
                    value={tenantId}
                    onChange={(tid) => setTenantId(tid || '')}
                    placeholder="Select tenant"
                    isInvalid={!!errors.tenant_id}
                  />
                  {errors.tenant_id && <p className={errCls}>{errors.tenant_id}</p>}
                </div>
              </div>
            )}

            {/* ── Order Selection ── */}
            <p className={sectionCls}>Original POS Order</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className={labelCls}>POS Order <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={selectedOrder}
                  onChange={handleOrderChange}
                  loadOptions={loadOrderOptions}
                  defaultOptions={true}
                  placeholder="Search by order / invoice #…"
                  className="text-sm"
                />
                {errors.pos_order_id && <p className={errCls}>{errors.pos_order_id}</p>}
              </div>
            </div>

            {/* ── Items to Refund ── */}
            {(loadingItems || refundLines.length > 0) && (
              <>
                <p className={sectionCls}>Items to Refund</p>
                {loadingItems ? (
                  <p className="text-sm text-gray-500 py-2">Loading order items…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="text-left px-2 py-1.5 border border-gray-200 dark:border-gray-600">Item</th>
                          <th className="text-center px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-24">Max Returnable</th>
                          <th className="text-center px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-28">Refund Qty <span className="text-red-500">*</span></th>
                          <th className="text-right px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-24">Unit Price</th>
                          <th className="text-right px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-24">Line Total</th>
                          <th className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundLines.map((line, i) => (
                          <tr key={`${line.variation_id}-${i}`} className="even:bg-gray-50 dark:even:bg-gray-700/40">
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">{line.item_name}</td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-500">
                              {line.max_returnable}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                              <input
                                type="number" step="0.001" min="0" max={line.max_returnable}
                                value={line.quantity}
                                onChange={e => updateLine(i, Number(e.target.value))}
                                className={`${inputCls} text-center`}
                              />
                              {errors[`items.${i}.qty`] && <p className={errCls}>{errors[`items.${i}.qty`]}</p>}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-right font-mono">
                              {Number(line.unit_price).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-right font-mono font-semibold">
                              {(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                              <button type="button" onClick={() => removeLine(i)}
                                className="text-red-500 hover:text-red-700 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                          <td colSpan={4} className="px-2 py-1.5 text-right text-xs border border-gray-200 dark:border-gray-600">
                            Refund Total
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-sm border border-gray-200 dark:border-gray-600">
                            {totalRefund.toFixed(2)}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-600"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {errors.items && <p className={errCls}>{errors.items}</p>}
              </>
            )}

            {/* ── Refund Details ── */}
            <p className={sectionCls}>Refund Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>Refund Reason <span className="text-red-500">*</span></label>
                <select value={refundReason} onChange={e => setRefundReason(e.target.value)} className={inputCls}>
                  {REFUND_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.refund_reason && <p className={errCls}>{errors.refund_reason}</p>}
              </div>

              <div>
                <label className={labelCls}>Refund Method <span className="text-red-500">*</span></label>
                <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className={inputCls}>
                  {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {errors.refund_method && <p className={errCls}>{errors.refund_method}</p>}
              </div>

              <div>
                <label className={labelCls}>Reason Details</label>
                <textarea rows={2} value={reasonDetails} onChange={e => setReasonDetails(e.target.value)}
                  className={inputCls} placeholder="Additional details…" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60">
                {submitting ? 'Saving…' : 'Submit Refund'}
              </button>
              <button type="button" onClick={handleCancel}
                className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint="pos/refunds"
        pageSize={15}
        enableSearch
        searchPlaceholder="Search refunds…"
      />

      {/* Settle Payment Dialog */}
      {showSettleDialog && settleTarget && (() => {
        const po = settleTarget.pos_order as any;
        const grandTotal = Number(po?.grand_total ?? 0);
        const returnedAmount = Number(po?.returned_amount ?? 0);
        const paidAmount = Number(po?.paid_amount ?? 0);
        const effectiveTotal = Math.max(0, grandTotal - returnedAmount);
        const balance = effectiveTotal - paidAmount;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-xl flex items-center justify-between text-white">
                <div>
                  <h2 className="font-bold text-lg">Settle Payment</h2>
                  <p className="text-sm opacity-80">{settleTarget.refund_number} · {po?.invoice_number ?? po?.order_number ?? '-'}</p>
                </div>
                <button onClick={() => setShowSettleDialog(false)}
                  className="rounded-full p-1 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary cards */}
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Order Total</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtNum(grandTotal)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Refunded</p>
                    <p className="font-semibold text-orange-600">{fmtNum(returnedAmount)}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Net Order</p>
                    <p className="font-semibold text-indigo-600">{fmtNum(effectiveTotal)}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Paid</p>
                    <p className="font-semibold text-emerald-600">{fmtNum(paidAmount)}</p>
                  </div>
                </div>

                {/* Balance banner */}
                <div className={`rounded-lg p-3 text-center ${balance === 0
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                    : balance > 0
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                  }`}>
                  {balance === 0 ? (
                    <p className="font-semibold text-sm">Order is fully settled — no action needed</p>
                  ) : (
                    <>
                      <p className="text-xs mb-0.5">{balance > 0 ? 'Customer still owes' : 'Refund due to customer'}</p>
                      <p className="font-bold text-xl">{fmtNum(Math.abs(balance))}</p>
                    </>
                  )}
                </div>

                {/* Settlement form */}
                {balance !== 0 && (
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Action</label>
                      <select value={settleForm.action}
                        onChange={e => setSettleForm(f => ({ ...f, action: e.target.value }))}
                        className={inputCls}>
                        <option value="collect">Collect Payment from Customer</option>
                        <option value="refund">Issue Refund to Customer</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Amount</label>
                      <input type="number" step="0.01" min="0.01"
                        value={settleForm.amount}
                        onChange={e => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Payment Method</label>
                      <select value={settleForm.payment_method}
                        onChange={e => setSettleForm(f => ({ ...f, payment_method: e.target.value }))}
                        className={inputCls}>
                        {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="text" value={settleForm.notes}
                        onChange={e => setSettleForm(f => ({ ...f, notes: e.target.value }))}
                        className={inputCls} placeholder="e.g. Refunded via cash" />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex justify-end gap-2">
                <button onClick={() => setShowSettleDialog(false)}
                  className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {balance === 0 ? 'Close' : 'Cancel'}
                </button>
                {balance !== 0 && (
                  <button onClick={handleSettleSubmit} disabled={settling}
                    className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-sm font-medium transition-colors">
                    {settling ? 'Processing…' : settleForm.action === 'refund' ? 'Issue Refund' : 'Record Payment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
