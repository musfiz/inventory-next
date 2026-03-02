'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Save, UserCheck, Check, X } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import { notify } from '@/lib/notifications';
import userPermissionService, { UserPermissionModule, UserSelection } from '@/services/userPermissionService';
import { usePermissions } from '@/hooks/use-permissions';

export default function UserPermissionsPage() {
  const { isTenantAdmin } = usePermissions();
  const [users, setUsers] = useState<UserSelection[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [modules, setModules] = useState<UserPermissionModule[]>([]);
  const [filteredModules, setFilteredModules] = useState<UserPermissionModule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Available permission actions
  const permissionActions = ['view', 'store', 'update', 'delete', 'PDF', 'XLSX'];

  // Filter users: if current user is tenant_admin, exclude other tenant_admins
  const filteredUsers = useMemo(() => {
    if (isTenantAdmin) {
      return users.filter(user => user.user_type !== 'tenant_admin');
    }
    return users;
  }, [users, isTenantAdmin]);

  // Fetch users and modules on mount
  useEffect(() => {
    fetchUsers();
    fetchModules();
  }, []);

  // Filter modules when search query or module filter changes
  useEffect(() => {
    filterModules();
  }, [searchQuery, selectedModule, modules]);

  const fetchUsers = async () => {
    try {
      const data = await userPermissionService.getUsersForSelection();
      setUsers(data);
    } catch (error) {
      notify.error('Failed to load users');
    }
  };

  const fetchModules = async () => {
    try {
      const data = await userPermissionService.getPermissionsByModule();
      setModules(data);
      setFilteredModules(data);
    } catch (error) {
      notify.error('Failed to load permissions');
    }
  };

  const filterModules = () => {
    let filtered = [...modules];

    // Filter by module selection
    if (selectedModule !== 'all') {
      filtered = filtered.filter(m => m.module === selectedModule);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.module.toLowerCase().includes(query) ||
        m.permissions.some(p => p.name.toLowerCase().includes(query))
      );
    }

    setFilteredModules(filtered);
  };

  const loadUserPermissions = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await userPermissionService.getUserPermissions(userId);
      setSelectedPermissions(new Set(data.permissions));
    } catch (error) {
      notify.error('Failed to load user permissions');
      setSelectedPermissions(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      loadUserPermissions(userId);
    } else {
      setSelectedPermissions(new Set());
    }
  };

  const togglePermission = (permissionName: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionName)) {
      newPermissions.delete(permissionName);
    } else {
      newPermissions.add(permissionName);
    }
    setSelectedPermissions(newPermissions);
  };

  const toggleAllModulePermissions = (module: UserPermissionModule, checked: boolean) => {
    const newPermissions = new Set(selectedPermissions);
    module.permissions.forEach(permission => {
      if (checked) {
        newPermissions.add(permission.name);
      } else {
        newPermissions.delete(permission.name);
      }
    });
    setSelectedPermissions(newPermissions);
  };

  const isModuleFullyChecked = (module: UserPermissionModule): boolean => {
    return module.permissions.every(p => selectedPermissions.has(p.name));
  };

  const isModulePartiallyChecked = (module: UserPermissionModule): boolean => {
    const checked = module.permissions.filter(p => selectedPermissions.has(p.name)).length;
    return checked > 0 && checked < module.permissions.length;
  };

  const handleSavePermissions = async () => {
    // Clear previous errors
    setFormErrors({});

    if (!selectedUserId) {
      setFormErrors({ user: 'Please select a user' });
      notify.error('Please select a user');
      return;
    }

    setSaving(true);
    try {
      await userPermissionService.assignPermissions(selectedUserId, Array.from(selectedPermissions));
      notify.success('Permissions assigned successfully');
    } catch (error) {
      notify.error('Failed to assign permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('all');
    setFormErrors({});
  };

  // Get unique modules for filter dropdown
  const uniqueModules = Array.from(new Set(modules.map(m => m.module))).sort();

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            User Permissions
          </h1>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* User Selection - spans 5 columns on large screens */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select User *
            </label>
            <CustomSelect
              value={filteredUsers.find(user => user.id === selectedUserId) ? {
                value: filteredUsers.find(user => user.id === selectedUserId)!.id,
                label: `${filteredUsers.find(user => user.id === selectedUserId)!.name} (${filteredUsers.find(user => user.id === selectedUserId)!.user_type})`
              } : null}
              onChange={(option) => handleUserChange(option?.value || '')}
              options={filteredUsers.map(user => ({
                value: user.id,
                label: `${user.name} (${user.user_type})`
              }))}
              placeholder="Select a user"
              isInvalid={!!formErrors.user}
            />
            {formErrors.user && (
              <p className="text-red-600 text-xs mt-1">{formErrors.user}</p>
            )}
          </div>

          {/* Module Filter - spans 2 columns */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 h-8"
            >
              <option value="all">All Modules</option>
              {uniqueModules.map(module => (
                <option key={module} value={module}>
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search - spans 3 columns */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Permissions
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by module or permission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 h-8"
              />
            </div>
          </div>

          {/* Reset Button - spans 2 columns */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Actions
            </label>
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-1.5 h-8 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Table */}
      {selectedUserId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading permissions...
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No permissions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/4">
                      Module
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      View
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Create
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Edit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Delete
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      PDF
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      XLSX
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredModules.map((module) => (
                    <tr key={module.module} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {module.module}
                          </span>
                        </div>
                      </td>
                      {permissionActions.map(action => {
                        const permission = module.permissions.find(p => p.action === action);
                        return (
                          <td key={action} className="px-4 py-3 text-center">
                            {permission ? (
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(permission.name)}
                                onChange={() => togglePermission(permission.name)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-800">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isModuleFullyChecked(module)}
                          ref={(el) => {
                            if (el) el.indeterminate = isModulePartiallyChecked(module);
                          }}
                          onChange={(e) => toggleAllModulePermissions(module, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Shield className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Please select a user to manage permissions
          </p>
        </div>
      )}

      {/* Save Button */}
      {selectedUserId && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
