'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Sparkles,
  Check,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { notify } from '@/lib/notifications';

export default function RegisterPage() {
  const router = useRouter();
  const register = useCustomerAuthStore(s => s.register);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    agree: true,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (k: keyof typeof form) => (e: any) =>
    setForm({ ...form, [k]: e.target.value ?? e.target.checked });

  const passwordStrength = (() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      notify.error('Passwords do not match');
      return;
    }
    if (!form.agree) {
      notify.error('Please accept the terms');
      return;
    }
    setLoading(true);
    const res = await register(form.name, form.email, form.phone, form.password);
    setLoading(false);
    if (res.ok) {
      notify.success('Account created successfully');
      router.push('/store/account');
    } else {
      notify.error(res.message || 'Could not create account');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Already a member?{' '}
            <Link
              href="/store/account/login"
              className="font-semibold text-brand-600 hover:underline"
            >
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <User className="mr-1 inline h-3.5 w-3.5" /> Full name
              </label>
              <input
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder="John Doe"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Phone className="mr-1 inline h-3.5 w-3.5" /> Phone
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+880 1XXX-XXXXXX"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Lock className="mr-1 inline h-3.5 w-3.5" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i < passwordStrength
                            ? strengthColors[passwordStrength - 1]
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {strengthLabels[passwordStrength - 1] || 'Too short'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Confirm password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.confirm}
                onChange={handleChange('confirm')}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              {form.confirm && form.password === form.confirm && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Passwords match
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="sf-check mt-0.5"
                checked={form.agree}
                onChange={e => setForm({ ...form, agree: e.target.checked })}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        <div className="hidden flex-col justify-center lg:flex">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-black text-gray-900 dark:text-white">
            Join UIMS today
          </h1>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
            Create an account to unlock exclusive benefits and a personalized
            shopping experience.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { stat: '50K+', label: 'Active members' },
              { stat: '৳5,000+', label: 'Min free shipping' },
              { stat: '7-day', label: 'Return policy' },
              { stat: '24/7', label: 'Customer support' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="text-2xl font-black text-brand-600">{s.stat}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
