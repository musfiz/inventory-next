'use client';

import Link from 'next/link';
import Spinner from '@/components/ui/spinner';
import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  ArrowLeftRight,
  Store,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/use-auth';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notifications';

interface HeaderProps {
  user: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent) => void;
}

export default function Header({
  user,
  sidebarOpen,
  setSidebarOpen,
  setMobileMenuOpen,
  searchQuery,
  setSearchQuery,
  handleSearch,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [switchingBack, setSwitchingBack] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { active: storefrontActive } = useStorefrontStatus();
  const isSwitchedUser = useAuthStore(state => state.isSwitchedUser);
  const originalSuperAdmin = useAuthStore(state => state.originalSuperAdmin);
  const switchBack = useAuthStore(state => state.switchBack);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownOpen) return;

      const target = event.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const handleSwitchBack = async () => {
    setSwitchingBack(true);
    setDropdownOpen(false);
    try {
      const success = await switchBack();
      if (success) {
        notify.success('Switched back to super admin');
        router.push('/dashboard');
      } else {
        notify.error('Failed to switch back. Please try again or logout and login');
      }
    } catch (error) {
      notify.error('An error occurred. Please try again');
    } finally {
      setSwitchingBack(false);
    }
  };

  return (
    <header
      className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800 min-h-14 h-24 flex-0 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800"
      style={{ height: '6rem' }}
    >
      <div className="h-full sm:px-4 lg:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-64 sm:w-80 lg:w-96 pl-10 pr-24 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100 dark:focus:shadow-indigo-900/20 text-sm transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 caret-gray-900 dark:caret-gray-100"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer border border-gray-200 dark:border-gray-600"
              >
                <span> ⌘ </span>
                <span> K </span>
              </button>
            </div>
          </form>
        </div>

        {/* Notifications & User Dropdown */}
        <div className="flex items-center gap-2">
          {/* Storefront Shortcut — visible only when storefront is active */}
          {storefrontActive && (
            <button
              onClick={() => window.open('/store', '_blank', 'noopener,noreferrer')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="View storefront"
              title="View storefront"
            >
              <Store className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {!mounted ? (
              <div className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              {/* Notification Badge */}
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notification Dropdown Menu */}
            {notificationOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotificationOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-96 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Notifications
                    </h3>
                    <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">
                      Mark all read
                    </button>
                  </div>
                  <div className="overflow-y-auto">
                    {/* Notification Items */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex gap-3">
                          <div className="shrink-0">
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              New user registered
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              John Doe joined the platform
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              2 hours ago
                            </p>
                          </div>
                          <div className="shrink-0">
                            <span className="h-2 w-2 bg-indigo-500 dark:bg-indigo-400 rounded-full block"></span>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex gap-3">
                          <div className="shrink-0">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              System backup completed
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              All data backed up successfully
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              5 hours ago
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex gap-3">
                          <div className="shrink-0">
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              High memory usage
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Server memory at 85%
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              1 day ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium cursor-pointer">
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Dropdown */}
          <div ref={userDropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.name || 'No User'}
                </p>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.name || 'No Name'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || 'No Email'}
                    </p>
                    {isSwitchedUser && originalSuperAdmin && (
                      <div className="mt-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded text-xs text-orange-800 dark:text-orange-300">
                        Switched from: {originalSuperAdmin.name}
                      </div>
                    )}
                  </div>
                  {isSwitchedUser && (
                    <>
                      <button
                        onClick={handleSwitchBack}
                        disabled={switchingBack}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer w-full text-left ${switchingBack
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          }`}
                      >
                        {switchingBack ? (
                          <>
                            <Spinner size="sm" />
                            Switching back...
                          </>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-5 w-5" />
                            Switch Back to Admin
                          </>
                        )}
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    </>
                  )}
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    Settings
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
