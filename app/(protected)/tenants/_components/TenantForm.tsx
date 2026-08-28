'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { GiSave } from 'react-icons/gi';
import { z } from 'zod';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { useApplyServerErrors } from '@/components/ui/form/apply-server-errors';
import {
  TextField,
  TextareaField,
  SelectField,
  CheckboxField,
  Field,
  useFieldError,
} from '@/components/ui/form/fields';
import Spinner from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/use-permissions';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '@/lib/constants';
import { notify } from '@/lib/notifications';
import {
  requiredString,
  optionalString,
  email,
  phone,
  optionalId,
  numberField,
  booleanField,
} from '@/lib/utils/validation';
import { tenantService } from '@/services/tenantService';

const COUNTRY_OPTIONS = ['Bangladesh'] as const;

// ── Schema (Section 3.4: zod-based validation) ──────────────────────────────
const tenantSchema = z.object({
  business_name: requiredString('Business name', { max: 191 }),
  business_type_id: optionalId('Business type'),
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
    formState: { isSubmitting },
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

  const applyServerErrors = useApplyServerErrors();

  const onValid = async (values: TenantFormOutput) => {
    try {
      const payload = { ...values };
      if (isEditMode && editRef) {
        await tenantService.updateTenant(editRef, payload as any);
        notify.success('Tenant updated successfully!');
      } else {
        await tenantService.storeTenant(payload as any);
        notify.success('Tenant created successfully!');
      }
      router.push('/tenants');
    } catch (error: any) {
      const applied = applyServerErrors(error.response?.data?.errors);
      if (!applied) {
        notify.error(
          error.response?.data?.message ||
            (isEditMode ? 'Failed to update tenant' : 'Failed to create tenant'),
        );
      }
    }
  };

  const storefrontError = useFieldError('storefront_active');

  if (isEditMode && !isHydrated) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-center">
          <Spinner size="md" className="mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {isEditMode ? 'Edit Tenant' : 'Tenant Registration'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="space-y-1" autoComplete="false" noValidate>
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="mb-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField name="business_name" label="Business Name" required placeholder="Enter business name" />
                <Field label="Business Type">
                  <Controller
                    control={control}
                    name="business_type_id"
                    render={({ field }) => (
                      <BusinessTypeSelect
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder="Select business type"
                      />
                    )}
                  />
                </Field>
                <TextField name="email" label="Email" type="email" required placeholder="Enter email address" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <TextField name="contact_person" label="Contact Person" placeholder="Enter contact person name" />
                <TextField name="phone" label="Phone" type="tel" placeholder="Enter phone number" />
                <TextField name="city" label="City" placeholder="Enter city" />
                <SelectField name="country" label="Country" required>
                  {COUNTRY_OPTIONS.map(country => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </SelectField>
              </div>

              <TextareaField name="address" label="Address" rows={2} placeholder="Enter business address" />
            </div>
          </div>

          {/* Business Registration */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Business Registration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <TextField name="trade_license" label="Trade License" placeholder="Enter trade license number" />
              <TextField name="tin_number" label="TIN Number" placeholder="Enter TIN number" />
              <TextField name="bin_number" label="BIN Number" placeholder="Enter BIN number" />
              <TextField name="vat_number" label="VAT Number" placeholder="Enter VAT number" />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Settings & Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <SelectField name="subscription_plan" label="Subscription Plan" required>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </SelectField>
              <SelectField name="subscription_status" label="Subscription Status" required>
                {SUBSCRIPTION_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectField>

              <Field label="Subscription End At">
                <Controller
                  control={control}
                  name="subscription_ends_at"
                  render={({ field }) => (
                    <CustomDatePicker value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </Field>
              <Field label="Trial Ends At">
                <Controller
                  control={control}
                  name="trial_ends_at"
                  render={({ field }) => (
                    <CustomDatePicker value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Usage Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField
                name="max_users"
                label="Max Users"
                type="number"
                min={1}
                required
                registrationOptions={{ valueAsNumber: true }}
              />
              <TextField
                name="max_products"
                label="Max Products"
                type="number"
                min={1}
                required
                registrationOptions={{ valueAsNumber: true }}
              />
              <TextField
                name="max_warehouses"
                label="Max Warehouses"
                type="number"
                min={1}
                required
                registrationOptions={{ valueAsNumber: true }}
              />
            </div>
          </div>

          {/* Active + Storefront + Submit */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-6">
              <CheckboxField name="is_active" label="Active" />
              <Controller
                control={control}
                name="storefront_active"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(field.value)}
                      onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        field.value
                          ? 'bg-indigo-600 focus:ring-indigo-500'
                          : 'bg-gray-300 dark:bg-gray-600 focus:ring-indigo-500'
                      } ${storefrontError ? 'ring-2 ring-red-500' : ''}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          field.value ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Storefront Active
                      </span>
                      {storefrontError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5" role="alert">
                          {storefrontError}
                        </p>
                      )}
                    </div>
                  </label>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/tenants')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GiSave className="w-4 h-4" />
                {isSubmitting ? (isEditMode ? 'Saving…' : 'Creating…') : isEditMode ? 'Save Changes' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
