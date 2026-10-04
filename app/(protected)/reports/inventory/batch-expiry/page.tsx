'use client';

import { useState } from 'react';
import {
  CalendarClock,
  CalendarX,
  Coins,
  Layers,
  PackageX,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import TenantSelect from '@/components/ui/tenant-select';
import CustomSelect, { type SelectOption } from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import reportService from '@/services/reportService';
import commonService from '@/services/commonService';
import { formatCurrency, formatDate, formatNumber, formatPercent, todayISO } from '@/lib/utils/format';
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
  BatchExpiryReport,
  BatchExpiryRow,
  BatchExpiryBucket,
  BatchStatus,
} from '@/types/report.types';

/** Kept in step with App\Reports\Inventory\BatchExpiryReport::BUCKETS. */
const BUCKETS: { value: BatchExpiryBucket; label: string }[] = [
  { value: 'expired', label: 'Expired' },
  { value: '0-7', label: '0-7 Days' },
  { value: '8-30', label: '8-30 Days' },
  { value: '31-60', label: '31-60 Days' },
  { value: '61-90', label: '61-90 Days' },
  { value: '90_plus', label: '90+ Days' },
  { value: 'no_expiry', label: 'No Expiry Date' },
];

const BUCKET_BADGES: Record<string, string> = {
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  '0-7': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  '8-30': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '31-60': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '61-90': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  '90_plus': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  no_expiry: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  exhausted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  quarantined: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  exhausted: 'Exhausted',
  quarantined: 'Quarantined',
};

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
  { value: 'composite', label: 'Composite' },
  { value: 'digital', label: 'Digital' },
  { value: 'service', label: 'Service' },
];

