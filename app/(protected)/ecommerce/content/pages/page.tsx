'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  X,
  Pencil,
  Trash2,
  Globe,
  EyeOff,
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import staticPageService from '@/services/staticPageService';
import { notify, confirm } from '@/lib/notifications';
import RichTextEditor from '@/components/ui/rich-text-editor';
import type { StaticPage } from '@/types/api.types';

type PageForm = {
  id?: string;
  slug: string;
  title: string;
  body: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: PageForm = {
  slug: '',
  title: '',
  body: '',
  meta_title: '',
  meta_description: '',
  is_published: false,
  sort_order: 1,
};

export default function CmsPagesPage() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PageForm>({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSeo, setShowSeo] = useState(false);
  const [slugError, setSlugError] = useState('');

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staticPageService.getAll({ per_page: 100 });
      setPages(res.data || []);
    } catch {
      notify.error('Failed to load static pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(false);
    setShowForm(false);
    setSaving(false);
    setSlugError('');
    setShowSeo(false);
  };

  const handleAddPage = () => {
    setEditing(false);
    setForm({ ...emptyForm });
    setSlugError('');
    setShowSeo(false);
    setShowForm(true);
  };

  const openEditForm = (page: StaticPage) => {
    setForm({
      id: page.id,
      slug: page.slug,
      title: page.title,
      body: page.body || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      is_published: page.is_published,
      sort_order: page.sort_order,
    });
    setEditing(true);
    setShowForm(true);
    setSlugError('');
    setShowSeo(!!(page.meta_title || page.meta_description));
  };

  const validateSlug = (slug: string): string => {
    if (!slug.trim()) return 'Slug is required';
    if (!/^[a-z0-9-]+$/.test(slug)) return 'Slug must only contain lowercase letters, numbers, and hyphens';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slugErr = validateSlug(form.slug);
    if (slugErr) { setSlugError(slugErr); return; }
    setSlugError('');

    if (!form.title.trim()) {
      notify.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      if (editing && form.id) {
        const updated = await staticPageService.update(form.id, {
          slug: form.slug,
          title: form.title,
          body: form.body || undefined,
          meta_title: form.meta_title || undefined,
          meta_description: form.meta_description || undefined,
          is_published: form.is_published,
          sort_order: form.sort_order,
        });
        setPages(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        notify.success('Page updated successfully');
      } else {
        const created = await staticPageService.create({
          slug: form.slug,
          title: form.title,
          body: form.body || undefined,
          meta_title: form.meta_title || undefined,
          meta_description: form.meta_description || undefined,
          is_published: form.is_published,
          sort_order: form.sort_order,
        });
        setPages(prev => [...prev, created]);
        notify.success('Page created successfully');
      }
      resetForm();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        const firstError = Object.values(apiErrors).flat().join(' ');
        if (apiErrors.slug) setSlugError(apiErrors.slug.join(' '));
        notify.error('Validation error', firstError);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save page');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (page: StaticPage) => {
    setTogglingId(page.id);
    try {
      const updated = await staticPageService.togglePublish(page.id);
      setPages(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch {
      notify.error('Failed to toggle publish status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (page: StaticPage) => {
    const result = await confirm({
      title: 'Delete Page?',
      text: `Are you sure you want to delete "${page.title}"? This cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    setDeletingId(page.id);
    try {
      await staticPageService.delete(page.id);
      setPages(prev => prev.filter(p => p.id !== page.id));
      notify.success('Page deleted');
    } catch {
      notify.error('Failed to delete page');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPages = pages.filter(p =>
    !searchQuery ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Static Pages (CMS)</h1>
        </div>
        <button
          onClick={handleAddPage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Page
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={fetchPages}
          disabled={loading}
          className="p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editing ? 'Edit Page' : 'Create Page'}
          </h2>

          {/* Row 1: Slug, Title, Sort Order */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setForm(f => ({ ...f, slug: val }));
                    setSlugError(validateSlug(val));
                  }}
                  placeholder="page-slug"
                  className={`w-full pl-7 pr-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    slugError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {slugError && <p className="mt-1 text-xs text-red-500">{slugError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Page title"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input
                type="number"
                min="1"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Body (Rich-Text Editor) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <RichTextEditor
              value={form.body}
              onChange={html => setForm(f => ({ ...f, body: html }))}
              placeholder="Write page content here..."
              minHeight="300px"
            />
          </div>

          {/* Publish Toggle + SEO */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-published"
              checked={form.is_published}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="is-published" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              Published
            </label>
          </div>

          {/* SEO Meta (Collapsible) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
            >
              {showSeo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              SEO Meta
            </button>

            {showSeo && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={form.meta_title}
                    onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                    placeholder="SEO title (optional)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                    placeholder="SEO description (optional)"
                    rows={3}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GiSave className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving...' : editing ? 'Update Page' : 'Save Page'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white text-sm font-medium rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Title</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Slug</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Updated</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No pages match your search' : 'No pages yet. Click "Add Page" to create your first one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{page.title}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                        page.is_published
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {page.is_published ? (
                          <><Globe className="w-3 h-3" /> Published</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Draft</>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTogglePublish(page)}
                          disabled={togglingId === page.id}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            page.is_published
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={page.is_published ? 'Set as Draft' : 'Publish'}
                        >
                          {togglingId === page.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : page.is_published ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Globe className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditForm(page)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(page)}
                          disabled={deletingId === page.id}
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title="Delete"
                        >
                          {deletingId === page.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
