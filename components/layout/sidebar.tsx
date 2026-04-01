'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  Users,
  Settings,
  TrendingUp,
  List,
  UserPlus,
  Shield,
  Bell,
  ChevronDown,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Building2,
  Package,
  Tag,
  Key,
  LucideIcon,
  UserLock,
  ListTodo,
  Package2,
  Barcode,
  Warehouse,
  ShoppingCart,
  DollarSign,
  CirclePile,
  CircleDollarSign,
  ListMinus
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  children?: NavigationItem[];
  permission?: string;
  permissions?: string[];
  superAdminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Tenant Management',
    icon: Building2,
    superAdminOnly: true,
    children: [
      { name: 'Tenant List', href: '/tenants', icon: List },
      { name: 'Tenant Registration', href: '/tenants/register', icon: UserPlus },
    ]
  },
  {
    name: 'User Management',
    icon: Users,
    permission: 'view-users',
    children: [
      { name: 'All Users', href: '/users', icon: List, permission: 'view-users' },
      { name: 'Add User', href: '/users/add', icon: UserPlus, permission: 'create-users' },
    ]
  },
  {
    name: 'Permission Management',
    icon: UserLock,
    permission: 'create-user-permission',
    children: [
      { name: 'All Permissions', href: '/permissions', icon: Key, superAdminOnly: true },
      { name: 'User Permissions', href: '/user-permissions', icon: Shield },
    ]
  },
  {
    name: 'Product Management',
    icon: Package2,
    permission: 'view-products',
    children: [
      { name: 'Products', href: '/products', icon: List, permission: 'view-products' },
      { name: 'Add Product', href: '/products/add', icon: UserPlus, permission: 'create-products' },
      { name: 'Product Variations', href: '/product-variations', icon: Tag, permission: 'view-product-variations' },
      { name: 'Add Product Variation', href: '/product-variations/add', icon: UserPlus, permission: 'create-product-variations' },
      { name: 'Product Barcodes', href: '/product-barcodes', icon: Barcode, permission: 'view-products' },
      { name: 'Product Image', href: '/products/images', icon: Image, permission: 'view-product-images' },
    ]
  },
  {
    name: 'Stock Management',
    icon: CirclePile,
    permission: 'view-stocks',
    children: [
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse, permission: 'view-warehouses' },
    ]
  },
  {
    name: 'Purchase Management',
    icon: ListMinus,
    permission: 'view-purchases',
    children: [
      { name: 'Product Purchase', href: '/purchases', icon: ShoppingCart, permission: 'view-purchases' },
    ]
  },
  {
    name: 'Sales Management',
    icon: CircleDollarSign,
    permission: 'view-sales',
    children: [
      { name: 'POS Sale', href: '/pos-sales', icon: DollarSign, permission: 'view-pos-sales' },
    ]
  },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Brands', href: '/brands', icon: Building2, superAdminOnly: true },
      { name: 'Units', href: '/units', icon: Package, superAdminOnly: true },
      { name: 'Categories', href: '/categories', icon: ListTodo, superAdminOnly: true },
      {
        name: 'Attributes',
        icon: Tag,
        superAdminOnly: true,
        children: [
          { name: 'Attribute List', href: '/attributes', icon: List },
          { name: 'Attribute Values', href: '/attributes/values', icon: Tag },
        ]
      }
    ]
  },
];

