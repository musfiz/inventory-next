'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sliders,
  Plus,
  X,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ImageIcon,
  Link,
  Calendar,
} from 'lucide-react';
import { ImUpload } from 'react-icons/im';
import heroSliderService from '@/services/heroSliderService';
import { notify, confirm } from '@/lib/notifications';
import CustomDateTimePicker from '@/components/ui/date-time-picker';
import type { HeroSliderImage } from '@/types/api.types';

type SlideForm = {
  id?: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  image?: File | null;
  image_preview?: string | null;
};

const emptyForm: SlideForm = {
  title: '',
  subtitle: '',
  cta_text: '',
  cta_link: '',
  alt_text: '',
  sort_order: 1,
  is_active: true,
  starts_at: '',
  ends_at: '',
  image: null,
  image_preview: null,
};

export default function HeroSliderPage() {
  const [slides, setSlides] = useState<HeroSliderImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SlideForm>({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await heroSliderService.getAll({ per_page: 100 });
      setSlides(res.data || []);
    } catch {
      notify.error('Failed to load hero slider images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const resetForm = () => {
    if (form.image_preview) URL.revokeObjectURL(form.image_preview);
    setForm({ ...emptyForm });
    setEditing(false);
    setFormOpen(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditForm = (slide: HeroSliderImage) => {
    setForm({
      id: slide.id,
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      cta_text: slide.cta_text || '',
      cta_link: slide.cta_link || '',
      alt_text: slide.alt_text || '',
      sort_order: slide.sort_order,
      is_active: slide.is_active,
      starts_at: slide.starts_at ? slide.starts_at.slice(0, 16) : '',
      ends_at: slide.ends_at ? slide.ends_at.slice(0, 16) : '',
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
    if (!editing && !form.image) {
      notify.error('Please select an image');
      return;
    }

    setSaving(true);
    setUploadProgress(form.image ? 0 : null);
    try {
      if (editing && form.id) {
        const updated = await heroSliderService.update(form.id, {
          title: form.title || undefined,
          subtitle: form.subtitle || undefined,
          cta_text: form.cta_text || undefined,
          cta_link: form.cta_link || undefined,
          alt_text: form.alt_text || undefined,
          sort_order: form.sort_order,
          is_active: form.is_active,
          starts_at: form.starts_at || undefined,
          ends_at: form.ends_at || undefined,
          image: form.image || undefined,
        }, percent => setUploadProgress(percent));
        setSlides(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        notify.success('Slide updated successfully');
      } else {
        const created = await heroSliderService.create({
          image: form.image!,
          title: form.title || undefined,
          subtitle: form.subtitle || undefined,
          cta_text: form.cta_text || undefined,
          cta_link: form.cta_link || undefined,
          alt_text: form.alt_text || undefined,
          sort_order: form.sort_order,
          is_active: form.is_active,
          starts_at: form.starts_at || undefined,
          ends_at: form.ends_at || undefined,
        }, percent => setUploadProgress(percent));
        setSlides(prev => [...prev, created]);
        notify.success('Slide uploaded successfully');
      }
      resetForm();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        notify.error('Validation error', Object.values(apiErrors).flat().join(' '));
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save slide');
      }
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleToggleActive = async (slide: HeroSliderImage) => {
    setTogglingId(slide.id);
    try {
      const updated = await heroSliderService.toggleActive(slide.id);
      setSlides(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch {
      notify.error('Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (slide: HeroSliderImage) => {
    const result = await confirm({
      title: 'Delete Slide?',
      text: `Are you sure you want to delete "${slide.title || 'Untitled'}"? This cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    setDeletingId(slide.id);
    try {
      await heroSliderService.delete(slide.id);
      setSlides(prev => prev.filter(s => s.id !== slide.id));
      notify.success('Slide deleted');
    } catch {
      notify.error('Failed to delete slide');
    } finally {
      setDeletingId(null);
    }
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSlides.length) return;

    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    newSlides.forEach((s, i) => (s.sort_order = i));
    setSlides(newSlides);

    heroSliderService
      .reorder(newSlides.map((s, i) => ({ id: s.id, sort_order: i })))
      .catch(() => notify.error('Failed to save order'));
  };

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
    if (!baseUrl) return url;

    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  };

  const currentPreview = editing && !form.image ? (() => {
    const slide = slides.find(s => s.id === form.id);
    return resolveImageUrl(slide?.image_url) || null;
  })() : form.image_preview;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Hero Slider</h1>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>
      </div>

      {formOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Slide' : 'Add New Slide'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image {!editing && <span className="text-red-500">*</span>}
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex items-center justify-center h-32 rounded border-2 border-dashed transition-colors cursor-pointer ${dragActive
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <ImUpload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Drop an image or click to browse
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      JPEG, PNG, WebP &middot; Max 4MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Slide title"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                    placeholder="Slide subtitle"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                    placeholder="e.g. Shop Now"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CTA Link</label>
                  <div className="relative">
                    <Link className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={form.cta_link}
                      onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))}
                      placeholder="/products or https://"
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={form.alt_text}
                    onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))}
                    placeholder="Image description for accessibility"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date (optional)</label>
                  <CustomDateTimePicker
                    value={form.starts_at}
                    onChange={val => setForm(f => ({ ...f, starts_at: val }))}
                    placeholder="Select start date & time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (optional)</label>
                  <CustomDateTimePicker
                    value={form.ends_at}
                    onChange={val => setForm(f => ({ ...f, ends_at: val }))}
                    placeholder="Select end date & time"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="is-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {currentPreview ? (
                  <img src={currentPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-400">No image selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {saving && uploadProgress !== null && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload progress</p>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</p>
                </div>
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving || (!editing && !form.image)}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImUpload className="w-3.5 h-3.5" />
                )}
                {saving ? 'Saving...' : editing ? 'Update Slide' : 'Upload Slide'}
              </button>
              <button
                onClick={resetForm}
                disabled={saving}
                className="px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No slides yet. Click &quot;Add Slide&quot; to create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                <img
                  src={resolveImageUrl(slide.image_url)}
                  alt={slide.alt_text || slide.title || 'Hero slide'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${slide.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                    {slide.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-900/60 text-white">
                    #{slide.sort_order}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {slide.title || 'Untitled'}
                    </p>
                    {slide.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{slide.subtitle}</p>
                    )}
                    {slide.cta_text && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                        CTA: {slide.cta_text}{slide.cta_link ? ` (${slide.cta_link})` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === slide.id ? null : slide.id)}
                    className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {expandedId === slide.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {expandedId === slide.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <p><span className="font-medium">Alt:</span> {slide.alt_text || '-'}</p>
                    <p><span className="font-medium">Starts:</span> {slide.starts_at ? new Date(slide.starts_at).toLocaleString() : '-'}</p>
                    <p><span className="font-medium">Ends:</span> {slide.ends_at ? new Date(slide.ends_at).toLocaleString() : '-'}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-400 mx-0.5">{index + 1}/{slides.length}</span>
                    <button
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(slide)}
                      disabled={togglingId === slide.id}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${slide.is_active
                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={slide.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingId === slide.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : slide.is_active ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(slide)}
                      className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(slide)}
                      disabled={deletingId === slide.id}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Delete"
                    >
                      {deletingId === slide.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
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