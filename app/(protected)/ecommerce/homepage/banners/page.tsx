'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ImageIcon,
  Link as LinkIcon,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { ImUpload } from 'react-icons/im';
import offerSlideService from '@/services/offerSlideService';
import { notify, confirm } from '@/lib/notifications';
import type { StorefrontOfferSlide } from '@/types/storefront';

const ACCENT_PRESETS = [
  { label: 'Indigo-Purple', value: 'from-indigo-600/85 to-purple-700/85' },
  { label: 'Rose-Pink', value: 'from-rose-600/85 to-pink-700/85' },
  { label: 'Emerald-Teal', value: 'from-emerald-600/85 to-teal-700/85' },
  { label: 'Amber-Orange', value: 'from-amber-600/85 to-orange-700/85' },
  { label: 'Fuchsia-Purple', value: 'from-fuchsia-600/85 to-purple-700/85' },
  { label: 'Blue-Cyan', value: 'from-blue-600/85 to-cyan-700/85' },
  { label: 'Red-Rose', value: 'from-red-600/85 to-rose-700/85' },
  { label: 'Violet-Fuchsia', value: 'from-violet-600/85 to-fuchsia-700/85' },
];

type OfferForm = {
  id?: string;
  title: string;
  subtitle: string;
  link: string;
  accent: string;
  sort_order: number;
  is_active: boolean;
  image?: File | null;
  image_preview?: string | null;
};

const emptyForm: OfferForm = {
  title: '',
  subtitle: '',
  link: '',
  accent: ACCENT_PRESETS[0].value,
  sort_order: 0,
  is_active: true,
  image: null,
  image_preview: null,
};

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

