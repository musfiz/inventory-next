'use client';

import {
  ShoppingCart, Truck, FileText, Package, Users, Ticket,
  ClipboardList, ListTodo, Building2, Zap, Receipt, Boxes,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

interface QuickAction {
  label: string;
  href: string;
  icon: typeof ShoppingCart;
  color: string;
  bgColor: string;
  /** Regular permission required (operational links) */
  permission?: string;
  /** Ecommerce permission required (storefront links) */
  ecommercePermission?: string;
}

// Ecommerce links — tenant_user sees only the ones matching their
// view-ecommerce-* permissions; tenant_admin sees all (storefront active).
const ECOMMERCE_ACTIONS: QuickAction[] = [
  { label: 'Ecommerce Orders', href: '/ecommerce/orders', icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30', ecommercePermission: 'view-ecommerce-orders' },
  { label: 'Categories', href: '/ecommerce/products/categories', icon: ListTodo, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30', ecommercePermission: 'view-ecommerce-categories' },
  { label: 'Brands', href: '/ecommerce/products/brands', icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30', ecommercePermission: 'view-ecommerce-brands' },
  { label: 'Coupons', href: '/ecommerce/promotions/coupons', icon: Ticket, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/30', ecommercePermission: 'view-ecommerce-coupons' },
  { label: 'Customers', href: '/ecommerce/customers', icon: Users, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/30', ecommercePermission: 'view-ecommerce-customers' },
  { label: 'Flash Campaigns', href: '/ecommerce/promotions/campaigns', icon: Zap, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', ecommercePermission: 'view-ecommerce-flashsale-campaign' },
];

// Important operational links — shown permission-wise (tenant_admin, super_admin).
const OPERATIONAL_ACTIONS: QuickAction[] = [
  { label: 'New POS Sale', href: '/pos-sales', icon: Receipt, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30', permission: 'create-pos-sales' },
  { label: 'Products', href: '/products', icon: Package, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30', permission: 'view-product' },
  { label: 'Add Stock', href: '/stock/add', icon: Boxes, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', permission: 'create-stock' },
  { label: 'Sales Orders', href: '/sales-orders', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30', permission: 'view-sales-order' },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: Truck, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/30', permission: 'view-purchase-order' },
  { label: "Today's Report", href: '/reports/pos/daily-sales', icon: BarChart3, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/30', permission: 'view-pos-daily-sales-report' },
];

export default function QuickActions() {
  const { isSuperAdmin, isTenantAdmin, isTenantUser, hasPermission, storefrontActive, isHydrated } =
    usePermissions();

  if (!isHydrated) return null;

  let actions: QuickAction[] = [];

  if (isTenantUser) {
    // Tenant user: ecommerce links only, each gated by its view-ecommerce-* permission
    if (!storefrontActive) return null;
    actions = ECOMMERCE_ACTIONS.filter(
      a => !a.ecommercePermission || hasPermission(a.ecommercePermission)
    );
  } else if (isTenantAdmin) {
    // Tenant admin: all ecommerce links + permission-wise important pages
    const ecommerce = storefrontActive ? ECOMMERCE_ACTIONS : [];
    const operational = OPERATIONAL_ACTIONS.filter(
      a => !a.permission || hasPermission(a.permission)
    );
    actions = [...ecommerce, ...operational];
  } else if (isSuperAdmin) {
    // Super admin: full operational set (hasPermission is always true)
    actions = OPERATIONAL_ACTIONS;
  }

  if (actions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {actions.map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
              <action.icon className={`w-4 h-4 ${action.color}`} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
