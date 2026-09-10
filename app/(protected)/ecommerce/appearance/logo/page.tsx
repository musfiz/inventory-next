'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Loader2, X, Monitor, Star, Trash2 } from 'lucide-react';
import { ImUpload } from 'react-icons/im';
import { GiSave } from 'react-icons/gi';
import brandingService from '@/services/brandingService';
import { notify } from '@/lib/notifications';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

const ACCEPT_HEADER = '.jpg,.jpeg,.png,.webp,.svg';
const ACCEPT_FOOTER = '.png';
const ACCEPT_FAVICON = '.png,.ico';
const MAX_SIZE_LOGO = 2 * 1024 * 1024;
const MAX_SIZE_FAVICON = 500 * 1024;

function validateFile(file: File, accept: string, maxSize: number): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  const allowed = accept.split(',').map(s => s.trim().toLowerCase());
  if (!allowed.includes(ext)) {
    notify.error(`Only ${accept} files are allowed`);
    return false;
  }
  if (file.size > maxSize) {
    const sizeMB = Math.round((maxSize / (1024 * 1024)) * 10) / 10;
    notify.error(`File must be under ${sizeMB}MB`);
    return false;
  }
  return true;
}

function DropZone({ accept, maxSize, label, onFileSelect }: {
  accept: string;
  maxSize: number;
  label: string;
  onFileSelect: (file: File) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f || !validateFile(f, accept, maxSize)) return;
    onFileSelect(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={e => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0] || null); }}
      onClick={() => inputRef.current?.click()}
      className={`flex items-center justify-center h-24 rounded border-2 border-dashed transition-colors cursor-pointer ${
        dragActive
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={e => handleFile(e.target.files?.[0] || null)} className="hidden" />
      <div className="text-center">
        <ImUpload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-500 dark:text-gray-400">{dragActive ? 'Release to upload' : 'Drop an image or click to browse'}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{accept.toUpperCase()} &middot; Max {Math.round(maxSize / 1024)}KB</p>
      </div>
    </div>
  );
}

export default function LogoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [headerLogoPreview, setHeaderLogoPreview] = useState<string | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null);

  const [footerLogoFile, setFooterLogoFile] = useState<File | null>(null);
  const [footerLogoPreview, setFooterLogoPreview] = useState<string | null>(null);
  const [footerLogoUrl, setFooterLogoUrl] = useState<string | null>(null);

  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [favicon16Preview, setFavicon16Preview] = useState<string | null>(null);
  const [favicon16Url, setFavicon16Url] = useState<string | null>(null);

  const blobUrlsRef = useRef<string[]>([]);
  const initialUrls = useRef({ header: null as string | null, footer: null as string | null, favicon: null as string | null, favicon_16: null as string | null });

  const addBlobUrl = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      blobUrlsRef.current.push(url);
    }
  }, []);

  const revokeBlob = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== url);
    }
  }, []);

  const dirty = headerLogoFile !== null || footerLogoFile !== null || faviconFile !== null;

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await brandingService.get();
      const { header_logo_url, footer_logo_url, favicon_url, favicon_16_url } = res;

      setHeaderLogoUrl(header_logo_url);
      setHeaderLogoPreview(header_logo_url ? resolveImageUrl(header_logo_url) : null);
      setHeaderLogoFile(null);

      setFooterLogoUrl(footer_logo_url);
      setFooterLogoPreview(footer_logo_url ? resolveImageUrl(footer_logo_url) : null);
      setFooterLogoFile(null);

      setFaviconUrl(favicon_url);
      setFaviconPreview(favicon_url ? resolveImageUrl(favicon_url) : null);
      setFavicon16Url(favicon_16_url);
      setFavicon16Preview(favicon_16_url ? resolveImageUrl(favicon_16_url) : null);
      setFaviconFile(null);

      initialUrls.current = { header: header_logo_url, footer: footer_logo_url, favicon: favicon_url, favicon_16: favicon_16_url };
    } catch {
      notify.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, [fetchBranding]);

  const handleHeaderLogoSelect = (file: File) => {
    revokeBlob(headerLogoPreview);
    const preview = URL.createObjectURL(file);
    addBlobUrl(preview);
    setHeaderLogoFile(file);
    setHeaderLogoPreview(preview);
  };

  const handleFooterLogoSelect = (file: File) => {
    revokeBlob(footerLogoPreview);
    const preview = URL.createObjectURL(file);
    addBlobUrl(preview);
    setFooterLogoFile(file);
    setFooterLogoPreview(preview);
  };

  const handleFaviconSelect = (file: File) => {
    revokeBlob(faviconPreview);
    revokeBlob(favicon16Preview);
    const preview = URL.createObjectURL(file);
    addBlobUrl(preview);
    setFaviconFile(file);
    setFaviconPreview(preview);
    setFavicon16Preview(preview);
  };

  const handleRemoveHeaderLogo = async () => {
    if (headerLogoUrl) {
      try {
        await brandingService.remove('header_logo');
        notify.success('Header logo removed');
        await fetchBranding();
      } catch {
        notify.error('Failed to remove header logo');
      }
    } else {
      revokeBlob(headerLogoPreview);
      setHeaderLogoFile(null);
      setHeaderLogoPreview(null);
    }
  };

  const handleRemoveFooterLogo = async () => {
    if (footerLogoUrl) {
      try {
        await brandingService.remove('footer_logo');
        notify.success('Footer logo removed');
        await fetchBranding();
      } catch {
        notify.error('Failed to remove footer logo');
      }
    } else {
      revokeBlob(footerLogoPreview);
      setFooterLogoFile(null);
      setFooterLogoPreview(null);
    }
  };

  const handleRemoveFavicon = async () => {
    if (faviconUrl) {
      try {
        await brandingService.remove('favicon');
        notify.success('Favicon removed');
        await fetchBranding();
      } catch {
        notify.error('Failed to remove favicon');
      }
    } else {
      revokeBlob(faviconPreview);
      revokeBlob(favicon16Preview);
      setFaviconFile(null);
      setFaviconPreview(null);
      setFavicon16Preview(null);
    }
  };

  const handleSave = async () => {
    if (!dirty) return;

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      if (headerLogoFile) formData.append('header_logo', headerLogoFile);
      if (footerLogoFile) formData.append('footer_logo', footerLogoFile);
      if (faviconFile) formData.append('favicon', faviconFile);

      await brandingService.update(formData, percent => setUploadProgress(percent));
      notify.success('Logo & favicon saved successfully');
      await fetchBranding();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        notify.error('Validation error', Object.values(apiErrors).flat().join(' '));
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save branding');
      }
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Logo & Favicon</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GiSave className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saving && uploadProgress !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Uploading logos &amp; favicon</p>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</p>
          </div>
          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-200 rounded-sm"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Header Logo</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Recommended: 220 &times; 75 px &middot; JPG, PNG, WebP, SVG</p>

          <DropZone
            accept={ACCEPT_HEADER}
            maxSize={MAX_SIZE_LOGO}
            label="Header logo"
            onFileSelect={handleHeaderLogoSelect}
          />

          {headerLogoPreview && (
            <div className="space-y-2">
              <div className="bg-white border border-gray-200 rounded h-12 flex items-center px-3">
                <img src={headerLogoPreview} alt="Header logo" className="max-h-8 w-auto object-contain" />
                <span className="text-sm text-gray-500 ml-3">Store Name</span>
                <div className="ml-auto flex gap-3">
                  <span className="text-xs text-gray-300">Cart</span>
                  <span className="text-xs text-gray-300">Login</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">Preview in light header</p>
                <button
                  onClick={handleRemoveHeaderLogo}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          )}

          {!headerLogoPreview && (
            <div className="flex items-center justify-center h-12 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
              <p className="text-xs text-gray-400">No header logo uploaded</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Footer Logo</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Recommended: 280 &times; 280 px square &middot; PNG only</p>

          <DropZone
            accept={ACCEPT_FOOTER}
            maxSize={MAX_SIZE_LOGO}
            label="Footer logo"
            onFileSelect={handleFooterLogoSelect}
          />

          {footerLogoPreview && (
            <div className="space-y-2">
              <div className="bg-gray-900 border border-gray-700 rounded flex flex-col items-center justify-center py-4">
                <img src={footerLogoPreview} alt="Footer logo" className="max-h-16 w-auto object-contain" />
                <p className="text-xs text-gray-400 mt-2">Store Name</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">Preview in dark footer</p>
                <button
                  onClick={handleRemoveFooterLogo}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          )}

          {!footerLogoPreview && (
            <div className="flex items-center justify-center h-12 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
              <p className="text-xs text-gray-400">No footer logo uploaded</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Favicon</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Recommended: 16 &times; 16 or 32 &times; 32 px &middot; PNG, ICO</p>

        <DropZone
          accept={ACCEPT_FAVICON}
          maxSize={MAX_SIZE_FAVICON}
          label="Favicon"
          onFileSelect={handleFaviconSelect}
        />

        {faviconPreview && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border">
                <img src={favicon16Preview ?? faviconPreview} alt="Favicon 16" className="w-4 h-4 object-contain" />
                <span className="text-xs text-gray-600 dark:text-gray-300">16&times;16</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border">
                <img src={faviconPreview} alt="Favicon 32" className="w-8 h-8 object-contain" />
                <span className="text-xs text-gray-600 dark:text-gray-300">32&times;32</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">Size previews (actual pixel dimensions)</p>
              <button
                onClick={handleRemoveFavicon}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        )}

        {!faviconPreview && (
          <div className="flex items-center justify-center h-12 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
            <p className="text-xs text-gray-400">No favicon uploaded</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Preview</h2>
        </div>

        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-t border border-gray-300 dark:border-gray-600 border-b-white dark:border-b-gray-800 px-3 py-1.5 w-fit">
            {(favicon16Preview ?? faviconPreview) && <img src={favicon16Preview ?? faviconPreview ?? ''} alt="" className="w-4 h-4 object-contain" />}
            {!(favicon16Preview ?? faviconPreview) && <div className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-500" />}
            <span className="text-xs text-gray-700 dark:text-gray-200 truncate max-w-[180px]">UIMS Store &mdash; Best Online Shop</span>
            <X className="w-3 h-3 text-gray-400 ml-1" />
          </div>

          <div className="bg-white border border-gray-200 dark:border-gray-600 rounded h-10 flex items-center px-3">
            {headerLogoPreview && <img src={headerLogoPreview} alt="" className="max-h-7 w-auto object-contain" />}
            {!headerLogoPreview && <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded" />}
            <span className="text-sm text-gray-500 ml-2">Store Name</span>
            <div className="ml-auto flex gap-3">
              <span className="text-xs text-gray-300">Cart</span>
              <span className="text-xs text-gray-300">Login</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded flex flex-col items-center py-3">
            {footerLogoPreview && <img src={footerLogoPreview} alt="" className="max-h-10 w-auto object-contain" />}
            {!footerLogoPreview && <div className="w-10 h-10 bg-gray-700 rounded" />}
            <p className="text-xs text-gray-400 mt-1">&copy; 2025 UIMS Store</p>
          </div>

          <div className="flex items-start gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded">
            <Star className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">UIMS Store</p>
              <div className="flex items-center gap-1 mt-0.5">
                {(favicon16Preview ?? faviconPreview) && <img src={favicon16Preview ?? faviconPreview ?? ''} alt="" className="w-3 h-3 object-contain" />}
                {!(favicon16Preview ?? faviconPreview) && <div className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-500" />}
                <span className="text-xs text-gray-500">Best online shopping in Bangladesh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
