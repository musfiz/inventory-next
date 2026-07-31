'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, LogOut, Package, LayoutDashboard, Settings, MapPin } from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';

export const AccountMenu = ({ onClose }: { onClose?: () => void }) => {
  const user = useCustomerAuthStore(s => s.user)!;
  const logout = useCustomerAuthStore(s => s.logout);
  const router = useRouter();

  const handleLogout = () => { logout(); onClose?.(); router.push('/'); };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
      <div className="bg-linear-to-br from-brand-600 to-purple-700 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold backdrop-blur-sm">{user.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.name}</p>
            <p className="truncate text-xs text-white/80">{user.email}</p>
          </div>
        </div>
      </div>
      <ul className="p-2">
        {[
          { icon: LayoutDashboard, label: 'Dashboard', href: '/store/account' },
          { icon: Package, label: 'My Orders', href: '/store/account/orders' },
          { icon: Heart, label: 'Wishlist', href: '/store/account/wishlist' },
          { icon: MapPin, label: 'Saved Addresses', href: '/store/account/addresses' },
          { icon: Settings, label: 'Account Settings', href: '/store/account/settings' },
        ].map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link href={href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30">
              <Icon className="h-4 w-4 text-gray-500" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 p-2 dark:border-gray-800">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:hover:bg-red-950/30">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
};
