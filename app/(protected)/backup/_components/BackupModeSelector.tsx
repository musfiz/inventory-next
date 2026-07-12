'use client';

import { Database, Building2 } from 'lucide-react';

export type BackupMode = 'full' | 'tenant';

interface BackupModeSelectorProps {
  mode: BackupMode;
  onChange: (mode: BackupMode) => void;
  disabled?: boolean;
}

const MODES: Array<{
  key: BackupMode;
  title: string;
  description: string;
  icon: typeof Database;
  accent: string;
  ringActive: string;
}> = [
  {
    key: 'full',
    title: 'Full Database Backup',
    description: 'All tables, all tenants, all shared data. For disaster recovery, server migration, or full clone.',
    icon: Database,
    accent: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300',
    ringActive: 'ring-indigo-500 border-indigo-500',
  },
  {
    key: 'tenant',
    title: 'Per-Tenant Backup',
    description: "One tenant's scoped data (59 tables) plus shared data for their business type. For client data requests or standalone instances.",
    icon: Building2,
    accent: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300',
    ringActive: 'ring-emerald-500 border-emerald-500',
  },
];

export function BackupModeSelector({ mode, onChange, disabled }: BackupModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.key)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              active
                ? `${m.ringActive} ring-1 shadow-sm`
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-md ${m.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {m.title}
                  </h3>
                  {active && (
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
