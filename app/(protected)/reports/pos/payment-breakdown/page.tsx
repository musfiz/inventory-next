'use client';

import {
  HandCoins,
  Coins,
  Wallet,
  Banknote,
  CreditCard,
  Undo2,
  Clock,
  Receipt,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
  filterInputClass,
  filterSelectClass,
  ReportSummaryCards,
  ReportTable,
  ReportExportBar,
  type ReportColumn,
  type SummaryCard,
} from '@/components/reports';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  firstDayOfMonthISO,
  todayISO,
} from '@/lib/utils/format';
import { posRegisterService, posSessionService, userService } from '@/services';
import reportService from '@/services/reportService';
import { useAuthStore } from '@/stores/auth-store';
import type { PaymentBreakdownReport, PaymentBreakdownRow } from '@/types/report.types';

/**
 * Mirrors `PosPaymentBreakdownReport::PAYMENT_METHODS` / `::STATUSES` on the
 * backend, which in turn mirror the `payments` table enums.
 */
const PAYMENT_METHODS: SelectOption[] = [
  { value: '', label: 'All Methods' },
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

const STATUSES: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

/** Only the two reference types that settle a POS order. */
const REFERENCE_TYPES: SelectOption[] = [
  { value: '', label: 'Sales & Refunds' },
  { value: 'pos', label: 'Sales (pos)' },
  { value: 'refund', label: 'Refund settlements' },
];

const humanize = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

export default function PaymentBreakdownPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<PaymentBreakdownReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [cashier, setCashier] = useState<SelectOption | null>(null);
  const [register, setRegister] = useState<SelectOption | null>(null);
  const [session, setSession] = useState<SelectOption | null>(null);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  /** Registers and sessions are per-tenant, so they wait for a tenant. */
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (paymentMethod) params.payment_method = paymentMethod;
    if (status) params.status = status;
    if (referenceType) params.reference_type = referenceType;
    if (cashier) params.cashier_id = cashier.value;
    if (register) params.register_id = register.value;
    if (session) params.session_id = session.value;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.paymentBreakdown(buildParams());
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedTenantId('');
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setPaymentMethod('');
    setStatus('');
    setReferenceType('');
    setCashier(null);
    setRegister(null);
    setSession(null);
    setSearch('');
    setData(null);
    setError(null);
  };

  /** Changing tenant invalidates every tenant-scoped option, so clear them. */
  const onTenantChange = (tid?: string | null) => {
    setSelectedTenantId(tid || '');
    setRegister(null);
    setSession(null);
  };

  const loadRegisters = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await posRegisterService.dropdown(scopeTenantId || undefined);
      const q = inputValue.trim().toLowerCase();
      return (rows || [])
        .map((r: any) => ({ value: String(r.id), label: r.name }))
        .filter((o: SelectOption) => !q || o.label.toLowerCase().includes(q));
    } catch {
      return [];
    }
  };

  const loadSessions = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const res = await posSessionService.list({
        search: inputValue.trim() || undefined,
        tenant_id: scopeTenantId || undefined,
        per_page: 50,
      });
      const q = inputValue.trim().toLowerCase();
      return (res?.data || [])
        .map((s: any) => ({
          value: String(s.id),
          label: s.session_number
            ? `Session ${s.session_number}`
            : `Session ${String(s.id).slice(0, 8)}`,
        }))
        .filter((o: SelectOption) => !q || o.label.toLowerCase().includes(q));
    } catch {
      return [];
    }
  };

  /**
   * Cashiers are `users`. The users endpoint is tenant-scoped by a global scope,
   * but a super admin sees every tenant's users — which is harmless here
   * because the report also filters on tenant, so picking one from another
   * tenant simply returns no rows.
   */
  const loadCashiers = async (inputValue: string): Promise<SelectOption[]> => {
    try {
      const res = await userService.getUsers({
        search: inputValue.trim() || undefined,
        per_page: 50,
      });
      return (res?.data || []).map((u: any) => ({
        value: String(u.id),
        label: u.name ?? u.email ?? String(u.id),
      }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;
  const top = summary?.top_method?.[0];

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Received',
          value: formatCurrency(summary.total_received),
          color: 'green',
          icon: Coins,
          subValue: `across ${formatNumber(summary.received_count)} settled transaction${
            summary.received_count === 1 ? '' : 's'
          }`,
        },
        {
          label: 'Net After Refunds',
          value: formatCurrency(summary.net_amount),
          color: summary.net_amount > 0 ? 'blue' : 'gray',
          icon: Wallet,
          subValue:
            summary.total_refunded > 0.005
              ? `${formatCurrency(summary.total_refunded)} paid back out`
              : 'no refunds in range',
        },
        {
          label: 'Cash Received',
          value: formatCurrency(summary.cash_received),
          color: 'amber',
          icon: Banknote,
          subValue:
            summary.cash_share_pct !== null
              ? `${formatPercent(summary.cash_share_pct)} of takings — checkable against the drawer`
              : 'no cash taken in range',
        },
        {
          label: 'Digital Received',
          value: formatCurrency(summary.digital_received),
          color: 'purple',
          icon: CreditCard,
          subValue:
            summary.digital_share_pct !== null
              ? `${formatPercent(summary.digital_share_pct)} of takings`
              : 'no digital takings in range',
        },
        {
          label: 'Refunded Out',
          value: formatCurrency(summary.total_refunded),
          color: summary.total_refunded > 0.005 ? 'orange' : 'gray',
          icon: Undo2,
          subValue: 'settlements flagged refunded',
        },
        {
          label: 'Pending',
          value: formatCurrency(summary.total_pending),
          color: summary.total_pending > 0.005 ? 'red' : 'gray',
          icon: Clock,
          subValue:
            summary.total_pending > 0.005
              ? 'taken but not yet settled'
              : 'nothing unsettled',
        },
        {
          label: 'Avg Transaction',
          value: formatCurrency(summary.avg_transaction),
          color: 'blue',
          icon: Receipt,
          subValue: `${formatNumber(summary.transaction_count)} attempts, ${formatNumber(
            summary.received_count,
          )} settled`,
        },
        {
          label: 'Top Method',
          value: top ? humanize(top.label) : '—',
          color: 'purple',
          icon: Trophy,
          subValue: top
            ? `${formatCurrency(top.value)} net${
                top.share_pct != null ? ` · ${formatPercent(top.share_pct)} of takings` : ''
              }`
            : 'no takings in range',
        },
      ]
    : [];

  const columns: ReportColumn<PaymentBreakdownRow>[] = [
    {
      key: 'payment_method',
      header: 'Payment Method',
      cell: (value: string, row) => (
        <div className="min-w-0">
          <div
            className={
              // The backend returns every method zero-filled, so a method with
              // no activity is muted — otherwise nine rows all at zero look
              // like nine real takings figures.
              row.received > 0 || row.refunded > 0
                ? 'truncate font-medium text-gray-900 dark:text-gray-100'
                : 'truncate text-gray-400 dark:text-gray-500'
            }
          >
            {humanize(value)}
          </div>
          {row.received <= 0 && row.refunded <= 0 && (
            <div className="text-[11px] text-muted-foreground">No activity</div>
          )}
        </div>
      ),
    },
    { key: 'transaction_count', header: 'Attempts', format: 'number', align: 'right' },
    {
      key: 'failed_count',
      header: 'Failed',
      format: 'number',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatNumber(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'received',
      header: 'Received',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="font-medium">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'refunded',
      header: 'Refunded',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="text-orange-600 dark:text-orange-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'net_amount',
      header: 'Net',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="font-medium">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'pending',
      header: 'Pending',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? (
          <span className="text-amber-600 dark:text-amber-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'avg_transaction',
      header: 'Avg Txn',
      format: 'currency',
      align: 'right',
      // Zero renders as a dash rather than ৳0.00, to match the other money
      // columns: most methods in a zero-filled table took nothing at all, and
      // a column of ৳0.00 reads as noise.
      cell: (value: number) =>
        value > 0.005 ? formatCurrency(value) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'largest_transaction',
      header: 'Largest',
      format: 'currency',
      align: 'right',
      cell: (value: number) =>
        value > 0.005 ? formatCurrency(value) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'share_pct',
      header: 'Share %',
      format: 'percent',
      align: 'right',
      cell: (value: number) => {
        if (!value) return <span className="text-muted-foreground">—</span>;
        const pct = Math.max(0, Math.min(100, value));
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="tabular-nums">{formatPercent(value)}</span>
          </div>
        );
      },
    },
  ];

  const totalsRow = summary
    ? {
        payment_method: 'Totals',
        transaction_count: formatNumber(summary.transaction_count),
        failed_count: formatNumber(
          data?.data.reduce((s, r) => s + r.failed_count, 0) ?? 0,
        ),
        received: formatCurrency(summary.total_received),
        refunded: formatCurrency(summary.total_refunded),
        net_amount: formatCurrency(summary.net_amount),
        pending: formatCurrency(summary.total_pending),
        // The period's average per settled transaction, from the summary —
        // summing per-method averages would be meaningless.
        avg_transaction: formatCurrency(summary.avg_transaction),
        // A MAX, never summed.
        largest_transaction: '',
        // Shares already add up to the total.
        share_pct: '',
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('pos', 'payment-breakdown', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const periodLabel = summary
    ? summary.start_date === summary.end_date
      ? formatDate(summary.start_date, 'long')
      : `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`
    : null;

  const description = summary
    ? [periodLabel, generatedAt ? `generated ${generatedAt}` : null].filter(Boolean).join(' · ')
    : 'Money in and out of the till, by payment method';

  return (
    <ReportLayout
      title="POS Payment Breakdown"
      description={description}
      icon={HandCoins}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={onTenantChange}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Cashier">
              <CustomSelect
                value={cashier}
                onChange={setCashier}
                loadOptions={loadCashiers}
                defaultOptions
                isClearable
                compact
                placeholder="All cashiers"
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={5}>
            <FilterField label="Register" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`reg-${scopeTenantId || 'unscoped'}`}
                value={register}
                onChange={(opt) => {
                  setRegister(opt);
                  setSession(null);
                }}
                loadOptions={loadRegisters}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All registers' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Session" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`ses-${scopeTenantId || 'unscoped'}`}
                value={session}
                onChange={setSession}
                loadOptions={loadSessions}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All sessions' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Payment Method">
              <select
                className={filterSelectClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Reference">
              <select
                className={filterSelectClass}
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value)}
              >
                {REFERENCE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow columns={1}>
            <FilterField label="Search" hint="matches the payment method">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. bkash"
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} columns={4} /> : undefined}
      loading={loading}
      error={error}
      hasData={!!data}
      actions={
        <ReportExportBar
          onExportPDF={exportPDF}
          onExportExcel={exportExcel}
          onExportCSV={exportCSV}
          onPrint={handlePrint}
          loading={!!exportLoading}
          disabled={!data}
        />
      }
    >
      {data && (
        <ReportTable
          columns={columns}
          data={data.data}
          pageSize={25}
          totalsRow={totalsRow}
          // payment_method is one row per method and is always present,
          // because the backend returns the full zero-filled spine.
          rowKey={(row) => row.payment_method}
          searchKeys={['payment_method']}
          showSerial
          serialHeader="SL"
          emptyMessage="No POS payments in this period"
        />
      )}
    </ReportLayout>
  );
}