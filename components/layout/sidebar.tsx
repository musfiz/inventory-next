'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  Users,
  Settings,
  List,
  UserPlus,
  Shield,
  ChevronDown,
  Image,
  Building2,
  Package,
  Tag,
  Key,
  UserLock,
  ListTodo,
  Barcode,
  Warehouse,
  CirclePile,
  CircleDollarSign,
  ListMinus,
  Container,
  LayersPlus,
  SquarePlus,
  FileText,
  FileSpreadsheet,
  History,
  Scale,
  Landmark,
} from 'lucide-react';
import { MdOutlineAssignmentReturn, MdOutlinePointOfSale, MdOutlinePostAdd, MdPayment, MdSupervisedUserCircle } from 'react-icons/md';
import { BsFilePost, BsReceiptCutoff } from 'react-icons/bs';
import { LiaFileInvoiceDollarSolid } from 'react-icons/lia';
import { PiUserListDuotone } from 'react-icons/pi';
import { VscEditSession } from "react-icons/vsc";
import { TbCreditCardRefund } from "react-icons/tb";
import { AiOutlineProduct } from "react-icons/ai";

interface SidebarProps {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
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
    ],
  },
  {
    name: 'User Management',
    icon: Users,
    permission: 'view-user',
    children: [
      { name: 'All Users', href: '/users', icon: List, permissions: ['view-user', 'create-user', 'edit-user', 'delete-user'] }
    ],
  },
  {
    name: 'Permission Management',
    icon: UserLock,
    permission: 'view-user-permission',
    children: [
      { name: 'All Permissions', href: '/permissions', icon: Key, superAdminOnly: true },
      { name: 'User Permissions', href: '/user-permissions', icon: Shield, permissions: ['view-user-permission', 'create-user-permission'] },
    ],
  },
  {
    name: 'Product Management',
    icon: AiOutlineProduct,
    permissions: ['view-product', 'view-product-variation', 'view-product-barcode', 'view-product-image'],
    children: [
      { name: 'Products', href: '/products', icon: List, permission: 'view-product' },
      { name: 'Add Product', href: '/products/add', icon: UserPlus, permission: 'create-product' },
      {
        name: 'Product Variations',
        href: '/product-variations',
        icon: Tag,
        permission: 'view-product-variation',
      },
      {
        name: 'Add Product Variation',
        href: '/product-variations/add',
        icon: UserPlus,
        permission: 'create-product-variation',
      },
      {
        name: 'Product Barcodes',
        href: '/product-barcodes',
        icon: Barcode,
        permission: 'view-product-barcode',
      },
      {
        name: 'Product Image',
        href: '/products/images',
        icon: Image,
        permission: 'view-product-image',
      },
    ],
  },
  {
    name: 'Stock Management',
    icon: CirclePile,
    permissions: ['view-stock', 'create-stock', 'view-stock-movement', 'view-warehouse', 'view-bin'],
    children: [
      { name: 'Stock', href: '/stock', icon: List, permission: 'view-stock' },
      { name: 'Add Stock', href: '/stock/add', icon: LayersPlus, permission: 'create-stock' },
      { name: 'Stock Movement', href: '/stock/movement', icon: History, permission: 'view-stock-movement' },
      { name: 'Warehouse', href: '/warehouse', icon: Warehouse, permission: 'view-warehouse' },
      { name: 'Bins', href: '/bins', icon: Container, permission: 'view-bin' },
    ],
  },
  {
    name: 'Purchase Management',
    icon: ListMinus,
    permissions: ['view-supplier', 'view-purchase-order', 'create-purchase-order', 'view-purchase-order-return'],
    children: [
      {
        name: 'Supplier List',
        href: '/suppliers',
        icon: PiUserListDuotone,
        permission: 'view-supplier'
      },
      {
        name: 'Purchase Orders',
        href: '/purchase-orders',
        icon: LiaFileInvoiceDollarSolid,
        permission: 'view-purchase-order',
      },
      {
        name: 'Add Purchase Orders',
        href: '/purchase-orders/add',
        icon: SquarePlus,
        permission: 'create-purchase-order',
      },
      {
        name: 'Purchase Orders Return',
        href: '/purchase-order-return',
        icon: MdOutlineAssignmentReturn,
        permission: 'view-purchase-order-return',
      },
    ],
  },
  {
    name: 'Sales Management',
    icon: CircleDollarSign,
    permissions: ['view-customer', 'view-sales', 'create-sales', 'view-sales-return', 'view-payment'],
    children: [
      { name: 'Customer', href: '/customers', icon: MdSupervisedUserCircle, permission: 'view-customer' },
      { name: 'Sales Orders', href: '/sales-orders', icon: BsReceiptCutoff, permission: 'view-sales' },
      { name: 'Add Sales Order', href: '/sales-orders/add', icon: MdOutlinePostAdd, permission: 'create-sales' },
      { name: 'Sales Return', href: '/sales-return', icon: MdOutlineAssignmentReturn, permission: 'view-sales-return' },
      { name: 'Payments List', href: '/payments', icon: MdPayment, permission: 'view-payment' },
    ],
  },
  {
    name: 'POS Management',
    icon: BsFilePost,
    permissions: ['view-pos-register', 'view-pos-session', 'create-pos-sales', 'view-pos-sales', 'view-pos-refund'],
    children: [
      { name: 'POS Register', href: '/pos-registers', icon: MdOutlinePostAdd, permission: 'view-pos-register' },
      { name: 'POS Session', href: '/pos-session', icon: VscEditSession, permission: 'view-pos-session' },
      { name: 'POS Sales', href: '/pos-sales', icon: MdOutlinePointOfSale, permission: 'create-pos-sales' },
      { name: 'POS Orders', href: '/pos-orders', icon: BsReceiptCutoff, permission: 'view-pos-sales' },
      { name: 'POS Refund', href: '/pos-refunds', icon: TbCreditCardRefund, permission: 'view-pos-refund' },
    ],
  },
  {
    name: 'Accounting Management',
    icon: FileSpreadsheet,
    permissions: ['view-accounts', 'view-expenses', 'view-journal-entries', 'view-accounts', 'view-trail-balance', 'view-balance-sheet', 'view-profit-loss', 'view-cash-flow'],
    children: [
      { name: 'Chart of Accounts', href: '/accounts', icon: LayersPlus, permission: 'view-accounts' },
      { name: 'Expenses', href: '/expenses', icon: FileText, permission: 'view-expenses' },
      { name: 'Journal Entries', href: '/journal-entries', icon: History, permission: 'view-journal-entries' },
      { name: 'Account Ledger', href: '/reports/ledger', icon: FileSpreadsheet, permission: 'view-accounts' },
      { name: 'Trial Balance', href: '/reports/trial-balance', icon: Scale, permission: 'view-trail-balance' },
      { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: Landmark, permission: 'view-balance-sheet' },
      { name: 'Profit & Loss', href: '/reports/profit-loss', icon: FileText, permission: 'view-profit-loss' },
      { name: 'Cash Flow', href: '/reports/cash-flow', icon: FileText, permission: 'view-cash-flow' },
    ],
  },
  {
    name: 'Report Management',
    icon: FileText,
    // permissions: [],
    children: [
      { name: 'Purchase Report', href: '/reports/purchase-list', icon: FileSpreadsheet, permission: 'view-purchase-report' },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    superAdminOnly: true,
    children: [
      { name: 'Brands', href: '/brands', icon: Building2, superAdminOnly: true },
      { name: 'Units', href: '/units', icon: Package, superAdminOnly: true },
      { name: 'Modules', href: '/modules', icon: LayersPlus, superAdminOnly: true },
      { name: 'Categories', href: '/categories', icon: ListTodo, superAdminOnly: true },
      {
        name: 'Attributes',
        icon: Tag,
        superAdminOnly: true,
        children: [
          { name: 'Attribute List', href: '/attributes', icon: List },
          { name: 'Attribute Values', href: '/attributes/values', icon: Tag },
        ],
      },
    ],
  },
];