function NavItem({ item, sidebarOpen, pathname, setMobileMenuOpen, depth = 0, isLast = false, itemPath = '', openItems, setOpenItems }: {
  item: NavigationItem;
  sidebarOpen: boolean;
  pathname: string;
  setMobileMenuOpen: (open: boolean) => void;
  depth?: number;
  isLast?: boolean;
  itemPath?: string;
  openItems: Set<string>;
  setOpenItems: (items: Set<string>) => void;
}) {
  const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();

  // Check if user has permission for this item
  const hasAccess = () => {
    // Check super admin only access first
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }

    if (item.permission) {
      return hasPermission(item.permission);
    }
    if (item.permissions) {
      return hasAnyPermission(item.permissions);
    }
    return true; // No permission required
  };

  // Don't render if no access
  if (!hasAccess()) {
    return null;
  }

  const currentPath = itemPath ? `${itemPath}.${item.name}` : item.name;
  const isOpen = openItems.has(currentPath);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href === pathname;
  const isParentActive = item.children?.some(child => child.href === pathname);

  const handleClick = () => {
    if (hasChildren) {
      const newOpenItems = new Set(openItems);

      if (isOpen) {
        // Close this item and all its children
        const itemsToRemove = Array.from(openItems).filter(path => path.startsWith(currentPath));
        itemsToRemove.forEach(path => newOpenItems.delete(path));
      } else {
        // Close siblings at the same level
        const pathParts = currentPath.split('.');
        const parentPath = pathParts.slice(0, -1).join('.');

        Array.from(openItems).forEach(path => {
          const parts = path.split('.');
          const pathParent = parts.slice(0, -1).join('.');
          if (pathParent === parentPath) {
            newOpenItems.delete(path);
          }
        });

        // Open this item
        newOpenItems.add(currentPath);
      }

      setOpenItems(newOpenItems);
    } else if (item.href) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Tree connection lines */}
      {depth > 0 && sidebarOpen && (
        <>
          {/* Vertical line */}
          <div className={`absolute left-0 top-0 w-px bg-gray-300 dark:bg-gray-600 ${isLast ? 'h-5' : 'h-full'}`} />
          {/* Horizontal line */}
          <div className="absolute left-0 top-5 w-4 h-px bg-gray-300 dark:bg-gray-600" />
        </>
      )}

      {item.href && !hasChildren ? (
        <Link
          href={item.href}
          onClick={() => {
            setMobileMenuOpen(false);
            setOpenItems(new Set());
          }}
          className={`
            relative group flex items-center px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer
            ${depth > 0 && sidebarOpen ? 'ml-4' : ''}
            ${isActive
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }
          `}
          title={!sidebarOpen ? item.name : undefined}
        >
          <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
          <span className={`${!sidebarOpen && 'hidden'} transition-opacity duration-300`}>{item.name}</span>
        </Link>
      ) : (
        <>
          <button
            onClick={handleClick}
            className={`
              relative group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer
              ${depth > 0 && sidebarOpen ? 'ml-4 w-[calc(100%-1rem)]' : 'w-full'}
              ${isParentActive
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
            title={!sidebarOpen ? item.name : undefined}
          >
            <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
            <span className={`${!sidebarOpen && 'hidden'} transition-opacity duration-300 flex-1 text-left`}>
              {item.name}
            </span>
            {sidebarOpen && hasChildren && (
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>
          {hasChildren && isOpen && sidebarOpen && (
            <div className="relative mt-1 ml-4 space-y-1">
              {item.children!.map((child, index) => (
                <NavItem
                  key={child.name}
                  item={child}
                  sidebarOpen={sidebarOpen}
                  pathname={pathname}
                  setMobileMenuOpen={setMobileMenuOpen}
                  depth={depth + 1}
                  isLast={index === item.children!.length - 1}
                  itemPath={currentPath}
                  openItems={openItems}
                  setOpenItems={setOpenItems}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Sidebar({ sidebarOpen, mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();

  // Recursive function to filter navigation based on permissions
  const filterNavigationRecursive = (items: NavigationItem[]): NavigationItem[] => {
    return items.map(item => {
      const clonedItem = { ...item };

      // Check super admin only access
      if (clonedItem.superAdminOnly && !isSuperAdmin) {
        return null;
      }

      // Filter children recursively first
      if (clonedItem.children) {
        clonedItem.children = filterNavigationRecursive(clonedItem.children);

        // If no accessible children, check if parent has direct access
        if (clonedItem.children.length === 0) {
          // Only show parent if it has its own permission that user has
          if (clonedItem.permission && !hasPermission(clonedItem.permission)) {
            return null;
          }
          if (clonedItem.permissions && !hasAnyPermission(clonedItem.permissions)) {
            return null;
          }
          // If parent has no permission requirement and no children, hide it
          if (!clonedItem.permission && !clonedItem.permissions) {
            return null;
          }
        }
      } else {
        // Leaf node - check permission
        if (clonedItem.permission && !hasPermission(clonedItem.permission)) {
          return null;
        }
        if (clonedItem.permissions && !hasAnyPermission(clonedItem.permissions)) {
          return null;
        }
      }

      return clonedItem;
    }).filter(Boolean) as NavigationItem[];
  };

  // Filter navigation based on permissions
  const filteredNavigation = useMemo(() => {
    return filterNavigationRecursive(navigation);
  }, [hasPermission, hasAnyPermission, isSuperAdmin]);

  // Helper function to find all parent paths for a given pathname
  const findParentPaths = (items: NavigationItem[], currentPath: string, parentPath = ''): string[] => {
    const paths: string[] = [];

    for (const item of items) {
      const itemPath = parentPath ? `${parentPath}.${item.name}` : item.name;

      if (item.href === currentPath) {
        // Found the active item, return all parent paths
        return parentPath ? [parentPath] : [];
      }

      if (item.children) {
        const childPaths = findParentPaths(item.children, currentPath, itemPath);
        if (childPaths.length > 0 || item.children.some(child => child.href === currentPath)) {
          paths.push(itemPath);
          paths.push(...childPaths);
        }
      }
    }

    return paths;
  };

  // Open parent menus based on current pathname on mount and pathname change
  useEffect(() => {
    const parentPaths = findParentPaths(filteredNavigation, pathname);
    if (parentPaths.length > 0) {
      setOpenItems(new Set(parentPaths));
    }
  }, [pathname, filteredNavigation]);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          lg:bg-white lg:dark:bg-gray-800 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700
          ${sidebarOpen ? 'w-70' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                AP
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-gray-100 text-2xl leading-tight">Admin Panel</h1>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md mx-auto">
              AP
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto scrollbar-hide">
          {sidebarOpen && (
            <div className="px-3 mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Menu</p>
            </div>
          )}
          <div className="space-y-0">
            {filteredNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                sidebarOpen={sidebarOpen}
                pathname={pathname}
                setMobileMenuOpen={setMobileMenuOpen}
                openItems={openItems}
                setOpenItems={setOpenItems}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
