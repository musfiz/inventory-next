'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, X, CheckCircle, Ban, Eye, Truck, Coins, PackageX,
  Info, Loader2, ShoppingCart, RotateCcw,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { MdOutlineAssignmentReturn } from 'react-icons/md';

import { PurchaseReturnPrintMenu } from '@/components/print/PurchaseReturnPrintMenu';
import Spinner from '@/components/ui/spinner';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';

import { notify, confirm } from '@/lib/notifications';
import { purchaseReturnService } from '@/services';
import apiClient from '@/lib/api/axios';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type {
  PurchaseReturn,
  PurchaseReturnReasonCode,
  PurchaseReturnResolution,
  ReturnablePurchaseOrderItem,
  ReturnableItemsResponse,
} from '@/types/api.types';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Why the goods are going back. Mirrors PurchaseReturnItem::REASON_CODES. */
const REASON_CODES: { value: PurchaseReturnReasonCode; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'expired', label: 'Expired' },
  { value: 'short_shelf_life', label: 'Short Shelf Life' },
  { value: 'excess', label: 'Excess Quantity' },
  { value: 'quality_mismatch', label: 'Quality Mismatch' },
  { value: 'other', label: 'Other' },
];

const RESOLUTIONS: { value: PurchaseReturnResolution; label: string }[] = [
  { value: 'credit_note', label: 'Credit Note — reduce what we owe' },
  { value: 'refund', label: 'Refund — vendor pays us back' },
  { value: 'replacement', label: 'Replacement — vendor re-sends goods' },
];

const SETTLEMENT_ACTIONS = [
  { value: 'refund_received', label: 'Refund received from vendor' },
  { value: 'apply_to_payable', label: 'Credit applied to payable' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Cheque' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Card chrome ───────────────────────────────────────────────────────────────
//
// Taken verbatim from the add-form pages (/products/add via components/products/
// ProductForm.tsx, and /purchase-orders/add). Those two are the reference for
// what a form card looks like in this app, so the same three classes are
// repeated here rather than reinvented: white surface, subtle shadow, 1px
// border, 12px padding.

const CARD_CLS =
  'bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3';

const CARD_TITLE_CLS =
  'text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
    completed: 'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200',
    cancelled: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>
      {status ?? '-'}
    </span>
  );
}

function settlementBadge(status?: string) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
    partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    settled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>
      {status ?? '-'}
    </span>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB');
}

function fmtNum(n?: string | number | null) {
  if (n === null || n === undefined || n === '') return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n?: string | number | null) {
  if (n === null || n === undefined || n === '') return '-';
  return String(Number(n));
}

function reasonLabel(v?: string | null) {
  if (!v) return '-';
  return REASON_CODES.find(r => r.value === v)?.label ?? v;
}

function resolutionLabel(v?: string | null) {
  if (!v) return '-';
  return RESOLUTIONS.find(r => r.value === v)?.label.split(' — ')[0] ?? v;
}

function returnTypeLabel(v?: string | null) {
  return v === 'rejected_at_receipt' ? 'Rejected at receipt' : 'After receipt';
}

/** Block a minus key on numeric inputs so a quantity can never go negative. */
function preventMinus(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-') e.preventDefault();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReturnLine {
  purchase_order_item_id: string;
  quantity_returned: number;
  reason_code: PurchaseReturnReasonCode;
  reason: string;
  // display only, echoed from the returnable-items response
  item_name: string;
  sku: string;
  unit_cost: number;
  max_returnable: number;
  quantity_ordered: number;
  quantity_received: number;
  already_returned: number;
  available_quantity: number;
}

interface ReturnForm {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  return_date: string;
  resolution: PurchaseReturnResolution;
  reason: string;
  vendor_reference: string;
  notes: string;
}

