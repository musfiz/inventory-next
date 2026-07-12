'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { notify } from '@/lib/notifications';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/store/account';
  const login = useCustomerAuthStore(s => s.login);

  const [email, setEmail] = useState('demo@uims.shop');
  const [password, setPassword] = useState('demo1234');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      notify.success('Welcome back!');
      router.push(redirect);
    } else {
      notify.error(res.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-black text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
            Sign in to track your orders, save your wishlist, and get
            personalized recommendations.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {[
              'Track all your orders in one place',
              'Save items to your wishlist',
              'Faster checkout with saved addresses',
              'Exclusive member-only deals',
            ].map(b => (
              <li key={b} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30">
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            New to UIMS?{' '}
            <Link
              href="/store/account/register"
              className="font-semibold text-brand-600 hover:underline"
            >
              Create an account
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Mail className="mr-1 inline h-3.5 w-3.5" /> Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <Lock className="mr-1 inline h-3.5 w-3.5" /> Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" className="sf-check" defaultChecked />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Demo Credentials
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-3 text-center text-xs text-brand-700 dark:border-brand-700 dark:bg-brand-950/20 dark:text-brand-300">
            <p className="font-bold">Any email + any password works in demo mode</p>
            <p className="mt-1 text-brand-600/80 dark:text-brand-400/80">
              Use demo@uims.shop / demo1234 (pre-filled)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
