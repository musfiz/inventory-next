'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, ExternalLink, Loader2 } from 'lucide-react';
import storefrontSettingsService from '@/services/storefrontSettingsService';
import { notify } from '@/lib/notifications';

const themes = [
  {
    id: 'default' as const,
    name: 'Default Theme',
    description: 'A clean, modern e-commerce design with blue accent colors. Perfect for general retail stores.',
    preview: {
      primary: '#4f46e5',
      secondary: '#8b5cf6',
      background: '#f9fafb',
      accent: 'from-brand-600 to-purple-700',
    },
    features: ['Blue/purple color scheme', 'Full-featured mega menu', 'Express checkout option', 'General retail layout'],
  },
  {
    id: 'grocery' as const,
    name: 'Grocery Theme',
    description: 'A fresh, vibrant design with green and orange colors. Built for grocery and fresh produce stores.',
    preview: {
      primary: '#16a34a',
      secondary: '#f97316',
      background: '#f0fdf4',
      accent: 'from-green-600 to-emerald-600',
    },
    features: ['Green/orange color scheme', 'Weight/unit pricing display', 'Delivery time slots', 'Freshness badges'],
  },
];

export default function ThemePage() {
  const [currentTheme, setCurrentTheme] = useState<'default' | 'grocery'>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    storefrontSettingsService
      .get()
      .then((res) => {
        setCurrentTheme((res.storefront_theme as 'default' | 'grocery') ?? 'default');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storefrontSettingsService.update({ storefront_theme: currentTheme });
      notify.success('Theme updated successfully');
    } catch {
      notify.error('Failed to update theme');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    window.open('/store', '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Theme & Appearance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a theme for your storefront. Changes apply instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-4 w-4" />
            Preview Storefront
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Theme Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setCurrentTheme(theme.id)}
            className={`relative text-left rounded-xl border-2 p-6 transition-all ${
              currentTheme === theme.id
                ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/30'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
            }`}
          >
            {/* Selection indicator */}
            {currentTheme === theme.id && (
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                <Check className="h-4 w-4" />
              </div>
            )}

            {/* Theme preview */}
            <div className="mb-4 flex gap-3">
              <div
                className="h-16 w-16 rounded-lg shadow-inner"
                style={{ backgroundColor: theme.preview.primary }}
              />
              <div
                className="h-16 w-16 rounded-lg shadow-inner"
                style={{ backgroundColor: theme.preview.secondary }}
              />
              <div
                className="h-16 w-16 rounded-lg border border-gray-200 shadow-inner dark:border-gray-700"
                style={{ backgroundColor: theme.preview.background }}
              />
            </div>

            {/* Theme info */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{theme.name}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{theme.description}</p>

            {/* Features */}
            <ul className="mt-4 space-y-1.5">
              {theme.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Current theme info */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Active Theme: <span className="text-blue-600 dark:text-blue-400">{themes.find(t => t.id === currentTheme)?.name}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your storefront is currently using the {themes.find(t => t.id === currentTheme)?.name.toLowerCase()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
