'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, CheckCircle, Check, RefreshCw, AlertTriangle, Ban, Undo2, FileText, Receipt, ListChecks, Info } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm, info as notifyInfo } from '@/lib/notifications';
import { posRefundService } from '@/services';
import Swal from 'sweetalert2';
import type { PosRefund } from '@/services/posRefundService';
import type { PosOrderItemForRefund } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import Spinner from '@/components/ui/spinner';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api/axios';
import { PosRefundPrintMenu } from '@/components/print';
import { GiSave } from 'react-icons/gi';

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
  // F-8 FIX: backend settleRefundPayment accepts `check` and `other`
  // (used when the cashier pays the customer by cheque or an
  // unlisted method). The previous list missed them, so the
  // dropdown forced the cashier to leave the field empty and
  // re-enter a method on the settle dialog.
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
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
  return new Date(d).toLocaleDateString('en-GB');
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

  // Refs to the qty inputs so we can auto-focus the first one when
  // the form opens. Cashier should be able to start typing immediately,
  // and clicking an existing value should select-all so they can overwrite
  // it (e.g. default 5 → they want 1, just type 1 — no manual clearing).
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form fields
  const [tenantId, setTenantId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('return');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reasonDetails, setReasonDetails] = useState('');
  const [orderItems, setOrderItems] = useState<PosOrderItemForRefund[]>([]);
  const [refundLines, setRefundLines] = useState<RefundLine[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Auto-focus the first quantity input when refund lines first appear
  // (i.e. after the order's items have been loaded). Cashier can then
  // start typing or tab between lines without clicking first.
  useEffect(() => {
    if (refundLines.length > 0 && qtyInputRefs.current[0]) {
      // Defer to a microtask so the input is mounted before we focus.
      // The default value is `max_returnable`; selecting it lets the
      // cashier type a new value immediately, or hit Backspace to clear.
      const t = setTimeout(() => {
        qtyInputRefs.current[0]?.focus();
        qtyInputRefs.current[0]?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [refundLines.length]);

  // Settle
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTarget, setSettleTarget] = useState<PosRefund | null>(null);
  const [settleForm, setSettleForm] = useState({ action: 'collect', amount: '', payment_method: 'cash', notes: '' });
  const [settling, setSettling] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  // ── Dropdown loaders ──────────────────────────────────────────────────────

  const [soKey, setSoKey] = useState(0);
  const [soDefaultOpts, setSoDefaultOpts] = useState<{ value: string; label: string; raw: any }[]>([]);

  const fetchOrders = async (input: string, tid: string) => {
    try {
      const params: Record<string, any> = { per_page: input ? 20 : 6 };
      params.tenant_id = tid;
      if (input) params.search = input;
      const res = await apiClient.get('/api/v1/pos/orders', { params });
      const items = res.data?.data?.data ?? res.data?.data ?? [];
      return items.map((o: any) => ({
        value: o.id,
        label: o.invoice_number ?? o.order_number ?? `#${o.id}`,
        raw: o,
      }));
    } catch { return []; }
  };

  // When tenant changes, pre-fetch default options + force remount
  useEffect(() => {
    setSelectedOrder(null);
    setOrderItems([]);
    setRefundLines([]);
    if (!tenantId) {
      setSoDefaultOpts([]);
      return;
    }
    fetchOrders('', tenantId).then(setSoDefaultOpts);
    setSoKey(k => k + 1);
  }, [tenantId]);

  const loadOrderOptions = async (input: string) => {
    if (!tenantId) return [];
    return fetchOrders(input, tenantId);
  };

  // When order selected: load its items
  const handleOrderChange = async (opt: any) => {
    setSelectedOrder(opt);
    setRefundLines([]);
    setOrderItems([]);
    if (!opt?.value) return;
    setLoadingItems(true);
    try {
      // P0-6: ask the server for an authoritative snapshot of refunds-in-flight
      // so two concurrent cashiers can't both pass the local `max_returnable`
      // check and double-refund the same line. See getOrderItems() doc.
      const items = await posRefundService.getOrderItems(opt.value, { includeCurrentRefunds: true });
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

      // P0-6: surface a soft warning if the server reports in-flight refunds
      // on this order, so the cashier knows numbers may shift during their
      // session and to watch for the refresh hint on submit.
      const hasInFlight = arr.some(i => (i.current_pending_refunds ?? 0) > 0);
      if (hasInFlight) {
        notifyInfo(
          'Refunds in progress',
          'This order has refunds being processed. Available quantities may change — refresh before submitting.'
        );
      }
    } catch { notify.error('Failed to load order items'); }
    finally { setLoadingItems(false); }
  };

  // Clear the currently selected POS order and its loaded items.
  // Used by the inline Cancel button beside the order input so the
  // cashier can wipe a wrong selection without re-opening the form.
  const handleOrderClear = () => {
    setSelectedOrder(null);
    setOrderItems([]);
    setRefundLines([]);
    setErrors(prev => {
      const next = { ...prev };
      delete next.pos_order_id;
      // Drop any per-line errors from the previously-loaded order
      Object.keys(next).forEach(k => { if (k.startsWith('items.')) delete next[k]; });
      delete next.items;
      return next;
    });
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
    } catch (err: any) {
      // P0-6: another cashier approved/completed a refund on this order
      // between the moment we loaded the items and the moment we submitted.
      // The local `max_returnable` was stale; the server is the only
      // authority. Detect the race and offer a one-click refresh + retry.
      if (isReturnableRace(err)) {
        await handleReturnableRace(err);
        return;
      }
      handleError(err);
    } finally { setSubmitting(false); }
  };

  /**
   * P0-6: detect the server-side race-rejection shape. Backend is
   * expected to return a 422/409 with a message containing
   * "no longer returnable" (or one of the documented variants) and a
   * structured `errors.items.<idx>.qty` field. The exact wording is
   * documented in P0_correctness.md acceptance criteria; the check is
   * intentionally permissive so message tweaks don't silently bypass it.
   */
  const isReturnableRace = (err: any): boolean => {
    const data = err?.response?.data;
    if (!data) return false;
    const message = String(data.message ?? '').toLowerCase();
    if (message.includes('no longer returnable')) return true;
    if (message.includes('not returnable')) return true;
    if (message.includes('exceeds max')) return true;
    const errors = data.errors;
    if (errors && typeof errors === 'object') {
      const flat = JSON.stringify(errors).toLowerCase();
      if (flat.includes('max_returnable')) return true;
      if (flat.includes('returnable')) return true;
    }
    return false;
  };

  /**
   * P0-6: race-recovery. Re-fetch the order's items with the
   * authoritative `current_refunds` snapshot, update the lines, and
   * show a clear refresh-and-retry prompt. We don't auto-resubmit
   * because the cashier's qty choices may need to be re-made.
   */
  const handleReturnableRace = async (err: any) => {
    const serverMessage = String(err?.response?.data?.message ?? '');
    notify.warning(
      serverMessage ||
      'This item is no longer fully returnable — another refund was just recorded on this order.'
    );
    if (!selectedOrder?.value) return;
    try {
      const items = await posRefundService.getOrderItems(selectedOrder.value, { includeCurrentRefunds: true });
      const arr: PosOrderItemForRefund[] = Array.isArray(items) ? items : [];
      setOrderItems(arr);
      // Re-clamp each existing line to the new `max_returnable`. If the
      // server now reports `max_returnable === 0` for a line, drop it
      // — that quantity is gone and the cashier should re-pick.
      setRefundLines(prev => prev
        .map(l => {
          const fresh = arr.find(i => i.variation_id === l.variation_id);
          if (!fresh) return l;
          return {
            ...l,
            max_returnable: fresh.max_returnable,
            quantity: Math.min(Number(l.quantity) || 0, fresh.max_returnable),
          };
        })
        .filter(l => l.max_returnable > 0)
      );
    } catch {
      // If the re-fetch itself fails, the cashier still has the warning
      // banner and the form's local `max_returnable` values are now
      // potentially optimistic — they should re-select the order.
    }
  };

  const handleApprove = async (refund: PosRefund) => {
    const result = await confirm({
      title: 'Approve & Restock',
      html: `Approve refund <strong>${refund.refund_number}</strong> and restore stock immediately?`,
      confirmButtonText: 'Approve & Restock', cancelButtonText: 'Cancel', icon: 'question',
    });
    if (!result.isConfirmed) return;

    // P0-1: try the combined endpoint first (single backend transaction).
    // If the backend has not yet shipped it (404), fall back to the safe
    // two-call sequence with a partial-failure recovery path.
    try {
      try {
        await posRefundService.approveAndComplete(refund.id);
      } catch (combinedErr: any) {
        const status = combinedErr?.response?.status;
        if (status !== 404 && status !== 405) throw combinedErr; // unexpected — surface to outer catch
        await runSequentialApproveAndComplete(refund.id);
      }
      notify.success('Refund approved & stock restored');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      handleApproveFailure(refund, err);
    }
  };

  // P0-1: sequential fallback when the combined endpoint is unavailable.
  // If `complete` fails after `approve` succeeded, the row is left in
  // `approved` with stock unrestored — we must not claim success.
  const runSequentialApproveAndComplete = async (id: number | string) => {
    await posRefundService.approve(id);
    try {
      await posRefundService.complete(id);
    } catch (completeErr: any) {
      // Re-throw with context so the caller can show a non-green banner
      // and offer a "Retry Complete" action.
      const err: any = new Error('Approved but stock restoration failed');
      err.code = 'PARTIAL_APPROVE';
      err.cause = completeErr;
      throw err;
    }
  };

  // P0-1: best-effort recovery — used both after a partial failure and as
  // the explicit "Retry Complete" row action while the row is `approved`.
  const handleRetryComplete = async (refund: PosRefund) => {
    try {
      await posRefundService.complete(refund.id);
      notify.success('Refund completed — stock restored');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Stock restoration still failing — please contact support');
    }
  };

  const handleApproveFailure = (refund: PosRefund, err: any) => {
    if (err?.code === 'PARTIAL_APPROVE') {
      notify.warning(
        'Approved but stock restoration failed',
        `Refund ${refund.refund_number} was approved, but the stock-restock step failed. Use the "Retry Complete" action on the row to recover.`
      );
      // Surface the current state so the row's status flips to `approved`
      // and the Retry Complete button appears.
      setRefreshKey(k => k + 1);
      return;
    }
    notify.error(err?.response?.data?.message || err?.message || 'Failed to approve refund');
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

  // P0-3: cancel a pending or approved refund. Approved refunds get
  // a typed-confirmation dialog because the original review flagged
  // them as risky (approval may have triggered side effects in other
  // implementations). Pending refunds get a standard confirm.
  const handleCancelRefund = async (refund: PosRefund) => {
    if (refund.status === 'approved') {
      // Stronger prompt for approved — typed confirmation so a stray
      // double-click can't cancel it. The label is short and the
      // receiver is the refund number so the user can verify.
      const { value: confirmText } = await Swal.fire({
        title: 'Cancel approved refund?',
        html: `
          <div class="text-left text-sm space-y-2">
            <p>
              Refund <strong>${refund.refund_number}</strong> has been
              <strong>approved</strong>. Cancelling it abandons the
              refund — the stock and journal will not be applied
              (those only happen on <em>Complete</em>, which this
              action prevents).
            </p>
            <p class="text-gray-600">
              This is safe in the current build but is reserved for
              cases where the approval was made by mistake. If you
              really want to cancel an approved refund, type the
              refund number below to confirm.
            </p>
          </div>
        `,
        input: 'text',
        inputPlaceholder: refund.refund_number ?? '',
        inputAttributes: { 'aria-label': 'Type the refund number to confirm' },
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cancel refund',
        cancelButtonText: 'Keep refund',
        confirmButtonColor: '#dc2626',
        preConfirm: (v: string) => {
          if ((v ?? '').trim() !== (refund.refund_number ?? '').trim()) {
            Swal.showValidationMessage('Refund number does not match');
            return false;
          }
          return true;
        },
      });
      if (!confirmText) return;
    } else {
      // Pending: standard confirm. Same shape as the delete dialog.
      const result = await confirm({
        title: 'Cancel refund',
        html: `Cancel pending refund <strong>${refund.refund_number}</strong>? The row will be kept for audit but the refund will not proceed.`,
        confirmButtonText: 'Cancel refund', cancelButtonText: 'Keep', icon: 'warning',
      });
      if (!result.isConfirmed) return;
    }

    try {
      await posRefundService.cancel(refund.id);
      notify.success('Refund cancelled');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to cancel refund');
    }
  };

  // P0-4: open the settle dialog with a fresh server read of the
  // refund. The list row omits `pos_order.paid_amount` updates
  // from any settlements that just happened, so using it directly
  // makes the cashier see a stale balance (e.g. they just settled
  // and reopened — old row still shows the pre-settle balance).
  // The pattern matches sales-returns: open the dialog immediately
  // with a loading state, then replace settleTarget with the fresh
  // row from show() once it lands.
  const openSettle = async (refund: PosRefund) => {
    setSettleLoading(true);
    setShowSettleDialog(true);
    try {
      const full = await posRefundService.show(refund.id);
      const target = full ?? refund;
      const po = (target as any).pos_order ?? (refund as any).pos_order;
      const grandTotal = Number(po?.grand_total ?? 0);
      const returnedAmount = Number(po?.returned_amount ?? 0);
      const paidAmount = Number(po?.paid_amount ?? 0);
      const effectiveTotal = Math.max(0, grandTotal - returnedAmount);
      const balance = effectiveTotal - paidAmount;

      setSettleTarget(target);
      setSettleForm({
        action: balance >= 0 ? 'collect' : 'refund',
        amount: Math.abs(balance).toFixed(2),
        payment_method: 'cash',
        notes: '',
      });
    } catch (err: any) {
      setShowSettleDialog(false);
      notify.error(err?.response?.data?.message || 'Failed to load settlement details');
    } finally {
      setSettleLoading(false);
    }
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
            {r.status === 'approved' && (
              <button onClick={() => handleRetryComplete(r)} title="Retry stock restoration"
                aria-label="Retry stock restoration for refund"
                className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {r.status === 'completed' && (
              <PosRefundPrintMenu refundDoc={r} />
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
            {(r.status === 'pending' || r.status === 'approved') && (
              <button onClick={() => handleCancelRefund(r)}
                title={r.status === 'approved' ? 'Cancel approved refund (typed confirmation)' : 'Cancel pending refund'}
                aria-label={`Cancel refund ${r.refund_number}`}
                className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer">
                <Ban className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  // Inputs/selects/textarea — match the tenant-registration form style: tight,
  // rounded-sm, indigo focus border. Mirrors the rest of the app's register
  // pages so cashiers get a consistent feel across modules.
  const inputCls =
    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 ' +
    'rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 ' +
    'dark:focus:border-indigo-400 transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2';
  const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400';
  // Section header — same icon+label pattern as the POS Orders filter card
  // so the form feels native to the rest of the project.
  const sectionCls =
    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ' +
    'flex items-center gap-1.5 mt-4 mb-2';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Undo2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> POS Refunds
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Refund
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          {/* Form header — flat, matches tenant registration card style */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Create Refund
            </h2>
            <button
              onClick={handleCancel}
              aria-label="Close create refund form"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
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
            <p className={sectionCls}><Receipt className="w-3.5 h-3.5" /> POS Order</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className={labelCls}>POS Order <span className="text-red-500">*</span></label>
                <div className="flex items-end gap-2">
                  <div className="w-1/2">
                    <CustomSelect
                      key={`pos-so-${soKey}`}
                      value={selectedOrder}
                      onChange={handleOrderChange}
                      loadOptions={loadOrderOptions}
                      defaultOptions={soDefaultOpts}
                      placeholder="Search by order / invoice #…"
                      className="text-sm"
                    />
                    {errors.pos_order_id && <p className={errCls}>{errors.pos_order_id}</p>}
                  </div>
                  {/* P0-6: manual refresh of the order items. The cashier
                      can re-pull a fresh server snapshot of in-flight
                      refunds before submitting. Same code path as
                      selecting the order again. */}
                  {selectedOrder?.value && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOrderChange(selectedOrder)}
                        disabled={loadingItems}
                        title="Re-check available quantities"
                        aria-label="Re-check available quantities"
                        className="inline-flex items-center justify-center gap-2 h-[34px] px-2 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${loadingItems ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">Refresh</span>
                      </button>
                      {/* Cancel selection: wipes the chosen order and any
                          loaded items/lines so the cashier can re-pick
                          without closing the whole form. Same gray style
                          as the bottom-of-form Cancel button. */}
                      <button
                        type="button"
                        onClick={handleOrderClear}
                        title="Clear order selection"
                        aria-label="Clear order selection"
                        className="inline-flex items-center justify-center gap-2 h-[34px] px-2 rounded-sm bg-gray-500 text-white text-sm font-medium hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Items to Refund ── */}
            {(loadingItems || refundLines.length > 0) && (
              <>
                <p className={sectionCls}><ListChecks className="w-3.5 h-3.5" /> Items to Refund</p>
                {/* P0-6: persistent in-flight refunds warning. Shown when
                    the server reports `current_pending_refunds > 0` on
                    any line. Stays visible while the cashier composes
                    the form so they know numbers may shift. */}
                {orderItems.some(i => (i.current_pending_refunds ?? 0) > 0) && (
                  <div
                    className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs"
                    role="status"
                    aria-live="polite"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-semibold">Refunds in progress:</strong>{' '}
                      Another cashier is processing a refund on this order. Available
                      quantities may change — re-select the order to refresh before submitting.
                    </div>
                  </div>
                )}
                {/* Caution: the cashier is about to refund these items.
                    Restock happens on completion (P0-1) but the user
                    should double-check qty before submitting. */}
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-semibold">Caution:</strong>{' '}
                    The items shown on this page will be refunded once you submit. Please verify the
                    quantities carefully before confirming — refunds restore stock to inventory and
                    cannot be easily undone.
                  </div>
                </div>
                {loadingItems ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    <Spinner size="sm" className="mr-2" />
                    Loading order items…
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="text-left px-3 py-2 font-semibold">Item</th>
                          <th className="text-center px-3 py-2 font-semibold w-40">Max Returnable</th>
                          <th className="text-center px-3 py-2 font-semibold w-28">Refund Qty <span className="text-red-200">*</span></th>
                          <th className="text-right px-3 py-2 font-semibold w-24">Unit Price</th>
                          <th className="text-right px-3 py-2 font-semibold w-24">Line Total</th>
                          <th className="px-3 py-2 font-semibold w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundLines.map((line, i) => (
                          <tr key={`${line.variation_id}-${i}`} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50/50 dark:bg-gray-700/30'}>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">{line.item_name}</td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-center text-gray-500">
                              {line.max_returnable}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                              <input
                                ref={el => { qtyInputRefs.current[i] = el; }}
                                type="number" step="0.001" min="0" max={line.max_returnable}
                                value={line.quantity}
                                onFocus={e => e.target.select()}
                                onChange={e => updateLine(i, Number(e.target.value))}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                                className={`${inputCls} text-center`}
                              />
                              {errors[`items.${i}.qty`] && <p className={errCls}>{errors[`items.${i}.qty`]}</p>}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-right font-mono">
                              {Number(line.unit_price).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-right font-mono font-semibold">
                              {(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-center">
                              <button type="button" onClick={() => removeLine(i)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1 cursor-pointer"
                                title="Remove line"
                                aria-label="Remove refund line">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                          <td colSpan={4} className="px-3 py-2 text-right text-xs border-t border-gray-200 dark:border-gray-600">
                            Refund Total
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sm border-t border-gray-200 dark:border-gray-600 text-blue-700 dark:text-blue-300">
                            {totalRefund.toFixed(2)}
                          </td>
                          <td className="border-t border-gray-200 dark:border-gray-600"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {errors.items && <p className={errCls}>{errors.items}</p>}
              </>
            )}

            {/* ── Refund Details ── */}
            <p className={sectionCls}><Info className="w-3.5 h-3.5" /> Refund Details</p>
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
                <textarea rows={1} value={reasonDetails} onChange={e => setReasonDetails(e.target.value)}
                  className={inputCls} placeholder="Additional details…" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3">
              <button type="submit" disabled={submitting}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                <GiSave className="w-4 h-4" />
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
              <div className="bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-xl flex items-center justify-between text-white">
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
                        max={Math.abs(balance) || undefined}
                        value={settleForm.amount}
                        onChange={e => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                        className={inputCls} />
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Max: ৳{(Math.abs(balance) || 0).toFixed(2)}
                        {settleLoading ? ' · loading fresh balance…' : ''}
                      </p>
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
                {balance !== 0 && (() => {
                  // P0-5: cap client-side. The input has max={abs(balance)}
                  // but the user can still type something out of range if
                  // they paste a larger number. Disable submit when the
                  // typed amount is invalid, missing, or zero.
                  const amt = Number(settleForm.amount);
                  const outOfRange = !settleForm.amount || !Number.isFinite(amt) || amt <= 0 || amt > Math.abs(balance);
                  return (
                    <button onClick={handleSettleSubmit}
                      disabled={settling || settleLoading || outOfRange}
                      className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-sm font-medium transition-colors">
                      {settling ? 'Processing…' : settleForm.action === 'refund' ? 'Issue Refund' : 'Record Payment'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
