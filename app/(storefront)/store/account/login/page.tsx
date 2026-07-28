'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, Sparkles, User, Phone, Check,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { notify } from '@/lib/notifications';

type Tab = 'login' | 'register';

/* ───────────────────────────── shared UI primitives ─────────────────────── */

function FieldLabel({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      {children}
    </label>
  );
}

function Input({ className = '', error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 dark:bg-gray-900 dark:text-gray-100 ${
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700'
      } ${className}`}
    />
  );
}

function FieldError({ error }: { error?: string | string[] }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-600">{Array.isArray(error) ? error[0] : error}</p>;
}

/* ───────────────────────────── password strength meter ──────────────────── */

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-gray-500">{score > 0 ? labels[score - 1] : null}</span>
    </div>
  );
}

/* ───────────────────────────── Login form ───────────────────────────────── */

function LoginForm() {
  const router = useRouter();
  const login = useCustomerAuthStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      notify.success('Welcome back!');
      router.push('/store/account');
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      notify.error(res.message || 'Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel icon={Mail}>Email</FieldLabel>
        <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={!!errors.email} autoComplete="email" />
        <FieldError error={errors.email} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel icon={Lock}>Password</FieldLabel>
          <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">Forgot?</Link>
        </div>
        <div className="relative">
          <Input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" error={!!errors.password} autoComplete="current-password" className="pr-10" />
          <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <FieldError error={errors.password} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" defaultChecked />
        Remember me
      </label>

      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-50">
        {loading ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Signing in...</>
        ) : 'Sign in'}
      </button>
    </form>
  );
}

/* ───────────────────────────── Register form ────────────────────────────── */

function RegisterForm() {
  const router = useRouter();
  const register = useCustomerAuthStore(s => s.register);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', agree: true });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.confirm) { notify.error('Passwords do not match'); return; }
    if (!form.agree) { notify.error('Please accept the terms & conditions'); return; }
    setLoading(true);
    const res = await register(form.name, form.email, form.phone, form.password, form.confirm);
    setLoading(false);
    if (res.ok) {
      notify.success('Account created successfully');
      router.push('/store/account');
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      notify.error(res.message || 'Could not create account');
    }
  };

  const fieldError = (k: string) => (errors[k] ? <FieldError error={errors[k]} /> : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.email?.some?.(e => e.includes('already been taken')) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30">
          This email is already registered.{' '}
          <Link href="/store/account/login" className="font-bold underline">Sign in instead</Link>
        </div>
      )}

      <div>
        <FieldLabel icon={User}>Full name</FieldLabel>
        <Input type="text" required value={form.name} onChange={set('name')} placeholder="John Doe" error={!!errors.name} autoComplete="name" />
        {fieldError('name')}
      </div>

      <div>
        <FieldLabel icon={Mail}>Email</FieldLabel>
        <Input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" error={!!errors.email} autoComplete="email" />
        {fieldError('email')}
      </div>

      <div>
        <FieldLabel icon={Phone}>Phone</FieldLabel>
        <Input type="tel" required value={form.phone} onChange={set('phone')} placeholder="+880 1XXX-XXXXXX" error={!!errors.phone} autoComplete="tel" />
        {fieldError('phone')}
      </div>

      <div>
        <FieldLabel icon={Lock}>Password</FieldLabel>
        <div className="relative">
          <Input type={showPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={set('password')} placeholder="At least 8 characters" error={!!errors.password} autoComplete="new-password" className="pr-10" />
          <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <StrengthMeter password={form.password} />
        {fieldError('password')}
      </div>

      <div>
        <FieldLabel icon={Lock}>Confirm password</FieldLabel>
        <Input type={showPw ? 'text' : 'password'} required value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" error={!!errors.password} autoComplete="new-password" />
        {form.confirm && form.password === form.confirm && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Passwords match</p>
        )}
        {fieldError('password')}
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" className="sf-check mt-0.5" checked={form.agree} onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))} />
        <span>
          I agree to the{' '}
          <Link href="/terms" className="font-semibold text-brand-600 hover:underline">Terms & Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">Privacy Policy</Link>
        </span>
      </label>

      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-50">
        {loading ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating account...</>
        ) : 'Create account'}
      </button>
    </form>
  );
}

/* ───────────────────────────── Tabbed page ──────────────────────────────── */

export default function AuthPage() {
  const searchParams = useSearchParams();
  const isAuthed = useCustomerAuthStore(s => s.isAuthenticated);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('login');

  // Read ?tab=register on mount
  useEffect(() => {
    if (searchParams.get('tab') === 'register') setTab('register');
  }, [searchParams]);

  // Redirect authenticated users away
  useEffect(() => {
    if (isAuthed) router.replace('/store/account');
  }, [isAuthed, router]);

  const toggle = useCallback(() => setTab(t => (t === 'login' ? 'register' : 'login')), []);

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4 py-10 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="grid w-full max-w-5xl gap-0 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-gray-200/60 dark:bg-gray-950 dark:shadow-gray-950 lg:grid-cols-5">

        {/* ──── brand / value panel ──── */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-purple-700 p-8 text-white lg:col-span-2">
          {/* subtle pattern overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />

          <div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="relative mt-6 text-3xl font-black leading-tight tracking-tight">
              {tab === 'login' ? 'Welcome back' : 'Join UIMS today'}
            </h2>
            <p className="relative mt-2 text-sm leading-relaxed text-white/80">
              {tab === 'login'
                ? 'Sign in to track orders, manage your wishlist, and enjoy a faster checkout.'
                : 'Create an account and unlock exclusive perks tailored just for you.'}
            </p>

            <ul className="relative mt-6 space-y-3">
              {[
                'Track all your orders in one place',
                'Save favourites to your wishlist',
                'Faster checkout with saved addresses',
                'Exclusive member-only deals',
              ].map(b => (
                <li key={b} className="flex items-center gap-2.5 text-sm font-medium text-white/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px]">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-8 grid grid-cols-2 gap-3">
            {[
              { stat: '50K+', label: 'Active members' },
              { stat: '৳5,000+', label: 'Min free shipping' },
              { stat: '7-day', label: 'Return policy' },
              { stat: '24/7', label: 'Customer support' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <p className="text-xl font-black">{s.stat}</p>
                <p className="text-[11px] font-medium text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ──── form panel ──── */}
        <div className="flex flex-col justify-center p-8 lg:col-span-3">
          {/* tab switcher */}
          <div className="mb-8 flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                tab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                tab === 'register'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Create account
            </button>
          </div>

          {/* dynamic heading */}
          {tab === 'login' ? (
            <p className="mb-6 text-sm text-gray-500">
              New to UIMS?{' '}
              <button type="button" onClick={toggle} className="font-semibold text-brand-600 hover:underline">Create an account</button>
            </p>
          ) : (
            <p className="mb-6 text-sm text-gray-500">
              Already a member?{' '}
              <button type="button" onClick={toggle} className="font-semibold text-brand-600 hover:underline">Sign in</button>
            </p>
          )}

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}
