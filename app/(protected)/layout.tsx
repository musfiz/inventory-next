'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { notify } from '@/lib/notifications';
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import Loading from './Loading';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const isSwitchedUser = useAuthStore((state) => state.isSwitchedUser);
  const originalSuperAdmin = useAuthStore((state) => state.originalSuperAdmin);
  const switchBack = useAuthStore((state) => state.switchBack);
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [switchingBack, setSwitchingBack] = useState(false);

  // Handle route changes - show loading indicator
  useEffect(() => {
    setIsRouteLoading(true);
    const timer = setTimeout(() => {
      setIsRouteLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [pathname]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    //
  };

  const handleSwitchBackToAdmin = async () => {
    setSwitchingBack(true);
    try {
      const success = await switchBack();
      if (success) {
        notify.success('Switched back to super admin');
        router.push('/dashboard');
      } else {
        notify.error('Failed to switch back. Please try again or logout and login');
      }
    } catch (error) {
      notify.error('An error occurred while switching back. Please try again');
    } finally {
      setSwitchingBack(false);
    }
  };

  return (
    <div>
      {/* Superadmin Debug Alert - Fixed at top */}
      {isSwitchedUser && originalSuperAdmin && (
        <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white px-4 py-0 shadow-lg z-50 border-b border-orange-700">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">🔄 Debug Mode Enabled</span>
              </div>
              <div className="h-4 w-px bg-orange-300"></div>
              <div className="text-sm">
                Switched to: <strong>{user?.name}</strong> ({user?.email})
              </div>
            </div>
            <button
              onClick={handleSwitchBackToAdmin}
              className={`flex items-center gap-2 px-2 py-1 rounded-sm text-sm font-medium transition-all cursor-pointer ${switchingBack
                ? 'bg-orange-700 cursor-not-allowed opacity-75'
                : 'bg-white text-orange-600 hover:bg-purple-50 shadow-sm'
                }`}
            >
              {switchingBack ? (
                <>
                  <div className="w-4 h-3 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                  Switching...
                </>
              ) : (
                <>
                  <User className="w-4 h-3" />
                  Switch Back
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 flex h-screen overflow-hidden relative ${isSwitchedUser ? 'border-5 border-red-500 pt-[0.67cm]' : ''}`}>
        {/* Route Loading Progress Bar */}
        {isRouteLoading && (
          <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-100 overflow-hidden">
            <div className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[loading_1s_ease-in-out_infinite]"
              style={{
                width: '50%',
                animation: 'loading 1s ease-in-out infinite'
              }}>
            </div>
          </div>
        )}

        <Sidebar
          sidebarOpen={sidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
          />

          {/* Page Content - Scrollable */}
          <main className="flex-1 overflow-y-auto py-2 px-2 sm:px-4 lg:px-4">
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

