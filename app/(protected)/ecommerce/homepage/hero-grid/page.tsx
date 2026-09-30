'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Eye,
  EyeOff,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { ImUpload } from 'react-icons/im';
import heroGridImagesService from '@/services/heroGridImagesService';
import { confirm, notify } from '@/lib/notifications';
import type { HeroGridImage } from '@/types/api.types';

const POSITIONS = [1, 2, 3, 4] as const;
const SLOT_LABELS: Record<number, string> = {
  1: 'Slot 1 — top left',
  2: 'Slot 2 — top right',
  3: 'Slot 3 — bottom left',
  4: 'Slot 4 — bottom right',
};

interface SlotForm {
  position: number;
  image: File | null;
  preview: string | null;
  /** width / height of the image, so previews never crop the artwork. */
  ratio: number | null;
  title: string;
  link_url: string;
  alt_text: string;
  is_active: boolean;
}

/** Cell ratio used when an image's size is unknown (e.g. pre-dimension rows). */
const FALLBACK_CELL_RATIO = 16 / 9;

const emptySlot = (position: number): SlotForm => ({
  position,
  image: null,
  preview: null,
  ratio: null,
  title: '',
  link_url: '',
  alt_text: '',
  is_active: true,
});

/** Read a picked file's intrinsic ratio so the preview matches the final upload. */
function readImageRatio(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => {
      URL.revokeObjectURL(url);
      resolve(probe.naturalWidth && probe.naturalHeight ? probe.naturalWidth / probe.naturalHeight : null);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    probe.src = url;
  });
}

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin */
const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