const emptyForm = (): ReturnForm => ({
  id: '',
  tenant_id: '',
  purchase_order_id: '',
  return_date: new Date().toISOString().slice(0, 10),
  resolution: 'credit_note',
  reason: '',
  vendor_reference: '',
  notes: '',
});

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseReturnsPage() {
  const { hasPermission, isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthStore(s => s.user);

  // Purchase family pages redirect to /access-denied, not /dashboard.
  useEffect(() => {
    if (isHydrated && !hasPermission('view-purchase-order-return')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ReturnForm>(emptyForm());
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [poMeta, setPoMeta] = useState<ReturnableItemsResponse['purchase_order'] | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Details dialog
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<PurchaseReturn | null>(null);

  // Settle dialog
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTarget, setSettleTarget] = useState<PurchaseReturn | null>(null);
  const [settleForm, setSettleForm] = useState({
    action: 'refund_received',
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: '',
  });
  const [settleLoading, setSettleLoading] = useState(false);
  const [settling, setSettling] = useState(false);

  // List filters
  const [statusFilter, setStatusFilter] = useState('');

  // ── Estimates ───────────────────────────────────────────────────────────────
  //
  // The backend's valuation is authoritative; these are a live preview so the
  // clerk sees the credit before saving. The formulas mirror the server:
  //   gross = qty x PO unit cost
  //   net   = gross x (1 - PO discount ratio)
  //   tax   = net x (PO tax_amount / PO net)

  const valuation = useMemo(() => {
    if (!poMeta) return { discountRatio: 0, taxRatio: 0 };
    const netBase = Number(poMeta.sub_total) - Number(poMeta.discount_amount);
    return {
      discountRatio: Number(poMeta.sub_total) > 0
        ? Number(poMeta.discount_amount) / Number(poMeta.sub_total)
        : 0,
      taxRatio: netBase > 0 ? Number(poMeta.tax_amount ?? 0) / netBase : 0,
    };
  }, [poMeta]);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let tax = 0;
    returnLines.forEach(l => {
      const g = Number(l.quantity_returned) * Number(l.unit_cost);
      const n = g * (1 - valuation.discountRatio);
      gross += g;
      net += n;
      tax += n * valuation.taxRatio;
    });
    return {
      gross: gross,
      discount: gross - net,
      net: net,
      tax: tax,
      total: net + tax,
    };
  }, [returnLines, valuation]);

  // ── Purchase order dropdown ─────────────────────────────────────────────────

  const [poKey, setPoKey] = useState(0);
  const [poDefaultOpts, setPoDefaultOpts] = useState<{ value: string; label: string; raw: any }[]>([]);

  const fetchPurchaseOrders = async (input: string, tenantId: string) => {
    try {
      const params: Record<string, any> = { per_page: input ? 20 : 8 };
      params.tenant_id = tenantId;
      if (input) params.search = input;
      const res = await apiClient.get('/api/v1/purchase-order', { params });
      const items = res.data?.data ?? [];
      return items.map((o: any) => ({
        value: o.id,
        label: `${o.po_number}${o.supplier?.name ? ` — ${o.supplier.name}` : ''}`,
        raw: o,
      }));
    } catch (e) {
      console.error('fetchPurchaseOrders error', e);
      return [];
    }
  };

  useEffect(() => {
    setSelectedPO(null);
    setReturnLines([]);
    setPoMeta(null);
    setForm(f => ({ ...f, purchase_order_id: '' }));
    if (!form.tenant_id) {
      setPoDefaultOpts([]);
      return;
    }
    fetchPurchaseOrders('', form.tenant_id).then(setPoDefaultOpts);
    setPoKey(k => k + 1);
  }, [form.tenant_id]);

  const loadPurchaseOrderOptions = async (input: string) => {
    if (!form.tenant_id) return [];
    return fetchPurchaseOrders(input, form.tenant_id);
  };

  /**
   * Load the returnable lines for the chosen PO.
   *
   * `max_returnable` comes from the server and already accounts for quantity
   * claimed by other open returns AND what is physically on hand — goods
   * already sold cannot go back to the vendor, so capping at
   * `quantity_received` alone would let the clerk submit something the backend
   * will reject.
   */
  const buildLinesFrom = (
    rows: ReturnablePurchaseOrderItem[],
    quantities?: Map<string, { quantity_returned: number; reason_code?: string; reason?: string }>,
  ): ReturnLine[] =>
    rows
      .map(row => {
        const existing = quantities?.get(row.purchase_order_item_id);
        const max = Number(row.max_returnable ?? 0);
        const name = [row.product_name, row.variation_name].filter(Boolean).join(' - ') || '-';
        return {
          purchase_order_item_id: row.purchase_order_item_id,
          // An edit must not exceed what is returnable PLUS its own current
          // quantity — the server excludes this return from the claimed total,
          // so the same figure is safe to re-send.
          quantity_returned: existing ? Number(existing.quantity_returned) : max > 0 ? max : 0,
          reason_code: (existing?.reason_code as PurchaseReturnReasonCode) ?? 'damaged',
          reason: existing?.reason ?? '',
          item_name: name,
          sku: row.sku ?? '',
          unit_cost: Number(row.unit_cost ?? 0),
          max_returnable: max,
          quantity_ordered: Number(row.quantity_ordered ?? 0),
          quantity_received: Number(row.quantity_received ?? 0),
          already_returned: Number(row.quantity_returned ?? 0),
          available_quantity: Number(row.available_quantity ?? 0),
        };
      })
      .filter(l => l.quantity_returned > 0 || l.max_returnable > 0);

  const handlePOChange = async (opt: any) => {
    setSelectedPO(opt);
    setForm(f => ({ ...f, purchase_order_id: opt?.value ?? '' }));
    setReturnLines([]);
    setPoMeta(null);
    if (!opt?.value) return;

    setLoadingItems(true);
    try {
      const data = await purchaseReturnService.getReturnableItems(String(opt.value));
      setPoMeta(data?.purchase_order ?? null);
      setReturnLines(buildLinesFrom(data?.items ?? []));
      if ((data?.items ?? []).length === 0) {
        notify.warning('This purchase order has no lines with received stock to return.');
      }
    } catch {
      notify.error('Failed to load returnable items');
    } finally {
      setLoadingItems(false);
    }
  };

  // ── Line item updaters ──────────────────────────────────────────────────────

  const updateLine = (id: string, field: keyof ReturnLine, value: any) => {
    setReturnLines(lines =>
      lines.map(l => (l.purchase_order_item_id === id ? { ...l, [field]: value } : l))
    );
  };

  /**
   * Clamp the typed quantity to `max_returnable`.
   *
   * The clamp is a convenience, not the enforcement — the backend re-checks
   * under a row lock, because stock can be sold between this render and the
   * submit.
   */
  const setLineQuantity = (line: ReturnLine, raw: string) => {
    const parsed = Number(raw);
    if (raw === '' || Number.isNaN(parsed)) {
      updateLine(line.purchase_order_item_id, 'quantity_returned', 0);
      return;
    }
    const clamped = Math.max(0, Math.min(line.max_returnable, parsed));
    updateLine(line.purchase_order_item_id, 'quantity_returned', clamped);
  };

  const removeLine = (id: string) => {
    setReturnLines(lines => lines.filter(l => l.purchase_order_item_id !== id));
    setErrors(prev => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith('items.')) next[k] = v;
      });
      return next;
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !form.id && !form.tenant_id) errs.tenant_id = 'Tenant is required';
    if (!form.purchase_order_id) errs.purchase_order_id = 'Purchase order is required';
    if (!form.resolution) errs.resolution = 'Settlement method is required';

    const active = returnLines.filter(l => Number(l.quantity_returned) > 0);
    if (active.length === 0) errs.items = 'Enter a quantity on at least one line';

    active.forEach(line => {
      const idx = returnLines.indexOf(line);
      if (Number(line.quantity_returned) > line.max_returnable) {
        errs[`items.${idx}.qty`] = `Maximum returnable is ${line.max_returnable}`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setForm({
      ...emptyForm(),
      tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ?? ''),
    });
    setSelectedPO(null);
    setReturnLines([]);
    setPoMeta(null);
    setErrors({});
    setShowForm(true);
  };

  /** Open the form for editing, prefilling from an existing pending return. */
  const handleEdit = async (ret: PurchaseReturn) => {
    setForm({
      id: String(ret.id),
      tenant_id: String(ret.tenant_id ?? ''),
      purchase_order_id: String(ret.purchase_order_id),
      return_date: ret.return_date ? String(ret.return_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      resolution: ret.resolution ?? 'credit_note',
      reason: ret.reason ?? '',
      vendor_reference: ret.vendor_reference ?? '',
      notes: ret.notes ?? '',
    });
    setSelectedPO(
      ret.purchase_order
        ? { value: ret.purchase_order.id, label: ret.purchase_order.po_number }
        : null
    );
    setErrors({});
    setShowForm(true);

    setLoadingItems(true);
    try {
      const [full, data] = await Promise.all([
        purchaseReturnService.show(ret.id),
        purchaseReturnService.getReturnableItems(String(ret.purchase_order_id)),
      ]);
      setPoMeta(data?.purchase_order ?? null);

      const quantities = new Map(
        (full?.items ?? []).map((ri: any) => [
          String(ri.purchase_order_item_id),
          {
            quantity_returned: Number(ri.quantity_returned ?? 0),
            reason_code: ri.reason_code ?? undefined,
            reason: ri.reason ?? undefined,
          },
        ])
      );
      setReturnLines(buildLinesFrom(data?.items ?? [], quantities));
    } catch {
      notify.error('Failed to load purchase return for editing');
    } finally {
      setLoadingItems(false);
    }
  };

  /**
   * Open the form pre-filled for a specific purchase order, driven from the
   * purchase orders page ("Return to vendor").
   */
  const handleCreateForPO = async (po: { id: string; po_number?: string; supplier?: { name?: string } }) => {
    setForm({
      ...emptyForm(),
      tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ?? ''),
      purchase_order_id: String(po.id),
    });
    setSelectedPO({ value: po.id, label: po.po_number });
    setErrors({});
    setShowForm(true);

    setLoadingItems(true);
    try {
      const data = await purchaseReturnService.getReturnableItems(String(po.id));
      setPoMeta(data?.purchase_order ?? null);
      setReturnLines(buildLinesFrom(data?.items ?? []));
      if ((data?.items ?? []).filter((i: any) => Number(i.max_returnable) > 0).length === 0) {
        notify.warning('This purchase order has no returnable quantity — nothing has been received, or it has all been returned.');
      }
    } catch {
      notify.error('Failed to load returnable items');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setErrors({});
  };

  /**
   * Deep link from the purchase orders page: `/purchase-order-return?po=<id>`
   * opens the form for that order.
   *
   * useEffect rather than lazy initial state so it survives the tenant-select
   * effect below clearing the form. A ref guards against re-running when the
   * user navigates between two different `?po=` values without unmounting.
   */
  const handledPoParam = useRef<string | null>(null);
  useEffect(() => {
    const poParam = searchParams?.get('po');
    if (!poParam || handledPoParam.current === poParam) return;
    if (!isHydrated) return;
    if (!hasPermission('create-purchase-order-return')) return;

    handledPoParam.current = poParam;
    handleCreateForPO({ id: poParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isHydrated, hasPermission]);

  const handleError = (err: any) => {
    const msg = err?.response?.data?.message || err?.response?.data?.errors;
    if (typeof msg === 'object' && msg !== null) {
      const flat: Record<string, string> = {};
      Object.entries(msg).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? (v[0] as string) : String(v);
      });
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
        purchase_order_id: form.purchase_order_id,
        return_date: form.return_date || undefined,
        resolution: form.resolution,
        reason: form.reason || undefined,
        vendor_reference: form.vendor_reference || undefined,
        notes: form.notes || undefined,
        // Only lines with a quantity go up; the backend rejects a zero.
        items: returnLines
          .filter(l => Number(l.quantity_returned) > 0)
          .map(l => ({
            purchase_order_item_id: l.purchase_order_item_id,
            quantity_returned: Number(l.quantity_returned),
            reason_code: l.reason_code,
            reason: l.reason || undefined,
          })),
      };
      if (isSuperAdmin && form.tenant_id) payload.tenant_id = form.tenant_id;
      if (form.id) payload.id = form.id;

      await purchaseReturnService.store(payload);
      notify.success(form.id ? 'Purchase return updated' : 'Purchase return created — pending approval');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (ret: PurchaseReturn) => {
    const ok = await confirm({
      title: 'Approve Purchase Return',
      html: `Approve return <strong>${ret.return_number}</strong>? This agrees the return with the vendor.`,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      icon: 'question',
    });
    if (!ok.isConfirmed) return;
    try {
      await purchaseReturnService.approve(ret.id);
      notify.success('Purchase return approved');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to approve purchase return');
    }
  };

  const handleComplete = async (ret: PurchaseReturn) => {
    const ok = await confirm({
      title: 'Goods Sent to Vendor',
      html: `Confirm that the goods on <strong>${ret.return_number}</strong> have physically left the warehouse.<br/><br/>`
        + 'Stock will be reduced, the purchase order updated, and a debit note number issued. This cannot be undone.',
      confirmButtonText: 'Yes, goods sent',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await purchaseReturnService.complete(ret.id);
      notify.success('Goods sent to vendor — stock, ledger and purchase order updated');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to complete purchase return');
    }
  };

  const handleCancelReturn = async (ret: PurchaseReturn) => {
    const ok = await confirm({
      title: 'Cancel Purchase Return',
      html: `Cancel <strong>${ret.return_number}</strong>? The reserved quantity will be released.`,
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'No',
      icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await purchaseReturnService.cancel(ret.id);
      notify.success('Purchase return cancelled');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to cancel purchase return');
    }
  };

  const handleDelete = async (ret: PurchaseReturn) => {
    const ok = await confirm({
      title: 'Delete Purchase Return',
      html: `Delete <strong>${ret.return_number}</strong>? This cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!ok.isConfirmed) return;
    try {
      await purchaseReturnService.destroy(ret.id);
      notify.success('Purchase return deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete purchase return');
    }
  };

  /** Outstanding = total − settled. The backend enforces the same cap. */
  const getOutstanding = (ret: PurchaseReturn) =>
    Number(ret.outstanding_amount ?? Number(ret.total_amount ?? 0) - Number(ret.settled_amount ?? 0));

  const openSettle = async (ret: PurchaseReturn) => {
    try {
      setSettleLoading(true);
      setShowSettleDialog(true);
      const full = (await purchaseReturnService.show(ret.id)) ?? ret;
      const outstanding = getOutstanding(full);
      setSettleTarget(full);
      setSettleForm({
        action: full.resolution === 'credit_note' ? 'apply_to_payable' : 'refund_received',
        amount: outstanding > 0 ? outstanding.toFixed(2) : '',
        payment_method: 'cash',
        reference: '',
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
    const amount = Number(settleForm.amount);
    if (!amount || amount <= 0) {
      notify.error('Amount must be greater than 0');
      return;
    }
    try {
      setSettling(true);
      await purchaseReturnService.settle(settleTarget.id, {
        action: settleForm.action as 'refund_received' | 'apply_to_payable',
        amount,
        payment_method: settleForm.payment_method,
        reference: settleForm.reference || undefined,
        notes: settleForm.notes || undefined,
      });
      notify.success(
        settleForm.action === 'refund_received' ? 'Refund received' : 'Credit applied to payable'
      );
      setShowSettleDialog(false);
      setSettleTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to settle purchase return');
    } finally {
      setSettling(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns: ColumnDef<PurchaseReturn>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) =>
        table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
    },
    {
      accessorKey: 'return_number',
      header: 'Return #',
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs font-semibold">{row.original.return_number}</div>
          {row.original.debit_note_number && (
            <div className="font-mono text-[10px] text-gray-500">{row.original.debit_note_number}</div>
          )}
        </div>
      ),
    },
    {
      id: 'po_number',
      header: 'PO #',
      cell: ({ row }) => (
        <div>
          <div className="text-xs">{row.original.purchase_order?.po_number ?? '-'}</div>
          {row.original.purchase_order?.supplier_order_no && (
            <div className="text-[10px] text-gray-500">
              Chalan: {row.original.purchase_order.supplier_order_no}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.supplier?.name ?? '-'}</span>
      ),
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.name ?? '-'}</span>,
    },
    {
      accessorKey: 'return_date',
      header: 'Date',
      cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.return_date)}</span>,
    },
    {
      accessorKey: 'total_amount',
      header: 'Debit Total',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{fmtNum(row.original.total_amount)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          {statusBadge(row.original.status)}
          {row.original.status === 'completed' && settlementBadge(row.original.settlement_status)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        const s = r.status ?? '';
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setDetailsTarget(r); setShowDetailsDialog(true); }}
              title="View Details"
              className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              aria-label="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>

            {s === 'pending' && hasPermission('approve-purchase-order-return') && (
              <button onClick={() => handleApprove(r)} title="Approve"
                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}

            {s === 'pending' && hasPermission('create-purchase-order-return') && (
              <button onClick={() => handleEdit(r)} title="Edit"
                className="p-1 rounded text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {s === 'approved' && hasPermission('complete-purchase-order-return') && (
              <button onClick={() => handleComplete(r)} title="Goods sent to vendor"
                className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer">
                <Truck className="w-4 h-4" />
              </button>
            )}

            {s === 'completed' && (
              <>
                {hasPermission('print-purchase-order-return') && (
                  <PurchaseReturnPrintMenu returnDoc={r} />
                )}
                {hasPermission('settle-purchase-order-return') && getOutstanding(r) > 0 && (
                  <button onClick={() => openSettle(r)} title="Record settlement"
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer">
                    <Coins className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {(s === 'pending' || s === 'approved') && hasPermission('cancel-purchase-order-return') && (
              <button onClick={() => handleCancelReturn(r)} title="Cancel"
                className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer">
                <Ban className="w-4 h-4" />
              </button>
            )}

            {s === 'pending' && hasPermission('delete-purchase-order-return') && (
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

  // ── Styles ──────────────────────────────────────────────────────────────────
  //
  // Card chrome (CARD_CLS / CARD_TITLE_CLS) and this control class are copied
  // from the add-form pages — components/products/ProductForm.tsx and
  // /purchase-orders/add — so every form in the app renders the same field.
  // Card titles and accents aside, the inputs here are identical to theirs:
  // text-xs, 1px border, indigo focus ring.

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const title = showForm ? (form.id ? 'Edit Purchase Return' : 'Create Purchase Return') : 'Purchase Order Returns';

  return (
    <div className="space-y-2">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MdOutlineAssignmentReturn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {title}
        </h1>
        {!showForm && hasPermission('create-purchase-order-return') && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Add Return
          </button>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="space-y-2">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Purchase order */}
            <div className={CARD_CLS}>
              <h3 className={CARD_TITLE_CLS}>
                <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Purchase Order
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {isSuperAdmin && (
                  <FormRow label="Tenant" required error={errors.tenant_id}>
                    <TenantSelect
                      value={form.tenant_id || null}
                      onChange={(tenantId) => setForm(f => ({ ...f, tenant_id: tenantId ?? '' }))}
                      placeholder="Select tenant"
                      isInvalid={!!errors.tenant_id}
                      compact
                    />
                  </FormRow>
                )}
                <FormRow
                  label="Order"
                  required
                  labelWidth="w-20"
                  error={errors.purchase_order_id}
                  className={isSuperAdmin ? '' : 'md:col-span-2'}
                >
                  <CustomSelect
                    key={`po-${poKey}`}
                    loadOptions={loadPurchaseOrderOptions}
                    defaultOptions={poDefaultOpts}
                    value={selectedPO}
                    onChange={handlePOChange}
                    placeholder={form.tenant_id ? 'Select purchase order' : 'Select tenant first'}
                    isDisabled={!form.tenant_id}
                    isClearable
                    compact
                    isInvalid={!!errors.purchase_order_id}
                  />
                </FormRow>
              </div>

              {/* PO facts, read-only — the source of every figure on the debit note. */}
              {poMeta && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <ReadOnlyField label="Supplier" value={poMeta.supplier_name ?? '-'} />
                  <ReadOnlyField label="Warehouse" value={poMeta.warehouse_name ?? '-'} />
                  <ReadOnlyField label="PO Total" value={fmtNum(poMeta.total_amount)} mono />
                  <ReadOnlyField label="Net Payable" value={fmtNum(poMeta.net_payable)} mono />
                </div>
              )}
            </div>

            {/* Items — full-bleed card with a header bar, matching the
                "Order Items" card on /purchase-orders/add. */}
            <div className={`${CARD_CLS} overflow-hidden`}>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Items to Return
                  {returnLines.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium">
                      {returnLines.filter(l => Number(l.quantity_returned) > 0).length}
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  quantities capped at stock on hand — sold goods cannot go back
                </span>
              </div>

              {errors.items && (
                <p className="px-3 pt-2 text-xs text-red-600">{errors.items}</p>
              )}

              {loadingItems ? (
                <div className="flex items-center justify-center py-8 text-xs text-gray-500">
                  <Spinner size="sm" className="mr-2" /> Loading returnable items…
                </div>
              ) : returnLines.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  {form.purchase_order_id
                    ? 'No returnable items on this purchase order.'
                    : 'Select a purchase order to see what can be returned.'}
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Item</div>
                    <div className="col-span-2 text-center">Return Qty</div>
                    <div className="col-span-2">Reason</div>
                    <div className="col-span-2">Note</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1 text-center">Del</div>
                  </div>

                  {/* Item rows */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {returnLines.map((line, idx) => {
                      const lineNet =
                        Number(line.quantity_returned) * Number(line.unit_cost) * (1 - valuation.discountRatio);
                      return (
                        <div
                          key={line.purchase_order_item_id}
                          className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-blue-50/40 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          {/* Row number badge */}
                          <div className="col-span-1 text-center">
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                              {idx + 1}
                            </span>
                          </div>

                          {/* Item + the quantities that set the cap */}
                          <div className="col-span-3 min-w-0">
                            <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                              {line.item_name}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                              {line.sku || '—'} · ordered {fmtQty(line.quantity_ordered)} · received{' '}
                              {fmtQty(line.quantity_received)}
                              {line.already_returned > 0 && ` · already returned ${fmtQty(line.already_returned)}`}
                              {' · on hand '}
                              {fmtQty(line.available_quantity)}
                            </div>
                          </div>

                          {/* Return quantity, with the ceiling spelled out */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.0001"
                              min={0}
                              max={line.max_returnable}
                              value={line.quantity_returned || ''}
                              onChange={e => setLineQuantity(line, e.target.value)}
                              onKeyDown={preventMinus}
                              onFocus={e => e.target.select()}
                              disabled={line.max_returnable <= 0}
                              className={inputCls(!!errors[`items.${idx}.qty`]) + ' text-right'}
                            />
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 text-right">
                              max {fmtQty(line.max_returnable)}
                            </p>
                            {errors[`items.${idx}.qty`] && (
                              <p className="text-[10px] text-red-500 mt-0.5">
                                {errors[`items.${idx}.qty`]}
                              </p>
                            )}
                          </div>

                          <div className="col-span-2">
                            <select
                              value={line.reason_code}
                              onChange={e =>
                                updateLine(line.purchase_order_item_id, 'reason_code', e.target.value)
                              }
                              className={inputCls()}
                            >
                              {REASON_CODES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="text"
                              value={line.reason}
                              onChange={e =>
                                updateLine(line.purchase_order_item_id, 'reason', e.target.value)
                              }
                              placeholder="Optional"
                              className={inputCls()}
                            />
                          </div>

                          <div className="col-span-1 text-right text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">
                            {fmtNum(lineNet)}
                          </div>

                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.purchase_order_item_id)}
                              title="Remove line"
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Debit value — mirrors the backend valuation exactly, so the
                      number the clerk approves matches the debit note. */}
                  <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        Estimate only — the backend value is authoritative
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-0.5">
                        <ReadOnlyField label="Sub Total" value={fmtNum(totals.gross)} mono muted />
                        <ReadOnlyField label="Less Discount" value={`(${fmtNum(totals.discount)})`} mono muted />
                        <ReadOnlyField label="Net Value" value={fmtNum(totals.net)} mono />
                        <ReadOnlyField label="VAT" value={fmtNum(totals.tax)} mono muted />
                        <ReadOnlyField label="Debit Total" value={fmtNum(totals.total)} mono strong />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Details */}
            <div className={CARD_CLS}>
              <h3 className={CARD_TITLE_CLS}>
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Return Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Date" labelWidth="w-20">
                  <input
                    type="date"
                    value={form.return_date}
                    onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))}
                    className={inputCls()}
                  />
                </FormRow>
                <FormRow label="Settlement" required labelWidth="w-20" error={errors.resolution}>
                  <select
                    value={form.resolution}
                    onChange={e => setForm(f => ({ ...f, resolution: e.target.value as PurchaseReturnResolution }))}
                    className={inputCls(!!errors.resolution)}
                  >
                    {RESOLUTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Vendor Ref" labelWidth="w-20">
                  <input
                    type="text"
                    value={form.vendor_reference}
                    onChange={e => setForm(f => ({ ...f, vendor_reference: e.target.value }))}
                    placeholder="RMA or credit note no"
                    className={inputCls()}
                  />
                </FormRow>
                <FormRow label="Reason" labelWidth="w-20">
                  <input
                    type="text"
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Header-level reason"
                    className={inputCls()}
                  />
                </FormRow>
                <FormRow label="Notes" labelWidth="w-20" className="md:col-span-2">
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className={`${inputCls()} resize-y`}
                  />
                </FormRow>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting || returnLines.length === 0}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GiSave className="w-4 h-4" />
                )}
                {submitting ? 'Saving…' : form.id ? 'Update Return' : 'Create Return'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-60"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────────── */}
      {!showForm && (
        <>
          <div className="flex items-center gap-2">
            <div style={{ width: 200 }}>
              <CustomSelect
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                onChange={(opt: any) => setStatusFilter(opt?.value ?? '')}
                placeholder="All statuses"
                isClearable={false}
                compact
              />
            </div>
          </div>

          <DataTable
            key={refreshKey}
            columns={columns}
            apiEndpoint="purchase-returns"
            filterParams={{ status: statusFilter || undefined }}
            pageSize={15}
            enableSearch
            searchPlaceholder="Search return no, debit note, PO or supplier…"
          />
        </>
      )}

      {/* ── Details dialog ───────────────────────────────────────────── */}
      {showDetailsDialog && detailsTarget && (() => {
        const r = detailsTarget;
        const outstanding = getOutstanding(r);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{r.return_number}</h3>
                  <p className="text-xs opacity-90">
                    {r.purchase_order?.po_number ?? '—'} · {r.supplier?.name ?? '—'}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsDialog(false)}
                  className="p-1 rounded hover:bg-white/20 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-2">
                    <div className="text-[10px] text-gray-500 uppercase">Debit Total</div>
                    <div className="font-mono font-bold text-sm">{fmtNum(r.total_amount)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-2">
                    <div className="text-[10px] text-gray-500 uppercase">Settled</div>
                    <div className="font-mono font-bold text-sm">{fmtNum(r.settled_amount)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-2">
                    <div className="text-[10px] text-gray-500 uppercase">Outstanding</div>
                    <div className="font-mono font-bold text-sm">{fmtNum(outstanding)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-2">
                    <div className="text-[10px] text-gray-500 uppercase">Status</div>
                    <div className="mt-0.5">{statusBadge(r.status)}</div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-gray-500">Debit Note:</span> {r.debit_note_number ?? 'Not issued'}</div>
                  <div><span className="text-gray-500">Return Date:</span> {fmtDate(r.return_date)}</div>
                  <div><span className="text-gray-500">PO:</span> {r.purchase_order?.po_number ?? '-'}</div>
                  <div><span className="text-gray-500">Chalan:</span> {r.purchase_order?.supplier_order_no ?? '-'}</div>
                  <div><span className="text-gray-500">Supplier:</span> {r.supplier?.name ?? '-'}</div>
                  <div><span className="text-gray-500">Warehouse:</span> {r.warehouse?.name ?? '-'}</div>
                  <div><span className="text-gray-500">Type:</span> {returnTypeLabel(r.return_type)}</div>
                  <div><span className="text-gray-500">Settlement:</span> {resolutionLabel(r.resolution)}</div>
                  <div><span className="text-gray-500">Vendor Ref:</span> {r.vendor_reference ?? '-'}</div>
                  <div><span className="text-gray-500">Created By:</span> {r.creator?.name ?? '-'}</div>
                  {r.approver && <div><span className="text-gray-500">Approved By:</span> {r.approver.name}</div>}
                  {r.completedBy && <div><span className="text-gray-500">Dispatched By:</span> {r.completedBy.name}</div>}
                </div>

                {r.reason && (
                  <div className="text-xs"><span className="text-gray-500">Reason:</span> {r.reason}</div>
                )}
                {r.notes && (
                  <div className="text-xs"><span className="text-gray-500">Notes:</span> {r.notes}</div>
                )}

                {/* Items */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="px-2 py-1 text-left">Item</th>
                          <th className="px-2 py-1 text-right">Qty</th>
                          <th className="px-2 py-1 text-right">Unit Cost</th>
                          <th className="px-2 py-1 text-left">Reason</th>
                          <th className="px-2 py-1 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(r.items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 py-3 text-center text-gray-500">
                              No items loaded.
                            </td>
                          </tr>
                        ) : (
                          (r.items ?? []).map((it: any) => (
                            <tr key={it.id} className="border-t border-gray-200 dark:border-gray-700">
                              <td className="px-2 py-1">
                                {it.product?.name ?? '-'}
                                {it.variation?.name && (
                                  <span className="text-gray-500"> · {it.variation.name}</span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-right font-mono">{fmtQty(it.quantity_returned)}</td>
                              <td className="px-2 py-1 text-right font-mono">{fmtNum(it.unit_cost)}</td>
                              <td className="px-2 py-1">
                                {reasonLabel(it.reason_code)}
                                {it.reason && <div className="text-[10px] text-gray-500 italic">{it.reason}</div>}
                              </td>
                              <td className="px-2 py-1 text-right font-mono font-semibold">{fmtNum(it.line_total)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Settlements */}
                {(r.settlements ?? []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Settlement History</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700">
                            <th className="px-2 py-1 text-left">Date</th>
                            <th className="px-2 py-1 text-left">Action</th>
                            <th className="px-2 py-1 text-right">Amount</th>
                            <th className="px-2 py-1 text-left">Method</th>
                            <th className="px-2 py-1 text-left">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(r.settlements ?? []).map((s: any) => (
                            <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                              <td className="px-2 py-1">{fmtDate(s.created_at)}</td>
                              <td className="px-2 py-1">{s.action === 'refund_received' ? 'Refund received' : 'Credit applied'}</td>
                              <td className="px-2 py-1 text-right font-mono">{fmtNum(s.amount)}</td>
                              <td className="px-2 py-1">{s.payment_method}</td>
                              <td className="px-2 py-1">{s.creator?.name ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDetailsDialog(false)}
                  className="w-full px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Settle dialog ────────────────────────────────────────────── */}
      {showSettleDialog && (() => {
        const outstanding = settleTarget ? getOutstanding(settleTarget) : 0;
        const amt = Number(settleForm.amount);
        const invalid = !amt || !Number.isFinite(amt) || amt <= 0 || amt > outstanding;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-semibold">Record Settlement</h3>
                <button
                  onClick={() => { setShowSettleDialog(false); setSettleTarget(null); }}
                  className="p-1 rounded hover:bg-white/20 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {settleLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner size="md" />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {settleTarget && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                      <ReadOnlyField label="Return" value={settleTarget.return_number} mono />
                      <ReadOnlyField
                        label="Debit Note"
                        value={settleTarget.debit_note_number ?? 'Not issued'}
                        mono
                      />
                      <ReadOnlyField label="Total" value={fmtNum(settleTarget.total_amount)} mono />
                      <ReadOnlyField label="Outstanding" value={fmtNum(outstanding)} mono strong />
                    </div>
                  )}

                  <FormRow label="Action" labelWidth="w-20">
                    <select
                      value={settleForm.action}
                      onChange={e => setSettleForm(f => ({ ...f, action: e.target.value }))}
                      className={inputCls()}
                    >
                      {SETTLEMENT_ACTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </FormRow>

                  <FormRow
                    label="Amount"
                    labelWidth="w-20"
                    error={settleForm.amount && invalid
                      ? `Must be greater than 0 and at most ${fmtNum(outstanding)}.`
                      : null}
                  >
                    <input
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={outstanding}
                      value={settleForm.amount}
                      onChange={e => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      className={inputCls(invalid && !!settleForm.amount) + ' text-right'}
                    />
                  </FormRow>

                  <FormRow label="Method" labelWidth="w-20">
                    <select
                      value={settleForm.payment_method}
                      onChange={e => setSettleForm(f => ({ ...f, payment_method: e.target.value }))}
                      className={inputCls()}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </FormRow>

                  <FormRow label="Reference" labelWidth="w-20">
                    <input
                      type="text"
                      value={settleForm.reference}
                      onChange={e => setSettleForm(f => ({ ...f, reference: e.target.value }))}
                      placeholder="Transaction or cheque number"
                      className={inputCls()}
                    />
                  </FormRow>

                  <FormRow label="Notes" labelWidth="w-20" className="mt-2">
                    <textarea
                      rows={2}
                      value={settleForm.notes}
                      onChange={e => setSettleForm(f => ({ ...f, notes: e.target.value }))}
                      className={`${inputCls()} resize-y`}
                    />
                  </FormRow>
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => { setShowSettleDialog(false); setSettleTarget(null); }}
                  disabled={settling}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettleSubmit}
                  disabled={settling || settleLoading || invalid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white cursor-pointer"
                >
                  {settling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {settling ? 'Processing…' : 'Record Settlement'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Form primitives ───────────────────────────────────────────────────────────
//
// Copied from components/product-manage/product-detail-panel.tsx so both forms
// read as one system: a right-aligned fixed-width label, then the control. The
// error is indented past the label rather than sitting under the input, which
// keeps multi-field rows aligned when only one of them is wrong.

function FormRow({
  label,
  required,
  error,
  children,
  labelWidth = 'w-16',
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label
          className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && (
        <p className={`text-[10px] text-red-500 mt-0.5 ${labelWidth === 'w-16' ? 'ml-[4.375rem]' : 'ml-[5.375rem]'}`}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A label/value pair that is derived, not entered — PO totals, the running debit
 * estimate. Styled as a FormRow so derived figures line up with the inputs next
 * to them instead of floating in a separate summary box.
 */
function ReadOnlyField({
  label,
  value,
  mono,
  muted,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  /** Tabular figures for money and quantities. */
  mono?: boolean;
  /** De-emphasised for intermediate subtotals. */
  muted?: boolean;
  /** Emphasised for the final total. */
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="w-20 shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right">
        {label}:
      </label>
      <div
        className={[
          'flex-1 min-w-0 truncate',
          mono ? 'font-mono' : '',
          strong
            ? 'text-sm font-bold text-gray-900 dark:text-gray-100'
            : muted
              ? 'text-xs text-gray-500 dark:text-gray-400'
              : 'text-xs text-gray-700 dark:text-gray-300',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  );
}
