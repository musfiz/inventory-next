'use client';

import { useEffect, useState } from 'react';
import { Plus, X, CheckCircle, Check, Ban, AlertTriangle, Undo2, FileText, Receipt, ListChecks, Info, Eye } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { salesReturnService, salesOrderService } from '@/services';
import type { SalesReturn, SalesReturnReason, SalesReturnRefundMethod } from '@/types/api.types';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api/axios';
import { SalesReturnPrintMenu } from '@/components/print/SalesReturnPrintMenu';

// ─── Constants ────────────────────────────────────────────────────────────────

const RETURN_REASONS: { value: SalesReturnReason; label: string }[] = [
  { value: 'defective', label: 'Defective' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'damaged_in_transit', label: 'Damaged in Transit' },
  { value: 'customer_changed_mind', label: 'Customer Changed Mind' },
  { value: 'overcharged', label: 'Overcharged' },
  { value: 'other', label: 'Other' },
];

const REFUND_METHODS: { value: SalesReturnRefundMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'exchange', label: 'Exchange' },
  // F-9 FIX: backend settleReturnPayment accepts `check` and
  // `other` (used when the cashier pays the customer by cheque
  // or an unlisted method).
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
    completed: 'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200',
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
  return RETURN_REASONS.find(r => r.value === v)?.label ?? v ?? '-';
}

function methodLabel(v?: string) {
  return REFUND_METHODS.find(r => r.value === v)?.label ?? v ?? '-';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  item_name: string;
  item_code?: string;
  quantity: number;
  quantity_returned?: number;
  unit_price: number;
  product_id?: number;
  variation_id?: number;
  product?: { name: string };
  variation?: { name?: string; sku?: string };
  batch_id?: number;
}

interface ReturnLineItem {
  sales_order_item_id: number;
  quantity_returned: number;
  unit_price: number;
  condition: string;
  reason: string;
  // display only
  item_name: string;
  max_returnable: number;
}

interface ReturnForm {
  id: string;
  tenant_id: string;
  sales_order_id: string;
  reason: string;
  notes: string;
  refund_method: string;
}

