'use client';

import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import CartDrawer from '@/components/storefront/CartDrawer';
import FloatingCartButton from '@/components/storefront/FloatingCartButton';
import { CartFlyProvider } from '@/components/storefront/CartFlyProvider';
import ScrollToTop from '@/components/storefront/ScrollToTop';
import MobileBottomNav from '@/components/storefront/MobileBottomNav';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartFlyProvider>
      <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <ScrollToTop />
        <StorefrontHeader />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <StorefrontFooter />
        <CartDrawer />
        <FloatingCartButton />
        <MobileBottomNav />
      </div>
    </CartFlyProvider>
  );
}