function NavItem({
  item,
  sidebarOpen,
  pathname,
  setMobileMenuOpen,
  depth = 0,
  isLast = false,
  itemPath = '',
  openItems,
  setOpenItems,
}: {
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
          <div
            className={`absolute left-0 top-0 w-px bg-gray-300 dark:bg-gray-600 ${isLast ? 'h-5' : 'h-full'}`}
          />
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
          <span className={`${!sidebarOpen && 'hidden'} transition-opacity duration-300`}>
            {item.name}
          </span>
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
            <span
              className={`${!sidebarOpen && 'hidden'} transition-opacity duration-300 flex-1 text-left`}
            >
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
    return items
      .map(item => {
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
      })
      .filter(Boolean) as NavigationItem[];
  };

  // Filter navigation based on permissions
  const filteredNavigation = useMemo(() => {
    return filterNavigationRecursive(navigation);
  }, [hasPermission, hasAnyPermission, isSuperAdmin]);

  // Helper function to find all parent paths for a given pathname
  const findParentPaths = (
    items: NavigationItem[],
    currentPath: string,
    parentPath = ''
  ): string[] => {
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
                <h1 className="font-bold text-gray-900 dark:text-gray-100 text-2xl leading-tight">
                  Admin Panel
                </h1>
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
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Menu
              </p>
            </div>
          )}
          <div className="space-y-0">
            {filteredNavigation.map(item => (
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
