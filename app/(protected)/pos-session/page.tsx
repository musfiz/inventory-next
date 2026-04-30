'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Lock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posSessionService, posRegisterService, commonService } from '@/services';
import type { PosSession } from '@/services/posSessionService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import DateTimePicker from '@/components/ui/date-time-picker';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'open' | 'edit' | 'close' | null;

interface SessionFormData {
  tenant_id: string;
  register_id: string;
  user_id: string;
  session_number: string;
  start_time: string;
  end_time: string;
  opening_balance: string;
  closing_balance: string;
  actual_cash: string;
  total_sales: string;
  total_refunds: string;
  total_discount: string;
  total_tax: string;
  cash_sales: string;
  card_sales: string;
  bkash_sales: string;
  nagad_sales: string;
  rocket_sales: string;
  bank_transfer_sales: string;
  credit_sales: string;
  cash_in: string;
  cash_out: string;
  sale_count: string;
  refund_count: string;
  item_count: string;
  customer_count: string;
  status: string;
  opening_notes: string;
  closing_notes: string;
  closing_reason: string;
}

interface CloseFormData {
  actual_cash: string;
  closing_balance: string;
  closing_notes: string;
  closing_reason: string;
}

const emptyForm = (): SessionFormData => ({
  tenant_id: '', register_id: '', user_id: '', session_number: '',
  start_time: '', end_time: '',
  opening_balance: '0', closing_balance: '', actual_cash: '',
  total_sales: '0', total_refunds: '0', total_discount: '0', total_tax: '0',
  cash_sales: '0', card_sales: '0', bkash_sales: '0', nagad_sales: '0',
  rocket_sales: '0', bank_transfer_sales: '0', credit_sales: '0',
  cash_in: '0', cash_out: '0',
  sale_count: '0', refund_count: '0', item_count: '0', customer_count: '0',
  status: 'open', opening_notes: '', closing_notes: '', closing_reason: '',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    open:      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    closed:    'bg-gray-100  text-gray-700  dark:bg-gray-700  dark:text-gray-300',
    paused:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    suspended: 'bg-red-100  text-red-700   dark:bg-red-900   dark:text-red-200',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosSessionPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [mode, setMode] = useState<Mode>(null);
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [defaultRegisterOptions, setDefaultRegisterOptions] = useState<any[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [selectedTenant, setSelectedTenant]     = useState<any>(null);

  const [form, setForm] = useState<SessionFormData>(emptyForm());

  const [closeForm, setCloseForm] = useState<CloseFormData>({
    actual_cash: '', closing_balance: '', closing_notes: '', closing_reason: '',
  });

  const sf = (field: keyof SessionFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Dropdown loaders ─────────────────────────────────────────────────────

  const loadRegisterOptions = async (input: string) => {
    const list = await posRegisterService.dropdown().catch(() => []);
    return (list || []).map((r: any) => ({ value: r.id, label: r.name }));
  };

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const list = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
    return (list || []).map((t: any) => ({ value: t.id, label: t.business_name }));
  };

  useEffect(() => {
    posRegisterService.dropdown()
      .then((list: any[]) => setDefaultRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name }))))
      .catch(() => {});
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !form.tenant_id) errs.tenant_id = 'Tenant is required';
    if (!form.register_id)               errs.register_id = 'Register is required';
    if (form.opening_balance === '' || Number(form.opening_balance) < 0)
      errs.opening_balance = 'Opening balance must be ≥ 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCloseForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (closeForm.actual_cash !== '' && Number(closeForm.actual_cash) < 0)
      errs.actual_cash = 'Actual cash must be ≥ 0';
    if (closeForm.closing_balance !== '' && Number(closeForm.closing_balance) < 0)
      errs.closing_balance = 'Closing balance must be ≥ 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenNew = () => {
    setMode('open');
    setActiveSession(null);
    setSelectedRegister(null);
    setSelectedTenant(null);
    const f = emptyForm();
    f.tenant_id = isSuperAdmin ? '' : (authUser?.tenant_id ?? '');
    setForm(f);
    setErrors({});
  };

  const handleEdit = (session: PosSession) => {
    setMode('edit');
    setActiveSession(session);
    setSelectedRegister(session.register ? { value: session.register.id, label: session.register.name } : null);
    setSelectedTenant(null);
    setForm({
      tenant_id:           String(session.tenant_id ?? ''),
      register_id:         String(session.register_id ?? ''),
      user_id:             String(session.user_id ?? ''),
      session_number:      String(session.session_number ?? ''),
      start_time:          session.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : '',
      end_time:            session.end_time   ? new Date(session.end_time).toISOString().slice(0, 16)   : '',
      opening_balance:     String(session.opening_balance     ?? '0'),
      closing_balance:     String(session.closing_balance     ?? ''),
      actual_cash:         String(session.actual_cash         ?? ''),
      total_sales:         String(session.total_sales         ?? '0'),
      total_refunds:       String(session.total_refunds       ?? '0'),
      total_discount:      String(session.total_discount      ?? '0'),
      total_tax:           String(session.total_tax           ?? '0'),
      cash_sales:          String(session.cash_sales          ?? '0'),
      card_sales:          String(session.card_sales          ?? '0'),
      bkash_sales:         String(session.bkash_sales         ?? '0'),
      nagad_sales:         String(session.nagad_sales         ?? '0'),
      rocket_sales:        String(session.rocket_sales        ?? '0'),
      bank_transfer_sales: String(session.bank_transfer_sales ?? '0'),
      credit_sales:        String(session.credit_sales        ?? '0'),
      cash_in:             String(session.cash_in             ?? '0'),
      cash_out:            String(session.cash_out            ?? '0'),
      sale_count:          String(session.sale_count          ?? '0'),
      refund_count:        String(session.refund_count        ?? '0'),
      item_count:          String(session.item_count          ?? '0'),
      customer_count:      String(session.customer_count      ?? '0'),
      status:              String(session.status              ?? 'open'),
      opening_notes:       String(session.opening_notes       ?? ''),
      closing_notes:       String(session.closing_notes       ?? ''),
      closing_reason:      String(session.closing_reason      ?? ''),
    });
    setErrors({});
  };

  const handleCloseModal = (session: PosSession) => {
    setMode('close');
    setActiveSession(session);
    setCloseForm({ actual_cash: '', closing_balance: '', closing_notes: '', closing_reason: '' });
    setErrors({});
  };

  const handleCancel = () => { setMode(null); setActiveSession(null); setErrors({}); };

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

  const buildPayload = () => ({
    tenant_id:           form.tenant_id           || undefined,
    register_id:         form.register_id         || undefined,
    user_id:             form.user_id             || undefined,
    session_number:      form.session_number      || undefined,
    start_time:          form.start_time          || undefined,
    end_time:            form.end_time            || undefined,
    opening_balance:     form.opening_balance     !== '' ? Number(form.opening_balance)     : 0,
    closing_balance:     form.closing_balance     !== '' ? Number(form.closing_balance)     : undefined,
    actual_cash:         form.actual_cash         !== '' ? Number(form.actual_cash)         : undefined,
    total_sales:         form.total_sales         !== '' ? Number(form.total_sales)         : 0,
    total_refunds:       form.total_refunds       !== '' ? Number(form.total_refunds)       : 0,
    total_discount:      form.total_discount      !== '' ? Number(form.total_discount)      : 0,
    total_tax:           form.total_tax           !== '' ? Number(form.total_tax)           : 0,
    cash_sales:          form.cash_sales          !== '' ? Number(form.cash_sales)          : 0,
    card_sales:          form.card_sales          !== '' ? Number(form.card_sales)          : 0,
    bkash_sales:         form.bkash_sales         !== '' ? Number(form.bkash_sales)         : 0,
    nagad_sales:         form.nagad_sales         !== '' ? Number(form.nagad_sales)         : 0,
    rocket_sales:        form.rocket_sales        !== '' ? Number(form.rocket_sales)        : 0,
    bank_transfer_sales: form.bank_transfer_sales !== '' ? Number(form.bank_transfer_sales) : 0,
    credit_sales:        form.credit_sales        !== '' ? Number(form.credit_sales)        : 0,
    cash_in:             form.cash_in             !== '' ? Number(form.cash_in)             : 0,
    cash_out:            form.cash_out            !== '' ? Number(form.cash_out)            : 0,
    sale_count:          form.sale_count          !== '' ? Number(form.sale_count)          : 0,
    refund_count:        form.refund_count        !== '' ? Number(form.refund_count)        : 0,
    item_count:          form.item_count          !== '' ? Number(form.item_count)          : 0,
    customer_count:      form.customer_count      !== '' ? Number(form.customer_count)      : 0,
    status:              form.status              || 'open',
    opening_notes:       form.opening_notes       || undefined,
    closing_notes:       form.closing_notes       || undefined,
    closing_reason:      form.closing_reason      || undefined,
  });

  const handleSubmitOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await posSessionService.open(buildPayload());
      notify.success('Session opened successfully');
      setMode(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !validateForm()) return;
    setSubmitting(true);
    try {
      await posSessionService.update(activeSession.id, buildPayload());
      notify.success('Session updated successfully');
      setMode(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleSubmitClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !validateCloseForm()) return;
    setSubmitting(true);
    try {
      await posSessionService.close(activeSession.id, {
        actual_cash:     closeForm.actual_cash     !== '' ? Number(closeForm.actual_cash)     : undefined,
        closing_balance: closeForm.closing_balance !== '' ? Number(closeForm.closing_balance) : undefined,
        closing_notes:   closeForm.closing_notes   || undefined,
        closing_reason:  closeForm.closing_reason  || undefined,
      });
      notify.success('Session closed successfully');
      setMode(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) { handleError(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (session: PosSession) => {
    const result = await confirm({
      title: 'Delete Session',
      html: `Delete session <strong>${session.session_number}</strong>? This cannot be undone.`,
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await posSessionService.destroy(session.id);
      notify.success('Session deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete session');
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────

  const columns: ColumnDef<PosSession>[] = [
    { id: 'serial', header: 'SL', cell: ({ row, table }) => table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1 },
    { accessorKey: 'session_number', header: 'Session #', cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.session_number ?? '-'}</span> },
    { accessorKey: 'register_id',    header: 'Register',  cell: ({ row }) => <span>{(row.original as any).register?.name ?? '-'}</span> },
    { accessorKey: 'user_id',        header: 'Cashier',   cell: ({ row }) => <span>{(row.original as any).user?.name ?? '-'}</span> },
    { accessorKey: 'start_time',     header: 'Start Time',cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.start_time)}</span> },
    { accessorKey: 'end_time',       header: 'End Time',  cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.end_time)}</span> },
    { accessorKey: 'opening_balance',     header: 'Opening Bal',  cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.opening_balance)}</span> },
    { accessorKey: 'closing_balance',     header: 'Closing Bal',  cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.closing_balance)}</span> },
    { accessorKey: 'actual_cash',         header: 'Actual Cash',  cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.actual_cash)}</span> },
    { accessorKey: 'total_sales',         header: 'Total Sales',  cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.total_sales)}</span> },
    { accessorKey: 'total_refunds',       header: 'Refunds',      cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.total_refunds)}</span> },
    { accessorKey: 'total_discount',      header: 'Discount',     cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.total_discount)}</span> },
    { accessorKey: 'total_tax',           header: 'Tax',          cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.total_tax)}</span> },
    { accessorKey: 'cash_sales',          header: 'Cash Sales',   cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.cash_sales)}</span> },
    { accessorKey: 'card_sales',          header: 'Card Sales',   cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.card_sales)}</span> },
    { accessorKey: 'bkash_sales',         header: 'bKash',        cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.bkash_sales)}</span> },
    { accessorKey: 'nagad_sales',         header: 'Nagad',        cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.nagad_sales)}</span> },
    { accessorKey: 'rocket_sales',        header: 'Rocket',       cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.rocket_sales)}</span> },
    { accessorKey: 'bank_transfer_sales', header: 'Bank Transfer',cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.bank_transfer_sales)}</span> },
    { accessorKey: 'credit_sales',        header: 'Credit',       cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.credit_sales)}</span> },
    { accessorKey: 'cash_in',             header: 'Cash In',      cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.cash_in)}</span> },
    { accessorKey: 'cash_out',            header: 'Cash Out',     cell: ({ row }) => <span className="font-mono text-xs">{fmtNum(row.original.cash_out)}</span> },
    { accessorKey: 'sale_count',          header: 'Sales',        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sale_count ?? 0}</span> },
    { accessorKey: 'refund_count',        header: 'Refunds #',    cell: ({ row }) => <span className="font-mono text-xs">{row.original.refund_count ?? 0}</span> },
    { accessorKey: 'item_count',          header: 'Items',        cell: ({ row }) => <span className="font-mono text-xs">{row.original.item_count ?? 0}</span> },
    { accessorKey: 'customer_count',      header: 'Customers',    cell: ({ row }) => <span className="font-mono text-xs">{row.original.customer_count ?? 0}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => statusBadge(row.original.status) },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {s.status === 'open' && (
              <button onClick={() => handleCloseModal(s)} title="Close session" className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer">
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => handleEdit(s)} title="Edit session" className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => handleDelete(s)} title="Delete session" className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // ── Shared styles ─────────────────────────────────────────────────────────

  const inputCls = 'w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5';
  const errCls   = 'text-xs text-red-500 mt-0.5';
  const sectionCls = 'pt-3 pb-1 border-b border-gray-200 dark:border-gray-600 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

  // ── Shared form body ─────────────────────────────────────────────────────

  const renderFormBody = (isEdit = false) => (
    <>
      {/* ── Basic Info ── */}
      <p className={sectionCls}>Basic Info</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {isSuperAdmin && (
          <div>
            <label className={labelCls}>Tenant <span className="text-red-500">*</span></label>
            <CustomSelect
              value={selectedTenant}
              onChange={opt => { setSelectedTenant(opt); setForm(f => ({ ...f, tenant_id: opt?.value ?? '' })); }}
              loadOptions={loadTenantOptions}
              placeholder="Select tenant"
              className="text-sm"
            />
            {errors.tenant_id && <p className={errCls}>{errors.tenant_id}</p>}
          </div>
        )}
        <div>
          <label className={labelCls}>Register <span className="text-red-500">*</span></label>
          <CustomSelect
            value={selectedRegister}
            onChange={opt => { setSelectedRegister(opt); setForm(f => ({ ...f, register_id: opt?.value ?? '' })); }}
            loadOptions={loadRegisterOptions}
            defaultOptions={defaultRegisterOptions}
            placeholder="Select register"
            className="text-sm"
          />
          {errors.register_id && <p className={errCls}>{errors.register_id}</p>}
        </div>
        <div>
          <label className={labelCls}>Session #</label>
          <input type="text" value={form.session_number} onChange={sf('session_number')} placeholder="Auto-generated if blank" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={sf('status')} className={inputCls}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* ── Time ── */}
      <p className={sectionCls}>Time</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Start Time</label>
          <DateTimePicker value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} placeholder="Select start time" />
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <DateTimePicker value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} placeholder="Select end time" />
        </div>
      </div>

      {/* ── Balances ── */}
      <p className={sectionCls}>Balances</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <label className={labelCls}>Opening Balance <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" min="0" value={form.opening_balance} onChange={sf('opening_balance')} className={inputCls} />
          {errors.opening_balance && <p className={errCls}>{errors.opening_balance}</p>}
        </div>
        <div>
          <label className={labelCls}>Closing Balance</label>
          <input type="number" step="0.01" min="0" value={form.closing_balance} onChange={sf('closing_balance')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Actual Cash</label>
          <input type="number" step="0.01" min="0" value={form.actual_cash} onChange={sf('actual_cash')} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Cash In</label>
            <input type="number" step="0.01" min="0" value={form.cash_in} onChange={sf('cash_in')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cash Out</label>
            <input type="number" step="0.01" min="0" value={form.cash_out} onChange={sf('cash_out')} className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Sales Totals ── */}
      <p className={sectionCls}>Sales Totals</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          ['total_sales',    'Total Sales'],
          ['total_refunds',  'Total Refunds'],
          ['total_discount', 'Total Discount'],
          ['total_tax',      'Total Tax'],
        ] as [keyof SessionFormData, string][]).map(([key, lbl]) => (
          <div key={key}>
            <label className={labelCls}>{lbl}</label>
            <input type="number" step="0.01" min="0" value={form[key] as string} onChange={sf(key)} className={inputCls} />
          </div>
        ))}
      </div>

      {/* ── Payment Methods ── */}
      <p className={sectionCls}>Payment Methods</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          ['cash_sales',          'Cash'],
          ['card_sales',          'Card'],
          ['bkash_sales',         'bKash'],
          ['nagad_sales',         'Nagad'],
          ['rocket_sales',        'Rocket'],
          ['bank_transfer_sales', 'Bank Transfer'],
          ['credit_sales',        'Credit'],
        ] as [keyof SessionFormData, string][]).map(([key, lbl]) => (
          <div key={key}>
            <label className={labelCls}>{lbl}</label>
            <input type="number" step="0.01" min="0" value={form[key] as string} onChange={sf(key)} className={inputCls} />
          </div>
        ))}
      </div>

      {/* ── Counts ── */}
      <p className={sectionCls}>Counts</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          ['sale_count',     'Sale Count'],
          ['refund_count',   'Refund Count'],
          ['item_count',     'Item Count'],
          ['customer_count', 'Customer Count'],
        ] as [keyof SessionFormData, string][]).map(([key, lbl]) => (
          <div key={key}>
            <label className={labelCls}>{lbl}</label>
            <input type="number" min="0" value={form[key] as string} onChange={sf(key)} className={inputCls} />
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      <p className={sectionCls}>Notes</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Opening Notes</label>
          <textarea rows={3} value={form.opening_notes} onChange={sf('opening_notes')} className={inputCls} placeholder="Notes about opening..." />
        </div>
        <div>
          <label className={labelCls}>Closing Notes</label>
          <textarea rows={3} value={form.closing_notes} onChange={sf('closing_notes')} className={inputCls} placeholder="Notes about closing..." />
        </div>
        <div>
          <label className={labelCls}>Closing Reason</label>
          <textarea rows={3} value={form.closing_reason} onChange={sf('closing_reason')} className={inputCls} placeholder="Reason for closing..." />
        </div>
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Sessions</h1>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Session
        </button>
      </div>

      {/* ── Open Session Form ── */}
      {mode === 'open' && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add New Session</h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmitOpen} className="space-y-2">
            {renderFormBody(false)}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save Session'}
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Session Form ── */}
      {mode === 'edit' && activeSession && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Edit Session — <span className="font-mono text-blue-600">{activeSession.session_number}</span>
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmitEdit} className="space-y-2">
            {renderFormBody(true)}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Close Session Form ── */}
      {mode === 'close' && activeSession && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Close Session — <span className="font-mono text-orange-600">{activeSession.session_number}</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Register: {(activeSession as any).register?.name ?? '-'} &nbsp;|&nbsp;
                Opened: {fmtDate(activeSession.start_time)} &nbsp;|&nbsp;
                Opening Balance: <strong>{fmtNum(activeSession.opening_balance)}</strong>
              </p>
            </div>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {/* Session summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 p-3 rounded-sm bg-gray-50 dark:bg-gray-700/50 text-sm">
            {[
              ['Total Sales',    fmtNum(activeSession.total_sales)],
              ['Total Refunds',  fmtNum(activeSession.total_refunds)],
              ['Cash Sales',     fmtNum(activeSession.cash_sales)],
              ['Sale Count',     String(activeSession.sale_count ?? 0)],
              ['Total Discount', fmtNum(activeSession.total_discount)],
              ['Total Tax',      fmtNum(activeSession.total_tax)],
              ['Cash In',        fmtNum(activeSession.cash_in)],
              ['Cash Out',       fmtNum(activeSession.cash_out)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{val}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmitClose} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Actual Cash Count</label>
                <input type="number" step="0.01" min="0" value={closeForm.actual_cash} onChange={e => setCloseForm(f => ({ ...f, actual_cash: e.target.value }))} placeholder="Physical cash in drawer" className={inputCls} />
                {errors.actual_cash && <p className={errCls}>{errors.actual_cash}</p>}
              </div>
              <div>
                <label className={labelCls}>Closing Balance</label>
                <input type="number" step="0.01" min="0" value={closeForm.closing_balance} onChange={e => setCloseForm(f => ({ ...f, closing_balance: e.target.value }))} placeholder="Cash to keep for next session" className={inputCls} />
                {errors.closing_balance && <p className={errCls}>{errors.closing_balance}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Closing Notes</label>
                <textarea rows={3} value={closeForm.closing_notes} onChange={e => setCloseForm(f => ({ ...f, closing_notes: e.target.value }))} className={inputCls} placeholder="Notes about this session closure..." />
              </div>
              <div>
                <label className={labelCls}>Closing Reason</label>
                <textarea rows={3} value={closeForm.closing_reason} onChange={e => setCloseForm(f => ({ ...f, closing_reason: e.target.value }))} className={inputCls} placeholder="Reason for closing (e.g. end of shift)..." />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-sm hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-60">
                <Lock className="w-4 h-4" />
                {submitting ? 'Closing…' : 'Close Session'}
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint="pos/sessions"
        pageSize={15}
        enableSearch
        searchPlaceholder="Search sessions…"
      />
    </div>
  );
}
