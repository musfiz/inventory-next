'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import CartDrawer from '@/components/storefront/CartDrawer';
import FloatingCartButton from '@/components/storefront/FloatingCartButton';
import { CartFlyProvider } from '@/components/storefront/CartFlyProvider';
import ScrollToTop from '@/components/storefront/ScrollToTop';
import MobileBottomNav from '@/components/storefront/MobileBottomNav';
import FaviconSetter from '@/components/storefront/FaviconSetter';
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { active, loading } = useStorefrontStatus();

  useEffect(() => {
    if (!loading && !active) {
      router.replace('/welcome');
    }
  }, [active, loading, router]);

  if (active === null || !active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <CartFlyProvider>
      <FaviconSetter />
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