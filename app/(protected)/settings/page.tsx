'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Camera, User, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { usePermissions } from '@/hooks/use-permissions';
import { userService } from '@/services';
import tenantService from '@/services/tenantService';
import commonService from '@/services/commonService';
import CustomSelect from '@/components/ui/custom-select';
import { notify } from '@/lib/notifications';

type ProfileFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  avatar: File | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const { isSuperAdmin } = usePermissions();
  const { selectedTenant, tenantSettings, setSelectedTenant, setTenantSettings, clearTenantData } = useTenantStore();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Tenant selector state (superadmin only) ──────────────────────────────
  const [tenantOption, setTenantOption] = useState<{ value: string; label: string } | null>(
    selectedTenant ? { value: selectedTenant.id, label: selectedTenant.business_name } : null
  );
  const [tenantSaving, setTenantSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    avatar: null,
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      password_confirmation: '',
      avatar: null,
    });

    setAvatarPreview(
      user.avatar_url ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${user.avatar_url}` : null
    );
  }, [user]);

  useEffect(() => {
    if (!form.avatar) return;

    const nextPreview = URL.createObjectURL(form.avatar);
    setAvatarPreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [form.avatar]);

  const initials = useMemo(() => {
    const source = form.name || user?.name || 'U';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }, [form.name, user?.name]);

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTenant = async () => {
    if (!tenantOption) {
      notify.error('Please select a tenant first');
      return;
    }
    setTenantSaving(true);
    try {
      const settings = await tenantService.getTenantSettings(String(tenantOption.value));
      setSelectedTenant({ id: tenantOption.value, business_name: tenantOption.label } as any);
      setTenantSettings(settings);
      notify.success(`Default tenant set to "${tenantOption.label}"`);
    } catch {
      notify.error('Failed to load tenant settings');
    } finally {
      setTenantSaving(false);
    }
  };

  const handleClearTenant = () => {
    clearTenantData();
    setTenantOption(null);
    notify.success('Default tenant cleared');
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.email.trim()) nextErrors.email = 'Username / email is required';
    if (form.password && form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    if (form.password && form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const updatedUser = await userService.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
        password_confirmation: form.password ? form.password_confirmation : undefined,
        avatar: form.avatar,
      });

      setUser(updatedUser as import('@/types').User);
      setErrors({});
      setForm(prev => ({
        ...prev,
        password: '',
        password_confirmation: '',
        avatar: null,
      }));
      setAvatarPreview(
        updatedUser.avatar_url
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${updatedUser.avatar_url}`
          : null
      );
      notify.success('Profile updated successfully');
      router.refresh();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const nextErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([key, value]) => {
          nextErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
        });
        setErrors(nextErrors);
      } else {
        notify.error(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
          <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Profile Settings
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1" autoComplete="off">
        {/* Account Info + Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Account Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
            {/* Avatar */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Photo
              </label>
              <div className="relative overflow-hidden rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 aspect-square w-full">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                    onError={event => {
                      (event.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-2xl font-semibold text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400">
                    {initials || <User className="h-10 w-10" />}
                  </div>
                )}
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1.5 bg-black/55 px-2 py-2 text-xs font-medium text-white transition hover:bg-black/70">
                  <Camera className="h-3.5 w-3.5" />
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0] ?? null;
                      setForm(prev => ({ ...prev, avatar: file }));
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={event => handleChange('email', event.target.value)}
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                  placeholder="name@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={event => handleChange('name', event.target.value)}
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                  placeholder="Full name"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={event => handleChange('phone', event.target.value)}
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                  placeholder="Phone number"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Change Password
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Leave blank to keep your current password.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={event => handleChange('password', event.target.value)}
                className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                placeholder="New password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={event => handleChange('password_confirmation', event.target.value)}
                className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                placeholder="Confirm password"
              />
              {errors.password_confirmation && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password_confirmation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm cursor-pointer"
          >
            <GiSave className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* ── Superadmin: Default Tenant ────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Default Tenant</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Select the tenant whose print &amp; POS settings will be used across the application. This is saved locally and persists across sessions.
          </p>

          {/* Currently saved badge */}
          {selectedTenant && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Currently:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full border border-indigo-200 dark:border-indigo-700">
                <Building2 className="h-3 w-3" />
                {selectedTenant.business_name}
              </span>
              {tenantSettings && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  · {tenantSettings.default_printer_type === 'thermal' ? `Thermal ${tenantSettings.thermal_paper_size ?? '80mm'}` : 'A4'}
                </span>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant</label>
              <CustomSelect
                value={tenantOption}
                onChange={opt => setTenantOption(opt)}
                loadOptions={async (input: string) => {
                  const list = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
                  return (list || []).map((t: any) => ({ value: String(t.id), label: t.business_name }));
                }}
                defaultOptions
                placeholder="Search and select a tenant…"
                className="text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveTenant}
              disabled={tenantSaving || !tenantOption}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm cursor-pointer shrink-0"
            >
              <GiSave className="h-4 w-4" />
              {tenantSaving ? 'Saving…' : 'Save Tenant'}
            </button>
            {selectedTenant && (
              <button
                type="button"
                onClick={handleClearTenant}
                title="Clear default tenant"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-sm cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}