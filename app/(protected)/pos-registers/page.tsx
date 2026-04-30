'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posRegisterService, commonService, customerService, warehouseService } from '@/services';
import type { PosRegister } from '@/services/posRegisterService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function PosRegisterPage() {
  const { isSuperAdmin } = usePermissions();
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
      tenant_id: isSuperAdmin ? r.tenant_id : undefined,
      warehouse_id: r.warehouse_id,
      code: r.code || '',
      name: r.name,
      location: r.location || '',
      terminal_id: r.terminal_id || '',
      device_info: r.device_info ? JSON.stringify(r.device_info) : '',
      default_customer_id: r.default_customer_id,
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
    if (isSuperAdmin && r.tenant_id) setSelectedTenant({ value: r.tenant_id, label: r.tenant?.business_name || '' });
    if (r.warehouse_id) setSelectedWarehouse({ value: r.warehouse_id, label: r.warehouse?.name || '' });
    if (r.default_customer_id) setSelectedCustomer({ value: r.default_customer_id, label: r.default_customer?.name || '' });
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
        default_customer_id: formData.default_customer_id,
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
    { accessorKey: 'name', header: 'Register Name', cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm">{row.original.name}</div>
        {(row.original as any).location && <div className="text-xs text-gray-500 dark:text-gray-400">{(row.original as any).location}</div>}
      </div>
    )},
    { accessorKey: 'warehouse', header: 'Warehouse', cell: ({ row }) => {
      const wh = (row.original as any).warehouse;
      return wh ? <span className="text-xs">{wh.name} {wh.code ? `(${wh.code})` : ''}</span> : <span className="text-gray-400 text-xs">-</span>;
    }},
    { id: 'payment', header: 'Payment', cell: ({ row }) => (
      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{(row.original as any).default_payment_method || '-'}</span>
    )},
    { id: 'online', header: 'Online', cell: ({ row }) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${ (row.original as any).is_online ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
        {(row.original as any).is_online ? 'Online' : 'Offline'}
      </span>
    )},
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${row.original.is_active ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </span>
    )},
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => handleEdit(row.original)} className="p-1 text-green-600 hover:text-green-700"><Edit className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(row.original)} className="p-1 text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const buildApiEndpoint = () => `pos/registers`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">POS Registers</h1>
        <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer">
          <Plus className="w-4 h-4" /> Add Register
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-3">
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Register' : 'Add Register'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <div>
                  <CustomSelect
                    value={selectedTenant}
                    onChange={option => {
                      setFormData({ ...formData, tenant_id: option?.value || undefined });
                      setSelectedTenant(option);
                      if (option?.value && formErrors.tenant_id) {
                        const { tenant_id, ...rest } = formErrors;
                        setFormErrors(rest);
                      }
                    }}
                    loadOptions={loadTenantOptions}
                    defaultOptions={defaultTenantOptions}
                    placeholder="Select tenant"
                    className="text-sm"
                    isInvalid={!!formErrors.tenant_id}
                  />
                  {formErrors.tenant_id && <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>}
                </div>
              </div>
            )}

            {/* Top row: small warehouse selector, name, code */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Warehouse <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={selectedWarehouse}
                  onChange={opt => {
                    setFormData({ ...formData, warehouse_id: opt?.value });
                    setSelectedWarehouse(opt);
                    if (opt?.value && formErrors.warehouse_id) {
                      const { warehouse_id, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  loadOptions={loadWarehouseOptions}
                  defaultOptions={defaultWarehouseOptions}
                  placeholder="Select warehouse"
                  className="text-sm"
                  isInvalid={!!formErrors.warehouse_id}
                />
                {formErrors.warehouse_id && <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Register Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (e.target.value && formErrors.name) {
                      const { name, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Code <span className="text-xs text-gray-400">(auto if blank)</span></label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g. REG-01"
                />
              </div>
            </div>

            {/* Second row: location, terminal id, default customer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g. Ground Floor - Counter 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Terminal ID</label>
                <input type="text" value={formData.terminal_id} onChange={e => setFormData({ ...formData, terminal_id: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g. TERM-001" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Default Customer</label>
                <CustomSelect value={selectedCustomer} onChange={opt => { setFormData({ ...formData, default_customer_id: opt?.value }); setSelectedCustomer(opt); }} loadOptions={loadCustomerOptions} defaultOptions={defaultCustomerOptions} placeholder="Select customer" className="text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Payment Method</label>
                <select value={formData.default_payment_method} onChange={e => setFormData({ ...formData, default_payment_method: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Tax Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={formData.default_tax_rate} onChange={e => setFormData({ ...formData, default_tax_rate: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Logo URL</label>
                <input type="text" value={formData.receipt_logo_url} onChange={e => setFormData({ ...formData, receipt_logo_url: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" placeholder="https://..." />
              </div>
            </div>

            {/* Receipt Footer, Device Info, Header in same row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Header</label>
                <textarea value={formData.receipt_header} onChange={e => setFormData({ ...formData, receipt_header: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" rows={3} placeholder="e.g. Welcome to our store!" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Footer</label>
                <textarea value={formData.receipt_footer} onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" rows={3} placeholder="e.g. Thank you for shopping!" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Device Info (JSON)</label>
                <textarea value={formData.device_info} onChange={e => setFormData({ ...formData, device_info: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" rows={3} placeholder='{"model":"..."}' />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.allow_price_override} onChange={e => setFormData({ ...formData, allow_price_override: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow Price Override</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.allow_discount} onChange={e => setFormData({ ...formData, allow_discount: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow Discount</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.allow_negative_stock} onChange={e => setFormData({ ...formData, allow_negative_stock: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow Negative Stock</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.require_customer} onChange={e => setFormData({ ...formData, require_customer: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Require Customer</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.show_tax_details} onChange={e => setFormData({ ...formData, show_tax_details: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Tax Details</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.show_barcode} onChange={e => setFormData({ ...formData, show_barcode: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Barcode</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.is_online} onChange={e => setFormData({ ...formData, is_online: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Is Online</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Is Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Update Register' : 'Save Register'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-sm hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable key={refreshKey} columns={columns} apiEndpoint={buildApiEndpoint()} pageSize={15} enableSearch={true} searchPlaceholder="Search registers by name or code..." />
    </div>
  );
}
