'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import BusinessTypeMultiSelect from '@/components/ui/business-type-multi-select';
import commonService from '@/services/commonService';
import { categoryService } from '@/services';
import { notify } from '@/lib/notifications';
import type { Category } from '@/types/api.types';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
      />
    </button>
  );
}

export function CategoryFormDialog({
  open,
  onClose,
  onSaved,
  editingCategory,
  defaultParentId,
  allCategories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingCategory: Category | null;
  defaultParentId?: string | null;
  allCategories: Category[];
}) {
  const { isSuperAdmin } = usePermissions();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_type_ids: [] as number[],
    is_active: true,
    storefront_active: false,
    parent_id: undefined as string | undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<SelectOption[]>([]);

  const loadParentOptions = useCallback(async (input: string) => {
    try {
      const btId = isSuperAdmin ? (formData.business_type_ids[0] ?? null) : tenantBusinessTypeId;
      const params: any = { only_parent: true };
      if (input.trim()) params.search = input.trim();
      if (btId) params.business_type_id = btId;
      const cats = await commonService.getCategoriesForDropdown(params);
      const filtered = cats.filter(c => !editingCategory || String(c.id) !== String(editingCategory.id));
      const opts = filtered.map(c => ({ value: String(c.id), label: c.name }));
      if (!input) setParentOptions(opts);
      return opts;
    } catch { return []; }
  }, [formData.business_type_ids, isSuperAdmin, tenantBusinessTypeId, editingCategory]);

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      const btIds = isSuperAdmin ? ((editingCategory as any).business_types?.map((b: any) => b.id) ?? []) : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []);
      setFormData({
        name: editingCategory.name,
        description: editingCategory.description || '',
        business_type_ids: btIds,
        is_active: !!editingCategory.is_active,
        storefront_active: !!(editingCategory as Category).storefront_active,
        parent_id: editingCategory.parent_id ? String(editingCategory.parent_id) : undefined,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        business_type_ids: isSuperAdmin ? [] : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []),
        is_active: true,
        storefront_active: false,
        parent_id: defaultParentId ? String(defaultParentId) : undefined,
      });
    }
    setErrors({});
    loadParentOptions('');
  }, [open, editingCategory, defaultParentId, isSuperAdmin, tenantBusinessTypeId]);

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (formData.business_type_ids.length === 0) e.business_type_ids = 'At least one business type is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        business_type_ids: isSuperAdmin ? formData.business_type_ids : (tenantBusinessTypeId ? [tenantBusinessTypeId] : []),
        ...(editingCategory ? { id: String(editingCategory.id) } : {}),
      };
      await categoryService.storeCategory(payload);
      notify.success(editingCategory ? 'Category updated' : 'Category created');
      onSaved();
      onClose();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? (v as string[]).join(', ') : String(v); });
        setErrors(mapped);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save category');
      }
    } finally { setSaving(false); }
  };

  const selectedParent = formData.parent_id ? parentOptions.find(o => o.value === formData.parent_id) || { value: formData.parent_id, label: allCategories.find(c => String(c.id) === formData.parent_id)?.name || `#${formData.parent_id}` } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editingCategory ? 'Edit Category' : defaultParentId ? 'Add Sub-category' : 'Add Category'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Category name" className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business Types <span className="text-red-500">*</span></label>
              <BusinessTypeMultiSelect value={formData.business_type_ids} onChange={ids => setFormData({ ...formData, business_type_ids: ids })} placeholder="Select business types" isInvalid={!!errors.business_type_ids} />
              {errors.business_type_ids && <p className="text-xs text-red-600 mt-1">{errors.business_type_ids}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Category</label>
            <CustomSelect value={selectedParent as SelectOption | null} onChange={opt => setFormData({ ...formData, parent_id: opt?.value || undefined })} loadOptions={loadParentOptions} defaultOptions={parentOptions} placeholder="No parent (top-level)" isClearable />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Optional description" className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={formData.is_active ? 'active' : 'inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'active' })} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Show on Storefront</label>
            <div className="flex h-[30px] items-center gap-2">
              <ToggleSwitch
                checked={!!formData.storefront_active}
                onChange={v => setFormData({ ...formData, storefront_active: v })}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {formData.storefront_active ? 'Shown in Shop by Category' : 'Hidden from Shop by Category'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded">
              <GiSave className="w-4 h-4" />{saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
