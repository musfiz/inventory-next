'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { GiSave } from 'react-icons/gi';
import { z } from 'zod';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import CustomDatePicker from '@/components/ui/date-picker';
import Spinner from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/use-permissions';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '@/lib/constants';
import { notify } from '@/lib/notifications';
import {
  requiredString,
  optionalString,
  email,
  phone,
  numberField,
  booleanField,
  normalizeServerErrors,
} from '@/lib/utils/validation';
import { tenantService } from '@/services/tenantService';

const COUNTRY_OPTIONS = ['Bangladesh'] as const;

// ── Schema (Section 3.4: zod-based validation) ──────────────────────────────
const tenantSchema = z.object({
  business_name: requiredString('Business name', { max: 191 }),
  business_type_id: z.string().trim().uuid('Invalid business type').optional().or(z.literal('')).transform(v => (v === '' ? undefined : v)),
  contact_person: optionalString({ max: 191 }),
  phone: phone('Phone', false),
  email: email(),
  address: optionalString({ max: 500 }),
  city: optionalString({ max: 191 }),
  country: requiredString('Country'),
  trade_license: optionalString({ max: 191 }),
  tin_number: optionalString({ max: 191 }),
  bin_number: optionalString({ max: 191 }),
  vat_number: optionalString({ max: 191 }),
  currency: requiredString('Currency'),
  timezone: requiredString('Timezone'),
  trial_ends_at: optionalString(),
  subscription_plan: requiredString('Subscription plan'),
  subscription_status: requiredString('Subscription status'),
  subscription_ends_at: optionalString(),
  max_users: numberField({ label: 'Max users', required: true, min: 1, integer: true }),
  max_products: numberField({ label: 'Max products', required: true, min: 1, integer: true }),
  max_warehouses: numberField({ label: 'Max warehouses', required: true, min: 1, integer: true }),
  is_active: booleanField,
  storefront_active: booleanField,
});

type TenantFormInput = z.input<typeof tenantSchema>;
type TenantFormOutput = z.output<typeof tenantSchema>;

const EMPTY_FORM: TenantFormInput = {
  business_name: '',
  business_type_id: '',
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
  max_users: 2,
  max_products: 200,
  max_warehouses: 2,
  is_active: true,
  storefront_active: false,
};

