'use client';

import { useEffect, useState } from 'react';
import { List, Plus, Edit, X, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { supplierService, commonService } from '@/services';
import { usePermissions } from '@/hooks/use-permissions';
import { notify, confirm } from '@/lib/notifications';

export default function SupplierListPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { isSuperAdmin } = usePermissions();

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

  const handleEdit = (supplier: any) => {
    setFormErrors({});
    setFormData({
      ...formData,
      ...supplier,
    });
    if (supplier?.tenant_id)
      setSelectedTenant({
        value: supplier.tenant_id,
        label: supplier.tenant_business_name || supplier.tenant_name || '',
      });
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
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
            title="Delete"
          >
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
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Suppliers
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
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-md p-3 space-y-3"
        >
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
              <CustomSelect
                className={'w-64 text-xs'}
                value={selectedTenant}
                onChange={(o: any) => {
                  setSelectedTenant(o);
                  setFormData({ ...formData, tenant_id: o?.value });
                  if (formErrors.tenant_id) {
                    const { tenant_id, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                }}
                loadOptions={loadTenantOptions}
                defaultOptions={defaultTenantOptions}
                placeholder="Select tenant"
                isInvalid={!!formErrors.tenant_id}
              />
              {formErrors.tenant_id && (
                <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) {
                    const { name, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                }}
                placeholder="Enter supplier name"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (formErrors.phone) {
                    const { phone, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                }}
                placeholder="Enter phone number"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.phone && <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Enter contact person name"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.contact_person ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">Company</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Enter company name"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.company_name ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block text-sm">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                placeholder="Enter website URL"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.website ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.city ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter state"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.state ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="Enter postal code"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.postal_code ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">VAT Number</label>
              <input
                type="text"
                value={formData.vat_number}
                onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                placeholder="Enter VAT number"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.vat_number ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">TIN Number</label>
              <input
                type="text"
                value={formData.tin_number}
                onChange={e => setFormData({ ...formData, tin_number: e.target.value })}
                placeholder="Enter TIN number"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.tin_number ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">Trade License</label>
              <input
                type="text"
                value={formData.trade_license}
                onChange={e => setFormData({ ...formData, trade_license: e.target.value })}
                placeholder="Enter trade license number"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.trade_license ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">Payment Terms</label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Enter payment terms"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.payment_terms ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">Credit Limit</label>
              <input
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="Enter credit limit"
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.credit_limit ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.status ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Update Supplier' : 'Save Supplier'}
            </button>
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
              className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
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
