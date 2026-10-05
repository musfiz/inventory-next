'use client';

import { useState } from 'react';
import {
  FileText,
  Wallet,
  ArrowDownLeft,
  Undo2,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import supplierService from '@/services/supplierService';
import { formatCurrency, formatNumber, formatDate, todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
import { notify } from '@/lib/notifications';
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
import { useServerReportExport } from '@/hooks/reports/use-server-report-export';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type {
  SupplierStatementReport,
  SupplierStatementRow,
  SupplierStatementType,
} from '@/types/report.types';

/** Kept in step with App\Reports\Purchase\SupplierStatementReport::TYPES. */
const DOC_TYPES: { value: SupplierStatementType; label: string }[] = [
  { value: 'purchase', label: 'Purchases' },
  { value: 'payment', label: 'Payments' },
  { value: 'return', label: 'Purchase Returns' },
];

const TYPE_BADGES: Record<string, string> = {
  purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  return: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const PERIOD_PRESETS = [
  { label: 'This Month', from: () => firstDayOfMonthISO(), to: () => todayISO() },
  { label: 'Last 30 Days', from: () => shiftDays(-30), to: () => todayISO() },
  { label: 'Last 90 Days', from: () => shiftDays(-90), to: () => todayISO() },
  { label: 'This Year', from: () => `${todayISO().slice(0, 4)}-01-01`, to: () => todayISO() },
];

/**
 * A Y-m-d date `days` from today, built from local calendar parts.
 *
 * Deliberately not `toISOString()`: that converts to UTC first, which shifts the
 * day for anyone east or west of Greenwich and can hand the API a date the user
 * did not ask for.
 */
function shiftDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function SupplierStatementPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<SupplierStatementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [docType, setDocType] = useState<SupplierStatementType | ''>('');
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (docType) params.type = docType;
    if (search.trim()) params.search = search.trim();
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.supplierStatement(params as any);
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => {
    // A statement is one supplier's account — there is nothing to print without
    // one, so say so instead of firing a request the API will reject.
    if (!supplier) {
      notify.warning('Please select a supplier first');
      return;
    }
    fetchReport(buildParams());
  };

  /** Clicking an already-active type clears it, so the control toggles. */
  const applyType = (value: SupplierStatementType) => {
    const next = docType === value ? '' : value;
    setDocType(next);
    const params = buildParams();
    if (next === '') {
      delete params.type;
    } else {
      params.type = next;
    }
    fetchReport(params);
  };

  const applyPreset = (preset: (typeof PERIOD_PRESETS)[number]) => {
    setStartDate(preset.from());
    setEndDate(preset.to());
  };

  const reset = () => {
    setSelectedTenantId('');
    setSupplier(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setDocType('');
    setSearch('');
    setData(null);
    setError(null);
  };

  const loadSuppliers = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const res = await supplierService.getSuppliers({
        search: inputValue,
        per_page: 25,
        ...(scopeTenantId ? { tenant_id: scopeTenantId } : {}),
      });
      const rows = res?.data?.data ?? res?.data ?? [];
      return (Array.isArray(rows) ? rows : []).map((s: any) => ({
        value: String(s.id),
        label: s.name,
      }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Opening Balance',
          value: formatCurrency(summary.opening_balance),
          color: 'blue',
          icon: Wallet,
          subValue: `brought forward from before ${formatDate(summary.start_date, 'short')}`,
        },
        {
          label: 'Total Purchased',
          value: formatCurrency(summary.total_purchased),
          color: 'purple',
          icon: ArrowDownLeft,
          subValue: `${formatNumber(data?.data.filter((r) => r.type_key === 'purchase').length ?? 0)} purchase documents`,
        },
        {
          label: 'Total Paid',
          value: formatCurrency(summary.total_paid),
          color: 'green',
          icon: Scale,
          subValue: `${formatCurrency(summary.total_returned)} in returns`,
        },
        {
          label: 'Closing Balance',
          value: formatCurrency(summary.closing_balance),
          color: summary.closing_balance > 0 ? 'red' : 'green',
          icon: FileText,
          subValue:
            summary.over_credited > 0
              ? 'supplier is in credit'
              : `${formatNumber(summary.document_count)} documents`,
        },
      ]
    : [];

  /** One card per document type, doubling as the drill-down control. */
  const typeCards: SummaryCard[] = DOC_TYPES.map((t) => {
    const rows = data?.data.filter((r) => r.type_key === t.value) ?? [];
    const amount = rows.reduce((sum, r) => sum + (t.value === 'purchase' ? r.debit : r.credit), 0);
    const tone = t.value === 'purchase' ? 'purple' : t.value === 'payment' ? 'green' : 'orange';
    return {
      label: t.label,
      value: formatCurrency(amount),
      color: tone,
      subValue: `${formatNumber(rows.length)} documents`,
      onClick: () => applyType(t.value),
      active: docType === t.value,
    } as SummaryCard;
  });

  /** Zero money columns stay quiet so the eye lands on real movements. */
  const moneyCell = (value: number) => (
    <span className={value > 0 ? '' : 'text-muted-foreground'}>{formatCurrency(value)}</span>
  );

  const columns: ReportColumn<SupplierStatementRow>[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'document_number', header: 'Document' },
    {
      key: 'type',
      header: 'Type',
      align: 'center',
      cell: (_value: unknown, row: SupplierStatementRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            TYPE_BADGES[row.type_key] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Details',
      cell: (value: string) => (
        <span className="text-muted-foreground">{value || '—'}</span>
      ),
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? <span className="font-medium">{formatCurrency(value)}</span> : moneyCell(0),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(value)}</span>
        ) : (
          moneyCell(0)
        ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (value: number) => (
        <span className={value < 0 ? 'font-medium text-blue-600 dark:text-blue-400' : 'font-medium'}>
          {formatCurrency(value)}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        document_number: 'Totals',
        debit: formatCurrency(summary.total_purchased),
        credit: formatCurrency(summary.total_credited),
        balance: formatCurrency(summary.closing_balance),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('supplier', 'statement', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        summary.supplier_name ?? 'Supplier',
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'One supplier’s account, document by document, with a running balance';

  return (
    <ReportLayout
      title="Supplier Statement"
      description={description}
      icon={FileText}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setSupplier(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField
              label="Supplier"
              hint={scopeReady ? 'Required — a statement covers one supplier' : 'select a tenant first'}
            >
              <CustomSelect
                key={`sup-${scopeTenantId || 'unscoped'}`}
                value={supplier}
                onChange={setSupplier}
                loadOptions={loadSuppliers}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'Select a supplier' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Period">
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FilterField>
            <FilterField label="Document Type">
              <select
                className={filterSelectClass}
                value={docType}
                onChange={(e) => setDocType(e.target.value as SupplierStatementType | '')}
              >
                <option value="">All Documents</option>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Search">
              <input
                type="search"
                className={filterInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Document number or details"
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={
        cards.length > 0 ? (
          <>
            <ReportSummaryCards cards={cards} />
            <div className="mt-3">
              <ReportSummaryCards cards={typeCards} />
            </div>
            {summary && summary.over_credited > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                The closing balance is negative — this supplier is holding{' '}
                {formatCurrency(summary.over_credited)} more than we owe them.
              </p>
            )}
          </>
        ) : undefined
      }
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
          rowKey={(row) => `${row.date}-${row.document_number}`}
          showSerial
          serialHeader="#"
        />
      )}
    </ReportLayout>
  );
}