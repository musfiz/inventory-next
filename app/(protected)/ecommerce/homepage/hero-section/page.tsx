'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Images, LayoutGrid, Loader2, Save, SlidersVertical, Tag } from 'lucide-react';
import storefrontSettingsService, { type HomepageHeroWidget } from '@/services/storefrontSettingsService';
import { notify } from '@/lib/notifications';

const WIDGETS: Array<{
  id: HomepageHeroWidget;
  name: string;
  description: string;
  features: string[];
  manageHref: string;
  manageLabel: string;
}> = [
  {
    id: 'hero_slider',
    name: 'Hero Slider',
    description:
      'Full-width auto-rotating banner carousel with title, subtitle and a call-to-action. Best for seasonal campaigns and single big announcements.',
    features: [
      'Full-width rotating banners',
      'Title, subtitle and CTA per slide',
      'Scheduling window per slide',
      'Inline search bar on the first slide',
    ],
    manageHref: '/ecommerce/homepage/hero-slider',
    manageLabel: 'Manage Hero Slider',
  },
  {
    id: 'hero_grid_deals',
    name: 'Image Grid + Weekly Deals',
    description:
      'A 2x2 grid of promotional images beside a Weekly Deals rail showing this week’s discounted products.',
    features: [
      'Four fixed promo image cells',
      'Weekly Deals rail beside the grid',
      'Countdown to the deal end date',
      'Deals come from Flash Sale campaigns',
    ],
    manageHref: '/ecommerce/homepage/hero-grid',
    manageLabel: 'Manage Hero Grid Images',
  },
];

const WIDGET_DEAL_HREFS: Partial<Record<HomepageHeroWidget, { href: string; label: string }>> = {
  hero_grid_deals: { href: '/ecommerce/homepage/weekly-deals', label: 'Manage Weekly Deals' },
};

export default function HeroSectionPage() {
  const router = useRouter();
  const [widget, setWidget] = useState<HomepageHeroWidget>('hero_slider');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const settings = await storefrontSettingsService.get();
        if (cancelled) return;
        setWidget(settings.homepage_hero_widget ?? 'hero_slider');
      } catch {
        if (!cancelled) notify.error('Failed to load hero section settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storefrontSettingsService.update({ homepage_hero_widget: widget });
      notify.success('Hero section updated successfully');
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to update hero section');
    } finally {
      setSaving(false);
    }
  };

  const active = WIDGETS.find(w => w.id === widget) ?? WIDGETS[0];

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hero Section</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose which widget renders in the top hero area of your homepage. Changes apply instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/store', '_blank')}
            className="inline-flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-4 w-4" />
            Preview Storefront
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Widget cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {WIDGETS.map(w => {
          const selected = widget === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setWidget(w.id)}
              className={`relative rounded-sm border-2 p-5 text-left transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-950/30'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              }`}
            >
              {selected && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <Check className="h-4 w-4" />
                </span>
              )}

              {/* Thumbnail preview */}
              <div className="mb-4 h-28 overflow-hidden rounded-sm border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                {w.id === 'hero_slider' ? (
                  <div className="flex h-full flex-col justify-center gap-1.5 p-3">
                    <div className="h-6 w-3/4 rounded-sm bg-brand-500/70" />
                    <div className="h-2 w-1/2 rounded-sm bg-brand-300/70" />
                    <div className="mt-1 h-3 w-16 rounded-sm bg-brand-700/60" />
                  </div>
                ) : (
                  <div className="flex h-full gap-1.5 p-2">
                    <div className="grid flex-1 grid-cols-2 gap-1.5">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-sm bg-brand-400/50" />
                      ))}
                    </div>
                    <div className="flex w-2/5 flex-col gap-1.5">
                      <div className="h-4 w-full rounded-sm bg-amber-400/70" />
                      <div className="flex-1 rounded-sm bg-amber-200/60" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {w.id === 'hero_slider' ? (
                  <SlidersVertical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <LayoutGrid className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                )}
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{w.name}</h3>
              </div>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{w.description}</p>

              <ul className="mt-4 space-y-1.5">
                {w.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Manage content deep link */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <Images className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Active widget:{' '}
              <span className="text-indigo-600 dark:text-indigo-400">{active.name}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Edit the content this widget renders.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {WIDGET_DEAL_HREFS[widget] && (
            <button
              onClick={() => router.push(WIDGET_DEAL_HREFS[widget]!.href)}
              className="inline-flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Tag className="h-4 w-4" />
              {WIDGET_DEAL_HREFS[widget]!.label}
            </button>
          )}
          <button
            onClick={() => router.push(active.manageHref)}
            className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <ExternalLink className="h-4 w-4" />
            {active.manageLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