const emptyForm = (): ReturnForm => ({
  id: '', tenant_id: '', sales_order_id: '',
  reason: 'defective', notes: '', refund_method: 'cash',
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesReturnsPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-sales-return') && !hasPermission('view-sales')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const authUser = useAuthStore(s => s.user);

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ReturnForm>(emptyForm());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [returnLines, setReturnLines] = useState<ReturnLineItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Details dialog
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<SalesReturn | null>(null);

  // Settle payment dialog
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTarget, setSettleTarget] = useState<SalesReturn | null>(null);
  const [settleForm, setSettleForm] = useState({ action: 'collect', amount: '', payment_method: 'cash', notes: '' });
  const [settleLoading, setSettleLoading] = useState(false);
  const [settling, setSettling] = useState(false);

  const sf = (field: keyof ReturnForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const getReturnBalance = (ret: SalesReturn) => {
    const refundAmount = Number(ret.refund_amount ?? 0);
    const settlements = ((ret as any).settlement_payments ?? []) as Array<any>;
    const alreadySettled = settlements.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
    return {
      refundAmount,
      alreadySettled,
      balance: refundAmount - alreadySettled,
    };
  };

  // ── Sales order dropdown ─────────────────────────────────────────────────

  const [soKey, setSoKey] = useState(0);
  const [soDefaultOpts, setSoDefaultOpts] = useState<{ value: string; label: string; raw: any }[]>([]);

  const fetchOrders = async (input: string, tenantId: string) => {
    try {
      const params: Record<string, any> = {
        per_page: input ? 20 : 6,
        status: 'delivered,returned,confirmed,processing,ready,shipped,cancelled',
      };
      params.tenant_id = tenantId;
      if (input) params.search = input;
      const res = await apiClient.get('/api/v1/sales-order', { params });
      const items = res.data?.data ?? [];
      return items.map((o: any) => ({
        value: o.id,
        label: `${o.invoice_number ?? o.order_number} — ${o.customer?.name ?? 'Walk-in'}`,
        raw: o,
      }));
    } catch (e) {
      console.error('fetchOrders error', e);
      return [];
    }
  };

  // When tenant changes, pre-fetch default options + force remount
  useEffect(() => {
    setSelectedOrder(null);
    setReturnLines([]);
    setOrderItems([]);
    setForm(f => ({ ...f, sales_order_id: '' }));
    if (!form.tenant_id) {
      setSoDefaultOpts([]);
      return;
    }
    fetchOrders('', form.tenant_id).then(setSoDefaultOpts);
    setSoKey(k => k + 1);
  }, [form.tenant_id]);

  const loadOrderOptions = async (input: string) => {
    if (!form.tenant_id) return [];
    return fetchOrders(input, form.tenant_id);
  };

  // When order is selected: fetch its items
  const handleOrderChange = async (opt: any) => {
    setSelectedOrder(opt);
    setForm(f => ({ ...f, sales_order_id: opt?.value ?? '' }));
    setReturnLines([]);
    setOrderItems([]);
    if (!opt?.value) return;
    setLoadingItems(true);
    try {
      const items = await salesOrderService.getSalesOrderItems(String(opt.value));
      const itemArr: OrderItem[] = Array.isArray(items) ? items : [];
      setOrderItems(itemArr);
      // Pre-build return lines for items that still have returnable qty
      const lines: ReturnLineItem[] = itemArr
        .map(item => {
          const alreadyReturned = Number(item.quantity_returned ?? 0);
          const max = Number(item.quantity) - alreadyReturned;
          return {
            sales_order_item_id: item.id,
            quantity_returned: max > 0 ? max : 0,
            unit_price: Number(item.unit_price),
            condition: 'good',
            reason: '',
            item_name: (item.product?.name
              ? `${item.product.name}${item.variation?.name ? ` - ${item.variation.name}` : ''}`
              : item.item_name) || '-',
            max_returnable: max,
          };
        })
        .filter(l => l.max_returnable > 0);
      setReturnLines(lines);
    } catch {
      notify.error('Failed to load order items');
    } finally {
      setLoadingItems(false);
    }
  };

  // ── Line item updaters ────────────────────────────────────────────────────

  const updateLine = (id: number, field: keyof ReturnLineItem, value: any) => {
    setReturnLines(lines => lines.map(l => l.sales_order_item_id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: number) => {
    setReturnLines(lines => lines.filter(l => l.sales_order_item_id !== id));
    // Clear all item-level errors to prevent stale messages appearing on shifted rows
    setErrors(prev => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith('items.')) next[k] = v;
      });
      return next;
    });
  };

  const totalRefund = returnLines.reduce(
    (sum, l) => sum + Number(l.quantity_returned) * Number(l.unit_price), 0
  );

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !form.id && !form.tenant_id) errs.tenant_id = 'Tenant is required';
    if (!form.sales_order_id) errs.sales_order_id = 'Sales order is required';
    if (!form.reason) errs.reason = 'Return reason is required';
    if (!form.refund_method) errs.refund_method = 'Refund method is required';
    if (returnLines.length === 0) errs.items = 'Add at least one item to return';
    returnLines.forEach((line, i) => {
      if (!line.quantity_returned || Number(line.quantity_returned) <= 0) {
        errs[`items.${i}.qty`] = 'Qty must be > 0';
      }
      if (Number(line.quantity_returned) > line.max_returnable) {
        errs[`items.${i}.qty`] = `Max returnable is ${line.max_returnable}`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setForm({ ...emptyForm(), tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ?? '') });
    setSelectedOrder(null);
    setOrderItems([]);
    setReturnLines([]);
    setErrors({});
    setShowForm(true);
  };

  const handleEdit = async (ret: SalesReturn) => {
    setForm({
      id: String(ret.id),
      tenant_id: String(ret.tenant_id ?? ''),
      sales_order_id: String(ret.sales_order_id),
      reason: ret.reason ?? 'defective',
      notes: ret.notes ?? '',
      refund_method: ret.refund_method ?? 'cash',
    });
    setSelectedOrder(ret.sales_order
      ? { value: ret.sales_order.id, label: ret.sales_order.invoice_number }
      : null
    );
    // Load items for editing
    setLoadingItems(true);
    try {
      const items = await salesOrderService.getSalesOrderItems(String(ret.sales_order_id));
      const itemArr: OrderItem[] = Array.isArray(items) ? items : [];
      setOrderItems(itemArr);
      // Build return lines from existing return items
      const lines: ReturnLineItem[] = (ret.items ?? []).map(ri => {
        const orderItem = itemArr.find(oi => oi.id === ri.sales_order_item_id);
        const soldQty = Number(orderItem?.quantity ?? ri.quantity_returned);
        return {
          sales_order_item_id: ri.sales_order_item_id,
          quantity_returned: Number(ri.quantity_returned),
          unit_price: Number(ri.unit_price),
          condition: ri.condition ?? 'good',
          reason: ri.reason ?? '',
          item_name: (orderItem?.product?.name
            ? `${orderItem.product.name}${orderItem.variation?.name ? ` - ${orderItem.variation.name}` : ''}`
            : (ri.product?.name ?? orderItem?.item_name ?? '-')),
          max_returnable: soldQty,
        };
      });
      setReturnLines(lines);
    } catch {
      notify.error('Failed to load order items');
    } finally {
      setLoadingItems(false);
    }
    setErrors({});
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setErrors({}); };

  const handleError = (err: any) => {
    const msg = err?.response?.data?.message || err?.response?.data?.errors;
    if (typeof msg === 'object') {
      const flat: Record<string, string> = {};
      Object.entries(msg).forEach(([k, v]) => { flat[k] = Array.isArray(v) ? v[0] as string : String(v); });
      setErrors(flat);
    } else {
      notify.error(String(msg || 'An error occurred'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        sales_order_id: form.sales_order_id,
        reason: form.reason,
        notes: form.notes || undefined,
        refund_method: form.refund_method,
        items: returnLines.map(l => ({
          sales_order_item_id: l.sales_order_item_id,
          quantity_returned: Number(l.quantity_returned),
          unit_price: Number(l.unit_price),
          condition: l.condition,
          reason: l.reason || undefined,
        })),
      };
      if (isSuperAdmin && form.tenant_id) payload.tenant_id = form.tenant_id;
      if (form.id) payload.id = form.id;

      await salesReturnService.store(payload);
      notify.success(form.id ? 'Return updated successfully' : 'Return created successfully');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (ret: SalesReturn) => {
    const ok = await confirm({
      title: 'Approve Return',
      html: `Approve return <strong>${ret.return_number}</strong>?`,
      confirmButtonText: 'Approve', cancelButtonText: 'Cancel', icon: 'question',
    });
    if (!ok.isConfirmed) return;
    try {
      await salesReturnService.approve(ret.id);
      notify.success('Return approved');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to approve'); }
  };

  const handleComplete = async (ret: SalesReturn) => {
    const ok = await confirm({
      title: 'Complete Return & Restock',
      html: `Complete return <strong>${ret.return_number}</strong>? Stock will be restored immediately.`,
      confirmButtonText: 'Complete & Restock', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await salesReturnService.complete(ret.id);
      notify.success('Return completed — stock restored successfully');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to complete'); }
  };

  const handleCancelReturn = async (ret: SalesReturn) => {
    const ok = await confirm({
      title: 'Cancel Return',
      html: `Cancel return <strong>${ret.return_number}</strong>?`,
      confirmButtonText: 'Yes, Cancel', cancelButtonText: 'No', icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await salesReturnService.cancel(ret.id);
      notify.success('Return cancelled');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to cancel'); }
  };

  const handleDelete = async (ret: SalesReturn) => {
    const ok = await confirm({
      title: 'Delete Return',
      html: `Delete return <strong>${ret.return_number}</strong>? This cannot be undone.`,
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await salesReturnService.destroy(ret.id);
      notify.success('Return deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) { notify.error(err?.response?.data?.message || 'Failed to delete'); }
  };

  const openSettle = async (ret: SalesReturn) => {
    try {
      setSettleLoading(true);
      setShowSettleDialog(true);

      const full = await salesReturnService.show(ret.id);
      const target = full ?? ret;
      const { balance } = getReturnBalance(target);

      setSettleTarget(target);
      setSettleForm({
        action: balance > 0 ? 'refund' : 'collect',
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
    if (!settleForm.amount || Number(settleForm.amount) <= 0) {
      notify.error('Amount must be greater than 0');
      return;
    }
    try {
      setSettling(true);
      await salesReturnService.settlePayment(settleTarget.id, settleForm);
      notify.success(settleForm.action === 'refund' ? 'Refund issued successfully' : 'Payment collected successfully');
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

  const columns: ColumnDef<SalesReturn>[] = [
    {
      id: 'serial', header: 'SL',
      cell: ({ row, table }) =>
        table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
    },
    {
      accessorKey: 'return_number', header: 'Return #',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.return_number}</span>,
    },
    {
      accessorKey: 'sales_order_id', header: 'Invoice',
      cell: ({ row }) => (
        <span className="text-xs">{(row.original as any).sales_order?.invoice_number ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'customer_id', header: 'Customer',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).customer?.name ?? '-'}</span>,
    },
    {
      accessorKey: 'return_date', header: 'Date',
      cell: ({ row }) => {
        const d = row.original.return_date;
        const formatted = d ? new Date(d).toLocaleDateString('en-GB') : '-';
        return <span className="text-xs">{formatted}</span>;
      },
    },
    {
      accessorKey: 'refund_amount', header: 'Refund',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{fmtNum(row.original.refund_amount)}</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => { setDetailsTarget(r); setShowDetailsDialog(true); }} title="View Details"
              className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <Eye className="w-4 h-4" />
            </button>
            {r.status === 'pending' && hasPermission('approve-sales-returns') && (
              <button onClick={() => handleApprove(r)} title="Approve"
                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {r.status === 'approved' && hasPermission('approve-sales-returns') && (
              <button onClick={() => handleComplete(r)} title="Complete & Restock"
                className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer">
                <Check className="w-4 h-4" />
              </button>
            )}
            {r.status === 'completed' && (
              <>
                {hasPermission('print-sales-returns') && (
                  <SalesReturnPrintMenu returnDoc={r} />
                )}
                {hasPermission('settle-sales-returns') && (
                  <button onClick={() => openSettle(r)} title="Settle Payment"
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
              </>
            )}
            {r.status === 'pending' && hasPermission('update-sales-returns') && (
              <button onClick={() => handleEdit(r)} title="Edit"
                className="p-1 rounded text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {['pending', 'approved'].includes(r.status ?? '') && hasPermission('reject-sales-returns') && (
              <button onClick={() => handleCancelReturn(r)} title="Cancel"
                className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer">
                <Ban className="w-4 h-4" />
              </button>
            )}
            {r.status === 'pending' && hasPermission('delete-sales-returns') && (
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
  const sectionCls =
    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ' +
    'flex items-center gap-1.5 mt-4 mb-2';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Undo2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Sales Returns
        </h1>
        {hasPermission('create-sales-returns') && (
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Return
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {form.id ? `Edit Return — ${form.id}` : 'Create New Return'}
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">

            {/* ── Tenant Selection - Only for Super Admin ── */}
            {isSuperAdmin && !form.id && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Tenant <span className="text-red-500">*</span></label>
                  <TenantSelect
                    value={form.tenant_id}
                    onChange={(tid) => setForm(f => ({ ...f, tenant_id: tid || '' }))}
                    placeholder="Select tenant"
                    isInvalid={!!errors.tenant_id}
                  />
                  {errors.tenant_id && <p className={errCls}>{errors.tenant_id}</p>}
                </div>
              </div>
            )}

            {/* ── Order Selection ── */}
            <p className={sectionCls}><Receipt className="w-3.5 h-3.5" /> Original Sales Order</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Sales Order <span className="text-red-500">*</span></label>
                <CustomSelect
                  key={`so-${soKey}`}
                  value={selectedOrder}
                  onChange={handleOrderChange}
                  loadOptions={loadOrderOptions}
                  defaultOptions={soDefaultOpts}
                  placeholder="Search by invoice # or customer…"
                  className="text-sm"
                  isDisabled={!!form.id}
                />
                {errors.sales_order_id && <p className={errCls}>{errors.sales_order_id}</p>}
              </div>
            </div>

            {/* ── Return Items ── */}
            {(loadingItems || returnLines.length > 0) && (
              <>
                <p className={sectionCls}><ListChecks className="w-3.5 h-3.5" /> Items to Return</p>
                {/* Caution banner — same UX as POS refund */}
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-semibold">Caution:</strong>{' '}
                    The items shown on this page will be returned once you submit. Please verify the
                    quantities and conditions carefully before confirming — returns restore stock to inventory and
                    cannot be easily undone.
                  </div>
                </div>
                {loadingItems ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                    Loading order items…
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="text-left px-3 py-2 font-semibold">Item</th>
                          <th className="text-center px-3 py-2 font-semibold w-32">Max Returnable</th>
                          <th className="text-center px-3 py-2 font-semibold w-28">Return Qty <span className="text-red-200">*</span></th>
                          <th className="text-right px-3 py-2 font-semibold w-24">Unit Price</th>
                          <th className="text-center px-3 py-2 font-semibold w-32">Condition <span className="text-red-200">*</span></th>
                          <th className="text-left px-3 py-2 font-semibold">Item Note</th>
                          <th className="text-right px-3 py-2 font-semibold w-24">Total</th>
                          <th className="px-3 py-2 font-semibold w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnLines.map((line, i) => (
                          <tr key={line.sales_order_item_id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50/50 dark:bg-gray-700/30'}>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                              {line.item_name}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-center text-gray-500">
                              {line.max_returnable}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                              <input
                                type="number" step="0.001" min="0" max={line.max_returnable}
                                value={line.quantity_returned}
                                onChange={e => updateLine(line.sales_order_item_id, 'quantity_returned', e.target.value)}
                                onFocus={e => e.target.select()}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                                className={`${inputCls} text-center`}
                              />
                              {errors[`items.${i}.qty`] && <p className={errCls}>{errors[`items.${i}.qty`]}</p>}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-right font-mono">
                              <input
                                type="number" step="0.01" min="0"
                                value={line.unit_price}
                                onChange={e => updateLine(line.sales_order_item_id, 'unit_price', e.target.value)}
                                className={`${inputCls} text-right`}
                              />
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                              <select
                                value={line.condition}
                                onChange={e => updateLine(line.sales_order_item_id, 'condition', e.target.value)}
                                className={inputCls}
                              >
                                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                              <input
                                type="text"
                                value={line.reason}
                                onChange={e => updateLine(line.sales_order_item_id, 'reason', e.target.value)}
                                placeholder="Optional note"
                                className={inputCls}
                              />
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-right font-mono font-semibold">
                              {(Number(line.quantity_returned) * Number(line.unit_price)).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 text-center">
                              <button type="button" onClick={() => removeLine(line.sales_order_item_id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1 cursor-pointer"
                                title="Remove line"
                                aria-label="Remove return line">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                          <td colSpan={6} className="px-3 py-2 text-right text-xs border-t border-gray-200 dark:border-gray-600">
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

            {/* ── Return Details ── */}
            <p className={sectionCls}><Info className="w-3.5 h-3.5" /> Return Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>Return Reason <span className="text-red-500">*</span></label>
                <select value={form.reason} onChange={sf('reason')} className={inputCls}>
                  {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.reason && <p className={errCls}>{errors.reason}</p>}
              </div>

              <div>
                <label className={labelCls}>Refund Method <span className="text-red-500">*</span></label>
                <select value={form.refund_method} onChange={sf('refund_method')} className={inputCls}>
                  {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {errors.refund_method && <p className={errCls}>{errors.refund_method}</p>}
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea rows={1} value={form.notes} onChange={sf('notes')}
                  className={inputCls} placeholder="Additional notes…" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3">
              <button type="submit" disabled={submitting}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                <GiSave className="w-4 h-4" />
                {submitting ? 'Saving…' : form.id ? 'Update Return' : 'Submit Return'}
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
        apiEndpoint="sales-returns"
        pageSize={15}
        enableSearch
        searchPlaceholder="Search returns…"
      />

      {/* Details Dialog */}
      {showDetailsDialog && detailsTarget && (() => {
        const d = detailsTarget;
        const so = (d as any).sales_order ?? {};
        const items = (d as any).return_items ?? [];
        const customerName = (d as any).customer?.name ?? so.customer?.name ?? '-';
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-4 rounded-t-xl flex items-center justify-between text-white shrink-0">
                <div>
                  <h2 className="font-bold text-lg">Return Details</h2>
                  <p className="text-sm opacity-80">{d.return_number} · {so.invoice_number ?? '-'}</p>
                </div>
                <button onClick={() => setShowDetailsDialog(false)}
                  className="rounded-full p-1 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Return Date</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{d.return_date ? new Date(d.return_date).toLocaleDateString('en-GB') : '-'}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Status</p>
                    <div className="mt-0.5">{statusBadge(d.status)}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Customer</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{customerName}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Reason</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{reasonLabel(d.reason)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Refund Amount</p>
                    <p className="font-semibold text-red-600">{fmtNum(d.refund_amount)}</p>
                  </div>
                </div>

                {/* Details list */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Details
                  </p>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-gray-500 dark:text-gray-400">Return Number</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{d.return_number}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-gray-500 dark:text-gray-400">Invoice Number</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{so.invoice_number ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-gray-500 dark:text-gray-400">Customer</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{customerName}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-gray-500 dark:text-gray-400">Refund Method</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{methodLabel(d.refund_method)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-gray-500 dark:text-gray-400">Created At</span>
                      <span className="text-gray-800 dark:text-gray-200">{d.created_at ? fmtDate(d.created_at) : '-'}</span>
                    </div>
                    {(d as any).approved_at && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400">Approved At</span>
                        <span className="text-gray-800 dark:text-gray-200">{fmtDate((d as any).approved_at)}</span>
                      </div>
                    )}
                    {(d as any).completed_at && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400">Completed At</span>
                        <span className="text-gray-800 dark:text-gray-200">{fmtDate((d as any).completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approver & Notes grid */}
                <div className="grid grid-cols-2 gap-3">
                  {(d as any).approver && (
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 text-xs">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">Approved By</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{(d as any).approver?.name}</p>
                    </div>
                  )}
                  {d.notes && (
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 text-xs col-span-2">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">Notes</p>
                      <p className="text-gray-800 dark:text-gray-100">{d.notes}</p>
                    </div>
                  )}
                </div>

                {/* Return Items Table */}
                {items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />Returned Items ({items.length})
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Item</th>
                            <th className="px-3 py-2 text-center font-semibold">Qty</th>
                            <th className="px-3 py-2 text-center font-semibold">Condition</th>
                            <th className="px-3 py-2 text-right font-semibold">Price</th>
                            <th className="px-3 py-2 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {items.map((it: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 odd:bg-gray-50/50 dark:odd:bg-gray-800/20">
                              <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                <p className="font-medium">{it.product?.name ?? it.item_name ?? '-'}</p>
                                {(it.variation?.name || it.item_code) && <p className="text-[10px] text-gray-500">{it.variation?.name ?? it.item_code}</p>}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-800 dark:text-gray-200">{it.quantity ?? 0}</td>
                              <td className="px-3 py-2 text-center text-gray-800 dark:text-gray-200 capitalize">{it.condition ?? '-'}</td>
                              <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200 font-mono">{fmtNum(it.unit_price)}</td>
                              <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200 font-mono font-semibold">{fmtNum((it.quantity ?? 0) * (it.unit_price ?? 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Settlement history */}
                {((d as any).settlement_payments ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                      Settlement History
                    </p>
                    {(d as any).settlement_payments.map((p: any, idx: number) => (
                      <div key={p.id ?? idx} className="text-xs bg-gray-50 dark:bg-gray-700/40 rounded-md px-3 py-2 flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-200 capitalize">
                            {p.action} via {String(p.payment_method ?? '-').replace('_', ' ')}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {p.created_at ? fmtDate(p.created_at) : '-'}
                            {p.creator?.name ? ` • ${p.creator.name}` : ''}
                          </p>
                          {p.notes && <p className="text-gray-500 mt-0.5">{p.notes}</p>}
                        </div>
                        <p className={`font-bold shrink-0 ${p.action === 'refund' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {p.action === 'refund' ? '-' : '+'}{fmtNum(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 shrink-0">
                <button onClick={() => setShowDetailsDialog(false)}
                  className="w-full px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Settle Payment Dialog */}
      {showSettleDialog && (() => {
        if (settleLoading) {
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                  <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                  <span className="text-sm font-medium">Loading settlement details...</span>
                </div>
              </div>
            </div>
          );
        }

        if (!settleTarget) return null;

        const refundAmount = Number(settleTarget.refund_amount ?? 0);
        const settlements = ((settleTarget as any).settlement_payments ?? []) as Array<any>;
        const alreadySettled = settlements.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
        const balance = refundAmount - alreadySettled;
        const so = (settleTarget as any).sales_order;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
              {/* Header */}
              <div className="bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-xl flex items-center justify-between text-white">
                <div>
                  <h2 className="font-bold text-lg">Settle Payment</h2>
                  <p className="text-sm opacity-80">{settleTarget.return_number} · {so?.invoice_number ?? '-'}</p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Return Total</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtNum(settleTarget.total_amount ?? 0)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Refund Amount</p>
                    <p className="font-semibold text-orange-600">{fmtNum(refundAmount)}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Already Settled</p>
                    <p className="font-semibold text-indigo-600">{fmtNum(alreadySettled)}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Balance</p>
                    <p className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtNum(Math.abs(balance))}</p>
                  </div>
                </div>

                {/* Net balance banner */}
                <div className={`rounded-lg p-3 text-center ${balance === 0
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                  : balance > 0
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                  }`}>
                  {balance === 0 ? (
                    <p className="font-semibold text-sm">This return is fully settled — no action needed</p>
                  ) : (
                    <>
                      <p className="text-xs mb-0.5">{balance > 0 ? 'Refund due to customer' : 'Customer owes'}</p>
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
                        className={inputCls} placeholder="e.g. Refunded via cash on delivery" />
                    </div>
                  </div>
                )}

                {/* Previous settlements */}
                {settlements.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Settlement History
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1.5">
                      {settlements.map((p, idx) => (
                        <div key={p.id ?? idx} className="text-xs bg-gray-50 dark:bg-gray-700/40 rounded-md px-2.5 py-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200 capitalize">
                              {p.action} via {String(p.payment_method ?? '-').replace('_', ' ')}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                              {p.creator?.name ? ` • ${p.creator.name}` : ''}
                            </p>
                            {p.notes && <p className="text-gray-500 dark:text-gray-400 mt-0.5">{p.notes}</p>}
                          </div>
                          <p className={`font-bold ${p.action === 'refund' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {p.action === 'refund' ? '-' : '+'}{fmtNum(p.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex justify-end gap-2">
                <button onClick={() => {
                  setShowSettleDialog(false);
                  setSettleTarget(null);
                }}
                  className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {balance === 0 ? 'Close' : 'Cancel'}
                </button>
                {balance !== 0 && (() => {
                  // P0-5: cap client-side. Disable submit when the typed
                  // amount is invalid, missing, zero, or larger than the
                  // current balance. The server still enforces the real
                  // cap; this is a UX guard.
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
