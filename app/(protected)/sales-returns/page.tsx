'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, CheckCircle, Check, Printer, Ban } from 'lucide-react';
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
import { SalesReturnCreditNote } from '@/components/print/invoices';

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

  // Credit note print
  const [printReturn, setPrintReturn] = useState<SalesReturn | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Settle payment dialog
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTarget, setSettleTarget] = useState<SalesReturn | null>(null);
  const [settleForm, setSettleForm] = useState({ action: 'collect', amount: '', payment_method: 'cash', notes: '' });
  const [settleLoading, setSettleLoading] = useState(false);
  const [settling, setSettling] = useState(false);

  const sf = (field: keyof ReturnForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const getOrderBalance = (ret: SalesReturn) => {
    const so = (ret as any).sales_order;
    const grandTotal = Number(so?.grand_total ?? 0);
    const returnedAmount = Number(so?.returned_amount ?? 0);
    const paidAmount = Number(so?.paid_amount ?? 0);
    const effectiveTotal = Math.max(0, grandTotal - returnedAmount);
    return {
      grandTotal,
      returnedAmount,
      paidAmount,
      effectiveTotal,
      balance: effectiveTotal - paidAmount,
    };
  };

  // ── Dropdown loaders ──────────────────────────────────────────────────────

  const loadOrderOptions = async (input: string) => {
    try {
      const res = await apiClient.get('/api/v1/sales-order', {
        params: { search: input, per_page: input ? 20 : 10, status: 'delivered,completed,returned' },
      });
      const items = res.data?.data?.data ?? res.data?.data ?? [];
      return items.map((o: any) => ({
        value: o.id,
        label: `${o.invoice_number ?? o.order_number} — ${o.customer?.name ?? 'Walk-in'}`,
        raw: o,
      }));
    } catch { return []; }
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

  const handlePrint = async (ret: SalesReturn) => {
    try {
      const full = await salesReturnService.show(ret.id);
      setPrintReturn(full ?? null);
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
    } catch { notify.error('Failed to load return details'); }
  };

  const openSettle = async (ret: SalesReturn) => {
    try {
      setSettleLoading(true);
      setShowSettleDialog(true);

      const full = await salesReturnService.show(ret.id);
      const target = full ?? ret;
      const { balance } = getOrderBalance(target);

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
      id: 'order_payment_status', header: 'Order Payment',
      cell: ({ row }) => {
        const payment = String((row.original as any).sales_order?.payment_status ?? '').toLowerCase();
        if (!payment) return <span className="text-xs text-gray-400">-</span>;
        const map: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
          overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
        return (
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${map[payment] ?? 'bg-gray-100 text-gray-600'}`}>
            {payment}
          </span>
        );
      },
    },
    {
      accessorKey: 'customer_id', header: 'Customer',
      cell: ({ row }) => <span className="text-xs">{(row.original as any).customer?.name ?? '-'}</span>,
    },
    {
      accessorKey: 'return_date', header: 'Date',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.return_date)}</span>,
    },
    {
      accessorKey: 'reason', header: 'Reason',
      cell: ({ row }) => <span className="text-xs">{reasonLabel(row.original.reason)}</span>,
    },
    {
      accessorKey: 'refund_amount', header: 'Refund Total',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{fmtNum(row.original.refund_amount)}</span>,
    },
    {
      id: 'order_balance', header: 'Balance',
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== 'completed') return <span className="text-xs text-gray-400">-</span>;
        const { balance } = getOrderBalance(r);
        if (balance === 0) {
          return <span className="text-xs font-semibold text-emerald-600">Settled</span>;
        }
        return (
          <span className={`text-xs font-semibold ${balance > 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {balance > 0 ? 'Collect: ' : 'Refund: '}{fmtNum(Math.abs(balance))}
          </span>
        );
      },
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
      cell: ({ row }) => <span className="text-xs">{(row.original as any).approver?.name ?? '-'}</span>,
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
              <>
                <button onClick={() => handlePrint(r)} title="Print Credit Note"
                  className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => openSettle(r)} title="Settle Payment"
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </>
            )}
            {r.status === 'pending' && (
              <button onClick={() => handleEdit(r)} title="Edit"
                className="p-1 rounded text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {['pending', 'approved'].includes(r.status ?? '') && (
              <button onClick={() => handleCancelReturn(r)} title="Cancel"
                className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer">
                <Ban className="w-4 h-4" />
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
        {printReturn && <SalesReturnCreditNote returnDoc={printReturn} />}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sales Returns</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Return
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
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
            <p className={sectionCls}>Original Sales Order</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Sales Order <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={selectedOrder}
                  onChange={handleOrderChange}
                  loadOptions={loadOrderOptions}
                  defaultOptions={!form.id}
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
                <p className={sectionCls}>Items to Return</p>
                {loadingItems ? (
                  <p className="text-sm text-gray-500 py-2">Loading items…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="text-left px-2 py-1.5 border border-gray-200 dark:border-gray-600">Item</th>
                          <th className="text-center px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-24">Max Returnable</th>
                          <th className="text-center px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-28">Return Qty <span className="text-red-500">*</span></th>
                          <th className="text-right px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-24">Unit Price</th>
                          <th className="text-center px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-32">Condition <span className="text-red-500">*</span></th>
                          <th className="text-left px-2 py-1.5 border border-gray-200 dark:border-gray-600">Item Note</th>
                          <th className="text-right px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-20">Total</th>
                          <th className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnLines.map((line, i) => (
                          <tr key={line.sales_order_item_id} className="even:bg-gray-50 dark:even:bg-gray-700/40">
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                              {line.item_name}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-500">
                              {line.max_returnable}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                              <input
                                type="number" step="0.001" min="0" max={line.max_returnable}
                                value={line.quantity_returned}
                                onChange={e => updateLine(line.sales_order_item_id, 'quantity_returned', e.target.value)}
                                className={`${inputCls} text-center`}
                              />
                              {errors[`items.${i}.qty`] && <p className={errCls}>{errors[`items.${i}.qty`]}</p>}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-right">
                              <input
                                type="number" step="0.01" min="0"
                                value={line.unit_price}
                                onChange={e => updateLine(line.sales_order_item_id, 'unit_price', e.target.value)}
                                className={`${inputCls} text-right`}
                              />
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                              <select
                                value={line.condition}
                                onChange={e => updateLine(line.sales_order_item_id, 'condition', e.target.value)}
                                className={inputCls}
                              >
                                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                              <input
                                type="text"
                                value={line.reason}
                                onChange={e => updateLine(line.sales_order_item_id, 'reason', e.target.value)}
                                placeholder="Optional note"
                                className={inputCls}
                              />
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-right font-mono font-semibold">
                              {(Number(line.quantity_returned) * Number(line.unit_price)).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                              <button type="button" onClick={() => removeLine(line.sales_order_item_id)}
                                className="text-red-500 hover:text-red-700 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                          <td colSpan={6} className="px-2 py-1.5 text-right text-xs border border-gray-200 dark:border-gray-600">
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

            {/* ── Return Details ── */}
            <p className={sectionCls}>Return Details</p>
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
                <textarea rows={2} value={form.notes} onChange={sf('notes')}
                  className={inputCls} placeholder="Additional notes…" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
              >
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

        const so = (settleTarget as any).sales_order;
        const grandTotal = Number(so?.grand_total ?? 0);
        const returnedAmount = Number(so?.returned_amount ?? 0);
        const paidAmount = Number(so?.paid_amount ?? 0);
        const effectiveTotal = Math.max(0, grandTotal - returnedAmount);
        const balance = effectiveTotal - paidAmount;
        const settlements = ((settleTarget as any).settlement_payments ?? []) as Array<any>;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-xl flex items-center justify-between text-white">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Invoice Total</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtNum(grandTotal)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Returned</p>
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

                {/* Net balance banner */}
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
