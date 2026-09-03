'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Search, Check, X, Store, AlertCircle } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import Spinner from '@/components/ui/spinner';
import { notify } from '@/lib/notifications';
import ecommerceMenuPermissionService, {
  EcommercePermission,
  UserSelection,
} from '@/services/ecommerceMenuPermissionService';
import { usePermissions } from '@/hooks/use-permissions';
import { GiSave } from 'react-icons/gi';

// Friendly labels for each ecommerce permission (matches EcommerceManagementPermissionSeeder)
const permissionLabels: Record<string, string> = {
  'view-ecommerce-store-setting': 'Store Settings',
  'view-ecommerce-locale-currency': 'Locale & Currency',
  'view-ecommerce-seo-meta': 'SEO & Meta Defaults',
  'view-ecommerce-payment-method': 'Payment Methods',
  'view-ecommerce-shipping-delivery': 'Shipping & Delivery',
  'view-ecommerce-theme': 'Theme & Colors',
  'view-ecommerce-logo-favicon': 'Logo & Favicon',
  'view-ecommerce-header-info': 'Header & Info',
  'view-ecommerce-mega-menu': 'Mega Menu',
  'view-ecommerce-navigation-menu': 'Navigation Menu',
  'view-ecommerce-footer-builder': 'Footer Builder',
  'view-ecommerce-hero-slider': 'Hero Slider',
  'view-ecommerce-top-offer': 'Top Offer',
  'view-ecommerce-flash-sale': 'Flash Sale',
  'view-ecommerce-brands': 'Brands',
  'view-ecommerce-categories': 'Categories',
  'view-ecommerce-category-content': 'Category Content',
  'view-ecommerce-display-rules': 'Display Rules',
  'view-ecommerce-product-rules': 'Product Rules',
  'view-ecommerce-product-media': 'Product Media',
  'view-ecommerce-static-pages': 'Static Pages (CMS)',
  'view-ecommerce-blog': 'Blog / News',
  'view-ecommerce-coupons': 'Coupons',
  'view-ecommerce-flashsale-campaign': 'Flash Sale Campaigns',
  'view-ecommerce-orders': 'All Orders',
  'view-ecommerce-order-status': 'Order Status',
  'view-ecommerce-return-refund': 'Returns & Refunds',
  'view-ecommerce-shipping': 'Shipping Zones',
  'view-ecommerce-customers': 'Customer List',
  'view-ecommerce-customer-groups': 'Customer Groups',
  'view-ecommerce-wishlist': 'Wishlist Insights',
  'view-ecommerce-sales-conversion': 'Sales & Conversion',
  'view-ecommerce-traffic': 'Traffic & Search Terms',
  'view-ecommerce-top-products': 'Top Products',
  'view-ecommerce-email-template': 'Email Templates',
  'view-ecommerce-tracking-code': 'Tracking Codes (GA/FB Pixel)',
  'view-ecommerce-chat-support': 'Chat / Support Widget',
};

// Group permissions by sidebar section for better UX
const permissionGroups = [
  {
    title: 'Storefront Settings',
    permissions: [
      'view-ecommerce-store-setting',
      'view-ecommerce-locale-currency',
      'view-ecommerce-seo-meta',
      'view-ecommerce-payment-method',
      'view-ecommerce-shipping-delivery',
    ],
  },
  {
    title: 'Branding',
    permissions: [
      'view-ecommerce-theme',
      'view-ecommerce-logo-favicon',
      'view-ecommerce-header-info',
      'view-ecommerce-mega-menu',
      'view-ecommerce-navigation-menu',
      'view-ecommerce-footer-builder',
    ],
  },
  {
    title: 'Homepage',
    permissions: [
      'view-ecommerce-hero-slider',
      'view-ecommerce-top-offer',
      'view-ecommerce-flash-sale',
    ],
  },
  {
    title: 'Product Display',
    permissions: [
      'view-ecommerce-brands',
      'view-ecommerce-categories',
      'view-ecommerce-category-content',
      'view-ecommerce-display-rules',
      'view-ecommerce-product-rules',
      'view-ecommerce-product-media',
    ],
  },
  {
    title: 'Content & Pages',
    permissions: [
      'view-ecommerce-static-pages',
      'view-ecommerce-blog',
    ],
  },
  {
    title: 'Promo & Coupons',
    permissions: [
      'view-ecommerce-coupons',
      'view-ecommerce-flashsale-campaign',
    ],
  },
  {
    title: 'Storefront Orders',
    permissions: [
      'view-ecommerce-orders',
      'view-ecommerce-order-status',
      'view-ecommerce-return-refund',
      'view-ecommerce-shipping',
    ],
  },
  {
    title: 'Store Customers',
    permissions: [
      'view-ecommerce-customers',
      'view-ecommerce-customer-groups',
      'view-ecommerce-wishlist',
    ],
  },
  {
    title: 'Storefront Analytics',
    permissions: [
      'view-ecommerce-sales-conversion',
      'view-ecommerce-traffic',
      'view-ecommerce-top-products',
    ],
  },
  {
    title: 'Notifications',
    permissions: [
      'view-ecommerce-email-template',
      'view-ecommerce-tracking-code',
      'view-ecommerce-chat-support',
    ],
  },
];

