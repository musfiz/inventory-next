'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posRegisterService, commonService, customerService } from '@/services';
import type { PosRegister } from '@/services/posRegisterService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import TenantSelect from '@/components/ui/tenant-select';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

const inputCls = (hasError?: boolean) =>
  `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

function FormRow({ label, required, error, children, className = '', labelWidth = 'w-32', fieldWidth = 'flex-1 min-w-0' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; className?: string; labelWidth?: string; fieldWidth?: string }) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-20' ? 'ml-[5.5rem]' : 'ml-[4.375rem]';
  return (
    <div className={className}>
      <div className="flex items-start gap-1.5">
        <label className={`${labelWidth} shrink-0 pt-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-left`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className={fieldWidth}>{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}

export default function PosRegisterPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-pos-register')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<any>(null);
  type FormDataType = {
    tenant_id?: string | undefined;
    warehouse_id?: string | undefined;
    code?: string;
    name?: string;
    location?: string;
    terminal_id?: string;
    device_info?: string;
    default_customer_id?: string | undefined;
    default_payment_method?: string;
    default_tax_rate?: string;
    allow_price_override?: boolean;
    allow_discount?: boolean;
    allow_negative_stock?: boolean;
    require_customer?: boolean;
    receipt_header?: string;
    receipt_footer?: string;
    receipt_logo_url?: string;
    show_tax_details?: boolean;
    show_barcode?: boolean;
    is_active?: boolean;
    is_online?: boolean;

  };

  const [formData, setFormData] = useState<FormDataType>({
    tenant_id: undefined,
    warehouse_id: undefined,
    name: '',
    location: '',
    terminal_id: '',
    device_info: '',
    default_customer_id: undefined,
    default_payment_method: 'cash',
    default_tax_rate: '0.00',
    allow_price_override: false,
    allow_discount: true,
    allow_negative_stock: false,
    require_customer: false,
    receipt_header: '',
    receipt_footer: '',
    receipt_logo_url: '',
    show_tax_details: true,
    show_barcode: true,
    is_active: true,
    is_online: false,


  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [defaultCustomerOptions, setDefaultCustomerOptions] = useState<any[]>([]);

  const authUser = useAuthStore(s => s.user);

  const loadWarehouseOptions = async (input: string) => {
    const tenant_id = isSuperAdmin ? selectedTenant?.value : authUser?.tenant_id;
    if (!tenant_id) return [];
    const params: any = { search: input, tenant_id };
    const list = await commonService.getWarehousesByTenant(params).catch(() => []);
    return (list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }));
  };

  const loadCustomerOptions = async (input: string) => {
    const tenant_id = isSuperAdmin ? selectedTenant?.value : authUser?.tenant_id;
    const params: any = { search: input, tenant_id };
    const list = await customerService.getCustomersDropdown(params).catch(() => []);
    const options = (list || []).map((c: any) => ({ value: c.id, label: c.name }));
    if (!input && defaultCustomerOptions.length === 0) setDefaultCustomerOptions(options);
    return options;
  };
  const loadTenantOptions = async (inputValue: string) => {
    try {
      if (!isSuperAdmin) return [];
      const tenants = await commonService.getTenantsForDropdown({ search: inputValue });
      const options = tenants.map((t: any) => ({ value: t.id, label: t.business_name }));
      if (!inputValue && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
      return options;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  // Prefetch tenant options on mount for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenantOptions('');
    }
  }, [isSuperAdmin]);

  // Prefetch warehouse options: for tenant users load their warehouses, for superadmin load when tenant selected
  useEffect(() => {
    const prefetch = async () => {
      if (!isSuperAdmin && authUser?.tenant_id) {
        const list = await commonService.getWarehousesByTenant({ tenant_id: authUser?.tenant_id }).catch(() => []);
        setDefaultWarehouseOptions((list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` })));
      }
    };
    prefetch();
  }, [isSuperAdmin, authUser?.tenant_id]);

  // When superadmin selects a tenant, prefetch warehouses and customers for that tenant
  useEffect(() => {
    const prefetchForTenant = async () => {
      if (isSuperAdmin && selectedTenant?.value) {
        const list = await commonService.getWarehousesByTenant({ tenant_id: selectedTenant.value }).catch(() => []);
        setDefaultWarehouseOptions((list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` })));

        const customers = await customerService.getCustomersDropdown({ tenant_id: selectedTenant.value }).catch(() => []);
        setDefaultCustomerOptions((customers || []).map((c: any) => ({ value: c.id, label: c.name })));
      } else if (isSuperAdmin && !selectedTenant) {
        setDefaultWarehouseOptions([]);
        setDefaultCustomerOptions([]);
      }
    };
    prefetchForTenant();
  }, [isSuperAdmin, selectedTenant]);

  // Prefetch customers for tenant users
  useEffect(() => {
    const prefetchCustomers = async () => {
      if (!isSuperAdmin && authUser?.tenant_id) {
        const list = await customerService.getCustomersDropdown({ tenant_id: authUser?.tenant_id }).catch(() => []);
        setDefaultCustomerOptions((list || []).map((c: any) => ({ value: c.id, label: c.name })));
      }
    };
    prefetchCustomers();
  }, [isSuperAdmin, authUser?.tenant_id]);

  const handleAdd = () => {
    setIsEditing(false);
    setCurrent(null);
    setFormData({
      tenant_id: undefined,
      warehouse_id: undefined,
      code: '',
      name: '',
      location: '',
      terminal_id: '',
      device_info: '',
      default_customer_id: undefined,
      default_payment_method: 'cash',
      default_tax_rate: '0.00',
      allow_price_override: false,
      allow_discount: true,
      allow_negative_stock: false,
      require_customer: false,
      receipt_header: '',
      receipt_footer: '',
      receipt_logo_url: '',
      show_tax_details: false,
      show_barcode: true,
      is_active: true,
      is_online: false,


    });
    setFormErrors({});
    setSelectedTenant(null);
    setSelectedWarehouse(null);
    if (isSuperAdmin) loadTenantOptions('');
    setShowForm(true);
  };

  const handleEdit = (r: any) => {
    setIsEditing(true);
    setCurrent(r);
    setFormData({
      tenant_id: isSuperAdmin && r.tenant_id ? String(r.tenant_id) : undefined,
      warehouse_id: r.warehouse_id ? String(r.warehouse_id) : undefined,
      code: r.code || '',
      name: r.name,
      location: r.location || '',
      terminal_id: r.terminal_id || '',
      device_info: r.device_info ? JSON.stringify(r.device_info) : '',
      default_customer_id: r.default_customer_id ? String(r.default_customer_id) : undefined,
      default_payment_method: r.default_payment_method || 'cash',
      default_tax_rate: String(r.default_tax_rate ?? '0.00'),
      allow_price_override: !!r.allow_price_override,
      allow_discount: !!r.allow_discount,
      allow_negative_stock: !!r.allow_negative_stock,
      require_customer: !!r.require_customer,
      receipt_header: r.receipt_header || '',
      receipt_footer: r.receipt_footer || '',
      receipt_logo_url: r.receipt_logo_url || '',
      show_tax_details: !!r.show_tax_details,
      show_barcode: !!r.show_barcode,
      is_active: !!r.is_active,
      is_online: !!r.is_online,
    });
    setFormErrors({});
    if (isSuperAdmin && r.tenant_id) setSelectedTenant({ value: String(r.tenant_id), label: r.tenant?.business_name || '' });
    if (r.warehouse_id) setSelectedWarehouse({ value: String(r.warehouse_id), label: r.warehouse?.name || '' });
    else setSelectedWarehouse(null);
    if (r.default_customer_id) setSelectedCustomer({ value: String(r.default_customer_id), label: r.default_customer?.name || '' });
    else setSelectedCustomer(null);
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (isSuperAdmin && !formData.tenant_id) errors.tenant_id = 'Tenant is required';
    if (!formData.warehouse_id) errors.warehouse_id = 'Warehouse is required';
    if (!formData.name || !formData.name.trim()) errors.name = 'Register name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload: any = {
        warehouse_id: formData.warehouse_id,
        name: formData.name,
        code: formData.code,
        location: formData.location,
        terminal_id: formData.terminal_id,
        device_info: formData.device_info ? JSON.parse(formData.device_info) : null,
        default_customer_id: formData.default_customer_id ? String(formData.default_customer_id) : null,
        default_payment_method: formData.default_payment_method,
        default_tax_rate: formData.default_tax_rate,
        allow_price_override: formData.allow_price_override,
        allow_discount: formData.allow_discount,
        allow_negative_stock: formData.allow_negative_stock,
        require_customer: formData.require_customer,
        receipt_header: formData.receipt_header,
        receipt_footer: formData.receipt_footer,
        receipt_logo_url: formData.receipt_logo_url,
        show_tax_details: formData.show_tax_details,
        show_barcode: formData.show_barcode,
        is_active: formData.is_active,
        is_online: formData.is_online,
      };
      if (isSuperAdmin && formData.tenant_id) payload.tenant_id = formData.tenant_id;
      if (isEditing && current) payload.id = current.id;

      await posRegisterService.store(payload);
      notify.success(isEditing ? 'Register updated' : 'Register created');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (axiosError.response?.data?.errors) {
        const transformed: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, messages]) => {
          transformed[key] = Array.isArray(messages) ? messages.join(', ') : (messages as any);
        });
        setFormErrors(transformed);
      } else {
        notify.error(axiosError.response?.data?.message || 'Failed to save register');
      }
    }
  };

  const handleDelete = async (r: PosRegister) => {
    const result = await confirm({ title: 'Delete Register', html: `Delete register <strong>${r.name}</strong>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning' });
    if (!result.isConfirmed) return;
    try {
      await posRegisterService.destroy(r.id);
      notify.success('Register deleted');
      setRefreshKey(k => k + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete register');
    }
  };

  const columns: ColumnDef<PosRegister>[] = [
    { id: 'serial', header: 'SL', cell: ({ row, table }) => (table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1) },
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => <div className="font-mono text-xs">{(row.original as any).code || '-'}</div> },
    {
      accessorKey: 'name', header: 'Register Name', cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name}</div>
          {(row.original as any).location && <div className="text-xs text-gray-500 dark:text-gray-400">{(row.original as any).location}</div>}
        </div>
      )
    },
    {
      accessorKey: 'warehouse', header: 'Warehouse', cell: ({ row }) => {
        const wh = (row.original as any).warehouse;
        return wh ? <span className="text-xs">{wh.name} {wh.code ? `(${wh.code})` : ''}</span> : <span className="text-gray-400 text-xs">-</span>;
      }
    },
    {
      id: 'payment', header: 'Payment', cell: ({ row }) => (
        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{(row.original as any).default_payment_method || '-'}</span>
      )
    },
    {
      id: 'online', header: 'Online', cell: ({ row }) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${(row.original as any).is_online ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
          {(row.original as any).is_online ? 'Online' : 'Offline'}
        </span>
      )
    },
    {
      accessorKey: 'is_active', header: 'Status', cell: ({ row }) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${row.original.is_active ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {hasPermission('update-pos-register') && (
            <button onClick={() => handleEdit(row.original)} className="p-1 text-green-600 hover:text-green-700" aria-label="Edit" title="Edit"><Edit className="w-4 h-4" /></button>
          )}
          {hasPermission('delete-pos-register') && (
            <button onClick={() => handleDelete(row.original)} className="p-1 text-red-600 hover:text-red-700" aria-label="Delete" title="Delete"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    },
  ];

  const buildApiEndpoint = () => `pos/registers`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {showForm ? (isEditing ? 'Edit Register' : 'Add Register') : 'POS Registers'}
        </h1>
        {hasPermission('create-pos-register') && (
          <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Register
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">

            {/* ── Basic Information ── */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h3>

              {isSuperAdmin && (
                <div className="mb-2 md:w-1/2">
                  <FormRow label="Tenant" required error={formErrors.tenant_id || null}>
                    <TenantSelect
                      value={formData.tenant_id ?? null}
                      onChange={(tenantId) => {
                        const nextTenantId = tenantId ? String(tenantId) : undefined;
                        setFormData({ ...formData, tenant_id: nextTenantId });
                        setSelectedTenant(nextTenantId ? { value: nextTenantId, label: '' } : null);
                        if (nextTenantId && formErrors.tenant_id) {
                          setFormErrors(prev => {
                            const next = { ...prev };
                            delete next.tenant_id;
                            return next;
                          });
                        }
                      }}
                      placeholder="Select tenant"
                      isInvalid={!!formErrors.tenant_id}
                      compact
                    />
                  </FormRow>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Warehouse" required error={formErrors.warehouse_id || null}>
                  <CustomSelect
                    value={selectedWarehouse}
                    onChange={opt => {
                      setFormData({ ...formData, warehouse_id: opt?.value });
                      setSelectedWarehouse(opt);
                      if (opt?.value && formErrors.warehouse_id) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.warehouse_id;
                          return next;
                        });
                      }
                    }}
                    loadOptions={loadWarehouseOptions}
                    defaultOptions={defaultWarehouseOptions}
                    placeholder="Select warehouse"
                    isInvalid={!!formErrors.warehouse_id}
                    compact
                  />
                </FormRow>

                <FormRow label="Register Name" required error={formErrors.name || null}>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value && formErrors.name) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Main Counter"
                    className={inputCls(!!formErrors.name)}
                  />
                </FormRow>

                <FormRow label="Code">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. REG-01 (auto if blank)"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Location">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Ground Floor - Counter 1"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Terminal ID">
                  <input
                    type="text"
                    value={formData.terminal_id}
                    onChange={e => setFormData({ ...formData, terminal_id: e.target.value })}
                    placeholder="e.g. TERM-001"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* ── Defaults ── */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Defaults</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Default Customer">
                  <CustomSelect
                    value={selectedCustomer}
                    onChange={opt => {
                      setFormData({ ...formData, default_customer_id: opt?.value ? String(opt.value) : undefined });
                      setSelectedCustomer(opt || null);
                    }}
                    loadOptions={loadCustomerOptions}
                    defaultOptions={defaultCustomerOptions}
                    placeholder="Select customer"
                    compact
                  />
                </FormRow>

                <FormRow label="Payment Method">
                  <select
                    value={formData.default_payment_method}
                    onChange={e => setFormData({ ...formData, default_payment_method: e.target.value })}
                    className={inputCls(false)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </FormRow>

                <FormRow label="Tax Rate (%)" fieldWidth="w-40">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.default_tax_rate}
                    onChange={e => setFormData({ ...formData, default_tax_rate: e.target.value })}
                    placeholder="0.00"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Receipt Logo URL">
                  <input
                    type="text"
                    value={formData.receipt_logo_url}
                    onChange={e => setFormData({ ...formData, receipt_logo_url: e.target.value })}
                    placeholder="https://..."
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* ── Receipt & Device ── */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Receipt &amp; Device</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Receipt Header">
                  <textarea
                    value={formData.receipt_header}
                    onChange={e => setFormData({ ...formData, receipt_header: e.target.value })}
                    rows={3}
                    placeholder="e.g. Welcome to our store!"
                    className={`${inputCls(false)} resize-none`}
                  />
                </FormRow>

                <FormRow label="Receipt Footer">
                  <textarea
                    value={formData.receipt_footer}
                    onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })}
                    rows={3}
                    placeholder="e.g. Thank you for shopping!"
                    className={`${inputCls(false)} resize-none`}
                  />
                </FormRow>

                <FormRow label="Device Info (JSON)" className="md:col-span-2">
                  <textarea
                    value={formData.device_info}
                    onChange={e => setFormData({ ...formData, device_info: e.target.value })}
                    rows={3}
                    placeholder='{"model":"..."}'
                    className={`${inputCls(false)} resize-none`}
                  />
                </FormRow>
              </div>
            </div>

            {/* ── Settings ── */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Settings</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'allow_price_override', label: 'Allow Price Override' },
                  { key: 'allow_discount', label: 'Allow Discount' },
                  { key: 'allow_negative_stock', label: 'Allow Negative Stock' },
                  { key: 'require_customer', label: 'Require Customer' },
                  { key: 'show_tax_details', label: 'Show Tax Details' },
                  { key: 'show_barcode', label: 'Show Barcode' },
                  { key: 'is_online', label: 'Is Online' },
                  { key: 'is_active', label: 'Is Active' },
                ] as const).map(f => (
                  <label key={f.key} className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={!!(formData as any)[f.key]}
                      onChange={e => setFormData({ ...formData, [f.key]: e.target.checked })}
                      className="h-3.5 w-3.5 accent-indigo-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Form Actions ── */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded cursor-pointer"
              >
                <GiSave className="w-3.5 h-3.5" />
                {isEditing ? 'Update Register' : 'Create Register'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable key={refreshKey} columns={columns} apiEndpoint={buildApiEndpoint()} pageSize={15} enableSearch={true} searchPlaceholder="Search registers by name or code..." />
    </div>
  );
}
