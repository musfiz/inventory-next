'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomDateTimePicker from '@/components/ui/date-time-picker';
import VariationSelector, { toSelectedVariation } from '@/components/ecommerce/campaigns/variation-selector';
import weeklyDealsService from '@/services/weeklyDealsService';
import productVariationService from '@/services/productVariationService';
import { notify, confirm } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';
import { formatMoney } from '@/lib/utils/format';
import type { SelectedVariation, WeeklyDeal, WeeklyDealStatus } from '@/types/ecommerce';

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin */
function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}

const STATUS_STYLES: Record<WeeklyDealStatus, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ended: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const toLocalInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

interface FormState {
  id?: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  variations: SelectedVariation[];
}

const emptyForm: FormState = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  variations: [],
};

export default function WeeklyDealsPage() {
  const [deals, setDeals] = useState<WeeklyDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await weeklyDealsService.list({ per_page: 100 });
      setDeals(res.data);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load weekly deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const openCreate = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 86400000);
    setForm({
      ...emptyForm,
      starts_at: toLocalInput(now.toISOString()),
      ends_at: toLocalInput(nextWeek.toISOString()),
    });
    setErrors({});
    setDrawerOpen(true);
  };

  /**
   * Re-open for editing. The deal's variation rows only carry ids, so each one
   * is hydrated with its label data before the form is shown.
   */
  const openEdit = async (deal: WeeklyDeal) => {
    setErrors({});
    setDrawerOpen(true);
    setForm({
      id: deal.id,
      title: deal.title,
      description: deal.description ?? '',
      starts_at: toLocalInput(deal.starts_at),
      ends_at: toLocalInput(deal.ends_at),
      is_active: deal.is_active,
      variations: [],
    });

    try {
      const full = await weeklyDealsService.getById(deal.id);
      // The admin show endpoint serializes the pivot rows under the
      // snake_case `deal_products` key (Eloquent snake-cases relation names).
      const rows: { product_variation_id: string }[] =
        full.deal_products ?? (full as any).dealProducts ?? full.products ?? [];

      if (rows.length === 0) return;

      // Fetch each variation by id so rows resolve even when they fall
      // outside the first page of the variations list.
      const settled = await Promise.allSettled(
        rows.map(r => productVariationService.getVariation(String(r.product_variation_id))),
      );

      const hydrated: SelectedVariation[] = [];
      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          hydrated.push(toSelectedVariation(result.value));
        } else {
          // Never silently drop a saved row — keep a placeholder so the admin
          // sees it and saving cannot wipe it.
          const rawId = String(rows[i].product_variation_id);
          hydrated.push({
            product_variation_id: rawId,
            product_id: '',
            product_name: 'Unavailable variation',
            variation_name: rawId.slice(0, 8),
            sku: '',
            image_url: undefined,
            selling_price: 0,
          });
        }
      });

      setForm(f => (f.id === deal.id ? { ...f, variations: hydrated } : f));
    } catch {
      notify.error('Could not load the deal variations');
    }
  };

  const addVariations = (added: SelectedVariation[]) => {
    setForm(f => {
      const seen = new Set(f.variations.map(v => v.product_variation_id));
      return {
        ...f,
        variations: [
          ...f.variations,
          ...added.filter(a => !seen.has(a.product_variation_id)),
        ],
      };
    });
  };

  const removeVariation = (index: number) =>
    setForm(f => ({ ...f, variations: f.variations.filter((_, i) => i !== index) }));

  /** Carousel order = list order, so allow explicit reordering. */
  const moveVariation = (index: number, dir: -1 | 1) =>
    setForm(f => {
      const next = [...f.variations];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, variations: next };
    });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.starts_at) next.starts_at = 'Start date & time is required';
    if (!form.ends_at) next.ends_at = 'End date & time is required';
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      next.ends_at = 'End must be after start';
    }
    if (form.variations.length === 0) next.variations = 'Add at least one product variation';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await weeklyDealsService.store({
        id: form.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        is_active: form.is_active,
        sort_order: 0,
        variations: form.variations,
      });

      notify.success(form.id ? 'Weekly deal updated' : 'Weekly deal created');
      setDrawerOpen(false);
      setRefreshKey(k => k + 1);
      fetchDeals();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErrors)) flat[k] = v?.[0] ?? '';
        setErrors(flat);
        notify.error('Please fix the highlighted fields');
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save weekly deal');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (deal: WeeklyDeal) => {
    setTogglingId(deal.id);
    try {
      const updated = await weeklyDealsService.toggleActive(deal.id);
      setDeals(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      setRefreshKey(k => k + 1);
      notify.success(updated.is_active ? 'Deal activated' : 'Deal deactivated');
    } catch {
      notify.error('Failed to update deal status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (deal: WeeklyDeal) => {
    const result = await confirm({
      title: 'Delete Weekly Deal',
      html: `Delete <strong>${deal.title}</strong>?<br><br><em style="color:#dc2626;font-size:12px">This removes the deal and its ${deal.products_count ?? 0} variation(s).</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;

    try {
      await weeklyDealsService.delete(deal.id);
      notify.success('Weekly deal deleted');
      setRefreshKey(k => k + 1);
      fetchDeals();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete weekly deal');
    }
  };

  const columns = useMemo<ColumnDef<WeeklyDeal>[]>(
    () => [
      {
        id: 'title',
        header: 'Deal',
        meta: { width: '28%' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              {row.original.title}
            </p>
            {row.original.description && (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { width: '12%' },
        cell: ({ row }) => (
          <span
            className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[row.original.computed_status ?? 'inactive']}`}
          >
            {row.original.computed_status ?? 'inactive'}
          </span>
        ),
      },
      {
        id: 'timeline',
        header: 'Active Timeline',
        meta: { width: '28%' },
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>
              {formatDate(row.original.starts_at)} &rarr; {formatDate(row.original.ends_at)}
            </span>
          </div>
        ),
      },
      {
        id: 'products',
        header: 'Variations',
        meta: { width: '10%' },
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {row.original.products_count ?? 0}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        meta: { width: '22%' },
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              className="cursor-pointer rounded p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20"
              title="Edit"
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              className={`cursor-pointer rounded p-1 ${
                row.original.is_active
                  ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400'
                  : 'text-green-600 hover:bg-green-50 dark:text-green-400'
              }`}
              title={row.original.is_active ? 'Deactivate' : 'Activate'}
              onClick={() => handleToggle(row.original)}
              disabled={togglingId === row.original.id}
            >
              {togglingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : row.original.is_active ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              className="cursor-pointer rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-900 dark:text-red-400"
              title="Delete"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [togglingId],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Deals</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Time-boxed deals shown in the homepage hero carousel. A deal becomes visible to shoppers
            only between its start and end date, and its variations are shown one at a time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDeals}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Weekly Deal
          </button>
        </div>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        data={deals}
        pageSize={15}
        enableSearch={false}
        enablePagination={deals.length > 15}
        maxHeight="calc(100vh - 300px)"
      />

      {/* ── Add / Edit drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !saving && setDrawerOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {form.id ? 'Edit Weekly Deal' : 'Add Weekly Deal'}
              </h2>
              <button
                onClick={() => !saving && setDrawerOpen(false)}
                className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-5 px-6 py-5">
              {/* Title */}
              <div>
                <label className="mb-0.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekend Mega Deals"
                  className="w-full rounded-sm border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.title && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-0.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Short line shown under the deal title"
                  className="w-full rounded-sm border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Active timeline */}
              <div>
                <label className="mb-0.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Timeline <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <span className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                      Starts
                    </span>
                    <CustomDateTimePicker
                      value={form.starts_at}
                      onChange={v => setForm(f => ({ ...f, starts_at: v }))}
                      placeholder="Select start date & time"
                    />
                    {errors.starts_at && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.starts_at}</p>
                    )}
                  </div>
                  <div>
                    <span className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                      Ends
                    </span>
                    <CustomDateTimePicker
                      value={form.ends_at}
                      onChange={v => setForm(f => ({ ...f, ends_at: v }))}
                      placeholder="Select end date & time"
                      minDate={form.starts_at ? new Date(form.starts_at) : undefined}
                    />
                    {errors.ends_at && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.ends_at}</p>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The storefront only serves this deal while the current time falls inside this range.
                </p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                Deal is active
              </label>

              {/* Variations */}
              <div>
                <label className="mb-0.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Variations <span className="text-red-500">*</span>
                </label>
                <VariationSelector
                  value={[]}
                  onChange={addVariations}
                  placeholder="Search variations by product name, variation or SKU..."
                />

                {errors.variations && (
                  <p className="mt-1 text-xs text-red-600">{errors.variations}</p>
                )}

                {form.variations.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Carousel order ({form.variations.length})
                    </p>
                    {form.variations.map((v, i) => (
                      <div
                        key={v.product_variation_id}
                        className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">
                          {i + 1}
                        </span>
                        {v.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImageUrl(v.image_url)}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-sm border border-gray-200 bg-white object-cover dark:border-gray-600"
                          />
                        ) : (
                          <span className="h-8 w-8 shrink-0 rounded-sm bg-gray-200 dark:bg-gray-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                            {v.product_name || v.variation_name}
                          </p>
                          <p className="truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
                            {v.variation_name}
                            {v.sku ? ` · ${v.sku}` : ''}
                            {' · '}
                            {formatMoney(v.selling_price)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => moveVariation(i, -1)}
                            disabled={i === 0}
                            title="Move up"
                            className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveVariation(i, 1)}
                            disabled={i === form.variations.length - 1}
                            title="Move down"
                            className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariation(i)}
                            title="Remove"
                            className="cursor-pointer rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                disabled={saving}
                className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? 'Save Changes' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
