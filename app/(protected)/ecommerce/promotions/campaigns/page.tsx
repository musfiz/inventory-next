'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Timer,
  Plus,
  X,
  Edit2,
  Trash2,
  Pause,
  Play,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomDateTimePicker from '@/components/ui/date-time-picker';
import type {
  FlashSaleCampaign,
  CampaignStatus,
  CampaignCategory,
} from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import flashSaleCampaignService from '@/services/flashSaleCampaignService';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/format';
import CampaignStatCards from '@/components/ecommerce/campaigns/campaign-stat-cards';
import CountdownBannerPreview from '@/components/ecommerce/campaigns/countdown-banner-preview';
import ProductSelector, {
  type SelectedProduct,
} from '@/components/ecommerce/campaigns/product-selector';

// ── Status Badge ────────────────────────────────────────────────────────────

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<
    CampaignStatus,
    { bg: string; text: string; label: string }
  > = {
    scheduled: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      label: 'Scheduled',
    },
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      label: 'Active',
    },
    ended: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      label: 'Ended',
    },
    paused: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-800 dark:text-amber-300',
      label: 'Paused',
    },
  };
  const c = config[status];
  return (
    <span
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// ── Form State Shape ───────────────────────────────────────────────────────

interface CampaignFormState {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number | '';
  is_paused: boolean;
  is_active: boolean;
  banner: File | null;
  banner_preview: string | null;
  products: SelectedProduct[];
}

const emptyForm: CampaignFormState = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  discount_type: 'percentage',
  discount_value: '',
  is_paused: false,
  is_active: true,
  banner: null,
  banner_preview: null,
  products: [],
};

