'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  LayoutList,
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
  Star,
  Search,
  FileText,
  FileSpreadsheet,
  History,
  Scale,
  Landmark,
  Boxes,
  TrendingUp,
  Truck,
  ScrollText,
  AlertTriangle,
  Receipt,
  BarChart3,
  Percent,
  CalendarClock,
  PackageCheck,
  Coins,
  ClipboardList,
  FileBarChart,
  PieChart,
  Archive,
  SlidersVertical,
  Megaphone,
  Timer,
  Palette,
  PanelBottom,
  Globe,
  ClipboardCheck,
  RotateCcw,
  Heart,
  Mail,
  Code2,
  MessageSquare,
  Ticket,
  Power,
  Menu as MenuIcon,
  ShoppingCart,
} from 'lucide-react';
import { MdOutlineAssignmentReturn, MdOutlinePointOfSale, MdOutlinePostAdd, MdPayment, MdSupervisedUserCircle } from 'react-icons/md';
import { BsDatabaseFillDown, BsDatabaseFillGear, BsDatabaseFillUp, BsFilePost, BsReceiptCutoff } from 'react-icons/bs';
import { LiaFileInvoiceDollarSolid } from 'react-icons/lia';
import { PiUserListDuotone } from 'react-icons/pi';
import { VscEditSession } from "react-icons/vsc";
import { TbCreditCardRefund } from "react-icons/tb";
import { AiOutlineProduct } from "react-icons/ai";
import { GiShop } from "react-icons/gi";

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
  storefrontRequired?: boolean;
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
      { name: 'Ecommerce Permissions', href: '/user-permissions/ecommerce', icon: ShoppingCart, permissions: ['view-user-permission', 'create-user-permission'] },
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
        name: 'Bulk Add Variations',
        href: '/product-variations/bulk-add',
        icon: LayersPlus,
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
      { name: 'Sales Orders', href: '/sales-orders', icon: BsReceiptCutoff, permission: 'view-sales-order' },
      { name: 'Add Sales Order', href: '/sales-orders/add', icon: MdOutlinePostAdd, permission: 'create-sales-order' },
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
    ],
  },
  {
    name: 'Ecommerce Management',
    icon: GiShop,
    storefrontRequired: true,
    children: [
      {
        name: 'Storefront Settings',
        icon: Settings,
        children: [
          { name: 'Store Settings', href: '/ecommerce/settings/status', icon: Power },
          { name: 'Locale & Currency', href: '/ecommerce/settings/localization', icon: Globe },
          { name: 'SEO & Meta Defaults', href: '/ecommerce/settings/seo', icon: Search },
          { name: 'Payment Methods', href: '/ecommerce/settings/payments', icon: MdPayment },
          { name: 'Shipping & Delivery', href: '/ecommerce/settings/shipping', icon: Truck },
        ],
      },
      {
        name: 'Branding',
        icon: LayoutTemplate,
        children: [
          { name: 'Theme & Colors', href: '/ecommerce/appearance/theme', icon: Palette },
          { name: 'Logo & Favicon', href: '/ecommerce/appearance/logo', icon: Image },
          { name: 'Header & Info ', href: '/ecommerce/appearance/header-menu', icon: MenuIcon },
          { name: 'Mega Menu', href: '/ecommerce/appearance/mega-menu', icon: LayoutGrid },
          { name: 'Navigation Menu', href: '/ecommerce/appearance/storefront-navigation', icon: LayoutList },
          { name: 'Footer Builder', href: '/ecommerce/appearance/footer', icon: PanelBottom },
        ],
      },
      {
        name: 'Homepage',
        icon: LayoutDashboard,
        children: [
          { name: 'Hero Slider', href: '/ecommerce/homepage/hero-slider', icon: SlidersVertical },
          { name: 'Top Offer', href: '/ecommerce/homepage/banners', icon: Megaphone },
          { name: 'Flash Sale', href: '/ecommerce/homepage/flash-sale', icon: Timer },
        ],
      },
      {
        name: 'Product Display',
        icon: Package,
        children: [
          { name: 'Display Rules', href: '/ecommerce/products/display', icon: List },
          { name: 'Product Rules', href: '/ecommerce/products/flags', icon: Tag },
          { name: 'Category Page', href: '/ecommerce/products/category-content', icon: FileText },
          { name: 'Product Media', href: '/ecommerce/products/product-media', icon: Image },
          // { name: 'Related / Cross-sell / Up-sell', href: '/ecommerce/products/relations', icon: GitBranch },
        ],
      },
      {
        name: 'Content & Pages',
        icon: BsFilePost,
        children: [
          { name: 'Static Pages (CMS)', href: '/ecommerce/content/pages', icon: FileText },
          // { name: 'Announcement Bar', href: '/ecommerce/content/announcement', icon: MessageSquareText },
          { name: 'Blog / News', href: '/ecommerce/content/blog', icon: MdOutlinePostAdd },
          // { name: 'Media Library', href: '/ecommerce/content/media', icon: Images },
        ],
      },
      {
        name: 'Promo & Coupons',
        icon: Percent,
        children: [
          { name: 'Coupons', href: '/ecommerce/promotions/coupons', icon: Ticket },
          { name: 'Flash Sale Campaigns', href: '/ecommerce/promotions/campaigns', icon: Timer },
          // { name: 'Customer Group Pricing', href: '/ecommerce/promotions/group-pricing', icon: Users },
        ],
      },
      {
        name: 'Storefront Orders',
        icon: MdOutlinePointOfSale,
        children: [
          { name: 'All Orders', href: '/ecommerce/orders', icon: ClipboardList },
          { name: 'Order Status', href: '/ecommerce/orders/status', icon: ListTodo },
          { name: 'Returns & Refunds', href: '/ecommerce/orders/returns', icon: RotateCcw },
          { name: 'Shipping', href: '/ecommerce/orders/shipping-zones', icon: Truck },
        ],
      },
      {
        name: 'Store Customers',
        icon: Users,
        children: [
          { name: 'Customer List', href: '/ecommerce/customers', icon: Users },
          { name: 'Customer Groups', href: '/ecommerce/customers/groups', icon: Users },
          { name: 'Wishlist Insights', href: '/ecommerce/customers/wishlist-insights', icon: Heart },
        ],
      },
      // {
      //   name: 'Reviews & Ratings',
      //   icon: Star,
      //   children: [
      //     { name: 'Moderation Queue', href: '/ecommerce/reviews/queue', icon: ClipboardCheck },
      //     { name: 'Review Settings', href: '/ecommerce/reviews/settings', icon: Settings },
      //   ],
      // },
      {
        name: 'Storefront Analytics',
        icon: BarChart3,
        children: [
          { name: 'Sales & Conversion', href: '/ecommerce/analytics/sales', icon: TrendingUp },
          { name: 'Traffic & Search Terms', href: '/ecommerce/analytics/traffic', icon: Search },
          { name: 'Top Products', href: '/ecommerce/analytics/top-products', icon: PieChart },
        ],
      },
      {
        name: 'Notifications',
        icon: MessageSquare,
        children: [
          { name: 'Email Templates', href: '/ecommerce/integrations/email-templates', icon: Mail },
          { name: 'Tracking Codes (GA/FB Pixel)', href: '/ecommerce/integrations/tracking', icon: Code2 },
          { name: 'Chat / Support Widget', href: '/ecommerce/integrations/support-widget', icon: MessageSquare },
        ],
      },
    ],
  },
  {
    name: 'Report Management',
    icon: FileText,
    children: [
      {
        name: 'Inventory Reports',
        icon: Boxes,
        permissions: ['view-stock-valuation-report', 'view-stock-aging-report', 'view-abc-analysis-report', 'view-dead-stock-report', 'view-stock-adjustment-report', 'view-reorder-report', 'view-stock-movement-report', 'view-batch-expiry-report', 'view-stock-status-report', 'view-low-stock-report', 'view-product-profitability-report'],
        children: [
          { name: 'Stock Valuation', href: '/reports/inventory/stock-valuation', icon: Coins, permission: 'view-stock-valuation-report' },
          { name: 'Stock Aging', href: '/reports/inventory/stock-aging', icon: CalendarClock, permission: 'view-stock-aging-report' },
          { name: 'ABC Analysis', href: '/reports/inventory/abc-analysis', icon: PieChart, permission: 'view-abc-analysis-report' },
          { name: 'Dead Stock', href: '/reports/inventory/dead-stock', icon: Archive, permission: 'view-dead-stock-report' },
          { name: 'Stock Adjustment', href: '/reports/inventory/stock-adjustment', icon: Scale, permission: 'view-stock-adjustment-report' },
          { name: 'Reorder / Low Stock', href: '/reports/inventory/reorder', icon: PackageCheck, permission: 'view-reorder-report' },
          { name: 'Stock Movement', href: '/reports/inventory/stock-movement', icon: History, permission: 'view-stock-movement-report' },
          { name: 'Batch & Expiry', href: '/reports/inventory/batch-expiry', icon: CalendarClock, permission: 'view-batch-expiry-report' },
          { name: 'Stock Status', href: '/reports/product/stock-status', icon: BarChart3, permission: 'view-stock-status-report' },
          { name: 'Product Profitability', href: '/reports/product/profitability', icon: BarChart3, permission: 'view-product-profitability-report' },
        ],
      },
      {
        name: 'Sales Reports',
        icon: TrendingUp,
        permissions: ['view-sales-by-product-report', 'view-sales-by-customer-report', 'view-sales-by-category-report', 'view-profit-margin-report', 'view-return-analysis-report', 'view-sales-trend-report', 'view-customer-aging-report'],
        children: [
          { name: 'Sales by Product', href: '/reports/sales/by-product', icon: BarChart3, permission: 'view-sales-by-product-report' },
          { name: 'Sales by Customer', href: '/reports/sales/by-customer', icon: TrendingUp, permission: 'view-sales-by-customer-report' },
          { name: 'Sales by Category', href: '/reports/sales/by-category', icon: BarChart3, permission: 'view-sales-by-category-report' },
          { name: 'Profit Margin', href: '/reports/sales/profit-margin', icon: Percent, permission: 'view-profit-margin-report' },
          { name: 'Return Analysis', href: '/reports/sales/return-analysis', icon: MdOutlineAssignmentReturn, permission: 'view-return-analysis-report' },
          { name: 'Sales Trend', href: '/reports/sales/sales-trend', icon: TrendingUp, permission: 'view-sales-trend-report' },
          { name: 'Customer Aging', href: '/reports/customer/aging', icon: CalendarClock, permission: 'view-customer-aging-report' },
          { name: 'Customer Profitability', href: '/reports/customer/profitability', icon: TrendingUp, permission: 'view-customer-profitability-report' },
        ],
      },
      {
        name: 'Purchase Reports',
        icon: ListMinus,
        permissions: ['view-po-summary-report', 'view-supplier-performance-report', 'view-purchase-by-supplier-report', 'view-grn-report', 'view-supplier-aging-report', 'view-supplier-statement', 'view-supplier-scorecard-report'],
        children: [
          { name: 'PO Summary', href: '/reports/purchase/po-summary', icon: FileBarChart, permission: 'view-po-summary-report' },
          { name: 'Supplier Performance', href: '/reports/purchase/supplier-performance', icon: Truck, permission: 'view-supplier-performance-report' },
          { name: 'Purchase by Supplier', href: '/reports/purchase/by-supplier', icon: Building2, permission: 'view-purchase-by-supplier-report' },
          { name: 'GRN Register', href: '/reports/purchase/grn-register', icon: Container, permission: 'view-grn-report' },
          { name: 'Supplier Aging', href: '/reports/supplier/aging', icon: CalendarClock, permission: 'view-supplier-aging-report' },
          { name: 'Supplier Statement', href: '/reports/supplier/statement', icon: FileText, permission: 'view-supplier-statement' },
          { name: 'Supplier Scorecard', href: '/reports/supplier/scorecard', icon: BarChart3, permission: 'view-supplier-scorecard-report' },
        ],
      },
      {
        name: 'POS Reports',
        icon: MdOutlinePointOfSale,
        permissions: ['view-pos-daily-sales-report', 'view-pos-session-report', 'view-cashier-performance-report', 'view-payment-breakdown-report', 'view-pos-refund-report'],
        children: [
          { name: 'Daily Sales', href: '/reports/pos/daily-sales', icon: BarChart3, permission: 'view-pos-daily-sales-report' },
          { name: 'Session Summary', href: '/reports/pos/session-summary', icon: FileText, permission: 'view-pos-session-report' },
          { name: 'Cashier Performance', href: '/reports/pos/cashier-performance', icon: Users, permission: 'view-cashier-performance-report' },
          { name: 'Payment Breakdown', href: '/reports/pos/payment-breakdown', icon: MdPayment, permission: 'view-payment-breakdown-report' },
          { name: 'Refund Summary', href: '/reports/pos/refund-summary', icon: TbCreditCardRefund, permission: 'view-pos-refund-report' },
        ],
      },
      {
        name: 'Accounting Reports',
        icon: FileSpreadsheet,
        permissions: ['view-ar-aging-report', 'view-ap-aging-report', 'view-failed-journal-report', 'view-tax-return-report', 'view-trail-balance', 'view-balance-sheet', 'view-profit-loss', 'view-cash-flow', 'view-accounts'],
        children: [
          { name: 'AR Aging', href: '/reports/accounting/ar-aging', icon: Coins, permission: 'view-ar-aging-report' },
          { name: 'AP Aging', href: '/reports/accounting/ap-aging', icon: Coins, permission: 'view-ap-aging-report' },
          { name: 'Failed Journal', href: '/reports/accounting/failed-journal', icon: AlertTriangle, permission: 'view-failed-journal-report' },
          { name: 'Tax Return', href: '/reports/tax/tax-return', icon: Receipt, permission: 'view-tax-return-report' },
          { name: 'Trial Balance', href: '/reports/trial-balance', icon: Scale, permission: 'view-trail-balance' },
          { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: Landmark, permission: 'view-balance-sheet' },
          { name: 'Profit & Loss', href: '/reports/profit-loss', icon: FileText, permission: 'view-profit-loss' },
          { name: 'Cash Flow', href: '/reports/cash-flow', icon: FileText, permission: 'view-cash-flow' },
          { name: 'Account Ledger', href: '/reports/ledger', icon: FileSpreadsheet, permission: 'view-accounts' },
        ],
      },
      {
        name: 'Warehouse Reports',
        icon: Warehouse,
        permissions: ['view-warehouse-stock-report', 'view-transfer-report'],
        children: [
          { name: 'Warehouse Stock', href: '/reports/warehouse/stock-summary', icon: Warehouse, permission: 'view-warehouse-stock-report' },
          { name: 'Stock Transfer', href: '/reports/warehouse/transfer', icon: Truck, permission: 'view-transfer-report' },
        ],
      },
      {
        name: 'System Reports',
        icon: ScrollText,
        permissions: ['view-audit-log-report', 'view-activity-log-report', 'view-alert-history-report'],
        children: [
          { name: 'Audit Log', href: '/reports/system/audit-log', icon: ScrollText, permission: 'view-audit-log-report' },
          { name: 'Activity Log', href: '/reports/system/activity-log', icon: ClipboardList, permission: 'view-activity-log-report' },
          { name: 'Alert History', href: '/reports/system/alert-history', icon: AlertTriangle, permission: 'view-alert-history-report' },
        ],
      },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    superAdminOnly: true,
    children: [
      { name: 'Business Types', href: '/business-types', icon: GiShop, superAdminOnly: true },
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
      {
        name: 'Database',
        icon: BsDatabaseFillGear,
        superAdminOnly: true,
        children: [
          { name: 'Backup', href: '/backup', icon: BsDatabaseFillDown, superAdminOnly: true },
          { name: 'Restore', href: '/restore', icon: BsDatabaseFillUp, superAdminOnly: true },
        ],
      },
    ],
  },
];

