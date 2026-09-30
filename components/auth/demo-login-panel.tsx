'use client';

import { useState } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import type { DemoUser } from '@/types/demo';

interface DemoLoginPanelProps {
  users: DemoUser[];
  onDemoLogin: (userId: string) => Promise<void>;
}

export default function DemoLoginPanel({ users, onDemoLogin }: DemoLoginPanelProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (users.length === 0) return null;

  const handleClick = async (userId: string) => {
    if (loadingUserId) return;
    setLoadingUserId(userId);
    setError(null);
    try {
      await onDemoLogin(userId);
    } catch {
      setError('Demo login failed. Please try again.');
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Try the demo</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        One-click login — no password needed. Changes are disabled in demo mode.
      </p>
      <div className="space-y-2">
        {users.map(user => {
          const isLoading = loadingUserId === user.id;
          return (
            <button
              key={user.id}
              type="button"
              disabled={loadingUserId !== null}
              onClick={() => handleClick(user.id)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.name}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.tenant?.name ? `${user.tenant.name} • ` : ''}
                  {user.email}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {user.user_type}
                </span>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
