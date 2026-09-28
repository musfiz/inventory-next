'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Barcode, Loader2, Monitor, Printer, Settings, Store } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { tenantService } from '@/services/tenantService';
import { GiSave } from 'react-icons/gi';
import { usePermissions } from '@/hooks/use-permissions';

interface TenantSettingsFormData {
  default_printer_type: string;
  thermal_paper_size: string;
  default_printer_enabled: boolean;
  pos_type: string;
  pos_receipt_header: string;
  pos_receipt_footer: string;
  pos_logo_position: string;
  pos_show_tax_breakdown: boolean;
  store_notification_email: string;
  business_short_name: string;
  store_date_format: string;
  store_time_format: string;
  store_currency_position: string;
  store_tax_included: boolean;
  logo_url: string;
  barcode_print_type: string;
  barcode_columns: number;
  barcode_label_width: string;
  barcode_label_height: string;
  barcode_paper_size: string;
  [key: string]: any;
}

const EMPTY_FORM: TenantSettingsFormData = {
  default_printer_type: 'a4',
  thermal_paper_size: '80mm',
  default_printer_enabled: false,
  pos_type: '80mm',
  pos_receipt_header: '',
  pos_receipt_footer: '',
  pos_logo_position: 'top',
  pos_show_tax_breakdown: true,
  store_notification_email: '',
  business_short_name: '',
  store_date_format: 'Y-m-d',
  store_time_format: 'H:i:s',
  store_currency_position: 'before',
  store_tax_included: false,
  logo_url: '',
  barcode_print_type: 'a4',
  barcode_columns: 1,
  barcode_label_width: '50mm',
  barcode_label_height: '25mm',
  barcode_paper_size: '80mm',
};

