'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Barcode,
  Printer,
  Settings,
  Store,
  Monitor,
  CheckSquare,
} from 'lucide-react';
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

export default function TenantSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { isSuperAdmin, isHydrated } = usePermissions();

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) {
      router.push('/access-denied');
    }
  }, [isSuperAdmin, isHydrated, router]);

  const tenantId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<TenantSettingsFormData>(EMPTY_FORM);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const data = await tenantService.getTenantSettings(tenantId);
        setFormData({ ...EMPTY_FORM, ...data });
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

  const getInputClassName = (fieldName: string, base: string) => {
    return errors[fieldName]
      ? base
        .replace(
          'border-gray-300 dark:border-gray-600',
          'border-red-500'
        )
        .replace(
          'focus:border-indigo-500 dark:focus:border-indigo-400',
          'focus:border-red-500'
        )
      : base;
  };

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

  const inputBase =
    'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';

  const labelClass =
    'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5';

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/tenants')}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Tenant Settings
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/* Section 1: Default Printer Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Default Printer Selection
            </h2>
          </div>
          <div className="p-3 space-y-3">
            {/* Printer Type Radio */}
            <div>
              <label className={labelClass}>Printer Type</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    A4 Print
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Thermal Print
                  </span>
                </label>
              </div>
            </div>

            {/* Thermal Paper Size (only when thermal selected) */}
            {formData.default_printer_type === 'thermal' && (
              <div>
                <label className={labelClass}>Thermal Paper Size</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      80mm
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      53mm
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Enable Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                name="default_printer_enabled"
                checked={formData.default_printer_enabled}
                onChange={handleCheckboxChange}
                className="rounded accent-indigo-600 dark:accent-indigo-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable Default Printer
              </span>
            </label>
          </div>
        </div>

        {/* Section 2: POS Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              POS Settings
            </h2>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>POS Type</label>
                <select
                  name="pos_type"
                  value={formData.pos_type}
                  onChange={handleInputChange}
                  className={getInputClassName('pos_type', inputBase)}
                >
                  <option value="80mm">80mm</option>
                  <option value="53mm">53mm</option>
                </select>
                {getFieldError('pos_type') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('pos_type')}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Receipt Header</label>
                <input
                  type="text"
                  name="pos_receipt_header"
                  value={formData.pos_receipt_header}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'pos_receipt_header',
                    inputBase
                  )}
                  placeholder="Header text"
                />
              </div>

              <div>
                <label className={labelClass}>Receipt Footer</label>
                <input
                  type="text"
                  name="pos_receipt_footer"
                  value={formData.pos_receipt_footer}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'pos_receipt_footer',
                    inputBase
                  )}
                  placeholder="Footer text"
                />
              </div>

              <div>
                <label className={labelClass}>Logo Position</label>
                <select
                  name="pos_logo_position"
                  value={formData.pos_logo_position}
                  onChange={handleInputChange}
                  className={getInputClassName('pos_logo_position', inputBase)}
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pos_show_tax_breakdown"
                    checked={formData.pos_show_tax_breakdown}
                    onChange={handleCheckboxChange}
                    className="rounded accent-indigo-600 dark:accent-indigo-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Tax Breakdown
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              General Settings
            </h2>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Notification Email</label>
                <input
                  type="email"
                  name="store_notification_email"
                  value={formData.store_notification_email}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'store_notification_email',
                    inputBase
                  )}
                  placeholder="admin@example.com"
                />
                {getFieldError('store_notification_email') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('store_notification_email')}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Business Short Name</label>
                <input
                  type="text"
                  name="business_short_name"
                  value={formData.business_short_name}
                  onChange={handleInputChange}
                  className={getInputClassName('business_short_name', inputBase)}
                  placeholder="ABC"
                  maxLength={5}
                />
                {getFieldError('business_short_name') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('business_short_name')}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Logo URL</label>
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  className={getInputClassName('logo_url', inputBase)}
                  placeholder="https://example.com/logo.png"
                />
                {getFieldError('logo_url') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('logo_url')}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Date Format</label>
                <input
                  type="text"
                  name="store_date_format"
                  value={formData.store_date_format}
                  onChange={handleInputChange}
                  className={getInputClassName('store_date_format', inputBase)}
                  placeholder="Y-m-d"
                />
              </div>

              <div>
                <label className={labelClass}>Time Format</label>
                <input
                  type="text"
                  name="store_time_format"
                  value={formData.store_time_format}
                  onChange={handleInputChange}
                  className={getInputClassName('store_time_format', inputBase)}
                  placeholder="H:i:s"
                />
              </div>

              <div>
                <label className={labelClass}>Currency Position</label>
                <select
                  name="store_currency_position"
                  value={formData.store_currency_position}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'store_currency_position',
                    inputBase
                  )}
                >
                  <option value="before">Before (e.g. $100)</option>
                  <option value="after">After (e.g. 100$)</option>
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="store_tax_included"
                    checked={formData.store_tax_included}
                    onChange={handleCheckboxChange}
                    className="rounded accent-indigo-600 dark:accent-indigo-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Tax Included in Prices
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Barcode Print Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <Barcode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Barcode Print Settings
            </h2>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Print Type */}
              <div>
                <label className={labelClass}>Print Type</label>
                <select
                  name="barcode_print_type"
                  value={formData.barcode_print_type}
                  onChange={handleInputChange}
                  className={getInputClassName('barcode_print_type', inputBase)}
                >
                  <option value="a4">A4 Sheet</option>
                  <option value="thermal">Thermal</option>
                </select>
                {getFieldError('barcode_print_type') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('barcode_print_type')}
                  </p>
                )}
              </div>

              {/* Columns */}
              <div>
                <label className={labelClass}>Columns</label>
                <select
                  name="barcode_columns"
                  value={formData.barcode_columns}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      barcode_columns: parseInt(e.target.value),
                    }))
                  }
                  className={getInputClassName('barcode_columns', inputBase)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
                {getFieldError('barcode_columns') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('barcode_columns')}
                  </p>
                )}
              </div>

              {/* Label Width */}
              <div>
                <label className={labelClass}>Label Width</label>
                <input
                  type="text"
                  name="barcode_label_width"
                  value={formData.barcode_label_width}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'barcode_label_width',
                    inputBase
                  )}
                  placeholder="50mm"
                />
                {getFieldError('barcode_label_width') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('barcode_label_width')}
                  </p>
                )}
              </div>

              {/* Label Height */}
              <div>
                <label className={labelClass}>Label Height</label>
                <input
                  type="text"
                  name="barcode_label_height"
                  value={formData.barcode_label_height}
                  onChange={handleInputChange}
                  className={getInputClassName(
                    'barcode_label_height',
                    inputBase
                  )}
                  placeholder="25mm"
                />
                {getFieldError('barcode_label_height') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('barcode_label_height')}
                  </p>
                )}
              </div>

              {/* Paper Size */}
              <div>
                <label className={labelClass}>Paper Size (Thermal)</label>
                <select
                  name="barcode_paper_size"
                  value={formData.barcode_paper_size}
                  onChange={handleInputChange}
                  className={getInputClassName('barcode_paper_size', inputBase)}
                >
                  <option value="80mm">80mm</option>
                  <option value="50mm">50mm</option>
                </select>
                {getFieldError('barcode_paper_size') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {getFieldError('barcode_paper_size')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-white bg-green-600 rounded-sm hover:bg-green-700 disabled:bg-gray-400"
          >
            <GiSave />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
