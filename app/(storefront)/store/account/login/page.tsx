'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, Sparkles, User, Phone, Check, ShieldCheck,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import Spinner from '@/components/ui/spinner';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { notify } from '@/lib/notifications';

type Tab = 'login' | 'register';

/** Client-only captcha (canvas + reload) to block bots on account creation. */
const CaptchaBox = dynamic(() => import('@/components/storefront/CaptchaBox'), {
  ssr: false,
  loading: () => <div className="h-10 w-40 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-800" />,
});

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
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 dark:bg-gray-900 dark:text-gray-100 ${error
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

      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-brand-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-50">
        {loading ? (
          <><Spinner size="sm" tone="white" /> Signing in...</>
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
  const [captchaInput, setCaptchaInput] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.confirm) { notify.error('Passwords do not match'); return; }
    if (!form.agree) { notify.error('Please accept the terms & conditions'); return; }
    if (!captchaInput.trim()) {
      notify.error('Please enter the captcha code');
      return;
    }
    const { validateCaptcha } = await import('@/lib/captcha');
    if (!validateCaptcha(captchaInput.trim())) {
      notify.error('Captcha does not match. Please try again.');
      setCaptchaInput('');
      return;
    }
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

      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <FieldLabel icon={ShieldCheck}>Security check</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <CaptchaBox />
          <Input
            value={captchaInput}
            onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
            placeholder="Enter the code above"
            maxLength={6}
            autoComplete="off"
            className="min-w-40 flex-1"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">Type the characters shown above. Click the link to reload a new code.</p>
      </div>

      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-brand-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-50">
        {loading ? (
          <><Spinner size="sm" tone="white" /> Creating account...</>
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
    <div className="relative flex min-h-[calc(100vh-200px)] items-center justify-center overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-50 px-4 py-10 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* decorative ambient background — matches the blurred-orb + dot-grid language used across storefront hero sections */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          color: 'rgb(0 0 0 / 0.04)',
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/10" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/10" />

      <ScrollReveal animation="zoom-in" duration="normal" as="div" className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl shadow-brand-900/10 ring-1 ring-black/5 dark:bg-gray-950 dark:shadow-black/40 dark:ring-white/10 sm:p-10">
        {/* header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-600/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {tab === 'login'
              ? 'Sign in to track orders, manage your wishlist, and check out faster.'
              : 'Join to unlock faster checkout, order tracking, and member perks.'}
          </p>
        </div>

        {/* tab switcher with an animated sliding pill */}
        <div className="relative mb-7 flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
          <div
            className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-gray-950 ${tab === 'register' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'
              }`}
          />
          <button
            onClick={() => setTab('login')}
            className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${tab === 'login'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setTab('register')}
            className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${tab === 'register'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
          >
            Create account
          </button>
        </div>

        {tab === 'login' ? <LoginForm /> : <RegisterForm />}

        {/* dynamic footer link */}
        {tab === 'login' ? (
          <p className="mt-6 text-center text-sm text-gray-500">
            New to UIMS?{' '}
            <button type="button" onClick={toggle} className="font-semibold text-brand-600 hover:underline">Create an account</button>
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-gray-500">
            Already a member?{' '}
            <button type="button" onClick={toggle} className="font-semibold text-brand-600 hover:underline">Sign in</button>
          </p>
        )}
      </ScrollReveal>
    </div>
  );
}
