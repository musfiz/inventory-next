'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, ArrowLeft } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { tenantService } from '@/services/tenantService';
import { BUSINESS_TYPES, SUBSCRIPTION_PLANS, CURRENCIES, TIMEZONES } from '@/lib/constants';

interface TenantFormData {
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
  theme_color: string;
  subscription_plan: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
}

export default function TenantRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<TenantFormData>({
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
    theme_color: '#3B82F6',
    subscription_plan: 'free',
    max_users: 5,
    max_products: 1000,
    max_warehouses: 3,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('max_') ? parseInt(value) || 0 : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const getFieldError = (fieldName: string) => {
    return errors[fieldName]?.[0] || null;
  };

  const getInputClassName = (fieldName: string, baseClassName: string) => {
    const hasError = !!errors[fieldName];
    return hasError
      ? baseClassName
          .replace('border-gray-300 dark:border-gray-600', 'border-red-500')
          .replace('focus:border-indigo-500 dark:focus:border-indigo-400', 'focus:border-red-500')
      : baseClassName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      await tenantService.storeTenant(formData);
      notify.success('Tenant created successfully!');
      router.push('/tenants');
    } catch (error: any) {
      console.error('Error creating tenant:', error);

      // Handle validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to create tenant');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Tenant Registration
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-1">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          {/* Basic Information */}
          <div className="mb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  className={getInputClassName(
                    'business_name',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
                  className={getInputClassName(
                    'business_type',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
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
                  className={getInputClassName(
                    'email',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter email address"
                />
                {getFieldError('email') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('email')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'contact_person',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
                  className={getInputClassName(
                    'phone',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter phone number"
                />
                {getFieldError('phone') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('phone')}
                  </p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className={getInputClassName(
                    'address',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter business address"
                />
                {getFieldError('address') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('address')}
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
                  className={getInputClassName(
                    'city',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'country',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter country"
                />
                {getFieldError('country') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('country')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Registration */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-1">
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
                  className={getInputClassName(
                    'trade_license',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter trade license number"
                />
                {getFieldError('trade_license') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('trade_license')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TIN Number
                </label>
                <input
                  type="text"
                  name="tin_number"
                  value={formData.tin_number}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'tin_number',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter TIN number"
                />
                {getFieldError('tin_number') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('tin_number')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  BIN Number
                </label>
                <input
                  type="text"
                  name="bin_number"
                  value={formData.bin_number}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'bin_number',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                  placeholder="Enter BIN number"
                />
                {getFieldError('bin_number') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('bin_number')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  VAT Number
                </label>
                <input
                  type="text"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'vat_number',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Settings & Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'currency',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
                {getFieldError('currency') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('currency')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'timezone',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {getFieldError('timezone') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('timezone')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme Color
                </label>
                <input
                  type="color"
                  name="theme_color"
                  value={formData.theme_color}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'theme_color',
                    'w-full h-8 px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                />
                {getFieldError('theme_color') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('theme_color')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscription Plan
                </label>
                <select
                  name="subscription_plan"
                  value={formData.subscription_plan}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'subscription_plan',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-1">
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
                  className={getInputClassName(
                    'max_users',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
                  className={getInputClassName(
                    'max_products',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
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
                  className={getInputClassName(
                    'max_warehouses',
                    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400'
                  )}
                />
                {getFieldError('max_warehouses') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('max_warehouses')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-start">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isLoading ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
