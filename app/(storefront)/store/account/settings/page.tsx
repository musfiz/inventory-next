'use client';

import { useState } from 'react';
import { Save, User, Mail, Phone, Lock, Bell, Shield } from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { notify } from '@/lib/notifications';

export default function SettingsPage() {
  const user = useCustomerAuthStore(s => s.user);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [prefs, setPrefs] = useState({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
  });
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    notify.success('Profile updated');
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) {
      notify.error('Passwords do not match');
      return;
    }
    if (pw.new.length < 8) {
      notify.error('Password must be at least 8 characters');
      return;
    }
    setPw({ current: '', new: '', confirm: '' });
    notify.success('Password updated');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile */}
      <form
        onSubmit={handleProfile}
        className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
      >
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          <User className="mr-1 inline h-4 w-4 text-brand-600" /> Profile
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-purple-600 text-2xl font-bold text-white">
            {name.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700"
            >
              Change photo
            </button>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 2MB</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Full name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Save className="h-4 w-4" />
          Save changes
        </button>
      </form>

      {/* Password */}
      <form
        onSubmit={handlePassword}
        className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
      >
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          <Lock className="mr-1 inline h-4 w-4 text-brand-600" /> Change Password
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="password"
            placeholder="Current password"
            value={pw.current}
            onChange={e => setPw({ ...pw, current: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="password"
            placeholder="New password"
            value={pw.new}
            onChange={e => setPw({ ...pw, new: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={pw.confirm}
            onChange={e => setPw({ ...pw, confirm: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Update password
        </button>
      </form>

      {/* Notifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          <Bell className="mr-1 inline h-4 w-4 text-brand-600" /> Notifications
        </h2>
        <div className="mt-4 space-y-3">
          {[
            { key: 'orderUpdates', label: 'Order updates', desc: 'Get notified about your order status' },
            { key: 'promotions', label: 'Promotions & offers', desc: 'Deals and discounts via email' },
            { key: 'newsletter', label: 'Newsletter', desc: 'Weekly product recommendations' },
          ].map(item => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPrefs({ ...prefs, [item.key]: !prefs[item.key as keyof typeof prefs] })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  prefs[item.key as keyof typeof prefs]
                    ? 'bg-brand-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    prefs[item.key as keyof typeof prefs] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Danger */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-800 dark:bg-red-950/20 sm:p-6">
        <h2 className="text-lg font-black text-red-700 dark:text-red-400">
          <Shield className="mr-1 inline h-4 w-4" /> Danger Zone
        </h2>
        <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
          Once you delete your account, there is no going back.
        </p>
        <button
          onClick={() =>
            window.confirm('Delete account?') && notify.error('Account deletion is disabled in demo')
          }
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-red-950/30"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