// ── Page Component ─────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] =
    useState<FlashSaleCampaign | null>(null);
  const [campaigns, setCampaigns] = useState<FlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignFormState>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Category filter state ──────────────────────────────────────────────────
  const [categories, setCategories] = useState<CampaignCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await flashSaleCampaignService.list({ per_page: 100 });
      setCampaigns(res.data);
    } catch {
      // DataTable handles its own errors silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns, refreshKey]);

  // Load categories for the product filter dropdown
  useEffect(() => {
    flashSaleCampaignService.getCategories().then(setCategories);
  }, []);

  // Auto-refresh statuses every 60 seconds
  useEffect(() => {
    statusTimerRef.current = setInterval(() => {
      setCampaigns(prev =>
        prev.map(c => {
          // Trigger a re-computation by spreading (status is computed from accessor)
          return { ...c };
        })
      );
    }, 60_000);
    return () => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    };
  }, []);

  // ── Form Helpers ────────────────────────────────────────────────────────

  const resetForm = () => {
    if (form.banner_preview) URL.revokeObjectURL(form.banner_preview);
    setForm({ ...emptyForm });
    setFormErrors({});
    setIsEditing(false);
    setCurrentCampaign(null);
    setShowForm(false);
    setSelectedCategoryId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditForm = (campaign: FlashSaleCampaign) => {
    setForm({
      name: campaign.name,
      description: campaign.description,
      start_date: campaign.start_date ? campaign.start_date.slice(0, 16) : '',
      end_date: campaign.end_date ? campaign.end_date.slice(0, 16) : '',
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
      is_paused: campaign.is_paused,
      is_active: campaign.is_active,
      banner: null,
      banner_preview: campaign.banner_image_url ?? null,
      products: campaign.products?.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name || '',
        product_sku: p.product_sku,
      })) || [],
    });
    setFormErrors({});
    setIsEditing(true);
    setCurrentCampaign(campaign);
    setShowForm(true);
    setSelectedCategoryId('');
  };

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // ── Banner Upload ──────────────────────────────────────────────────────

  const handleBannerSelect = (file: File | null) => {
    if (!file) {
      if (form.banner_preview && !currentCampaign?.banner_image_url) {
        URL.revokeObjectURL(form.banner_preview);
      }
      setForm(f => ({
        ...f,
        banner: null,
        banner_preview: currentCampaign?.banner_image_url ?? null,
      }));
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      notify.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error('Image must be under 5MB');
      return;
    }
    if (form.banner_preview && !currentCampaign?.banner_image_url) {
      URL.revokeObjectURL(form.banner_preview);
    }
    setForm(f => ({
      ...f,
      banner: file,
      banner_preview: URL.createObjectURL(file),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleBannerSelect(e.dataTransfer.files?.[0] || null);
  };

  // ── Validation ─────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Campaign name is required';
    if (!form.start_date) errors.start_date = 'Start date is required';
    if (!form.end_date) errors.end_date = 'End date is required';
    if (form.discount_value === '' || Number(form.discount_value) <= 0) {
      errors.discount_value = 'Discount value must be greater than 0';
    }
    if (
      form.start_date &&
      form.end_date &&
      new Date(form.end_date) <= new Date(form.start_date)
    ) {
      errors.end_date = 'End date must be after start date';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validate()) return;

    setSaving(true);
    try {
      await flashSaleCampaignService.store({
        id: isEditing && currentCampaign?.id ? currentCampaign.id : undefined,
        name: form.name,
        description: form.description,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : undefined,
        end_date: form.end_date
          ? new Date(form.end_date).toISOString()
          : undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        is_paused: form.is_paused,
        is_active: form.is_active,
        banner: form.banner,
        products: form.products.map(p => ({
          id: '',
          campaign_id: currentCampaign?.id || '',
          product_id: p.product_id,
          product_name: p.product_name,
          product_sku: p.product_sku,
          created_at: new Date().toISOString(),
        })),
      });

      notify.success(
        isEditing ? 'Campaign updated successfully' : 'Campaign created successfully'
      );
      resetForm();
      setRefreshKey(prev => prev + 1);
      fetchCampaigns();
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.errors) {
        setFormErrors(errData.errors);
      } else {
        notify.error(errData?.message || err?.message || 'Failed to save campaign');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = async (campaign: FlashSaleCampaign) => {
    const result = await confirm({
      title: 'Delete Campaign',
      html: `Are you sure you want to delete <strong>${campaign.name}</strong>?<br><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;

    try {
      await flashSaleCampaignService.delete(campaign.id);
      notify.success('Campaign deleted');
      setRefreshKey(prev => prev + 1);
      fetchCampaigns();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete campaign');
    }
  };

  // ── Toggle Pause ───────────────────────────────────────────────────────

  const handleTogglePause = async (campaign: FlashSaleCampaign) => {
    try {
      const updated = await flashSaleCampaignService.togglePause(campaign.id);
      setCampaigns(prev =>
        prev.map(c => (c.id === updated.id ? updated : c))
      );
      setRefreshKey(prev => prev + 1);
      notify.success(updated.is_paused ? 'Campaign paused' : 'Campaign resumed');
    } catch (err: any) {
      notify.error('Failed to toggle campaign status');
    }
  };

  // ── DataTable Columns ──────────────────────────────────────────────────

  const columns: ColumnDef<FlashSaleCampaign>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
      cell: ({ row, table }) => {
        const p = table.getState().pagination;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {(p?.pageIndex || 0) * (p?.pageSize || 15) + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]" title={row.original.name}>
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      meta: { width: '10%' },
      cell: ({ row }) => {
        const { discount_type, discount_value } = row.original;
        const label =
          discount_type === 'percentage'
            ? `${discount_value}%`
            : formatCurrency(discount_value);
        return (
          <span
            className={`px-1.5 py-0.5 text-xs font-medium rounded ${discount_type === 'percentage'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              }`}
          >
            {label} {discount_type === 'percentage' ? 'OFF' : 'OFF'}
          </span>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.start_date ? formatDate(row.original.start_date) : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.end_date ? formatDate(row.original.end_date) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'products_count',
      header: 'Products',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.products?.length ?? 0} products
        </span>
      ),
    },
    {
      id: 'computed_status',
      accessorKey: 'computed_status',
      header: 'Status',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <CampaignStatusBadge
          status={row.original.computed_status || 'ended'}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '14%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => openEditForm(row.original)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1 rounded cursor-pointer ${row.original.is_paused
                ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
            title={row.original.is_paused ? 'Resume' : 'Pause'}
            onClick={() => handleTogglePause(row.original)}
          >
            {row.original.is_paused ? (
              <Play className="w-3.5 h-3.5" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDelete(row.original)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Flash Sale Campaigns
          </h1>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Campaign
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      {!loading && (
        <CampaignStatCards campaigns={campaigns} loading={loading} />
      )}

      {/* ── Add / Edit Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit Campaign' : 'Add New Campaign'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Row 1: Name, Discount Type, Discount Value */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Summer Flash Sale"
                  value={form.name}
                  onChange={e =>
                    setForm(f => ({ ...f, name: e.target.value }))
                  }
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.name && (
                  <p className="text-red-600 text-xs mt-0.5">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Discount Type
                </label>
                <select
                  value={form.discount_type}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      discount_type: e.target.value as 'percentage' | 'fixed',
                    }))
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (৳)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder={form.discount_type === 'percentage' ? 'e.g. 25' : 'e.g. 500'}
                  value={form.discount_value}
                  onChange={e =>
                    setForm(f => ({ ...f, discount_value: e.target.value === '' ? '' : Number(e.target.value) }))
                  }
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.discount_value
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {formErrors.discount_value && (
                  <p className="text-red-600 text-xs mt-0.5">
                    {formErrors.discount_value}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Start Date, End Date, Active, Paused */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <CustomDateTimePicker
                  value={form.start_date}
                  onChange={val =>
                    setForm(f => ({ ...f, start_date: val }))
                  }
                  placeholder="Select start date & time"
                />
                {formErrors.start_date && (
                  <p className="text-red-600 text-xs mt-0.5">
                    {formErrors.start_date}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <CustomDateTimePicker
                  value={form.end_date}
                  onChange={val =>
                    setForm(f => ({ ...f, end_date: val }))
                  }
                  placeholder="Select end date & time"
                />
                {formErrors.end_date && (
                  <p className="text-red-600 text-xs mt-0.5">
                    {formErrors.end_date}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e =>
                      setForm(f => ({ ...f, is_active: e.target.checked }))
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_paused}
                    onChange={e =>
                      setForm(f => ({ ...f, is_paused: e.target.checked }))
                    }
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paused
                  </span>
                </label>
              </div>
            </div>

            {/* Row 3: Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Description
              </label>
              <textarea
                placeholder="Describe the campaign offer and terms..."
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 resize-none"
              />
            </div>

            {/* Row 4: Banner Upload + Countdown Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Banner Image
                </label>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex items-center justify-center h-28 rounded border-2 border-dashed transition-colors cursor-pointer ${dragActive
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={e =>
                      handleBannerSelect(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                  <div className="text-center">
                    <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Drop a banner image or click to browse
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      JPEG, PNG, WebP &middot; Max 5MB
                    </p>
                  </div>
                </div>
                {form.banner_preview && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {form.banner ? 'New image selected' : 'Existing image'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Countdown Preview
                </label>
                <CountdownBannerPreview
                  name={form.name}
                  description={form.description}
                  start_date={form.start_date}
                  end_date={form.end_date}
                  discount_type={form.discount_type}
                  discount_value={
                    form.discount_value === '' ? 0 : Number(form.discount_value)
                  }
                  banner_preview={
                    form.banner
                      ? form.banner_preview
                      : isEditing && currentCampaign?.banner_image_url
                        ? currentCampaign.banner_image_url
                        : null
                  }
                />
              </div>
            </div>

            {/* Row 5: Category filter (1/4) + Product Tagging (3/4) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Filter by Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {selectedCategoryId
                    ? 'Showing up to 20 products'
                    : 'Select to filter products'}
                </p>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Tagged Products
                </label>
                <ProductSelector
                  key={selectedCategoryId || '__all__'}
                  value={form.products}
                  onChange={products =>
                    setForm(f => ({ ...f, products }))
                  }
                  placeholder="Search and select products to include in this campaign..."
                  categoryId={selectedCategoryId || undefined}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GiSave className="w-4 h-4" />
                )}
                {saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Campaign'
                    : 'Save Campaign'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DataTable ────────────────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(p: any) =>
          flashSaleCampaignService.list(p).then(res => ({
            data: res.data.map(c => {
              // Re-compute status on each render
              const now = new Date();
              if (c.is_paused) return { ...c, computed_status: 'paused' as const };
              if (now < new Date(c.start_date))
                return { ...c, computed_status: 'scheduled' as const };
              if (now > new Date(c.end_date))
                return { ...c, computed_status: 'ended' as const };
              return { ...c, computed_status: 'active' as const };
            }),
            total: res.total,
            page: res.page,
            per_page: res.per_page,
          }))
        }
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by campaign name, description..."
      />
    </div>
  );
}