export default function BatchExpiryPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);

  const [data, setData] = useState<BatchExpiryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [brand, setBrand] = useState<SelectOption | null>(null);
  const [warehouse, setWarehouse] = useState<SelectOption | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [bucket, setBucket] = useState<BatchExpiryBucket | ''>('');
  const [batchStatus, setBatchStatus] = useState<BatchStatus | ''>('');
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
    if (asOfDate) params.as_of_date = asOfDate;
    if (bucket) params.bucket = bucket;
    if (batchStatus) params.batch_status = batchStatus;
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
      const res = await reportService.batchExpiryReport(params as any);
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

  /** Clicking an already-active bucket clears it, so the card toggles. */
  const applyBucket = (value: BatchExpiryBucket) => {
    const next = bucket === value ? '' : value;
    setBucket(next);
    const params = buildParams();
    if (next === '') {
      delete params.bucket;
    } else {
      params.bucket = next;
    }
    fetchReport(params);
  };

  const reset = () => {
    setSelectedTenantId('');
    setCategory(null);
    setBrand(null);
    setWarehouse(null);
    setAsOfDate(todayISO());
    setBucket('');
    setBatchStatus('');
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
  const bucketByKey = (key: BatchExpiryBucket) => summary?.by_bucket?.find((b) => b.key === key);

  const cards: SummaryCard[] = summary
    ? [
        {
          label: 'Value at Risk',
          value: formatCurrency(summary.total_value_at_risk),
          color: 'purple',
          icon: Coins,
          subValue: `${formatNumber(summary.total_units)} units on hand`,
        },
        {
          label: 'Batches in Stock',
          value: formatNumber(summary.total_batches),
          color: 'blue',
          icon: Layers,
        },
        {
          label: 'Expired Value',
          value: formatCurrency(summary.expired_value),
          color: 'red',
          icon: CalendarX,
          subValue: `${formatNumber(bucketByKey('expired')?.batches ?? 0)} batches past date`,
          onClick: () => applyBucket('expired'),
          active: bucket === 'expired',
        },
        {
          label: '0-7 Days',
          value: formatNumber(bucketByKey('0-7')?.batches ?? 0),
          color: 'orange',
          icon: PackageX,
          subValue: `${formatCurrency(bucketByKey('0-7')?.value ?? 0)} · ${formatPercent(bucketByKey('0-7')?.share_pct ?? 0)}`,
          onClick: () => applyBucket('0-7'),
          active: bucket === '0-7',
        },
        {
          label: '8-30 Days',
          value: formatNumber(bucketByKey('8-30')?.batches ?? 0),
          color: 'amber',
          icon: AlertTriangle,
          subValue: `${formatCurrency(bucketByKey('8-30')?.value ?? 0)} · ${formatPercent(bucketByKey('8-30')?.share_pct ?? 0)}`,
          onClick: () => applyBucket('8-30'),
          active: bucket === '8-30',
        },
        {
          label: '31-90 Days',
          value: formatNumber(
            (bucketByKey('31-60')?.batches ?? 0) + (bucketByKey('61-90')?.batches ?? 0),
            0,
          ),
          color: 'amber',
          icon: Clock,
          subValue: `${formatCurrency((bucketByKey('31-60')?.value ?? 0) + (bucketByKey('61-90')?.value ?? 0))} to plan`,
        },
        {
          label: 'No Expiry Date',
          value: formatNumber(bucketByKey('no_expiry')?.batches ?? 0),
          color: 'gray',
          icon: ShieldCheck,
          subValue: `${formatCurrency(bucketByKey('no_expiry')?.value ?? 0)} untracked`,
          onClick: () => applyBucket('no_expiry'),
          active: bucket === 'no_expiry',
        },
      ]
    : [];

  const columns: ReportColumn<BatchExpiryRow>[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'variation_name', header: 'Variation' },
    {
      key: 'batch_number',
      header: 'Batch #',
      cell: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: 'warehouse_name', header: 'Warehouse' },
    {
      key: 'mfg_date',
      header: 'Mfg Date',
      cell: (value: string | null) => (value ? formatDate(value) : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      cell: (value: string | null) => (value ? formatDate(value) : <span className="text-muted-foreground">None</span>),
    },
    {
      key: 'days_to_expiry',
      header: 'Days to Expiry',
      align: 'right',
      cell: (value: number | null) =>
        value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={
              value < 0
                ? 'font-medium text-red-600 dark:text-red-400'
                : value <= 7
                  ? 'font-medium text-orange-600 dark:text-orange-400'
                  : value <= 30
                    ? 'font-medium text-amber-600 dark:text-amber-400'
                    : ''
            }
          >
            {value < 0 ? `${Math.abs(value)}d overdue` : `${value}d`}
          </span>
        ),
    },
    { key: 'current_qty', header: 'On Hand', format: 'qty', align: 'right' },
    { key: 'available_qty', header: 'Available', format: 'qty', align: 'right' },
    { key: 'unit_cost', header: 'Unit Cost', format: 'currency', align: 'right' },
    { key: 'value_at_risk', header: 'Value at Risk', format: 'currency', align: 'right' },
    {
      key: 'batch_status',
      header: 'Batch Status',
      align: 'center',
      cell: (_value: unknown, row: BatchExpiryRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_BADGES[row.batch_status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {STATUS_LABELS[row.batch_status] || row.batch_status}
        </span>
      ),
    },
    {
      key: 'expiry_bucket',
      header: 'Expiry',
      align: 'center',
      cell: (_value: unknown, row: BatchExpiryRow) => (
        <span
          className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
            BUCKET_BADGES[row.expiry_bucket] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.bucket_label}
        </span>
      ),
    },
  ];

  const totalsRow = summary
    ? {
        product_name: 'Totals',
        current_qty: formatNumber(summary.total_units, 2),
        value_at_risk: formatCurrency(summary.total_value_at_risk),
      }
    : undefined;

  const { loading: exportLoading, exportPDF, exportExcel, exportCSV, printReport: handlePrint } =
    useServerReportExport('inventory', 'batch-expiry', buildParams);

  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleString() : undefined;

  const description = summary
    ? [
        `As of ${formatDate(summary.as_of_date, 'long')}`,
        generatedAt ? `generated ${generatedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Every batch still holding stock, graded by how close it is to expiry';

  return (
    <ReportLayout
      title="Batch & Expiry"
      description={description}
      icon={CalendarClock}
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
            <FilterField label="As Of Date" hint="Expiry is graded against this date">
              <CustomDatePicker value={asOfDate} onChange={setAsOfDate} compact />
            </FilterField>
            <FilterField label="Expiry Bucket">
              <select
                className={filterSelectClass}
                value={bucket}
                onChange={(e) => setBucket(e.target.value as BatchExpiryBucket | '')}
              >
                <option value="">All Buckets</option>
                {BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Batch Status">
              <select
                className={filterSelectClass}
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as BatchStatus | '')}
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_LABELS).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABELS[k]}
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
                placeholder="Product, SKU or batch number"
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
          rowKey={(row) => `${row.batch_number}-${row.sku}-${row.warehouse_name}`}
          searchKeys={['product_name', 'variation_name', 'sku', 'barcode', 'batch_number', 'warehouse_name', 'category_name', 'brand_name']}
          showSerial
          serialHeader="SL"
        />
      )}
    </ReportLayout>
  );
}