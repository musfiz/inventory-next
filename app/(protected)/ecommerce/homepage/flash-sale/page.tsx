'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  Flame,
  ExternalLink,
  Zap,
  Clock,
  CalendarClock,
  Package,
  ChevronRight,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
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
import CustomDateTimePicker from '@/components/ui/date-time-picker';

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(c: {
  start_date: string;
  end_date: string;
  is_paused: boolean;
}): CampaignStatus {
  if (c.is_paused) return 'paused';
  const now = new Date();
  if (now < new Date(c.start_date)) return 'scheduled';
  if (now > new Date(c.end_date)) return 'ended';
  return 'active';
}

function withComputedStatus(c: FlashSaleCampaign): FlashSaleCampaign {
  return { ...c, computed_status: computeStatus(c) };
}

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:'))
    return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { bg: string; label: string; dot: string }> = {
    active: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: 'Active',
      dot: 'bg-green-500 animate-pulse',
    },
    scheduled: {
      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      label: 'Scheduled',
      dot: 'bg-blue-500',
    },
    paused: {
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      label: 'Paused',
      dot: 'bg-amber-500',
    },
    ended: {
      bg: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      label: 'Ended',
      dot: 'bg-gray-400',
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${c.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Live Countdown (for hero card) ──────────────────────────────────────────

interface CountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
}

function useCountdown(target?: string | null): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!target) {
      setParts({ d: 0, h: 0, m: 0, s: 0 });
      return;
    }
    const tick = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now());
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}

function CountdownBox({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[2.6rem] rounded-lg bg-black/25 px-2 py-1.5 text-center font-mono text-xl font-black tabular-nums backdrop-blur-sm">
        {pad(value)}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
        {unit}
      </span>
    </div>
  );
}

// ── Form State Shape ────────────────────────────────────────────────────────

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

// ── Page Component ──────────────────────────────────────────────────────────

