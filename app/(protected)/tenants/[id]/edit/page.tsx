'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Save, ArrowLeft } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { tenantService } from '@/services/tenantService';
import { BUSINESS_TYPES, SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '@/lib/constants';

interface TenantEditFormData {
  business_name: string;
  business_type: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  trade_license: string;
  tin_number: string;
  bin_number: string;
  vat_number: string;
  currency: string;
  timezone: string;
  trial_ends_at: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_ends_at: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  is_active: boolean;
}

const COUNTRY_OPTIONS = ['Bangladesh'] as const;

const EMPTY_FORM: TenantEditFormData = {
  business_name: '',
  business_type: 'other',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Bangladesh',
  trade_license: '',
  tin_number: '',
  bin_number: '',
  vat_number: '',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  trial_ends_at: '',
  subscription_plan: 'free',
  subscription_status: 'active',
  subscription_ends_at: '',
  max_users: 5,
  max_products: 1000,
  max_warehouses: 3,
  is_active: true,
};

export default function TenantEditPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<TenantEditFormData>(EMPTY_FORM);

  useEffect(() => {
    const fetchTenant = async () => {
      setIsFetching(true);
      try {
        const data = await tenantService.getTenantById(tenantId);
        const tenant = data.tenant ?? data;
        setFormData({
          business_name: tenant.business_name ?? '',
          business_type: tenant.business_type ?? 'other',
          contact_person: tenant.contact_person ?? '',
          phone: tenant.phone ?? '',
          email: tenant.email ?? '',
          address: tenant.address ?? '',
          city: tenant.city ?? '',
          country: tenant.country ?? 'Bangladesh',
          trade_license: tenant.trade_license ?? '',
          tin_number: tenant.tin_number ?? '',
          bin_number: tenant.bin_number ?? '',
          vat_number: tenant.vat_number ?? '',
          currency: tenant.currency ?? 'BDT',
          timezone: tenant.timezone ?? 'Asia/Dhaka',
          trial_ends_at: tenant.trial_ends_at ? tenant.trial_ends_at.substring(0, 10) : '',
          subscription_plan: tenant.subscription_plan ?? 'free',
          subscription_status: tenant.subscription_status ?? 'active',
          subscription_ends_at: tenant.subscription_ends_at
            ? tenant.subscription_ends_at.substring(0, 10)
            : '',
          max_users: tenant.max_users ?? 5,
          max_products: tenant.max_products ?? 1000,
          max_warehouses: tenant.max_warehouses ?? 3,
          is_active: tenant.is_active ?? true,
        });
      } catch (error: any) {
        notify.error(error.response?.data?.message || 'Failed to load tenant');
        router.push('/tenants');
      } finally {
        setIsFetching(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : name.includes('max_')
            ? parseInt(value) || 0
            : value,
    }));

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const getFieldError = (fieldName: string) => errors[fieldName]?.[0] ?? null;

  const getInputClassName = (fieldName: string, base: string) => {
    return errors[fieldName]
      ? base
        .replace('border-gray-300 dark:border-gray-600', 'border-red-500')
        .replace('focus:border-indigo-500 dark:focus:border-indigo-400', 'focus:border-red-500')
      : base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      await tenantService.updateTenant(tenantId, formData);
      notify.success('Tenant updated successfully!');
      router.push('/tenants');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to update tenant');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-500 dark:text-gray-400">
        Loading tenant data…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/tenants')}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Edit Tenant
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-1" autoComplete="off">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2 space-y-3">
            {/* Row 1: Business Name, Business Type, Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  required
                  className={getInputClassName('business_name', inputBase)}
                  placeholder="Enter business name"
                />
                {getFieldError('business_name') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('business_name')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Type
                </label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleInputChange}
                  className={getInputClassName('business_type', inputBase)}
                >
                  {BUSINESS_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {getFieldError('business_type') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('business_type')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={getInputClassName('email', inputBase)}
                  placeholder="Enter email address"
                />
                {getFieldError('email') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('email')}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Contact Person, Phone, City, Country */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  className={getInputClassName('contact_person', inputBase)}
                  placeholder="Enter contact person name"
                />
                {getFieldError('contact_person') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('contact_person')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={getInputClassName('phone', inputBase)}
                  placeholder="Enter phone number"
                />
                {getFieldError('phone') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('phone')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={getInputClassName('city', inputBase)}
                  placeholder="Enter city"
                />
                {getFieldError('city') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('city')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={getInputClassName('country', inputBase)}
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {getFieldError('country') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('country')}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Address */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
                className={getInputClassName('address', inputBase)}
                placeholder="Enter business address"
              />
              {getFieldError('address') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('address')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Business Registration */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Business Registration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trade License
              </label>
              <input
                type="text"
                name="trade_license"
                value={formData.trade_license}
                onChange={handleInputChange}
                className={getInputClassName('trade_license', inputBase)}
                placeholder="Enter trade license number"
              />
              {getFieldError('trade_license') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('trade_license')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                TIN Number
              </label>
              <input
                type="text"
                name="tin_number"
                value={formData.tin_number}
                onChange={handleInputChange}
                className={getInputClassName('tin_number', inputBase)}
                placeholder="Enter TIN number"
              />
              {getFieldError('tin_number') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('tin_number')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                BIN Number
              </label>
              <input
                type="text"
                name="bin_number"
                value={formData.bin_number}
                onChange={handleInputChange}
                className={getInputClassName('bin_number', inputBase)}
                placeholder="Enter BIN number"
              />
              {getFieldError('bin_number') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('bin_number')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                VAT Number
              </label>
              <input
                type="text"
                name="vat_number"
                value={formData.vat_number}
                onChange={handleInputChange}
                className={getInputClassName('vat_number', inputBase)}
                placeholder="Enter VAT number"
              />
              {getFieldError('vat_number') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('vat_number')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Settings & Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Settings & Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Plan
              </label>
              <select
                name="subscription_plan"
                value={formData.subscription_plan}
                onChange={handleInputChange}
                className={getInputClassName('subscription_plan', inputBase)}
              >
                {SUBSCRIPTION_PLANS.map(plan => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
              {getFieldError('subscription_plan') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('subscription_plan')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Status
              </label>
              <select
                name="subscription_status"
                value={formData.subscription_status}
                onChange={handleInputChange}
                className={getInputClassName('subscription_status', inputBase)}
              >
                {SUBSCRIPTION_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {getFieldError('subscription_status') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('subscription_status')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription End At
              </label>
              <input
                type="date"
                name="subscription_ends_at"
                value={formData.subscription_ends_at}
                onChange={handleInputChange}
                className={getInputClassName('subscription_ends_at', inputBase)}
              />
              {getFieldError('subscription_ends_at') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('subscription_ends_at')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trial Ends At
              </label>
              <input
                type="date"
                name="trial_ends_at"
                value={formData.trial_ends_at}
                onChange={handleInputChange}
                className={getInputClassName('trial_ends_at', inputBase)}
              />
              {getFieldError('trial_ends_at') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('trial_ends_at')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Usage Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Users
              </label>
              <input
                type="number"
                name="max_users"
                value={formData.max_users}
                onChange={handleInputChange}
                min="1"
                className={getInputClassName('max_users', inputBase)}
              />
              {getFieldError('max_users') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('max_users')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Products
              </label>
              <input
                type="number"
                name="max_products"
                value={formData.max_products}
                onChange={handleInputChange}
                min="1"
                className={getInputClassName('max_products', inputBase)}
              />
              {getFieldError('max_products') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('max_products')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Warehouses
              </label>
              <input
                type="number"
                name="max_warehouses"
                value={formData.max_warehouses}
                onChange={handleInputChange}
                min="1"
                className={getInputClassName('max_warehouses', inputBase)}
              />
              {getFieldError('max_warehouses') && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {getFieldError('max_warehouses')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Active Status + Submit */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/tenants')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {isLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
