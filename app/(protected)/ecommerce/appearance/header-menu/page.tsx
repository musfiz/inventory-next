'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Loader2,
  Monitor,
  Search,
  Heart,
  User,
  Sparkles,
  Gift,
  Phone,
  BadgePercent,
  Truck,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import headerMenuService from '@/services/headerMenuService';
import { notify } from '@/lib/notifications';
import type { HeaderMenuConfig } from '@/types/api.types';

const DEFAULT_UTILITY_BG = '#7c3aed';
const DEFAULT_UTILITY_TEXT = '#ffffff';

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export default function HeaderMenuPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [config, setConfig] = useState<HeaderMenuConfig>({
    utility_bar_enabled: true,
    utility_bar_text_free_shipping: 'Free shipping over ৳5,000',
    utility_bar_text_discount: '10% off your first order',
    utility_bar_phone: '+880 1700-000000',
    utility_bar_bg_color: DEFAULT_UTILITY_BG,
    utility_bar_text_color: DEFAULT_UTILITY_TEXT,
    nav_links: [],
    navigation_show_flash_sale: true,
    navigation_show_new_arrivals: true,
    menu_items: [],
    show_search_bar: true,
    show_wishlist_icon: true,
    show_account_icon: true,
    show_cart_icon: true,
    sticky_header: true,
    mega_menu_config: null,
  });

  const markDirty = useCallback(() => setDirty(true), []);

  const updateConfig = useCallback((partial: Partial<HeaderMenuConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
    markDirty();
  }, [markDirty]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await headerMenuService.get();
      setConfig(res);
    } catch {
      // First load - defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await headerMenuService.update(config);
      notify.success('Header settings saved successfully');
      setDirty(false);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to save header settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Header & Menu Builder</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GiSave className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Utility Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Utility Bar</h2>
          </div>
          <Toggle
            checked={config.utility_bar_enabled}
            onChange={v => updateConfig({ utility_bar_enabled: v })}
            id="utility-bar-toggle"
          />
        </div>

        {config.utility_bar_enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={config.utility_bar_phone}
                  onChange={e => updateConfig({ utility_bar_phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Free Shipping Text</label>
                <input
                  type="text"
                  value={config.utility_bar_text_free_shipping}
                  onChange={e => updateConfig({ utility_bar_text_free_shipping: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Text</label>
                <input
                  type="text"
                  value={config.utility_bar_text_discount}
                  onChange={e => updateConfig({ utility_bar_text_discount: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.utility_bar_bg_color}
                      onChange={e => updateConfig({ utility_bar_bg_color: e.target.value })}
                      className="w-9 h-9 p-0.5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.utility_bar_bg_color}
                      onChange={e => updateConfig({ utility_bar_bg_color: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.utility_bar_text_color}
                      onChange={e => updateConfig({ utility_bar_text_color: e.target.value })}
                      className="w-9 h-9 p-0.5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.utility_bar_text_color}
                      onChange={e => updateConfig({ utility_bar_text_color: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Header Settings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'show_search_bar', label: 'Search Bar', icon: Search },
            { key: 'show_wishlist_icon', label: 'Wishlist Icon', icon: Heart },
            { key: 'show_account_icon', label: 'Account Icon', icon: User },
            { key: 'show_cart_icon', label: 'Cart Icon', icon: User },
            { key: 'sticky_header', label: 'Sticky Header', icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
              </div>
              <Toggle
                checked={config[key as keyof HeaderMenuConfig] as boolean}
                onChange={v => updateConfig({ [key]: v })}
                id={`header-${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Preview</h2>
        </div>

        <div className="border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
          {/* Utility bar preview */}
          {config.utility_bar_enabled && (
            <div
              className="flex items-center justify-between px-4 py-1.5 text-xs"
              style={{ backgroundColor: config.utility_bar_bg_color, color: config.utility_bar_text_color }}
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {config.utility_bar_phone}</span>
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {config.utility_bar_text_free_shipping}</span>
                <span className="flex items-center gap-1"><BadgePercent className="w-3 h-3" /> {config.utility_bar_text_discount}</span>
              </div>
              <div className="flex items-center gap-3 opacity-80">
                <span>Track Order</span>
                <span>Help</span>
              </div>
            </div>
          )}

          {/* Main header preview */}
          <div className="px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-600 to-purple-600" />
                <div className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  UIMS<span className="text-indigo-600">.</span>
                </div>
              </div>

              {config.show_search_bar && (
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <div className="w-full h-8 rounded-full border border-gray-200 bg-gray-50" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 ml-auto">
                {config.show_wishlist_icon && <Heart className="w-4 h-4 text-gray-400" />}
                {config.show_account_icon && <User className="w-4 h-4 text-gray-400" />}
                {config.show_cart_icon && (
                  <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                    <span className="text-[10px] font-medium text-gray-500">Empty</span>
                    <span className="text-xs font-bold text-gray-800">৳0</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