export default function TenantForm({ editRef }: { editRef?: string }) {
  const router = useRouter();
  const { isSuperAdmin, isHydrated } = usePermissions();
  const isEditMode = Boolean(editRef);

  const methods = useForm<TenantFormInput, unknown, TenantFormOutput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: EMPTY_FORM,
    mode: 'onBlur',
  });
  const {
    handleSubmit,
    reset,
    control,
    register,
    setError,
    formState: { errors, isSubmitting },
  } = methods;

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) {
      router.push('/access-denied');
    }
  }, [isSuperAdmin, isHydrated, router]);

  useEffect(() => {
    if (!editRef) return;
    let cancelled = false;
    const fetchTenant = async () => {
      try {
        const data = await tenantService.getTenantById(editRef);
        if (cancelled) return;
        const tenant = data.tenant ?? data;
        reset({
          business_name: tenant.business_name ?? '',
          business_type_id: (tenant as any).business_type_id ?? undefined,
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
          max_users: tenant.max_users ?? 2,
          max_products: tenant.max_products ?? 200,
          max_warehouses: tenant.max_warehouses ?? 2,
          is_active: tenant.is_active ?? true,
          storefront_active: tenant.storefront_active ?? false,
        });
      } catch (error: any) {
        notify.error(error.response?.data?.message || 'Failed to load tenant');
        router.push('/tenants');
      }
    };
    fetchTenant();
    return () => {
      cancelled = true;
    };
  }, [editRef, router, reset]);

  const onValid = async (values: TenantFormOutput) => {
    try {
      const payload: Record<string, unknown> = { ...values };
      // Strip undefined/empty to avoid sending `business_type_id: undefined` which backend treats as keep-existing
      // but ensure business_name trim is preserved.
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) delete payload[k];
      });
      if (isEditMode && editRef) {
        const updated = await tenantService.updateTenant(editRef, payload as any);
        notify.success('Tenant updated successfully!');
        // Optimistically reflect name change before list refetches
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tenant:updated', { detail: updated }));
        }
      } else {
        await tenantService.storeTenant(payload as any);
        notify.success('Tenant created successfully!');
      }
      router.push('/tenants');
      router.refresh();
    } catch (error: any) {
      const errors = error.response?.data?.errors;
      const normalized = normalizeServerErrors(errors);
      if (Object.keys(normalized).length > 0) {
        for (const [field, msg] of Object.entries(normalized)) {
          setError(field as keyof TenantFormOutput, { type: 'server', message: msg });
        }
        notify.error('Please fix the highlighted fields');
      } else {
        notify.error(
          error.response?.data?.message ||
          (isEditMode ? 'Failed to update tenant' : 'Failed to create tenant'),
        );
      }
    }
  };

  const getFieldError = (field: keyof TenantFormOutput): string | null =>
    (errors[field]?.message as string | undefined) ?? null;
  const hasFieldError = (field: keyof TenantFormOutput): boolean => !!errors[field];

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const storefrontError = getFieldError('storefront_active');

  const showPageLoader = isEditMode && !isHydrated;

  return (
    <div className="relative space-y-3">
      {showPageLoader && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
          <Spinner size="md" decorative />
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          {isEditMode ? 'Edit Tenant' : 'Tenant Registration'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onValid)} className="space-y-3" autoComplete="off" noValidate>
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Business Name" required error={getFieldError('business_name')} labelWidth="w-32">
              <input
                id="business_name"
                type="text"
                aria-invalid={hasFieldError('business_name')}
                {...register('business_name')}
                className={inputCls(hasFieldError('business_name'))}
                placeholder="Enter business name"
              />
            </FormRow>

            <FormRow label="Business Type" error={getFieldError('business_type_id')} labelWidth="w-32">
              <Controller
                control={control}
                name="business_type_id"
                render={({ field }) => (
                  <BusinessTypeSelect
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder="Select business type"
                    isInvalid={hasFieldError('business_type_id')}
                    compact
                  />
                )}
              />
            </FormRow>

            <FormRow label="Email" required error={getFieldError('email')} labelWidth="w-32">
              <input
                id="email"
                type="email"
                aria-invalid={hasFieldError('email')}
                {...register('email')}
                className={inputCls(hasFieldError('email'))}
                placeholder="Enter email address"
              />
            </FormRow>

            <FormRow label="Contact Person" error={getFieldError('contact_person')} labelWidth="w-32">
              <input
                id="contact_person"
                type="text"
                aria-invalid={hasFieldError('contact_person')}
                {...register('contact_person')}
                className={inputCls(hasFieldError('contact_person'))}
                placeholder="Enter contact person name"
              />
            </FormRow>

            <FormRow label="Phone" error={getFieldError('phone')} labelWidth="w-32">
              <input
                id="phone"
                type="tel"
                aria-invalid={hasFieldError('phone')}
                {...register('phone')}
                className={inputCls(hasFieldError('phone'))}
                placeholder="Enter phone number"
              />
            </FormRow>

            <FormRow label="City" error={getFieldError('city')} labelWidth="w-32">
              <input
                id="city"
                type="text"
                aria-invalid={hasFieldError('city')}
                {...register('city')}
                className={inputCls(hasFieldError('city'))}
                placeholder="Enter city"
              />
            </FormRow>

            <FormRow label="Country" required error={getFieldError('country')} labelWidth="w-32">
              <select
                id="country"
                aria-invalid={hasFieldError('country')}
                {...register('country')}
                className={inputCls(hasFieldError('country'))}
              >
                {COUNTRY_OPTIONS.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Address" error={getFieldError('address')} labelWidth="w-32" className="md:col-span-2">
              <textarea
                id="address"
                aria-invalid={hasFieldError('address')}
                {...register('address')}
                rows={2}
                className={inputCls(hasFieldError('address'))}
                placeholder="Enter business address"
              />
            </FormRow>
          </div>
        </div>

        {/* Business Registration */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Business Registration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Trade License" error={getFieldError('trade_license')} labelWidth="w-32">
              <input
                id="trade_license"
                type="text"
                aria-invalid={hasFieldError('trade_license')}
                {...register('trade_license')}
                className={inputCls(hasFieldError('trade_license'))}
                placeholder="Enter trade license number"
              />
            </FormRow>
            <FormRow label="TIN Number" error={getFieldError('tin_number')} labelWidth="w-32">
              <input
                id="tin_number"
                type="text"
                aria-invalid={hasFieldError('tin_number')}
                {...register('tin_number')}
                className={inputCls(hasFieldError('tin_number'))}
                placeholder="Enter TIN number"
              />
            </FormRow>
            <FormRow label="BIN Number" error={getFieldError('bin_number')} labelWidth="w-32">
              <input
                id="bin_number"
                type="text"
                aria-invalid={hasFieldError('bin_number')}
                {...register('bin_number')}
                className={inputCls(hasFieldError('bin_number'))}
                placeholder="Enter BIN number"
              />
            </FormRow>
            <FormRow label="VAT Number" error={getFieldError('vat_number')} labelWidth="w-32">
              <input
                id="vat_number"
                type="text"
                aria-invalid={hasFieldError('vat_number')}
                {...register('vat_number')}
                className={inputCls(hasFieldError('vat_number'))}
                placeholder="Enter VAT number"
              />
            </FormRow>
          </div>
        </div>

        {/* Settings & Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Subscription
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2">
            <FormRow label="Plan" required error={getFieldError('subscription_plan')} labelWidth="w-28">
              <select
                id="subscription_plan"
                aria-invalid={hasFieldError('subscription_plan')}
                {...register('subscription_plan')}
                className={inputCls(hasFieldError('subscription_plan'))}
              >
                {SUBSCRIPTION_PLANS.map(plan => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Status" required error={getFieldError('subscription_status')} labelWidth="w-28">
              <select
                id="subscription_status"
                aria-invalid={hasFieldError('subscription_status')}
                {...register('subscription_status')}
                className={inputCls(hasFieldError('subscription_status'))}
              >
                {SUBSCRIPTION_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Subscription Ends" error={getFieldError('subscription_ends_at')} labelWidth="w-28">
              <Controller
                control={control}
                name="subscription_ends_at"
                render={({ field }) => (
                  <CustomDatePicker value={field.value ?? ''} onChange={field.onChange} compact />
                )}
              />
            </FormRow>
            <FormRow label="Trial Ends" error={getFieldError('trial_ends_at')} labelWidth="w-28">
              <Controller
                control={control}
                name="trial_ends_at"
                render={({ field }) => (
                  <CustomDatePicker value={field.value ?? ''} onChange={field.onChange} compact />
                )}
              />
            </FormRow>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Usage Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
            <FormRow label="Max Users" required error={getFieldError('max_users')} labelWidth="w-28">
              <input
                id="max_users"
                type="number"
                min={1}
                aria-invalid={hasFieldError('max_users')}
                {...register('max_users', { valueAsNumber: true })}
                className={inputCls(hasFieldError('max_users'))}
              />
            </FormRow>
            <FormRow label="Max Products" required error={getFieldError('max_products')} labelWidth="w-28">
              <input
                id="max_products"
                type="number"
                min={1}
                aria-invalid={hasFieldError('max_products')}
                {...register('max_products', { valueAsNumber: true })}
                className={inputCls(hasFieldError('max_products'))}
              />
            </FormRow>
            <FormRow label="Max Warehouses" required error={getFieldError('max_warehouses')} labelWidth="w-28">
              <input
                id="max_warehouses"
                type="number"
                min={1}
                aria-invalid={hasFieldError('max_warehouses')}
                {...register('max_warehouses', { valueAsNumber: true })}
                className={inputCls(hasFieldError('max_warehouses'))}
              />
            </FormRow>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Status</h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <input
                type="checkbox"
                aria-invalid={!!errors.is_active}
                {...register('is_active')}
                className="h-3.5 w-3.5 accent-indigo-600"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">Active</span>
            </label>
            <Controller
              control={control}
              name="storefront_active"
              render={({ field }) => (
                <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(field.value)}
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${field.value
                      ? 'bg-indigo-600 focus:ring-indigo-500'
                      : 'bg-gray-300 dark:bg-gray-600 focus:ring-indigo-500'
                      } ${storefrontError ? 'ring-2 ring-red-500' : ''}`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                    />
                  </button>
                  <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Storefront Active
                  </span>
                </label>
              )}
            />
          </div>
          {storefrontError && (
            <p className="text-[10px] text-red-500 mt-1" role="alert">
              {storefrontError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/tenants')}
            className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GiSave className="w-3.5 h-3.5" />}
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Tenant' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormRow({ label, required, error, children, labelWidth = 'w-32', className = '' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; labelWidth?: string; className?: string }) {
  const errorMl =
    labelWidth === 'w-32' ? 'ml-[8.5rem]' : labelWidth === 'w-28' ? 'ml-[7.5rem]' : 'ml-[5.5rem]';
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className={`text-[10px] text-red-500 mt-0.5 ${errorMl}`}>{error}</p>}
    </div>
  );
}
