'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Rows4, UserCheck, Plus, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { User } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import { confirm, notify, success } from '@/lib/notifications';
import { userService } from '@/services';

interface UserForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  user_type: 'tenant_admin' | 'tenant_user';
  tenant_id?: string;
  is_active: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const [switchingUser, setSwitchingUser] = useState<string | null>(null);
  const currentUser = useAuthStore(state => state.user);
  const switchUser = useAuthStore(state => state.switchUser);
  const { hasPermission, isHydrated, isSuperAdmin } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [form, setForm] = useState<UserForm>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    user_type: 'tenant_user',
    is_active: true,
  });

  // Redirect if no access to view users
  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin && !hasPermission('view-users')) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isSuperAdmin, hasPermission, router]);

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      phone: '',
      user_type: 'tenant_user',
      is_active: true,
    });
    setFormErrors({});
    setEditingId(null);
    setMode('add');
  };

  const handleAdd = () => {
    resetForm();
    setMode('add');
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = async (user: User) => {
    setMode('edit');
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      phone: user.phone || '',
      user_type: user.user_type as 'tenant_admin' | 'tenant_user',
      is_active: user.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (mode === 'add' && !form.password) {
      errors.password = 'Password is required';
    }

    if (form.password && form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (form.password && form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (mode === 'add') {
        await userService.createUser(form as any);
        success('User created successfully');
      } else if (editingId) {
        const updateData: any = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          user_type: form.user_type,
          is_active: form.is_active,
        };
        // Only include password if it was changed
        if (form.password) {
          updateData.password = form.password;
          updateData.password_confirmation = form.password_confirmation;
        }
        await userService.updateUser(editingId, updateData);
        success('User updated successfully');
      }
      setShowForm(false);
      resetForm();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      // Handle server-side validation errors
      if (error.response?.data?.errors) {
        const transformedErrors: { [key: string]: string } = {};
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          transformedErrors[key] = Array.isArray(messages) ? messages.join(', ') : messages as string;
        });
        setFormErrors(transformedErrors);
      } else {
        notify.error(error.response?.data?.message || 'An error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    const result = await confirm({
      title: 'Delete User',
      html: `Are you sure you want to delete <strong>${user.name}</strong>?<br><br>
             <em style="color: #6b7280; font-size: 12px;">This action cannot be undone.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await userService.deleteUser(user.id);
      success('User deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      notify.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Inactive
      </span>
    );
  };

  // Delete access rules:
  // - Super admin can delete any non-super-admin user except their own account.
  // - Tenant admin can delete only tenant_user accounts from the same tenant.
  // - Tenant users cannot delete anyone.
  // - Super admin accounts are never deletable from this list.
  const canDeleteUser = (targetUser: User) => {
    if (targetUser.user_type === 'super_admin') {
      return false;
    }

    if (isSuperAdmin) {
      return targetUser.id !== currentUser?.id;
    }

    if (currentUser?.user_type === 'tenant_admin') {
      return (
        targetUser.user_type === 'tenant_user' &&
        targetUser.tenant_id === currentUser.tenant_id &&
        targetUser.id !== currentUser.id
      );
    }

    return false;
  };

  const columns: ColumnDef<User>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
      cell: ({ row, table }) => {
        const page = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 15;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {page * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <div className="text-xs text-gray-900 dark:text-gray-100">{row.original.email}</div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.phone || '-'}</div>
      ),
    },
    {
      accessorKey: 'user_type',
      header: 'Type',
      meta: { width: '12%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
          {row.original.user_type?.replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => getStatusBadge(row.original.is_active),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '14%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {(isSuperAdmin || hasPermission('update-users')) && (
            <button
              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
              title="Edit"
              onClick={() => handleEdit(row.original)}
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {isSuperAdmin && row.original.user_type !== 'super_admin' && (
            <button
              className={`p-1 rounded transition-colors ${switchingUser === row.original.id
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
                }`}
              title={switchingUser === row.original.id ? 'Switching...' : 'Switch to User'}
              disabled={switchingUser === row.original.id}
              onClick={async () => {
                const result = await confirm({
                  title: 'Switch User Account',
                  html: `Are you sure you want to switch to <strong>${row.original.name}</strong>'s account?<br><br>
                          <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                            <strong>Email:</strong> ${row.original.email}<br>
                            <strong>Type:</strong> ${row.original.user_type}
                          </div><br>
                          <em style="color: #6b7280; font-size: 12px;">This is for debugging purposes only.
                            You can switch back from the header menu.
                          </em>`,
                  confirmButtonText: 'Switch',
                  cancelButtonText: 'Cancel',
                });

                if (!result.isConfirmed) return;

                setSwitchingUser(row.original.id);
                try {
                  const switchSuccess = await switchUser(row.original.id.toString());
                  if (switchSuccess) {
                    window.location.href = '/dashboard';
                  } else {
                    notify.switchUserError();
                  }
                } catch (error) {
                  notify.error('An error occurred while switching user. Please try again.');
                } finally {
                  setSwitchingUser(null);
                }
              }}
            >
              {switchingUser === row.original.id ? (
                <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {canDeleteUser(row.original) && (
            <button
              className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
              title="Delete"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    return 'users';
  };

  const inputCls = 'w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Rows4 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            User Management
          </h1>
        </div>
        {(isSuperAdmin || hasPermission('create-users')) && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Form Modal/Section */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {mode === 'add' ? 'Add User' : 'Edit User'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
              <div>
                <label className={labelCls}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    // Clear error when user types
                    if (e.target.value.trim() && formErrors.name) {
                      const { name, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Enter full name"
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className={labelCls}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    // Clear error when valid email is entered
                    if (e.target.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) && formErrors.email) {
                      const { email, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="user@example.com"
                />
                {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className={labelCls}>
                  User Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.user_type}
                  onChange={(e) => setForm({ ...form, user_type: e.target.value as 'tenant_admin' | 'tenant_user' })}
                  className={inputCls}
                >
                  <option value="tenant_user">Tenant User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Password {mode === 'add' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    // Clear error when user types
                    if (e.target.value && formErrors.password) {
                      const { password, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                />
                {formErrors.password && <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className={labelCls}>
                  Confirm Password {mode === 'add' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => {
                    setForm({ ...form, password_confirmation: e.target.value });
                    // Clear error when user types
                    if (e.target.value && formErrors.password_confirmation) {
                      const { password_confirmation, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.password_confirmation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Re-enter password"
                />
                {formErrors.password_confirmation && <p className="text-red-600 text-xs mt-1">{formErrors.password_confirmation}</p>}
              </div>

            </div>

            {/* Settings */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4" />
                {submitting ? 'Saving...' : mode === 'add' ? 'Create User' : 'Update User'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by name, email, or phone..."
      />
    </div>
  );
}
