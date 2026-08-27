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
  Image as ImageIcon,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import blogPostService from '@/services/blogPostService';
import { notify, confirm } from '@/lib/notifications';
import { imageUrl } from '@/lib/image-url';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" />
  ),
});
import type { BlogPost } from '@/types/api.types';

type PostForm = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  featured_image: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
};

const emptyForm: PostForm = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  featured_image: '',
  meta_title: '',
  meta_description: '',
  is_published: false,
};

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PostForm>({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSeo, setShowSeo] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const SEO_META_TITLE_MAX = 70;
  const SEO_META_DESC_MAX = 160;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogPostService.getAll({ per_page: 100 });
      setPosts(res.data || []);
    } catch {
      notify.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(false);
    setShowForm(false);
    setSaving(false);
    setFieldErrors({});
    setShowSeo(false);
  };

  const handleAddPost = () => {
    setEditing(false);
    const newId = crypto.randomUUID();
    setForm({ ...emptyForm, id: newId });
    setFieldErrors({});
    setShowSeo(false);
    setShowForm(true);
  };

  const getFolderKey = (id?: string) => id ? id.substring(0, 8) : undefined;

  const openEditForm = async (post: BlogPost) => {
    try {
      const fullPost = await blogPostService.get(post.id);
      setForm({
        id: fullPost.id,
        slug: fullPost.slug,
        title: fullPost.title,
        excerpt: fullPost.excerpt || '',
        body: fullPost.body || '',
        featured_image: fullPost.featured_image || '',
        meta_title: fullPost.meta_title || '',
        meta_description: fullPost.meta_description || '',
        is_published: fullPost.is_published,
      });
      setEditing(true);
      setShowForm(true);
      setFieldErrors({});
      setShowSeo(!!(fullPost.meta_title || fullPost.meta_description));
    } catch {
      notify.error('Failed to load blog post data');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!form.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      errors.slug = 'Slug must only contain lowercase letters, numbers, and hyphens';
    } else if (form.slug.length < 3) {
      errors.slug = 'Slug must be at least 3 characters';
    }

    if (form.meta_title && form.meta_title.length > SEO_META_TITLE_MAX) {
      errors.meta_title = `Meta title must not exceed ${SEO_META_TITLE_MAX} characters`;
    }

    if (form.meta_description && form.meta_description.length > SEO_META_DESC_MAX) {
      errors.meta_description = `Meta description must not exceed ${SEO_META_DESC_MAX} characters`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editing && form.id) {
        const updated = await blogPostService.update(form.id, {
          slug: form.slug,
          title: form.title,
          excerpt: form.excerpt || undefined,
          body: form.body || undefined,
          featured_image: form.featured_image || undefined,
          meta_title: form.meta_title || undefined,
          meta_description: form.meta_description || undefined,
          is_published: form.is_published,
        });
        setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        notify.success('Blog post updated successfully');
      } else {
        const created = await blogPostService.create({
          id: form.id,
          slug: form.slug,
          title: form.title,
          excerpt: form.excerpt || undefined,
          body: form.body || undefined,
          featured_image: form.featured_image || undefined,
          meta_title: form.meta_title || undefined,
          meta_description: form.meta_description || undefined,
          is_published: form.is_published,
        });
        setPosts(prev => [...prev, created]);
        notify.success('Blog post created successfully');
      }
      resetForm();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        const flat: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(apiErrors)) {
          flat[key] = msgs.join(' ');
        }
        setFieldErrors(flat);
        notify.error('Validation error', Object.values(flat).join('. '));
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save blog post');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    setTogglingId(post.id);
    try {
      const updated = await blogPostService.togglePublish(post.id);
      setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch {
      notify.error('Failed to toggle publish status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    const result = await confirm({
      title: 'Delete Blog Post?',
      text: `Are you sure you want to delete "${post.title}"? This cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    setDeletingId(post.id);
    try {
      await blogPostService.delete(post.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      notify.success('Blog post deleted');
    } catch {
      notify.error('Failed to delete blog post');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await blogPostService.uploadImage(file, getFolderKey(form.id));
      setForm(f => ({ ...f, featured_image: url }));
      notify.success('Featured image uploaded');
    } catch {
      notify.error('Failed to upload featured image');
    }
  };

  const handleRemoveFeaturedImage = () => {
    setForm(f => ({ ...f, featured_image: '' }));
  };

  const filteredPosts = posts.filter(p =>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Blog / News (CMS)</h1>
        </div>
        <button
          onClick={handleAddPost}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Post
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
            placeholder="Search posts..."
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
          onClick={fetchPosts}
          disabled={loading}
          className="p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            aria-label={loading ? 'Refreshing…' : 'Refresh'}
            role={loading ? 'status' : undefined}
          />
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editing ? 'Edit Blog Post' : 'Create Blog Post'}
          </h2>

          {/* Row 1: Slug, Title, Featured Image */}
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
                    clearFieldError('slug');
                  }}
                  placeholder="blog-post-slug"
                  className={`w-full pl-7 pr-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    fieldErrors.slug ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {fieldErrors.slug && <p className="mt-1 text-xs text-red-500">{fieldErrors.slug}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => {
                  setForm(f => ({ ...f, title: e.target.value }));
                  clearFieldError('title');
                }}
                placeholder="Post title"
                className={`w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  fieldErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Featured Image</label>
              <div className="space-y-2">
                {form.featured_image ? (
                  <div className="relative inline-block">
                    <img
                      src={imageUrl(form.featured_image) || ''}
                      alt="Featured"
                      className="h-20 w-20 object-cover rounded border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFeaturedImage}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFeaturedImageUpload}
                      className="hidden"
                    />
                    <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={e => {
                setForm(f => ({ ...f, excerpt: e.target.value }));
                clearFieldError('excerpt');
              }}
              placeholder="Short description or summary of the post..."
              rows={3}
              className={`w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${
                fieldErrors.excerpt ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {fieldErrors.excerpt && <p className="mt-1 text-xs text-red-500">{fieldErrors.excerpt}</p>}
          </div>

          {/* Body (Rich-Text Editor with Image Upload) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <RichTextEditor
              value={form.body}
              onChange={html => {
                setForm(f => ({ ...f, body: html }));
                clearFieldError('body');
              }}
              placeholder="Write your blog post content here..."
              minHeight="400px"
              onImageUpload={async (file) => {
                const url = await blogPostService.uploadImage(file, getFolderKey(form.id));
                return imageUrl(url) || url;
              }}
              onImageRemove={async (src) => {
                await blogPostService.deleteImage(src);
              }}
            />
            {fieldErrors.body && <p className="mt-1 text-xs text-red-500">{fieldErrors.body}</p>}
          </div>

          {/* Publish Toggle */}
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
                    onChange={e => {
                      const val = e.target.value;
                      if (val.length <= SEO_META_TITLE_MAX) {
                        setForm(f => ({ ...f, meta_title: val }));
                      }
                      clearFieldError('meta_title');
                    }}
                    placeholder="SEO title (optional)"
                    className={`w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      fieldErrors.meta_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {fieldErrors.meta_title && <p className="text-xs text-red-500">{fieldErrors.meta_title}</p>}
                    <p className={`text-xs ml-auto ${form.meta_title.length > SEO_META_TITLE_MAX ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {form.meta_title.length}/{SEO_META_TITLE_MAX}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.length <= SEO_META_DESC_MAX) {
                        setForm(f => ({ ...f, meta_description: val }));
                      }
                      clearFieldError('meta_description');
                    }}
                    placeholder="SEO description (optional)"
                    rows={3}
                    className={`w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${
                      fieldErrors.meta_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {fieldErrors.meta_description && <p className="text-xs text-red-500">{fieldErrors.meta_description}</p>}
                    <p className={`text-xs ml-auto ${form.meta_description.length > SEO_META_DESC_MAX ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {form.meta_description.length}/{SEO_META_DESC_MAX}
                    </p>
                  </div>
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
              {saving ? 'Saving...' : editing ? 'Update Post' : 'Save Post'}
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
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No posts match your search' : 'No blog posts yet. Click "Add Post" to create your first one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{post.title}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        /{post.slug}
                      </code>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                        post.is_published
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {post.is_published ? (
                          <><Globe className="w-3 h-3" /> Published</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Draft</>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {post.updated_at ? new Date(post.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={togglingId === post.id}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            post.is_published
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={post.is_published ? 'Set as Draft' : 'Publish'}
                        >
                          {togglingId === post.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : post.is_published ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Globe className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditForm(post)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={deletingId === post.id}
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title="Delete"
                        >
                          {deletingId === post.id ? (
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
