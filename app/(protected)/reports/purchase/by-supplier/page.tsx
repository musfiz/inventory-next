'use client';

import { useState } from 'react';
import {
  Building2,
  Coins,
  Award,
  Wallet,
  AlertTriangle,
  Layers,
  PackageCheck,
  Scale,
  Boxes,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import supplierService from '@/services/supplierService';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  todayISO,
  firstDayOfMonthISO,
} from '@/lib/utils/format';
import { notify } from '@/lib/notifications';
import {
  ReportLayout,
  ReportFilters,
  FilterRow,
  FilterField,
  FilterCheckbox,
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
  PurchaseBySupplierReport,
  PurchaseBySupplierRow,
  PurchaseOrderStatus,
} from '@/types/report.types';

/** Kept in step with purchase_orders.status. */
const PO_STATUSES: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseBySupplierPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<PurchaseBySupplierReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [supplier, setSupplier] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [search, setSearch] = useState('');

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (supplier) params.supplier_id = supplier.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    params.unpaid_only = unpaidOnly ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.purchaseBySupplier(params as any);
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load report';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => fetchReport(buildParams());

  /** Clicking an already-active "outstanding" card clears it, so it toggles. */
  const applyUnpaidOnly = () => {
    const next = !unpaidOnly;
    setUnpaidOnly(next);
    const params = buildParams();
    if (!next) delete params.unpaid_only;
    else params.unpaid_only = 1;
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setSupplier(null);
    setWarehouse(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setStatus('');
    setUnpaidOnly(false);
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

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({
        search: inputValue,
        tenant_id: scopeTenantId,
      });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Spend',
          value: formatCurrency(summary.total_value),
          color: 'blue',
          icon: Coins,
          subValue: `${formatNumber(summary.total_pos)} POs across ${formatNumber(summary.total_suppliers)} suppliers`,
        },
        {
          label: 'Top Supplier',
          value: summary.top_supplier ?? '—',
          color: 'purple',
          icon: Award,
          subValue: summary.top_supplier
            ? `${formatCurrency(summary.top_supplier_value ?? 0)} over ${formatNumber(summary.top_supplier_orders ?? 0)} POs (${formatPercent(summary.top_supplier_share_pct ?? 0)})`
            : 'no purchases in range',
        },
        {
          label: 'Total Paid',
          value: formatCurrency(summary.total_paid),
          color: 'green',
          icon: PackageCheck,
        },
        {
          label: 'Total Due',
          value: formatCurrency(summary.total_due),
          color: summary.total_due > 0 ? 'red' : 'green',
          icon: Wallet,
        },
        {
          label: 'Suppliers With Balance',
          value: formatNumber(summary.unpaid_suppliers),
          color: summary.unpaid_suppliers > 0 ? 'amber' : 'green',
          icon: AlertTriangle,
          onClick: applyUnpaidOnly,
          active: unpaidOnly,
        },
        {
          label: 'Avg Order Value',
          value: formatCurrency(summary.avg_order_value),
          color: 'gray',
          icon: Scale,
        },
        {
          label: 'Qty Ordered',
          value: formatNumber(summary.total_quantity_ordered, 2),
          color: 'gray',
          icon: Layers,
          subValue: `${formatNumber(summary.total_quantity_received, 2)} received (${formatPercent(summary.receiving_rate_pct)})`,
        },
        {
          label: 'Products',
          value: formatNumber(summary.total_products),
          color: 'gray',
          icon: Boxes,
          subValue: `across ${formatNumber(summary.total_lines)} order lines`,
        },
      ]
    : [];

  const columns: ReportColumn<PurchaseBySupplierRow>[] = [
    {
      key: 'supplier_name',
      header: 'Supplier',
      cell: (_value: unknown, row: PurchaseBySupplierRow) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{row.supplier_name ?? '—'}</div>
          {row.email && <div className="truncate text-xs text-muted-foreground">{row.email}</div>}
        </div>
      ),
    },
    { key: 'supplier_code', header: 'Code' },
    { key: 'po_count', header: 'POs', format: 'number', align: 'right' },
    { key: 'line_count', header: 'Lines', format: 'number', align: 'right' },
    { key: 'product_count', header: 'Products', format: 'number', align: 'right' },
    { key: 'quantity_ordered', header: 'Qty Ordered', format: 'qty', align: 'right' },
    { key: 'quantity_received', header: 'Qty Received', format: 'qty', align: 'right' },
    {
      key: 'pending_quantity',
      header: 'Qty Pending',
      format: 'qty',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">{formatNumber(value, 2)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'receiving_rate_pct',
      header: 'Received %',
      align: 'right',
      cell: (value: number) => (
        <span
          className={
            value >= 100
              ? 'font-medium text-green-600 dark:text-green-400'
              : value > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          }
        >
          {formatPercent(value)}
        </span>
      ),
    },
    {
      key: 'total_value',
      header: 'Total Value',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'total_paid', header: 'Paid', format: 'currency', align: 'right' },
    {
      key: 'total_due',
      header: 'Due',
      align: 'right',
      cell: (value: number) =>
        value > 0 ? (
          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'share_of_spend_pct',
      header: 'Share of Spend',
      align: 'right',
      cell: (value: number) => <span className="text-muted-foreground">{formatPercent(value)}</span>,
    },
    { key: 'avg_order_value', header: 'Avg Order', format: 'currency', align: 'right' },
    {
      key: 'first_order_date',
      header: 'First Order',
      cell: (value: string | null) =>
        value ? formatDate(value) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'last_order_date',
      header: 'Last Order',
      cell: (value: string | null) =>
        value ? formatDate(value) : <span className="text-muted-foreground">—</span>,
    },
  ];

  const totalsRow = summary
    ? {
        supplier_name: 'Totals',
        po_count: formatNumber(summary.total_pos),
        line_count: formatNumber(summary.total_lines),
        product_count: formatNumber(summary.total_products),
        quantity_ordered: formatNumber(summary.total_quantity_ordered, 2),
        quantity_received: formatNumber(summary.total_quantity_received, 2),
        total_value: formatCurrency(summary.total_value),
        total_paid: formatCurrency(summary.total_paid),
        total_due: formatCurrency(summary.total_due),
        share_of_spend_pct: formatPercent(100),
        avg_order_value: formatCurrency(summary.avg_order_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('purchase', 'by-supplier', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_suppliers)} suppliers`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Spend, order counts and outstanding balances per supplier';

  return (
    <ReportLayout
      title="Purchase by Supplier"
      description={description}
      icon={Building2}
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
                    setWarehouse(null);
                  }}
                  placeholder="Select a tenant"
                  compact
                  isClearable
                />
              </FilterField>
            </FilterRow>
          )}

          <FilterRow columns={3}>
            <FilterField label="Supplier" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`sup-${scopeTenantId || 'unscoped'}`}
                value={supplier}
                onChange={setSupplier}
                loadOptions={loadSuppliers}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All suppliers' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="PO Status">
              <select
                className={filterSelectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
              >
                <option value="">All Statuses</option>
                {PO_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
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
                placeholder="Supplier name, code or email"
              />
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Options">
              <FilterCheckbox
                label="Outstanding balance only"
                activeHint="Only suppliers with money still owed"
                checked={unpaidOnly}
                onChange={setUnpaidOnly}
              />
            </FilterField>
          </FilterRow>
        </ReportFilters>
      }
      summaryCards={cards.length > 0 ? <ReportSummaryCards cards={cards} /> : undefined}
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
          rowKey={(row) => row.supplier_id}
          searchKeys={['supplier_name', 'supplier_code', 'email']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