export default function BannersPage() {
  const [offers, setOffers] = useState<StorefrontOfferSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<OfferForm>({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await offerSlideService.getAll();
      setOffers(data);
    } catch {
      notify.error('Failed to load offer slides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const resetForm = () => {
    if (form.image_preview) URL.revokeObjectURL(form.image_preview);
    setForm({ ...emptyForm });
    setEditing(false);
    setFormOpen(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditForm = (offer: StorefrontOfferSlide) => {
    setForm({
      id: offer.id,
      title: offer.title,
      subtitle: offer.subtitle || '',
      link: offer.link,
      accent: offer.accent || ACCENT_PRESETS[0].value,
      sort_order: offer.sort_order,
      is_active: offer.is_active,
      image: null,
      image_preview: null,
    });
    setEditing(true);
    setFormOpen(true);
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      if (form.image_preview) URL.revokeObjectURL(form.image_preview);
      setForm(f => ({ ...f, image: null, image_preview: null }));
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
    if (form.image_preview) URL.revokeObjectURL(form.image_preview);
    setForm(f => ({ ...f, image: file, image_preview: URL.createObjectURL(file) }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!editing && !form.image) { notify.error('Please select an image'); return; }
    if (!form.title.trim()) { notify.error('Title is required'); return; }
    if (!form.link.trim()) { notify.error('Redirect link is required'); return; }

    setSaving(true);
    setUploadProgress(form.image ? 0 : null);
    try {
      const payload: any = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        link: form.link.trim(),
        accent: form.accent,
        sort_order: form.sort_order,
        is_active: form.is_active,
        image: form.image || undefined,
      };

      if (editing && form.id) {
        const updated = await offerSlideService.update(form.id, payload, p => setUploadProgress(p));
        setOffers(prev => prev.map(o => (o.id === updated.id ? updated : o)));
        notify.success('Offer slide updated');
      } else {
        delete payload.image_preview;
        const created = await offerSlideService.create(payload, p => setUploadProgress(p));
        setOffers(prev => [...prev, created]);
        notify.success('Offer slide created');
      }
      resetForm();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        notify.error('Validation error', Object.values(apiErrors).flat().join(' '));
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save offer slide');
      }
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleToggleActive = async (offer: StorefrontOfferSlide) => {
    setTogglingId(offer.id);
    try {
      const updated = await offerSlideService.toggleActive(offer.id);
      setOffers(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    } catch {
      notify.error('Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (offer: StorefrontOfferSlide) => {
    const result = await confirm({
      title: 'Delete Offer Slide?',
      text: `Delete "${offer.title}"? This cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setDeletingId(offer.id);
    try {
      await offerSlideService.delete(offer.id);
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      notify.success('Offer slide deleted');
    } catch {
      notify.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newOffers = [...offers];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOffers.length) return;
    [newOffers[index], newOffers[target]] = [newOffers[target], newOffers[index]];
    newOffers.forEach((s, i) => (s.sort_order = i));
    setOffers(newOffers);
    offerSlideService.reorder(newOffers.map((s, i) => ({ id: s.id, sort_order: i })))
      .catch(() => notify.error('Failed to save order'));
  };

  const currentPreview = editing && !form.image
    ? resolveImageUrl(offers.find(o => o.id === form.id)?.image_url) || null
    : form.image_preview;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Top Offers Banners</h1>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Offer
        </button>
      </div>

      {/* ---- Form Panel ---- */}
      {formOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Offer Slide' : 'Add Offer Slide'}
            </h2>
            <button onClick={resetForm} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Form fields - 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banner Image {!editing && <span className="text-red-500">*</span>}
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex items-center justify-center h-32 rounded border-2 border-dashed transition-colors cursor-pointer ${dragActive ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={e => handleFileSelect(e.target.files?.[0] || null)} className="hidden" />
                  <div className="text-center">
                    <ImUpload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Drop an image or click to browse</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPEG, PNG, WebP &middot; Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Title / Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mega Electronics Sale" className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
                  <input type="text" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Up to 40% off latest gadgets" className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Redirect Link <span className="text-red-500">*</span></label>
                <div className="relative">
                  <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/category/electronics or full URL" className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Internal paths (e.g. /store/products) or external URLs are accepted</p>
              </div>

              {/* Accent color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overlay Accent</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACCENT_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, accent: p.value }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${form.accent === p.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}
                    >
                      <span className={`w-4 h-4 rounded bg-gradient-to-r ${p.value.replace('85', '100')}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order + Active */}
              <div className="flex items-center gap-6">
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order</label>
                  <input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="is-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                  <label htmlFor="is-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">Active</label>
                </div>
              </div>
            </div>

            {/* Preview - 2 cols */}
            <div className="lg:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desktop Preview</label>
              <div className="relative h-44 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                {currentPreview ? (
                  <img src={currentPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-400">No image</p>
                    </div>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${form.accent}`} aria-hidden />
                <div className="absolute inset-0 flex items-center p-5">
                  <div className="text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">Limited time</p>
                    <h3 className="mt-0.5 text-base font-black">{form.title || 'Offer Title'}</h3>
                    <p className="mt-0.5 text-xs text-white/90">{form.subtitle || 'Subtitle text goes here'}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline-offset-4">
                      Shop now <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Preview</label>
              <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                {currentPreview ? (
                  <img src={currentPreview} alt="Preview mobile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-gray-400">No image</p>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${form.accent}`} aria-hidden />
                <div className="absolute inset-0 flex items-center p-4">
                  <div className="text-white">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/85">Limited time</p>
                    <h3 className="mt-0.5 text-sm font-black">{form.title || 'Offer Title'}</h3>
                    <p className="mt-0.5 text-[10px] text-white/90">{form.subtitle || 'Subtitle text'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {saving && uploadProgress !== null && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload progress</p>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</p>
                </div>
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={saving || (!editing && !form.image)} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImUpload className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : editing ? 'Update Offer' : 'Create Offer'}
              </button>
              <button onClick={resetForm} disabled={saving} className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Listing ---- */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No offer slides yet. Click &quot;Add Offer&quot; to create your first banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer, index) => (
            <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Card image with overlay */}
              <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                <img src={resolveImageUrl(offer.image_url)} alt={offer.title} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-r ${offer.accent || ACCENT_PRESETS[0].value}`} aria-hidden />
                <div className="absolute inset-0 flex items-center p-4">
                  <div className="text-white min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">Offer</p>
                    <h3 className="mt-0.5 text-sm font-black truncate">{offer.title}</h3>
                    {offer.subtitle && <p className="mt-0.5 text-[10px] text-white/90 truncate">{offer.subtitle}</p>}
                  </div>
                </div>
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${offer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{offer.is_active ? 'Active' : 'Inactive'}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-900/60 text-white">#{offer.sort_order}</span>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{offer.title}</p>
                    <a href={offer.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{offer.link}</span>
                    </a>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === offer.id ? null : offer.id)} className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                    {expandedId === offer.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {expandedId === offer.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p><span className="font-medium">Subtitle:</span> {offer.subtitle || '-'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Accent:</span>
                      <span className={`w-4 h-3 rounded bg-gradient-to-r ${(offer.accent || '').replace('85', '100')}`} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSlide(index, 'up')} disabled={index === 0} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" title="Move up">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-400 mx-0.5">{index + 1}/{offers.length}</span>
                    <button onClick={() => moveSlide(index, 'down')} disabled={index === offers.length - 1} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" title="Move down">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(offer)} className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(offer)} disabled={deletingId === offer.id} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" title="Delete">
                      {deletingId === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