export default function EcommercePermissionsPage() {
  const router = useRouter();
  const { isTenantAdmin, isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const [users, setUsers] = useState<UserSelection[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [allPermissions, setAllPermissions] = useState<EcommercePermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [storefrontActive, setStorefrontActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Only show tenant_user type users — tenant_admin gets all ecommerce permissions automatically
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.user_type === 'tenant_user');
  }, [users]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Redirect if no permission
  useEffect(() => {
    if (!isHydrated) return;
    if (!isSuperAdmin && !isTenantAdmin) {
      router.replace('/access-denied');
    }
  }, [isHydrated, isSuperAdmin, isTenantAdmin, router]);

  const fetchUsers = async () => {
    try {
      const data = await ecommerceMenuPermissionService.getUsersForSelection();
      setUsers(data);
    } catch (error) {
      notify.error('Failed to load users');
    }
  };

  const loadUserPermissions = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await ecommerceMenuPermissionService.getPermissions(userId);
      setAllPermissions(data.all_permissions);
      setSelectedPermissions(new Set(data.assigned_permissions.map(p => p.name)));
      setStorefrontActive(data.storefront_active);
    } catch (error) {
      notify.error('Failed to load ecommerce permissions');
      setSelectedPermissions(new Set());
      setAllPermissions([]);
      setStorefrontActive(false);
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
      setAllPermissions([]);
      setStorefrontActive(false);
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

  const toggleGroupPermissions = (groupPermissions: string[], checked: boolean) => {
    const newPermissions = new Set(selectedPermissions);
    groupPermissions.forEach(perm => {
      if (checked) {
        newPermissions.add(perm);
      } else {
        newPermissions.delete(perm);
      }
    });
    setSelectedPermissions(newPermissions);
  };

  const isGroupFullyChecked = (groupPermissions: string[]): boolean => {
    return groupPermissions.every(p => selectedPermissions.has(p));
  };

  const isGroupPartiallyChecked = (groupPermissions: string[]): boolean => {
    const checked = groupPermissions.filter(p => selectedPermissions.has(p)).length;
    return checked > 0 && checked < groupPermissions.length;
  };

  const toggleAllPermissions = (checked: boolean) => {
    if (checked) {
      setSelectedPermissions(new Set(allPermissions.map(p => p.name)));
    } else {
      setSelectedPermissions(new Set());
    }
  };

  const isAllChecked = allPermissions.length > 0 && allPermissions.every(p => selectedPermissions.has(p.name));

  const isAllPartiallyChecked = useMemo(() => {
    const checked = allPermissions.filter(p => selectedPermissions.has(p.name)).length;
    return checked > 0 && checked < allPermissions.length;
  }, [allPermissions, selectedPermissions]);

  const handleSavePermissions = async () => {
    setFormErrors({});

    if (!selectedUserId) {
      setFormErrors({ user: 'Please select a user' });
      notify.error('Please select a user');
      return;
    }

    setSaving(true);
    try {
      await ecommerceMenuPermissionService.assignPermissions(
        selectedUserId,
        Array.from(selectedPermissions)
      );
      notify.success('Ecommerce permissions updated successfully');
    } catch (error) {
      notify.error('Failed to update ecommerce permissions');
    } finally {
      setSaving(false);
    }
  };

  const formatPermissionName = (name: string): string => {
    return permissionLabels[name] || name.replace('view-ecommerce-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return permissionGroups;

    const query = searchQuery.toLowerCase();
    return permissionGroups
      .map(group => ({
        ...group,
        permissions: group.permissions.filter(p =>
          formatPermissionName(p).toLowerCase().includes(query) ||
          p.toLowerCase().includes(query)
        ),
      }))
      .filter(group => group.permissions.length > 0);
  }, [searchQuery]);

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Ecommerce Menu Permissions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Control which ecommerce pages each user can access
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* User Selection */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select User *
            </label>
            <CustomSelect
              value={
                filteredUsers.find(user => user.id === selectedUserId)
                  ? {
                    value: filteredUsers.find(user => user.id === selectedUserId)!.id,
                    label: `${filteredUsers.find(user => user.id === selectedUserId)!.name} (${filteredUsers.find(user => user.id === selectedUserId)!.user_type})`,
                  }
                  : null
              }
              onChange={option => handleUserChange(option?.value || '')}
              options={filteredUsers.map(user => ({
                value: user.id,
                label: `${user.name} (${user.user_type})`,
              }))}
              placeholder="Select a user"
              isInvalid={!!formErrors.user}
            />
            {formErrors.user && <p className="text-red-600 text-xs mt-1">{formErrors.user}</p>}
          </div>

          {/* Search */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Pages
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by page name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 h-8"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Actions
            </label>
            <button
              onClick={() => {
                setSearchQuery('');
                setFormErrors({});
              }}
              className="w-full px-3 py-1.5 h-8 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Content */}
      {selectedUserId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading ecommerce permissions...
            </div>
          ) : !storefrontActive ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
              <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                Storefront is not active
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                The storefront must be active for this tenant to manage ecommerce permissions.
              </p>
            </div>
          ) : allPermissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No ecommerce permissions found. Please run the migration first.
            </div>
          ) : (
            <div className="p-4">
              {/* Select All Toggle */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                    Ecommerce Management
                  </span>
                  <span className="text-xs text-indigo-500 dark:text-indigo-400">
                    ({selectedPermissions.size} of {allPermissions.length} selected)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Select All</span>
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    ref={el => {
                      if (el) el.indeterminate = isAllPartiallyChecked;
                    }}
                    onChange={e => toggleAllPermissions(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Permission Groups as Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map(group => {
                  const groupPerms = group.permissions.filter(p => allPermissions.some(ap => ap.name === p));
                  if (groupPerms.length === 0) return null;

                  return (
                    <div
                      key={group.title}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {group.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {groupPerms.filter(p => selectedPermissions.has(p)).length}/{groupPerms.length}
                          </span>
                          <input
                            type="checkbox"
                            checked={isGroupFullyChecked(groupPerms)}
                            ref={el => {
                              if (el) el.indeterminate = isGroupPartiallyChecked(groupPerms);
                            }}
                            onChange={e => toggleGroupPermissions(groupPerms, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Permission Items */}
                      <div className="space-y-2">
                        {groupPerms.map(permName => (
                          <label
                            key={permName}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                          >
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(permName)}
                                onChange={() => togglePermission(permName)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                              />
                              {selectedPermissions.has(permName) && (
                                <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5 pointer-events-none" />
                              )}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {formatPermissionName(permName)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Please select a user to manage ecommerce permissions
          </p>
        </div>
      )}

      {/* Save Button */}
      {selectedUserId && storefrontActive && allPermissions.length > 0 && (isSuperAdmin || isTenantAdmin || hasPermission('create-user-permission')) && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-1.5 border border-transparent text-sm font-medium rounded-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Spinner size="sm" tone="white" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <GiSave className="w-4 h-4" />
                Update Ecommerce Permissions
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