export default function TenantSettingsPage({ tenantId: propTenantId }: { tenantId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const { isSuperAdmin, isHydrated } = usePermissions();

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) {
      router.push('/access-denied');
    }
  }, [isSuperAdmin, isHydrated, router]);

  const tenantId = propTenantId || (params.id as string);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<TenantSettingsFormData>(EMPTY_FORM);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const data = await tenantService.getTenantSettings(tenantId);
        setFormData({
          ...EMPTY_FORM,
          ...data,
          business_short_name: data?.business_short_name ?? '',
          store_notification_email: data?.store_notification_email ?? '',
          logo_url: data?.logo_url ?? '',
        });
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || 'Failed to load settings'
        );
        router.push('/tenants');
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [tenantId, router]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'business_short_name'
        ? value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
        : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getFieldError = (fieldName: string) => errors[fieldName]?.[0] ?? null;
  const hasFieldError = (fieldName: string) => !!errors[fieldName];

  const inputCls = (hasError?: boolean) =>
    `w-full px-2.5 py-1 text-xs bg-white dark:bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      await tenantService.updateTenantSettings(tenantId, formData);
      notify.success('Settings updated successfully!');
      router.push('/tenants');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        notify.error(
          error.response?.data?.message || 'Failed to update settings'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-500 dark:text-gray-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/tenants')}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Tenant Settings
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/* Default Printer Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Default Printer Selection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Printer Type" labelWidth="w-32">
              <div className="flex min-h-7 items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="default_printer_type"
                    value="a4"
                    checked={formData.default_printer_type === 'a4'}
                    onChange={() =>
                      handleRadioChange('default_printer_type', 'a4')
                    }
                    className="accent-indigo-600 dark:accent-indigo-400"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    A4 Print
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="default_printer_type"
                    value="thermal"
                    checked={formData.default_printer_type === 'thermal'}
                    onChange={() =>
                      handleRadioChange('default_printer_type', 'thermal')
                    }
                    className="accent-indigo-600 dark:accent-indigo-400"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Thermal Print
                  </span>
                </label>
              </div>
            </FormRow>

            {formData.default_printer_type === 'thermal' && (
              <FormRow label="Paper Size" labelWidth="w-32">
                <div className="flex min-h-7 items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="thermal_paper_size"
                      value="80mm"
                      checked={formData.thermal_paper_size === '80mm'}
                      onChange={() =>
                        handleRadioChange('thermal_paper_size', '80mm')
                      }
                      className="accent-indigo-600 dark:accent-indigo-400"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      80mm
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="thermal_paper_size"
                      value="53mm"
                      checked={formData.thermal_paper_size === '53mm'}
                      onChange={() =>
                        handleRadioChange('thermal_paper_size', '53mm')
                      }
                      className="accent-indigo-600 dark:accent-indigo-400"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      53mm
                    </span>
                  </label>
                </div>
              </FormRow>
            )}

            <FormRow label="Default Printer" labelWidth="w-32">
              <div className="flex min-h-7 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="default_printer_enabled"
                    checked={formData.default_printer_enabled}
                    onChange={handleCheckboxChange}
                    className="h-3.5 w-3.5 accent-indigo-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Enable Default Printer
                  </span>
                </label>
              </div>
            </FormRow>
          </div>
        </div>

        {/* POS Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            POS Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="POS Type" error={getFieldError('pos_type')} labelWidth="w-32">
              <select
                name="pos_type"
                value={formData.pos_type}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('pos_type'))}
              >
                <option value="80mm">80mm</option>
                <option value="53mm">53mm</option>
              </select>
            </FormRow>

            <FormRow label="Receipt Header" error={getFieldError('pos_receipt_header')} labelWidth="w-32">
              <input
                type="text"
                name="pos_receipt_header"
                value={formData.pos_receipt_header}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('pos_receipt_header'))}
                placeholder="Header text"
              />
            </FormRow>

            <FormRow label="Receipt Footer" error={getFieldError('pos_receipt_footer')} labelWidth="w-32">
              <input
                type="text"
                name="pos_receipt_footer"
                value={formData.pos_receipt_footer}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('pos_receipt_footer'))}
                placeholder="Footer text"
              />
            </FormRow>

            <FormRow label="Logo Position" error={getFieldError('pos_logo_position')} labelWidth="w-32">
              <select
                name="pos_logo_position"
                value={formData.pos_logo_position}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('pos_logo_position'))}
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </FormRow>

            <FormRow label="Tax Breakdown" labelWidth="w-32">
              <div className="flex min-h-7 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pos_show_tax_breakdown"
                    checked={formData.pos_show_tax_breakdown}
                    onChange={handleCheckboxChange}
                    className="h-3.5 w-3.5 accent-indigo-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Show Tax Breakdown
                  </span>
                </label>
              </div>
            </FormRow>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            General Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Notification Email" error={getFieldError('store_notification_email')} labelWidth="w-32">
              <input
                type="email"
                name="store_notification_email"
                value={formData.store_notification_email}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('store_notification_email'))}
                placeholder="admin@example.com"
              />
            </FormRow>

            <FormRow label="Short Name" error={getFieldError('business_short_name')} labelWidth="w-32">
              <input
                type="text"
                name="business_short_name"
                value={formData.business_short_name ?? ''}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('business_short_name'))}
                placeholder="ABC"
                maxLength={5}
              />
            </FormRow>

            <FormRow label="Logo URL" error={getFieldError('logo_url')} labelWidth="w-32">
              <input
                type="text"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('logo_url'))}
                placeholder="https://example.com/logo.png"
              />
            </FormRow>

            <FormRow label="Date Format" error={getFieldError('store_date_format')} labelWidth="w-32">
              <input
                type="text"
                name="store_date_format"
                value={formData.store_date_format}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('store_date_format'))}
                placeholder="Y-m-d"
              />
            </FormRow>

            <FormRow label="Time Format" error={getFieldError('store_time_format')} labelWidth="w-32">
              <input
                type="text"
                name="store_time_format"
                value={formData.store_time_format}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('store_time_format'))}
                placeholder="H:i:s"
              />
            </FormRow>

            <FormRow label="Currency Position" error={getFieldError('store_currency_position')} labelWidth="w-32">
              <select
                name="store_currency_position"
                value={formData.store_currency_position}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('store_currency_position'))}
              >
                <option value="before">Before (e.g. $100)</option>
                <option value="after">After (e.g. 100$)</option>
              </select>
            </FormRow>

            <FormRow label="Tax Included" labelWidth="w-32">
              <div className="flex min-h-7 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="store_tax_included"
                    checked={formData.store_tax_included}
                    onChange={handleCheckboxChange}
                    className="h-3.5 w-3.5 accent-indigo-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Tax Included in Prices
                  </span>
                </label>
              </div>
            </FormRow>
          </div>
        </div>

        {/* Barcode Print Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Barcode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Barcode Print Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <FormRow label="Print Type" error={getFieldError('barcode_print_type')} labelWidth="w-32">
              <select
                name="barcode_print_type"
                value={formData.barcode_print_type}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('barcode_print_type'))}
              >
                <option value="a4">A4 Sheet</option>
                <option value="thermal">Thermal</option>
              </select>
            </FormRow>

            <FormRow label="Columns" error={getFieldError('barcode_columns')} labelWidth="w-32">
              <select
                name="barcode_columns"
                value={formData.barcode_columns}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    barcode_columns: parseInt(e.target.value),
                  }))
                }
                className={inputCls(hasFieldError('barcode_columns'))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </FormRow>

            <FormRow label="Label Width" error={getFieldError('barcode_label_width')} labelWidth="w-32">
              <input
                type="text"
                name="barcode_label_width"
                value={formData.barcode_label_width}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('barcode_label_width'))}
                placeholder="50mm"
              />
            </FormRow>

            <FormRow label="Label Height" error={getFieldError('barcode_label_height')} labelWidth="w-32">
              <input
                type="text"
                name="barcode_label_height"
                value={formData.barcode_label_height}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('barcode_label_height'))}
                placeholder="25mm"
              />
            </FormRow>

            <FormRow label="Paper Size" error={getFieldError('barcode_paper_size')} labelWidth="w-32">
              <select
                name="barcode_paper_size"
                value={formData.barcode_paper_size}
                onChange={handleInputChange}
                className={inputCls(hasFieldError('barcode_paper_size'))}
              >
                <option value="80mm">80mm</option>
                <option value="50mm">50mm</option>
              </select>
            </FormRow>
          </div>
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
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GiSave className="w-3.5 h-3.5" />}
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormRow({ label, required, error, children, labelWidth = 'w-32', className = '' }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; labelWidth?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <label className={`${labelWidth} shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-right`}>
          {label}{required && <span className="text-red-500">*</span>}:
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-0.5 ml-[8.5rem]">{error}</p>}
    </div>
  );
}
