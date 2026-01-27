'use client';

import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isSwitchedUser = useAuthStore((state) => state.isSwitchedUser);
  const originalSuperAdmin = useAuthStore((state) => state.originalSuperAdmin);
  const { logout, switchBackToAdmin } = useAuth();

  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [switchingBack, setSwitchingBack] = useState(false);

  // Check authentication and redirect if needed (only once, after hydration)
  useEffect(() => {
    if (!hasCheckedAuth && !isLoading && isHydrated) {
      setHasCheckedAuth(true);
    }
  }, [isLoading, isAuthenticated, hasCheckedAuth, isHydrated, pathname, router]);

  // Handle route changes
  useEffect(() => {
    setIsRouteLoading(true);
    const timer = setTimeout(() => {
      setIsRouteLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Show loading while checking authentication or hydrating
  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex h-screen overflow-hidden relative">
      {/* User Switch Indicator */}
      {isSwitchedUser && originalSuperAdmin && (
        <div className="bg-linear-to-r from-orange-500 to-orange-600 text-white px-4 py-3 shadow-lg border-b border-orange-400 z-50 relative">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">🔄 DEBUG MODE</span>
              </div>
              <div className="h-4 w-px bg-orange-300"></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                <span>
                  <strong>Current:</strong> {user?.name} ({user?.email})
                </span>
                <span className="hidden sm:block text-orange-100">•</span>
                <span>
                  <strong>Original Admin:</strong> {originalSuperAdmin.name}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                setSwitchingBack(true);
                try {
                  const success = await switchBackToAdmin();
                  if (success) {
                    alert('Successfully switched back to admin account. The page will reload.');
                    window.location.reload();
                  } else {
                    alert('Failed to switch back to admin. Please try again.');
                  }
                } catch (error) {
                  console.error('Switch back error:', error);
                  alert('An error occurred while switching back. Please try again.');
                } finally {
                  setSwitchingBack(false);
                }
              }}
              disabled={switchingBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${switchingBack
                ? 'bg-orange-700 cursor-not-allowed opacity-75'
                : 'bg-white text-orange-600 hover:bg-orange-50 shadow-sm'
                }`}
            >
              {switchingBack ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                  Switching...
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  Switch Back
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Full Page Loading Spinner */}
      {isRouteLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
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
          logout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
        />

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto py-2 px-2 sm:px-4 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}