export default function HeroGridPage() {
  const [slots, setSlots] = useState<SlotForm[]>(() => POSITIONS.map(emptySlot));
  const [existing, setExisting] = useState<Record<number, HeroGridImage>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const images = await heroGridImagesService.getAll();
      const map: Record<number, HeroGridImage> = {};
      images.forEach(img => {
        map[img.position] = img;
      });
      setExisting(map);
      setSlots(
        POSITIONS.map(p => {
          const img = map[p];
          return img
            ? {
              position: p,
              image: null,
              preview: img.image_url,
              ratio: img.aspect_ratio ?? null,
              title: img.title ?? '',
              link_url: img.link_url ?? '',
              alt_text: img.alt_text ?? '',
              is_active: img.is_active,
            }
            : emptySlot(p);
        }),
      );
    } catch {
      notify.error('Failed to load hero grid images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const updateSlot = (position: number, patch: Partial<SlotForm>) =>
    setSlots(prev => prev.map(s => (s.position === position ? { ...s, ...patch } : s)));

  const selectFile = async (position: number, file: File | null) => {
    const current = slots.find(s => s.position === position);

    if (!file) {
      if (current?.preview?.startsWith('blob:')) URL.revokeObjectURL(current.preview);
      updateSlot(position, {
        image: null,
        preview: existing[position]?.image_url ?? null,
        ratio: existing[position]?.aspect_ratio ?? null,
      });
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
    const ratio = await readImageRatio(file);
    if (current?.preview?.startsWith('blob:')) URL.revokeObjectURL(current.preview);
    updateSlot(position, { image: file, preview: URL.createObjectURL(file), ratio });
  };

  const handleDrop = (position: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragSlot(null);
    selectFile(position, e.dataTransfer.files?.[0] || null);
  };

  const saveSlot = async (position: number) => {
    const slot = slots.find(s => s.position === position);
    if (!slot) return;

    const current = existing[position];
    if (!slot.image && !current) {
      notify.error('Choose an image for this slot first');
      return;
    }
    if (!slot.image && current) {
      // Only metadata changed — nothing to upload, but still persist the fields.
      try {
        const updated = await heroGridImagesService.update(current.id, {
          title: slot.title,
          link_url: slot.link_url,
          alt_text: slot.alt_text,
          is_active: slot.is_active,
        });
        setExisting(prev => ({ ...prev, [position]: updated }));
        notify.success(`${SLOT_LABELS[position]} updated`);
      } catch (err: any) {
        notify.error(err?.response?.data?.message || 'Failed to update slot');
      }
      return;
    }

    setSavingSlot(position);
    setProgress(0);
    try {
      const onProgress = (p: number) => setProgress(p);
      const payload = {
        position,
        title: slot.title,
        link_url: slot.link_url,
        alt_text: slot.alt_text,
        is_active: slot.is_active,
      };
      const saved = current
        ? await heroGridImagesService.update(current.id, { ...payload, image: slot.image! }, onProgress)
        : await heroGridImagesService.create({ ...payload, image: slot.image! }, onProgress);

      setExisting(prev => ({ ...prev, [position]: saved }));
      const current2 = slots.find(s => s.position === position);
      if (current2?.preview?.startsWith('blob:')) URL.revokeObjectURL(current2.preview);
      // Prefer the server-measured ratio (post-resize) over the client estimate.
      updateSlot(position, {
        image: null,
        preview: saved.image_url,
        ratio: saved.aspect_ratio ?? slot.ratio,
      });
      if (fileInputs.current[position]) fileInputs.current[position]!.value = '';
      notify.success(`${SLOT_LABELS[position]} saved`);
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        notify.error('Validation error', Object.values(apiErrors).flat().join(' '));
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save slot');
      }
    } finally {
      setSavingSlot(null);
      setProgress(null);
    }
  };

  const toggleActive = async (position: number) => {
    const current = existing[position];
    if (!current) return;
    setTogglingId(current.id);
    try {
      const updated = await heroGridImagesService.toggleActive(current.id);
      setExisting(prev => ({ ...prev, [position]: updated }));
      updateSlot(position, { is_active: updated.is_active });
    } catch {
      notify.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const removeSlot = async (position: number) => {
    const current = existing[position];
    if (!current) return;

    const result = await confirm({
      title: 'Remove hero image',
      html: 'This deletes the uploaded image and clears the slot. Continue?',
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    setDeletingId(current.id);
    try {
      await heroGridImagesService.delete(current.id);
      setExisting(prev => {
        const next = { ...prev };
        delete next[position];
        return next;
      });
      updateSlot(position, emptySlot(position));
      notify.success(`${SLOT_LABELS[position]} cleared`);
    } catch {
      notify.error('Failed to remove hero image');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hero Grid Images</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Four promotional cells shown in the homepage hero when{' '}
            <strong>Image Grid + Weekly Deals</strong> is the active hero widget.
          </p>
        </div>
        <button
          onClick={fetchImages}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Live 2x2 preview */}
          <div className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Live 2×2 preview
            </h2>
            <div className="grid grid-cols-2 items-stretch gap-2 sm:max-w-md">
              {POSITIONS.map(p => {
                const slot = slots.find(s => s.position === p)!;
                return (
                  <div
                    key={p}
                    style={{ aspectRatio: slot.ratio || FALLBACK_CELL_RATIO }}
                    className="relative overflow-hidden rounded-sm border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {slot.preview ? (
                      <>
                        <Image
                          src={resolveImageUrl(slot.preview)}
                          alt={slot.alt_text || `Slot ${p}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 320px"
                          className="object-contain"
                          unoptimized
                        />
                        {!slot.is_active && (
                          <span className="absolute left-1.5 top-1.5 rounded-sm bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Hidden
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[10px] font-semibold">Slot {p}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot forms */}
          <div className="grid gap-4 md:grid-cols-2">
            {POSITIONS.map(p => {
              const slot = slots.find(s => s.position === p)!;
              const current = existing[p];
              const busy = savingSlot === p;

              return (
                <div
                  key={p}
                  className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {SLOT_LABELS[p]}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {current && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            disabled={togglingId === current.id}
                            title={slot.is_active ? 'Hide this cell' : 'Show this cell'}
                            className="p-1 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            {togglingId === current.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : slot.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlot(p)}
                            disabled={deletingId === current.id}
                            title="Remove this cell's image"
                            className="p-1 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            {deletingId === current.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          current
                            ? slot.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {current ? (slot.is_active ? 'Active' : 'Hidden') : 'Empty'}
                      </span>
                    </div>
                  </div>

                  {/* Image picker */}
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      setDragSlot(p);
                    }}
                    onDragLeave={() => setDragSlot(null)}
                    onDrop={e => handleDrop(p, e)}
                    onClick={() => fileInputs.current[p]?.click()}
                    style={{
                      aspectRatio: slot.ratio || FALLBACK_CELL_RATIO,
                      // Keeps the drop zone from collapsing once a preview shows.
                      minHeight: 120,
                    }}
                    className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-sm border-2 border-dashed transition-colors ${
                      dragSlot === p
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : slot.preview
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input
                      ref={el => {
                        fileInputs.current[p] = el;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={e => selectFile(p, e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {slot.preview ? (
                      <>
                        <Image
                          src={resolveImageUrl(slot.preview)}
                          alt={`Preview slot ${p}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 400px"
                          className="object-contain"
                          unoptimized
                        />
                        <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Click to replace
                        </span>
                      </>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <ImUpload className="mx-auto mb-1 h-6 w-6 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Drop an image or click to browse
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          JPEG, PNG, WebP &middot; Max 5MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Title badge
                      </label>
                      <input
                        type="text"
                        value={slot.title}
                        onChange={e => updateSlot(p, { title: e.target.value })}
                        placeholder="e.g. Weekend Sale"
                        className="w-full rounded-sm border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Link URL
                      </label>
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={slot.link_url}
                          onChange={e => updateSlot(p, { link_url: e.target.value })}
                          placeholder="/store/category/baby-care"
                          className="w-full rounded-sm border border-gray-300 bg-white py-1 pl-8 pr-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Alt text
                      </label>
                      <input
                        type="text"
                        value={slot.alt_text}
                        onChange={e => updateSlot(p, { alt_text: e.target.value })}
                        placeholder="Describe the promotion"
                        className="w-full rounded-sm border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 pt-0.5 text-xs text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={slot.is_active}
                        onChange={e => updateSlot(p, { is_active: e.target.checked })}
                        className="h-3.5 w-3.5 accent-indigo-600"
                      />
                      Show this cell on the storefront
                    </label>
                  </div>

                  {/* Save */}
                  <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                    {busy && progress !== null && (
                      <div className="mb-2 h-1 overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-sm bg-indigo-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = slots.find(s => s.position === p);
                          if (cur?.preview?.startsWith('blob:')) URL.revokeObjectURL(cur.preview);
                          const img = existing[p];
                          setSlots(prev =>
                            prev.map(s => {
                              if (s.position !== p) return s;
                              return img
                                ? {
                                  position: p,
                                  image: null,
                                  preview: img.image_url,
                                  ratio: img.aspect_ratio ?? null,
                                  title: img.title ?? '',
                                  link_url: img.link_url ?? '',
                                  alt_text: img.alt_text ?? '',
                                  is_active: img.is_active,
                                }
                                : emptySlot(p);
                            }),
                          );
                          if (fileInputs.current[p]) fileInputs.current[p]!.value = '';
                        }}
                        className="rounded-sm border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSlot(p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {busy ? 'Uploading...' : current ? 'Update Cell' : 'Upload Cell'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            <Save className="h-4 w-4 shrink-0 text-gray-400" />
            Each cell saves independently. Only active cells with an image are rendered on the storefront.
          </div>
        </>
      )}
    </div>
  );
}