function NavItem({
  item,
  sidebarOpen,
  activeHref,
  setMobileMenuOpen,
  depth = 0,
  isLast = false,
  itemPath = '',
  openItems,
  setOpenItems,
}: {
  item: NavigationItem;
  sidebarOpen: boolean;
  activeHref: string | null;
  setMobileMenuOpen: (open: boolean) => void;
  depth?: number;
  isLast?: boolean;
  itemPath?: string;
  openItems: Set<string>;
  setOpenItems: (items: Set<string>) => void;
}) {
  const { hasPermission, hasAnyPermission, isSuperAdmin, isTenantAdmin, storefrontActive } = usePermissions();

  // Check if user has permission for this item
  const hasAccess = () => {
    // Check super admin only access first
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }

    // Check storefront required (Ecommerce Management)
    // Visible for super_admin always, or tenant_admin when storefront is active
    if (item.storefrontRequired && !isSuperAdmin && !(isTenantAdmin && storefrontActive)) {
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

  const isPathMatch = (href?: string) => {
    if (!href || !activeHref) return false;
    return activeHref === href;
  };

  const hasActiveDescendant = (node: NavigationItem): boolean => {
    if (!node.children || node.children.length === 0) {
      return false;
    }

    return node.children.some(
      child => isPathMatch(child.href) || hasActiveDescendant(child)
    );
  };

  const isActive = isPathMatch(item.href);
  const isParentActive = hasActiveDescendant(item);

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
    <div className="relative" data-active={isParentActive ? 'true' : undefined}>
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
          onClick={() => setMobileMenuOpen(false)}
          className={`
            relative group flex items-center px-3 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer
            ${depth > 0 && sidebarOpen ? 'ml-4' : ''}
            ${isActive
              ? 'font-bold text-indigo-700 dark:text-indigo-300'
              : 'font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }
          `}
          title={!sidebarOpen || depth > 0 ? item.name : undefined}
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
              relative group flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 cursor-pointer
              ${depth > 0 && sidebarOpen ? 'ml-4 w-[calc(100%-1rem)]' : 'w-full'}
              ${isParentActive || isActive
                ? 'font-bold text-indigo-700 dark:text-indigo-300'
                : 'font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
            title={!sidebarOpen || depth > 0 ? item.name : undefined}
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
                  activeHref={activeHref}
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
  const lastAutoExpandedPath = useRef<string | null>(null);
  const { hasPermission, hasAnyPermission, isSuperAdmin, isTenantAdmin, storefrontActive } = usePermissions();

  // Recursive function to filter navigation based on permissions
  const filterNavigationRecursive = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .map(item => {
        const clonedItem = { ...item };

        // Check super admin only access
        if (clonedItem.superAdminOnly && !isSuperAdmin) {
          return null;
        }

        // Check storefront required (Ecommerce Management)
        if (clonedItem.storefrontRequired && !isSuperAdmin && !(isTenantAdmin && storefrontActive)) {
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

  const flattenHrefs = (items: NavigationItem[]): string[] => {
    const hrefs: string[] = [];

    for (const item of items) {
      if (item.href) {
        hrefs.push(item.href);
      }

      if (item.children) {
        hrefs.push(...flattenHrefs(item.children));
      }
    }

    return hrefs;
  };

  const activeHref = useMemo(() => {
    const hrefs = flattenHrefs(filteredNavigation);
    let bestMatch: string | null = null;

    for (const href of hrefs) {
      const isMatch = pathname === href || pathname.startsWith(`${href}/`);
      if (!isMatch) {
        continue;
      }

      if (!bestMatch || href.length > bestMatch.length) {
        bestMatch = href;
      }
    }

    return bestMatch;
  }, [pathname, filteredNavigation]);

  // Helper function to find all parent paths for a given pathname
  const findParentPaths = (
    items: NavigationItem[],
    currentActiveHref: string | null,
    parentPath = ''
  ): string[] => {
    const paths: string[] = [];

    const isPathMatch = (href?: string) => {
      if (!href || !currentActiveHref) return false;
      return currentActiveHref === href;
    };

    for (const item of items) {
      const itemPath = parentPath ? `${parentPath}.${item.name}` : item.name;

      if (isPathMatch(item.href)) {
        // Found the active item, return all parent paths
        return parentPath ? [parentPath] : [];
      }

      if (item.children) {
        const childPaths = findParentPaths(item.children, currentActiveHref, itemPath);
        if (childPaths.length > 0 || item.children.some(child => isPathMatch(child.href))) {
          paths.push(itemPath);
          paths.push(...childPaths);
        }
      }
    }

    return paths;
  };

  // Open parent menus based on current pathname on mount and pathname change
  useEffect(() => {
    const parentPaths = findParentPaths(filteredNavigation, activeHref);
    if (parentPaths.length === 0) {
      return;
    }

    setOpenItems(prev => {
      const isRouteChanged = lastAutoExpandedPath.current !== pathname;
      const shouldAutoExpand = isRouteChanged || prev.size === 0;

      if (!shouldAutoExpand) {
        return prev;
      }

      lastAutoExpandedPath.current = pathname;
      return new Set(parentPaths);
    });
  }, [pathname, activeHref, filteredNavigation]);

  // Scroll the active parent menu item into view at the top of the sidebar
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navRef.current || openItems.size === 0) return;

    const timer = setTimeout(() => {
      const nav = navRef.current;
      if (!nav) return;

      const activeItem = nav.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [openItems]);

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
        <nav ref={navRef} className="flex-1 px-2 py-1 overflow-y-auto scrollbar-thin">
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
                activeHref={activeHref}
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
