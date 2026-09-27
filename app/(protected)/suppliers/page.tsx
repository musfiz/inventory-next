'use client';

import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GiSave } from 'react-icons/gi';
import CustomSelect from '@/components/ui/custom-select';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';
import { notify, confirm } from '@/lib/notifications';
import { supplierService, commonService } from '@/services';

const inputCls = (hasError?: boolean) =>
  `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

function FormRow({ label, required, error, children, className = '', labelWidth = 'w-20', fieldWidth = 'flex-1 min-w-0' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; className?: string; labelWidth?: string; fieldWidth?: string }) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-20' ? 'ml-[5.5rem]' : 'ml-[4.375rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className={fieldWidth}>{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}

export default function SupplierListPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !hasPermission('view-supplier')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    tenant_id: undefined,
    name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    postal_code: '',
    vat_number: '',
    tin_number: '',
    trade_license: '',
    website: '',
    payment_terms: '',
    credit_limit: 0,
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const tenants = await commonService.getTenantsForDropdown({ search: input });
    const options = tenants.map((t: any) => ({ value: t.id, label: t.business_name }));
    if (!input && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
    return options;
  };

  useEffect(() => {
    if (isSuperAdmin) loadTenantOptions('');
  }, [isSuperAdmin]);

  const validateForm = () => {
    const errors: any = {};
    if (isSuperAdmin && !formData.tenant_id) errors.tenant_id = 'Tenant is required';
    if (!formData.name || !formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = 'Phone is required';
    } else {
      const phone = String(formData.phone).trim();
      const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
      if (!phoneRegex.test(phone)) errors.phone = 'Please enter a valid phone number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = { ...formData };
      if (isEditing && formData.id) submitData.id = formData.id;
      if (!isSuperAdmin) delete submitData.tenant_id;
      await supplierService.storeSupplier(submitData);
      notify.success(isEditing ? 'Supplier updated successfully' : 'Supplier created successfully');
      setShowForm(false);
      setRefreshKey(k => k + 1);
      setSelectedTenant(null);
      setIsEditing(false);
      setFormErrors({});
      setFormData({
        tenant_id: undefined,
        name: '',
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        country: 'Bangladesh',
        postal_code: '',
        vat_number: '',
        tin_number: '',
        trade_license: '',
        website: '',
        payment_terms: '',
        credit_limit: 0,
        status: 'active',
      });
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const transformed: any = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save supplier');
      }
    }
  };

  const handleEdit = async (supplier: any) => {
    setFormErrors({});
    // Normalize nulls to '' to avoid React `value` prop null warning (312:15)
    const sanitized = Object.fromEntries(
      Object.entries({ ...formData, ...supplier }).map(([k, v]) => [k, v ?? ''])
    ) as any;
    // keep tenant_id as undefined if empty, credit_limit as 0 if empty
    if (sanitized.tenant_id === '') sanitized.tenant_id = undefined;
    if (sanitized.credit_limit === '') sanitized.credit_limit = 0;
    setFormData(sanitized);
    if (supplier?.tenant_id) {
      // Prefer eager-loaded tenant relationship from API (SupplierTrait now with tenant)
      let label: string =
        supplier.tenant?.business_name ||
        supplier.tenant_business_name ||
        supplier.tenant_name ||
        supplier.business_name ||
        '';
      if (!label) {
        const hit = defaultTenantOptions.find((o: any) => String(o.value) === String(supplier.tenant_id));
        if (hit) label = hit.label;
      }
      if (!label && isSuperAdmin) {
        try {
          const tenants = await commonService.getTenantsForDropdown({ search: '' });
          const t = tenants.find((x: any) => String(x.id) === String(supplier.tenant_id));
          if (t) {
            label = (t as any).business_name;
            if (!defaultTenantOptions.some((o: any) => String(o.value) === String(t.id))) {
              setDefaultTenantOptions((prev: any) => [...prev, { value: (t as any).id, label }]);
            }
          }
        } catch { }
      }
      if (!label) label = String(supplier.tenant_id).slice(0, 8);
      const opt = { value: supplier.tenant_id, label };
      setSelectedTenant(opt);
      // Ensure AsyncSelect can display it even if not in defaultOptions
      if (!defaultTenantOptions.some((o: any) => String(o.value) === String(supplier.tenant_id))) {
        setDefaultTenantOptions((prev: any) => [...prev, opt]);
      }
    } else {
      setSelectedTenant(null);
    }
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const result = await confirm({
      title: 'Delete Supplier',
      html: 'Are you sure you want to delete this supplier?',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await supplierService.deleteSupplier(id);
      notify.success('Supplier deleted successfully');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span>
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'company_name', header: 'Company' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '84px' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
            title="Edit"
            aria-label="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
            title="Delete"
            aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const buildApiEndpoint = () => 'suppliers';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {showForm ? (isEditing ? 'Edit Supplier' : 'Add Supplier') : 'Supplier'}
        </h1>
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            setFormErrors({});
            setSelectedTenant(null);
            setFormData({
              tenant_id: undefined,
              name: '',
              company_name: '',
              contact_person: '',
              phone: '',
              email: '',
              address: '',
              city: '',
              state: '',
              country: 'Bangladesh',
              postal_code: '',
              vat_number: '',
              tin_number: '',
              trade_license: '',
              website: '',
              payment_terms: '',
              credit_limit: 0,
              status: 'active',
            });
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h3>

              {isSuperAdmin && (
                <div className="mb-2">
                  <FormRow label="Tenant" required labelWidth="w-32" error={formErrors.tenant_id}>
                    <CustomSelect
                      value={selectedTenant}
                      onChange={(o: any) => {
                        setSelectedTenant(o);
                        setFormData({ ...formData, tenant_id: o?.value });
                        if (formErrors.tenant_id) {
                          setFormErrors((prev: any) => {
                            const next = { ...prev };
                            delete next.tenant_id;
                            return next;
                          });
                        }
                      }}
                      loadOptions={loadTenantOptions}
                      defaultOptions={defaultTenantOptions.length > 0 ? defaultTenantOptions : true}
                      placeholder="Select tenant"
                      isInvalid={!!formErrors.tenant_id}
                      compact
                    />
                  </FormRow>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Name" required labelWidth="w-32" error={formErrors.name}>
                  <input
                    type="text"
                    value={formData.name ?? ''}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) {
                        setFormErrors((prev: any) => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter supplier name"
                    className={inputCls(!!formErrors.name)}
                  />
                </FormRow>

                <FormRow label="Phone" required labelWidth="w-32" error={formErrors.phone}>
                  <input
                    type="text"
                    value={formData.phone ?? ''}
                    onChange={e => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) {
                        setFormErrors((prev: any) => {
                          const next = { ...prev };
                          delete next.phone;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter phone number"
                    className={inputCls(!!formErrors.phone)}
                  />
                </FormRow>

                <FormRow label="Contact Person" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.contact_person ?? ''}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Enter contact person name"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Company" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.company_name ?? ''}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Enter company name"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Email" labelWidth="w-32" error={formErrors.email}>
                  <input
                    type="email"
                    value={formData.email ?? ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className={inputCls(!!formErrors.email)}
                  />
                </FormRow>

                <FormRow label="Website" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.website ?? ''}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Enter website URL"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="City" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.city ?? ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="State/Province" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.state ?? ''}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Postal Code" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.postal_code ?? ''}
                    onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="Enter postal code"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Country" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.country ?? ''}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Bangladesh"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Address" labelWidth="w-32" className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.address ?? ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, building, floor"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Tax & Compliance */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Tax &amp; Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="VAT Number" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.vat_number ?? ''}
                    onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                    placeholder="Enter VAT number"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="TIN Number" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.tin_number ?? ''}
                    onChange={e => setFormData({ ...formData, tin_number: e.target.value })}
                    placeholder="Enter TIN number"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Trade License" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.trade_license ?? ''}
                    onChange={e => setFormData({ ...formData, trade_license: e.target.value })}
                    placeholder="Enter trade license number"
                    className={inputCls(false)}
                  />
                </FormRow>
              </div>
            </div>

            {/* Business Terms */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Business Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <FormRow label="Payment Terms" labelWidth="w-32">
                  <input
                    type="text"
                    value={formData.payment_terms ?? ''}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="Enter payment terms"
                    className={inputCls(false)}
                  />
                </FormRow>

                <FormRow label="Credit Limit" labelWidth="w-32" fieldWidth="w-40" error={formErrors.credit_limit}>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit ?? ''}
                    onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                    placeholder="0.00"
                    className={inputCls(!!formErrors.credit_limit)}
                  />
                </FormRow>

                <FormRow label="Status" labelWidth="w-32" fieldWidth="w-40" error={formErrors.status}>
                  <select
                    value={formData.status ?? 'active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={inputCls(!!formErrors.status)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormRow>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                  setFormErrors({});
                  setSelectedTenant(null);
                  setFormData({
                    tenant_id: undefined,
                    name: '',
                    company_name: '',
                    contact_person: '',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    state: '',
                    country: 'Bangladesh',
                    postal_code: '',
                    vat_number: '',
                    tin_number: '',
                    trade_license: '',
                    website: '',
                    payment_terms: '',
                    credit_limit: 0,
                    status: 'active',
                  });
                }}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded"
              >
                <GiSave className="w-3.5 h-3.5" />
                {isEditing ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by supplier name, code..."
      />
    </div>
  );
}
