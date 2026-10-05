'use client';

import { useState } from 'react';
import {
  Container,
  ArrowDownToLine,
  Coins,
  Scale,
  Layers,
  FileText,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { formatCurrency, formatDate, formatNumber, todayISO, firstDayOfMonthISO } from '@/lib/utils/format';
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
  GrnRegisterReport,
  StockMovementRow,
  StockMovementType,
} from '@/types/report.types';

/**
 * The three receipt families this register covers, in the order
 * App\Reports\Purchase\GrnRegisterReport::scopedTypes() returns them.
 *
 * The ledger's own list has ten types; this page deliberately offers only the
 * inbound ones, because every movement in a goods-received register added
 * stock. That is also why there is no direction filter here — the ledger's
 * in/out split exists to classify mixed movements, and there are none.
 */
const RECEIPT_TYPES: { value: StockMovementType; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'return', label: 'Supplier Return' },
  { value: 'production', label: 'Production' },
];

const TYPE_BADGES: Record<string, string> = {
  purchase: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  return: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  production: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function GrnRegisterPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<GrnRegisterReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [receiptType, setReceiptType] = useState<StockMovementType | ''>('');
  const [productType, setProductType] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const scopeTenantId = (isSuperAdmin ? selectedTenantId : authUser?.tenant_id) || '';
  const scopeReady = !isSuperAdmin || !!selectedTenantId;
  const businessTypeId =
    (authUser as any)?.tenant?.business_type?.id ?? (authUser as any)?.business_type?.id ?? undefined;

  const buildParams = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (category) params.category_id = category.value;
    if (brand) params.brand_id = brand.value;
    if (warehouse) params.warehouse_id = warehouse.value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (receiptType) params.movement_type = receiptType;
    if (productType) params.product_type = productType;
    if (search.trim()) params.search = search.trim();
    params.include_inactive = includeInactive ? 1 : 0;
    if (scopeTenantId) params.tenant_id = scopeTenantId;
    return params;
  };

  const fetchReport = async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.grnRegister(params as any);
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

  /** Clicking an already-active receipt card clears it, so the card toggles. */
  const applyReceiptType = (value: StockMovementType) => {
    const next = receiptType === value ? '' : value;
    setReceiptType(next);
    const params = buildParams();
    if (next === '') {
      delete params.movement_type;
    } else {
      params.movement_type = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setWarehouse(null);
    setStartDate(firstDayOfMonthISO());
    setEndDate(todayISO());
    setReceiptType('');
    setProductType('');
    setSearch('');
    setIncludeInactive(false);
    setData(null);
    setError(null);
  };

  const loadCategories = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getCategoriesForDropdown({
        search: inputValue,
        tenant_id: scopeTenantId || undefined,
        business_type_id: scopeTenantId ? undefined : businessTypeId,
      });
      return (rows || []).map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch {
      return [];
    }
  };

  const loadBrands = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getBrandsForDropdown({
        search: inputValue,
        tenant_id: scopeTenantId || undefined,
        business_type_id: scopeTenantId ? undefined : businessTypeId,
      });
      return (rows || []).map((b: any) => ({ value: String(b.id), label: b.name }));
    } catch {
      return [];
    }
  };

  const loadWarehouses = async (inputValue: string): Promise<SelectOption[]> => {
    if (!scopeReady) return [];
    try {
      const rows = await commonService.getWarehousesByTenant({ search: inputValue, tenant_id: scopeTenantId });
      return (rows || []).map((w: any) => ({ value: String(w.id), label: w.name }));
    } catch {
      return [];
    }
  };

  const summary = data?.summary;
  const typeByKey = (key: string) => summary?.by_type?.find((t) => t.key === key);

  /** Distinct documents behind the lines — POs, returns or production runs. */
  const documentCount = data
    ? new Set(data.data.map((r) => r.reference_number || r.reference || r.id)).size
    : 0;

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Total Received',
          value: formatNumber(summary.total_in, 2),
          color: 'green',
          icon: ArrowDownToLine,
          subValue: 'units added to stock',
        },
        {
          label: 'Receipt Value',
          value: formatCurrency(summary.total_value),
          color: 'blue',
          icon: Coins,
          subValue: `${formatNumber(summary.total_lines)} receipt lines`,
        },
        {
          label: 'Avg Line Value',
          value: formatCurrency(
            summary.total_lines > 0 ? summary.total_value / summary.total_lines : 0,
          ),
          color: 'gray',
          icon: Scale,
        },
        {
          label: 'Documents',
          value: formatNumber(documentCount),
          color: 'purple',
          icon: FileText,
          subValue: 'distinct POs, returns and production runs',
        },
        {
          label: 'Receipt Lines',
          value: formatNumber(summary.total_lines),
          color: 'gray',
          icon: Layers,
        },
      ]
    : [];

  /** One card per receipt family, so the type itself is the drill-down. */
  const typeCards: SummaryCard[] = RECEIPT_TYPES.map((t) => {
    const stat = typeByKey(t.value);
    return {
      label: t.label,
      value: formatNumber(stat?.count ?? 0),
      color: t.value === 'purchase' ? 'green' : t.value === 'return' ? 'teal' : 'purple',
      subValue: `${formatNumber(stat?.qty_in ?? 0, 2)} units · ${formatCurrency(stat?.value ?? 0)}`,
      onClick: () => applyReceiptType(t.value),
      active: receiptType === t.value,
    } as SummaryCard;
  });

  const columns: ReportColumn<StockMovementRow>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (value: string) => <span>{value ? formatDate(value, 'long') : '—'}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (_value: unknown, row: StockMovementRow) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-medium">
            {row.reference_number || row.reference || '—'}
          </div>
          {row.reference_type && (
            <div className="truncate text-xs text-muted-foreground">
              {row.reference_type.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'movement_type',
      header: 'Receipt Type',
      align: 'center',
      cell: (_value: unknown, row: StockMovementRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            TYPE_BADGES[row.movement_type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.type_label}
        </span>
      ),
    },
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'sku',
      header: 'SKU',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'qty_before', header: 'Qty Before', format: 'qty', align: 'right' },
    {
      key: 'qty_change',
      header: 'Qty Received',
      align: 'right',
      cell: (value: number) => (
        <span
          className={
            value < 0
              ? 'font-medium text-red-600 dark:text-red-400'
              : value > 0
                ? 'font-medium text-green-600 dark:text-green-400'
                : ''
          }
        >
          {value > 0 ? '+' : ''}
          {formatNumber(value, 2)}
        </span>
      ),
    },
    { key: 'qty_after', header: 'Qty After', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    {
      key: 'total_cost',
      header: 'Value',
      format: 'currency',
      align: 'right',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    { key: 'reason', header: 'Reason' },
    { key: 'created_by', header: 'Posted By' },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        qty_change: formatNumber(summary.total_in, 2),
        total_cost: formatCurrency(summary.total_value),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('purchase', 'grn-register', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `${formatNumber(summary.total_lines)} receipt lines`,
        `${formatDate(summary.start_date, 'long')} – ${formatDate(summary.end_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Stock received — purchases, supplier returns and production';

  return (
    <ReportLayout
      title="GRN Register"
      description={description}
      icon={Container}
      filters={
        <ReportFilters onApply={generate} onReset={reset} loading={loading} actionsPlacement="below">
          {isSuperAdmin && (
            <FilterRow columns={1}>
              <FilterField label="Tenant" className="max-w-sm">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => {
                    setSelectedTenantId(tid || '');
                    setCategory(null);
                    setBrand(null);
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
            <FilterField label="Category" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`cat-${scopeTenantId || 'unscoped'}`}
                value={category}
                onChange={setCategory}
                loadOptions={loadCategories}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All categories' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Brand" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`brand-${scopeTenantId || 'unscoped'}`}
                value={brand}
                onChange={setBrand}
                loadOptions={loadBrands}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All brands' : 'Select a tenant first'}
              />
            </FilterField>
            <FilterField label="Warehouse" hint={scopeReady ? undefined : 'select a tenant first'}>
              <CustomSelect
                key={`wh-${scopeTenantId || 'unscoped'}`}
                value={warehouse}
                onChange={setWarehouse}
                loadOptions={loadWarehouses}
                defaultOptions={scopeReady}
                isClearable
                isDisabled={!scopeReady}
                compact
                placeholder={scopeReady ? 'All warehouses' : 'Select a tenant first'}
              />
            </FilterField>
          </FilterRow>

          <FilterRow columns={3}>
            <FilterField label="Start Date">
              <CustomDatePicker value={startDate} onChange={setStartDate} compact />
            </FilterField>
            <FilterField label="End Date">
              <CustomDatePicker value={endDate} onChange={setEndDate} compact />
            </FilterField>
            <FilterField label="Receipt Type">
              <select
                className={filterSelectClass}
                value={receiptType}
                onChange={(e) => setReceiptType(e.target.value as StockMovementType | '')}
              >
                <option value="">All Receipts</option>
                {RECEIPT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterRow>

          <FilterRow>
            <FilterField label="Product Type">
              <select className={filterSelectClass} value={productType} onChange={(e) => setProductType(e.target.value)}>
                {PRODUCT_TYPES.map((t) => (
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
                placeholder="Product, SKU, reference or reason"
              />
            </FilterField>
            <FilterField label="Options">
              <FilterCheckbox
                label="Include inactive"
                activeHint="Adds archived products to the report"
                checked={includeInactive}
                onChange={setIncludeInactive}
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
          rowKey={(row) => row.id}
          searchKeys={[
            'product_name',
            'variation_name',
            'sku',
            'barcode',
            'warehouse_name',
            'type_label',
            'reference',
            'reference_number',
            'reason',
            'created_by',
          ]}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}
