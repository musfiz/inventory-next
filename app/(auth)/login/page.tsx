'use client';

import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import DemoLoginPanel from '@/components/auth/demo-login-panel';
import PageLoader from '@/components/ui/page-loader';
import Spinner from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notifications';
import { demoService } from '@/services/demoService';
import type { DemoUser } from '@/types/demo';

interface ValidationErrors {
  email?: string[];
  password?: string[];
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shouldRemember, setShouldRemember] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, demoLogin } = useAuth({
    middleware: 'guest',
    redirectIfAuthenticated: '/dashboard',
  });
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    demoService
      .getDemoUsers()
      .then(users => {
        if (!cancelled) setDemoUsers(users);
      })
      .catch(() => {
        if (!cancelled) setDemoUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // Guards a double submit: the button is disabled, but Enter in a text field
    // can still fire submit while the first request is in flight.
    if (isLoading) return;

    setIsLoading(true);
    setErrors({});

    let signedIn = false;

    try {
      await login({
        email,
        password,
        remember: shouldRemember,
        setErrors: (validationErrors: ValidationErrors) => {
          if (validationErrors && Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
          }
        },
      });
      signedIn = true;
    } catch (err: any) {
      // Non-validation failures never reach the form's inline error slots, so
      // they surface as a toast instead of being swallowed.
      const message =
        err?.response?.data?.message ||
        (err?.response?.status === 419
          ? 'Your session expired. Please try again.'
          : 'Sign in failed. Please check your connection and try again.');
      setErrors({});
      notify.error(message);
    } finally {
      // Deliberately skipped on success. `login` resolves as soon as the user
      // has been fetched, which is before the guest-guard redirect to
      // /dashboard has swapped the route — releasing the lock there would
      // un-blur the form for a frame and let the user start typing into a page
      // that is about to disappear. Navigation unmounts the component, which is
      // what clears the state.
      //
      // Every failure path does clear it. Previously only the 422 branch did, so
      // a CSRF or network failure left the form disabled forever.
      if (!signedIn) setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to UIMS</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Please sign in to continue to your dashboard
          </p>
        </div>

        {/* Form Card */}
        <div className="relative bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <form
            className="space-y-4 transition-opacity"
            // Blur the whole form while the credentials are being checked.
            // Without this the fields stayed crisp and fully editable, so the
            // user could retype an email/password mid-request and no longer be
            // submitting what they thought they were.
            style={isLoading ? { filter: 'blur(3px)', pointerEvents: 'none' } : undefined}
            aria-hidden={isLoading}
            onSubmit={handleSubmit}
          >
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${errors.email ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  readOnly={isLoading}
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    // Clear email error when user starts typing
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${errors.email
                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent'
                    }`}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email[0]}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${errors.password ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  readOnly={isLoading}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    // Clear password error when user starts typing
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${errors.password
                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent'
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.password[0]}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={shouldRemember}
                  readOnly={isLoading}
                  onChange={e => setShouldRemember(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50 cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </form>

          {/* Round loader over the blurred form — same treatment as the
              "Checking session..." state on /pos-sales. */}
          {isLoading && (
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm"
            >
              <Spinner size="md" decorative />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Signing in…
              </p>
            </div>
          )}
        </div>

        {demoUsers.length > 0 && (
          <DemoLoginPanel
            users={demoUsers}
            onDemoLogin={userId => demoLogin(userId)}
            disabled={isLoading}
          />
        )}

        {/* Footer Links */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            Don&apos;t have an account?{' '}
            <Link target="blank"
              href="https://musfiz.com"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >

            </Link>
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Privacy Notice
            </a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p>© {new Date().getFullYear()} UIMS. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