export default function HomepageFlashSalePage() {

  // ── Data state ────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<FlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CampaignCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // ── Form drawer state ─────────────────────────────────────────────────
  const [showDrawer, setShowDrawer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<FlashSaleCampaign | null>(null);
  const [form, setForm] = useState<CampaignFormState>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Product manager modal state ───────────────────────────────────────
  const [productTarget, setProductTarget] = useState<FlashSaleCampaign | null>(null);
  const [productDraft, setProductDraft] = useState<SelectedProduct[]>([]);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Data Fetching ─────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await flashSaleCampaignService.list({ per_page: 100 });
      setCampaigns(res.data.map(withComputedStatus));
    } catch {
      // keep silent — service falls back to mock data internally
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    flashSaleCampaignService.getCategories().then(setCategories);
  }, [fetchCampaigns]);

  // Re-compute statuses every 60 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setCampaigns(prev => prev.map(withComputedStatus));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Lock body scroll while drawer/modal is open
  useEffect(() => {
    const open = showDrawer || showProductsModal;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDrawer, showProductsModal]);

  // ── Derived values ────────────────────────────────────────────────────

  /** The campaign currently shown on the storefront homepage flash sale section */
  const liveCampaign = useMemo(
    () =>
      campaigns.find(
        c => c.computed_status === 'active' && c.is_active && c.products?.length !== 0
      ) ||
      campaigns.find(c => c.computed_status === 'active' && c.is_active) ||
      null,
    [campaigns]
  );

  const liveCountdown = useCountdown(liveCampaign?.end_date);

  const upcomingCampaign = useMemo(
    () =>
      campaigns
        .filter(c => c.computed_status === 'scheduled' && c.is_active)
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        )[0] || null,
    [campaigns]
  );

  // ── Drawer helpers ────────────────────────────────────────────────────

  const closeDrawer = () => {
    if (form.banner_preview && form.banner) URL.revokeObjectURL(form.banner_preview);
    setForm({ ...emptyForm });
    setFormErrors({});
    setIsEditing(false);
    setCurrentCampaign(null);
    setShowDrawer(false);
    setSelectedCategoryId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddDrawer = () => {
    setForm({ ...emptyForm });
    setFormErrors({});
    setIsEditing(false);
    setCurrentCampaign(null);
    setShowDrawer(true);
  };

  const openEditDrawer = async (campaign: FlashSaleCampaign) => {
    setShowDrawer(true);
    setLoadingCampaign(true);
    setFormErrors({});
    try {
      // Fetch full detail so tagged products are available even when the list omits them
      const full =
        (await flashSaleCampaignService.getById(campaign.id)) ?? campaign;
      setCurrentCampaign(full);
      setForm({
        name: full.name || '',
        description: full.description || '',
        start_date: full.start_date ? full.start_date.slice(0, 16) : '',
        end_date: full.end_date ? full.end_date.slice(0, 16) : '',
        discount_type: full.discount_type,
        discount_value: full.discount_value,
        is_paused: full.is_paused,
        is_active: full.is_active,
        banner: null,
        banner_preview: full.banner_image_url ?? null,
        products:
          full.products?.map(p => ({
            product_id: p.product_id,
            product_name: p.product_name || p.product_id,
            product_sku: p.product_sku,
            product_image: p.product_image,
          })) || [],
      });
      setIsEditing(true);
    } catch {
      notify.error('Failed to load campaign details');
      setShowDrawer(false);
    } finally {
      setLoadingCampaign(false);
    }
  };

  // ── Banner Upload ─────────────────────────────────────────────────────

  const handleBannerSelect = (file: File | null) => {
    if (!file) {
      if (form.banner_preview && form.banner) {
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
    if (form.banner_preview && form.banner) {
      URL.revokeObjectURL(form.banner_preview);
    }
    setForm(f => ({
      ...f,
      banner: file,
      banner_preview: URL.createObjectURL(file),
    }));
  };

  // ── Validation & Submit ───────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Campaign name is required';
    if (!form.start_date) errors.start_date = 'Start date is required';
    if (!form.end_date) errors.end_date = 'End date is required';
    if (form.discount_value === '' || Number(form.discount_value) <= 0) {
      errors.discount_value = 'Discount value must be greater than 0';
    }
    if (
      form.discount_type === 'percentage' &&
      Number(form.discount_value) > 100
    ) {
      errors.discount_value = 'Percentage cannot exceed 100';
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
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
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
          product_image: p.product_image,
          created_at: new Date().toISOString(),
        })),
      });

      notify.success(
        isEditing
          ? 'Flash sale updated successfully'
          : 'Flash sale created successfully'
      );
      closeDrawer();
      fetchCampaigns();
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.errors) {
        setFormErrors(errData.errors);
      } else {
        notify.error(errData?.message || err?.message || 'Failed to save flash sale');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Row Actions ───────────────────────────────────────────────────────

  const handleDelete = async (campaign: FlashSaleCampaign) => {
    const result = await confirm({
      title: 'Delete Flash Sale',
      html: `Are you sure you want to delete <strong>${campaign.name}</strong>?<br><br>
            <em style="color: #dc2626; font-size: 12px;">This action cannot be undone.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;

    try {
      await flashSaleCampaignService.delete(campaign.id);
      notify.success('Flash sale deleted');
      fetchCampaigns();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete flash sale');
    }
  };

  const handleTogglePause = async (campaign: FlashSaleCampaign) => {
    try {
      const updated = await flashSaleCampaignService.togglePause(campaign.id);
      setCampaigns(prev =>
        prev.map(c => (c.id === updated.id ? withComputedStatus(updated) : c))
      );
      notify.success(updated.is_paused ? 'Flash sale paused' : 'Flash sale resumed');
    } catch {
      notify.error('Failed to update pause status');
    }
  };

  // ── Product Manager Modal ─────────────────────────────────────────────

  const openProductsModal = async (campaign: FlashSaleCampaign) => {
    setShowProductsModal(true);
    setLoadingProducts(true);
    try {
      const full = (await flashSaleCampaignService.getById(campaign.id)) ?? campaign;
      setProductTarget(full);
      setProductDraft(
        full.products?.map(p => ({
          product_id: p.product_id,
          product_name: p.product_name || p.product_id,
          product_sku: p.product_sku,
          product_image: p.product_image,
        })) || []
      );
    } catch {
      notify.error('Failed to load campaign products');
      setShowProductsModal(false);
    } finally {
      setLoadingProducts(false);
    }
  };

  const saveProducts = async () => {
    if (!productTarget) return;
    setSavingProducts(true);
    try {
      await flashSaleCampaignService.store({
        id: productTarget.id,
        name: productTarget.name,
        description: productTarget.description,
        start_date: productTarget.start_date,
        end_date: productTarget.end_date,
        discount_type: productTarget.discount_type,
        discount_value: productTarget.discount_value,
        is_paused: productTarget.is_paused,
        is_active: productTarget.is_active,
        products: productDraft.map(p => ({
          id: '',
          campaign_id: productTarget.id,
          product_id: p.product_id,
          product_name: p.product_name,
          product_sku: p.product_sku,
          product_image: p.product_image,
          created_at: new Date().toISOString(),
        })),
      });
      notify.success(
        `Products updated for "${productTarget.name}" (${productDraft.length} tagged)`
      );
      setShowProductsModal(false);
      setProductTarget(null);
      fetchCampaigns();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to update products');
    } finally {
      setSavingProducts(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Homepage Flash Sale
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage the flash sale section shown on your storefront homepage — create,
            schedule and tag discounted products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/store"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Storefront
          </Link>
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Flash Sale
          </button>
        </div>
      </div>

      {/* ── Live on Homepage Hero Card ─────────────────────────────────── */}
      {!loading && liveCampaign && <LiveHeroCard campaign={liveCampaign} countdown={liveCountdown} />}

      {!loading && !liveCampaign && upcomingCampaign && (
        <UpcomingCard
          campaign={upcomingCampaign}
          onEdit={() => openEditDrawer(upcomingCampaign)}
        />
      )}

      {!loading && !liveCampaign && !upcomingCampaign && (
        <div className="rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30">
            <Flame className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">
            Nothing live on the homepage right now
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Create a flash sale with a schedule that covers the current time and tag at
            least one product to show it on the storefront homepage.
          </p>
          <button
            onClick={openAddDrawer}
            className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Flash Sale
          </button>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <CampaignStatCards campaigns={campaigns} loading={loading} />

      {/* ── All Campaigns Grid ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            All Campaigns
            <span className="ml-2 text-xs font-normal text-gray-500">
              {loading ? '…' : `${campaigns.length} total`}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-44"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            No campaigns yet. Click &quot;New Flash Sale&quot; to create your first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={() => openEditDrawer(campaign)}
                onDelete={() => handleDelete(campaign)}
                onTogglePause={() => handleTogglePause(campaign)}
                onManageProducts={() => openProductsModal(campaign)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Drawer ──────────────────────────────────────────── */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <div className="relative ml-auto h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                {isEditing ? 'Edit Flash Sale' : 'New Flash Sale'}
              </h2>
              <button
                onClick={closeDrawer}
                disabled={saving || loadingCampaign}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingCampaign ? (
              <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Loading campaign…</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 p-4">
                {/* Name + Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Flash Sale"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                      formErrors.name
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
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the offer shown under the homepage banner..."
                    value={form.description}
                    onChange={e =>
                      setForm(f => ({ ...f, description: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 resize-none"
                  />
                </div>

                {/* Discount Type + Value */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Discount Value <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={form.discount_type === 'percentage' ? 100 : undefined}
                      step="any"
                      placeholder={
                        form.discount_type === 'percentage' ? 'e.g. 25' : 'e.g. 500'
                      }
                      value={form.discount_value}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          discount_value:
                            e.target.value === '' ? '' : Number(e.target.value),
                        }))
                      }
                      className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${
                        formErrors.discount_value
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

                {/* Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Start Date &amp; Time <span className="text-red-500">*</span>
                    </label>
                    <CustomDateTimePicker
                      value={form.start_date}
                      onChange={val => setForm(f => ({ ...f, start_date: val }))}
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
                      End Date &amp; Time <span className="text-red-500">*</span>
                    </label>
                    <CustomDateTimePicker
                      value={form.end_date}
                      onChange={val => setForm(f => ({ ...f, end_date: val }))}
                      placeholder="Select end date & time"
                      minDate={
                        form.start_date ? new Date(form.start_date) : undefined
                      }
                    />
                    {formErrors.end_date && (
                      <p className="text-red-600 text-xs mt-0.5">{formErrors.end_date}</p>
                    )}
                  </div>
                </div>

                {/* Visibility toggles */}
                <div className="flex flex-wrap items-center gap-4 rounded-sm border border-gray-200 dark:border-gray-700 p-2.5">
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
                      Visible on homepage
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 basis-full">
                    Only active campaigns within their schedule window appear in the
                    homepage flash sale section.
                  </p>
                </div>

                {/* Banner + Preview */}
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
                      onDrop={e => {
                        e.preventDefault();
                        setDragActive(false);
                        handleBannerSelect(e.dataTransfer.files?.[0] || null);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex items-center justify-center h-28 rounded-sm border-2 border-dashed transition-colors cursor-pointer ${
                        dragActive
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
                      <div className="text-center px-3">
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
                      Homepage Section Preview
                    </label>
                    <CountdownBannerPreview
                      name={form.name}
                      description={form.description}
                      start_date={form.start_date}
                      end_date={form.end_date}
                      discount_type={form.discount_type}
                      discount_value={
                        form.discount_value === ''
                          ? 0
                          : Number(form.discount_value)
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

                {/* Products */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tagged Products{' '}
                      <span className="text-xs font-normal text-gray-400">
                        ({form.products.length})
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
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
                        Filter product search
                      </p>
                    </div>
                    <div className="md:col-span-3">
                      <ProductSelector
                        key={selectedCategoryId || '__all__'}
                        value={form.products}
                        onChange={products => setForm(f => ({ ...f, products }))}
                        placeholder="Search and tag products for this flash sale..."
                        categoryId={selectedCategoryId || undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 pb-1">
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
                        ? 'Update Flash Sale'
                        : 'Save Flash Sale'}
                  </button>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    disabled={saving}
                    className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Products Manager Modal ─────────────────────────────────────── */}
      {showProductsModal && productTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !savingProducts && setShowProductsModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    Tagged Products — {productTarget.name}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Changes are saved to the backend immediately after you click Save.
                </p>
              </div>
              <button
                onClick={() => setShowProductsModal(false)}
                disabled={savingProducts || loadingProducts}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading products…
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Current tags as chips */}
                <div className="max-h-52 overflow-y-auto">
                  {productDraft.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      No products tagged yet. Use the selector below to add some.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-sm border border-gray-200 dark:border-gray-700">
                      {productDraft.map((p, idx) => (
                        <li
                          key={p.product_id}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {p.product_name}
                            </p>
                            {p.product_sku && (
                              <p className="text-[11px] text-gray-400 font-mono">
                                {p.product_sku}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setProductDraft(draft =>
                                draft.filter((_, i) => i !== idx)
                              )
                            }
                            disabled={savingProducts}
                            title="Remove"
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer disabled:opacity-50 shrink-0"
                           aria-label="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Add products */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Add Products
                  </label>
                  <ProductSelector
                    key={`pm-${productTarget.id}-${productDraft.length}`}
                    value={[]}
                    onChange={added => {
                      setProductDraft(draft => {
                        const existing = new Set(draft.map(d => d.product_id));
                        const merged = [
                          ...draft,
                          ...added.filter(a => !existing.has(a.product_id)),
                        ];
                        return merged;
                      });
                    }}
                    placeholder="Search products to add..."
                    categoryId={selectedCategoryId || undefined}
                  />
                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="mt-1.5 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">Filter by category: All</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        Category: {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowProductsModal(false)}
                    disabled={savingProducts}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProducts}
                    disabled={savingProducts}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
                  >
                    {savingProducts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <GiSave className="w-4 h-4" />
                    )}
                    Save Products
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Hero Card ──────────────────────────────────────────────────────────

function LiveHeroCard({
  campaign,
  countdown,
}: {
  campaign: FlashSaleCampaign;
  countdown: CountdownParts;
}) {
  const hasBanner = !!campaign.banner_image_url;
  const discountLabel =
    campaign.discount_type === 'percentage'
      ? `${campaign.discount_value}% OFF`
      : `${formatCurrency(campaign.discount_value)} OFF`;

  return (
    <div
      className={`relative overflow-hidden rounded-md text-white bg-linear-to-br from-rose-600 via-pink-600 to-purple-700 border border-gray-200 dark:border-transparent`}
    >
      {hasBanner && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${resolveImageUrl(campaign.banner_image_url)})` }}
          aria-hidden
        />
      )}

      <div className="relative z-10 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: status + info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
              <Zap className="w-3 h-3 animate-pulse" />
              Live on Homepage
            </span>
            <span className="rounded-full bg-red-500/90 px-2.5 py-0.5 text-xs font-bold">
              {discountLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-white/80">
              <CalendarClock className="w-3.5 h-3.5" />
              {formatDate(campaign.start_date)} → {formatDate(campaign.end_date)}
            </span>
          </div>

          <h2 className="mt-2 text-lg sm:text-xl font-black truncate">
            {campaign.name}
          </h2>
          {campaign.description && (
            <p className="text-sm text-white/85 line-clamp-1">{campaign.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85">
            <span className="inline-flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {campaign.products?.length ?? 0} products tagged
            </span>
            <Link
              href="/store"
              target="_blank"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-white"
            >
              See it live
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: countdown */}
        <div className="shrink-0">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white/85">
            <Clock className="w-3.5 h-3.5" />
            Ends in
          </p>
          <div className="flex items-start gap-1.5">
            {countdown.d > 0 && <CountdownBox value={countdown.d} unit="Days" />}
            <CountdownBox value={countdown.h} unit="Hours" />
            <CountdownBox value={countdown.m} unit="Mins" />
            <CountdownBox value={countdown.s} unit="Secs" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upcoming Card ───────────────────────────────────────────────────────────

function UpcomingCard({
  campaign,
  onEdit,
}: {
  campaign: FlashSaleCampaign;
  onEdit: () => void;
}) {
  const startsAt = formatDate(campaign.start_date);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-900/20 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
          <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
            Next up: {campaign.name}
          </p>
          <p className="text-xs text-blue-600/80 dark:text-blue-300/80">
            Scheduled to appear on the homepage starting {startsAt}
          </p>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-blue-300 dark:border-blue-700 rounded-sm text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5" />
        Review Schedule
      </button>
    </div>
  );
}

// ── Campaign Card ───────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onTogglePause,
  onManageProducts,
}: {
  campaign: FlashSaleCampaign;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
  onManageProducts: () => void;
}) {
  const status = campaign.computed_status || computeStatus(campaign);
  const hasBanner = !!campaign.banner_image_url;
  const productCount = campaign.products?.length ?? 0;

  // Timeline progress across the sale window
  const progress = useMemo(() => {
    const now = Date.now();
    const start = new Date(campaign.start_date).getTime();
    const end = new Date(campaign.end_date).getTime();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [campaign.start_date, campaign.end_date]);

  const progressColor =
    status === 'active'
      ? 'bg-green-500'
      : status === 'scheduled'
        ? 'bg-blue-500'
        : status === 'paused'
          ? 'bg-amber-500'
          : 'bg-gray-400';

  const discountLabel =
    campaign.discount_type === 'percentage'
      ? `${campaign.discount_value}%`
      : formatCurrency(campaign.discount_value);

  return (
    <div className="group relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      {/* Banner strip */}
      <div
        className={`relative h-20 ${!hasBanner ? 'bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500' : 'bg-gray-100 dark:bg-gray-700'}`}
      >
        {hasBanner && (
          <img
            src={resolveImageUrl(campaign.banner_image_url)}
            alt={campaign.name}
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-black/45 via-black/20 to-transparent" />

        {/* Overlays */}
        <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="rounded-sm bg-white/90 dark:bg-gray-900/80 px-1.5 py-0.5 text-[11px] font-bold text-gray-900 dark:text-white">
              {discountLabel} <span className="text-red-500">OFF</span>
            </span>
            <StatusBadge status={status} />
          </div>
          <h3 className="truncate text-sm font-bold text-white drop-shadow-sm pr-16">
            {campaign.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {campaign.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {campaign.description}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {formatDate(campaign.start_date)} → {formatDate(campaign.end_date)}
          </span>
          <button
            onClick={onManageProducts}
            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
            title="Manage tagged products"
          >
            <Package className="w-3 h-3" />
            {productCount} product{productCount !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Timeline progress */}
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${status === 'scheduled' ? 0 : progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span>{Math.round(progress)}% elapsed</span>
            {campaign.is_active ? (
              <span className="text-green-600 dark:text-green-400">On homepage</span>
            ) : (
              <span>Hidden</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-sm transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onManageProducts}
            className="flex flex-1 items-center justify-center gap-1 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-sm transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            Products
          </button>
          <button
            onClick={onTogglePause}
            title={campaign.is_paused ? 'Resume' : 'Pause'}
            className="flex flex-1 items-center justify-center gap-1 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-sm transition-colors cursor-pointer"
          >
            {campaign.is_paused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-sm transition-colors cursor-pointer"
           aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
