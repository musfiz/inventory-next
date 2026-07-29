'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PanelBottom,
  Loader2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Monitor,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  Gift,
  Sparkles,
  Star,
  Zap,
  HeartHandshake,
  Package,
  Clock,
  BadgePercent,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Music2,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import footerService from '@/services/footerService';
import { notify } from '@/lib/notifications';
import type {
  FooterConfig,
  FooterColumn,
  FooterLink,
  ValuePropItem,
  SocialLink,
  PaymentBadge,
} from '@/types/api.types';

const VALUE_PROP_ICONS: Record<string, any> = {
  Truck, RotateCcw, ShieldCheck, Headphones, Gift, Sparkles,
  Star, Zap, HeartHandshake, Package, Clock, BadgePercent,
};

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'twitter', label: 'Twitter', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'tiktok', label: 'TikTok', icon: Music2 },
];

const DEFAULT_PAYMENT_BADGES = [
  'Visa', 'Mastercard', 'bKash', 'Nagad', 'Rocket', 'COD', 'Amex', 'PayPal', 'Stripe',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function emptyColumnLink(sort_order: number): FooterLink {
  return { id: generateId(), label: '', url: '', sort_order, open_in_new_tab: false, is_active: true };
}

function emptyColumn(sort_order: number): FooterColumn {
  return { id: generateId(), title: '', sort_order, links: [] };
}

function emptyValueProp(sort_order: number): ValuePropItem {
  return { id: generateId(), icon: 'Truck', title: '', description: '', is_active: true, sort_order };
}

function emptySocialLink(): SocialLink {
  return { id: generateId(), platform: 'facebook', url: '', is_active: true };
}

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
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export default function FooterBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [config, setConfig] = useState<FooterConfig>({
    value_props_enabled: true,
    value_props: [
      { id: generateId(), icon: 'Truck', title: 'Free Shipping', description: 'On orders over \u09F75,000', is_active: true, sort_order: 0 },
      { id: generateId(), icon: 'RotateCcw', title: 'Easy Returns', description: '7-day return policy', is_active: true, sort_order: 1 },
      { id: generateId(), icon: 'ShieldCheck', title: 'Secure Payment', description: '100% protected checkout', is_active: true, sort_order: 2 },
      { id: generateId(), icon: 'Headphones', title: '24/7 Support', description: 'Dedicated customer care', is_active: true, sort_order: 3 },
    ],
    newsletter_enabled: true,
    newsletter_title: 'Subscribe to our newsletter',
    newsletter_subtitle: 'Be the first to get exclusive deals, new arrivals & insider updates.',
    columns: [
      {
        id: generateId(), title: 'Shop', sort_order: 0,
        links: [
          { id: generateId(), label: 'New Arrivals', url: '/store/products?filter=new', sort_order: 0, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Best Sellers', url: '/store/products?filter=bestseller', sort_order: 1, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Featured Products', url: '/store/products?filter=featured', sort_order: 2, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Flash Sale', url: '/store/products?filter=sale', sort_order: 3, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'All Categories', url: '/store/products', sort_order: 4, open_in_new_tab: false, is_active: true },
        ],
      },
      {
        id: generateId(), title: 'Customer Service', sort_order: 1,
        links: [
          { id: generateId(), label: 'Contact Us', url: '/help', sort_order: 0, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Track Order', url: '/order/track', sort_order: 1, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Returns & Refunds', url: '/help/returns', sort_order: 2, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Shipping Policy', url: '/help/shipping', sort_order: 3, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'FAQs', url: '/help/faq', sort_order: 4, open_in_new_tab: false, is_active: true },
        ],
      },
      {
        id: generateId(), title: 'About UIMS', sort_order: 2,
        links: [
          { id: generateId(), label: 'Our Story', url: '/about', sort_order: 0, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Careers', url: '/careers', sort_order: 1, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Press', url: '/press', sort_order: 2, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Sell on UIMS', url: '/sell', sort_order: 3, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Affiliates', url: '/affiliates', sort_order: 4, open_in_new_tab: false, is_active: true },
        ],
      },
      {
        id: generateId(), title: 'Legal', sort_order: 3,
        links: [
          { id: generateId(), label: 'Terms & Conditions', url: '/terms', sort_order: 0, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Privacy Policy', url: '/privacy', sort_order: 1, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Cookie Policy', url: '/cookies', sort_order: 2, open_in_new_tab: false, is_active: true },
          { id: generateId(), label: 'Accessibility', url: '/accessibility', sort_order: 3, open_in_new_tab: false, is_active: true },
        ],
      },
    ],
    contact_address: 'House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh',
    contact_phone: '+880 1700-000000',
    contact_email: 'support@uims.shop',
    about_text: 'Your one-stop online shop for quality products across electronics, fashion, home & living, and more.',
    social_links: [
      { id: generateId(), platform: 'facebook', url: '', is_active: true },
      { id: generateId(), platform: 'instagram', url: '', is_active: true },
      { id: generateId(), platform: 'twitter', url: '', is_active: true },
      { id: generateId(), platform: 'youtube', url: '', is_active: true },
    ],
    copyright_text: '\u00A9 {year} UIMS Store. All rights reserved.',
    show_payment_badges: true,
    payment_badges: [
      { id: generateId(), name: 'Visa', is_active: true },
      { id: generateId(), name: 'Mastercard', is_active: true },
      { id: generateId(), name: 'bKash', is_active: true },
      { id: generateId(), name: 'Nagad', is_active: true },
      { id: generateId(), name: 'Rocket', is_active: true },
      { id: generateId(), name: 'COD', is_active: true },
    ],
  });

  const markDirty = useCallback(() => setDirty(true), []);

  const updateConfig = useCallback(
    (partial: Partial<FooterConfig>) => {
      setConfig(prev => ({ ...prev, ...partial }));
      markDirty();
    },
    [markDirty]
  );

  // ── Column sub‑state ──────────────────────────────────────────────
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState<FooterColumn | null>(null);
  const [columnForm, setColumnForm] = useState<FooterColumn>(emptyColumn(0));

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkParentColId, setLinkParentColId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [linkForm, setLinkForm] = useState<FooterLink>(emptyColumnLink(0));

  // ── Value‑prop sub‑state ──────────────────────────────────────────
  const [showValuePropForm, setShowValuePropForm] = useState(false);
  const [editingValueProp, setEditingValueProp] = useState<ValuePropItem | null>(null);
  const [vpForm, setVpForm] = useState<ValuePropItem>(emptyValueProp(0));

  // ── Social‑link sub‑state ─────────────────────────────────────────
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [socialForm, setSocialForm] = useState<SocialLink>(emptySocialLink());

  // ── Data fetching ─────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await footerService.get();
      setConfig(res);
    } catch {
      // defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await footerService.update(config);
      notify.success('Footer saved successfully');
      setDirty(false);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to save footer settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Column CRUD ───────────────────────────────────────────────────
  const openAddColumn = () => {
    setEditingColumn(null);
    setColumnForm(emptyColumn(config.columns.length));
    setShowColumnForm(true);
  };

  const openEditColumn = (col: FooterColumn) => {
    setEditingColumn(col);
    setColumnForm({ ...col, links: [...col.links] });
    setShowColumnForm(true);
  };

  const closeColumnForm = () => {
    setShowColumnForm(false);
    setEditingColumn(null);
  };

  const saveColumn = () => {
    if (!columnForm.title.trim()) {
      notify.error('Column title is required');
      return;
    }
    let updated: FooterColumn[];
    if (editingColumn) {
      updated = config.columns.map(c => (c.id === editingColumn.id ? { ...columnForm } : c));
    } else {
      updated = [...config.columns, { ...columnForm, id: generateId(), sort_order: config.columns.length }];
    }
    updateConfig({ columns: updated });
    closeColumnForm();
    notify.success(editingColumn ? 'Column updated' : 'Column added');
  };

  const removeColumn = (id: string) => {
    updateConfig({ columns: config.columns.filter(c => c.id !== id) });
    notify.success('Column removed');
  };

  const moveColumn = (id: string, direction: -1 | 1) => {
    const idx = config.columns.findIndex(c => c.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= config.columns.length) return;
    const cols = [...config.columns];
    [cols[idx], cols[newIdx]] = [cols[newIdx], cols[idx]];
    updateConfig({ columns: cols.map((c, i) => ({ ...c, sort_order: i })) });
  };

  // ── Link CRUD (nested inside columns) ─────────────────────────────
  const openAddLink = (colId: string) => {
    setLinkParentColId(colId);
    setEditingLink(null);
    const col = config.columns.find(c => c.id === colId);
    setLinkForm(emptyColumnLink(col ? col.links.length : 0));
    setShowLinkForm(true);
  };

  const openEditLink = (colId: string, link: FooterLink) => {
    setLinkParentColId(colId);
    setEditingLink(link);
    setLinkForm({ ...link });
    setShowLinkForm(true);
  };

  const closeLinkForm = () => {
    setShowLinkForm(false);
    setLinkParentColId(null);
    setEditingLink(null);
  };

  const updateColumnLinks = (colId: string, links: FooterLink[]) => {
    updateConfig({
      columns: config.columns.map(c => (c.id === colId ? { ...c, links } : c)),
    });
  };

  const saveLink = () => {
    if (!linkParentColId) return;
    if (!linkForm.label.trim()) {
      notify.error('Link label is required');
      return;
    }
    if (!linkForm.url.trim()) {
      notify.error('Link URL is required');
      return;
    }
    const col = config.columns.find(c => c.id === linkParentColId);
    if (!col) return;

    let updated: FooterLink[];
    if (editingLink) {
      updated = col.links.map(l => (l.id === editingLink.id ? { ...linkForm } : l));
    } else {
      updated = [...col.links, { ...linkForm, id: generateId(), sort_order: col.links.length }];
    }
    updateColumnLinks(linkParentColId, updated);
    closeLinkForm();
    notify.success(editingLink ? 'Link updated' : 'Link added');
  };

  const removeLink = (colId: string, linkId: string) => {
    const col = config.columns.find(c => c.id === colId);
    if (!col) return;
    updateColumnLinks(colId, col.links.filter(l => l.id !== linkId));
    notify.success('Link removed');
  };

  const moveLinkInColumn = (colId: string, linkId: string, direction: -1 | 1) => {
    const col = config.columns.find(c => c.id === colId);
    if (!col) return;
    const idx = col.links.findIndex(l => l.id === linkId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= col.links.length) return;
    const links = [...col.links];
    [links[idx], links[newIdx]] = [links[newIdx], links[idx]];
    updateColumnLinks(colId, links.map((l, i) => ({ ...l, sort_order: i })));
  };

  // ── Value‑prop CRUD ───────────────────────────────────────────────
  const openAddValueProp = () => {
    setEditingValueProp(null);
    setVpForm(emptyValueProp(config.value_props.length));
    setShowValuePropForm(true);
  };

  const openEditValueProp = (vp: ValuePropItem) => {
    setEditingValueProp(vp);
    setVpForm({ ...vp });
    setShowValuePropForm(true);
  };

  const closeValuePropForm = () => {
    setShowValuePropForm(false);
    setEditingValueProp(null);
  };

  const saveValueProp = () => {
    if (!vpForm.title.trim()) {
      notify.error('Value prop title is required');
      return;
    }
    let updated: ValuePropItem[];
    if (editingValueProp) {
      updated = config.value_props.map(v => (v.id === editingValueProp.id ? { ...vpForm } : v));
    } else {
      updated = [...config.value_props, { ...vpForm, id: generateId(), sort_order: config.value_props.length }];
    }
    updateConfig({ value_props: updated });
    closeValuePropForm();
    notify.success(editingValueProp ? 'Value prop updated' : 'Value prop added');
  };

  const removeValueProp = (id: string) => {
    updateConfig({ value_props: config.value_props.filter(v => v.id !== id) });
    notify.success('Value prop removed');
  };

  const moveValueProp = (id: string, direction: -1 | 1) => {
    const idx = config.value_props.findIndex(v => v.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= config.value_props.length) return;
    const items = [...config.value_props];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    updateConfig({ value_props: items.map((v, i) => ({ ...v, sort_order: i })) });
  };

  // ── Social‑link CRUD ──────────────────────────────────────────────
  const openAddSocial = () => {
    setEditingSocial(null);
    setSocialForm(emptySocialLink());
    setShowSocialForm(true);
  };

  const openEditSocial = (sl: SocialLink) => {
    setEditingSocial(sl);
    setSocialForm({ ...sl });
    setShowSocialForm(true);
  };

  const closeSocialForm = () => {
    setShowSocialForm(false);
    setEditingSocial(null);
  };

  const saveSocial = () => {
    if (!socialForm.url.trim()) {
      notify.error('Social link URL is required');
      return;
    }
    let updated: SocialLink[];
    if (editingSocial) {
      updated = config.social_links.map(s => (s.id === editingSocial.id ? { ...socialForm } : s));
    } else {
      updated = [...config.social_links, { ...socialForm, id: generateId() }];
    }
    updateConfig({ social_links: updated });
    closeSocialForm();
    notify.success(editingSocial ? 'Social link updated' : 'Social link added');
  };

  const removeSocial = (id: string) => {
    updateConfig({ social_links: config.social_links.filter(s => s.id !== id) });
    notify.success('Social link removed');
  };

  // ── Payment badge toggle ──────────────────────────────────────────
  const togglePaymentBadge = (badgeId: string) => {
    updateConfig({
      payment_badges: config.payment_badges.map(b =>
        b.id === badgeId ? { ...b, is_active: !b.is_active } : b
      ),
    });
  };

  const addPaymentBadge = (name: string) => {
    if (config.payment_badges.some(b => b.name === name)) return;
    updateConfig({
      payment_badges: [...config.payment_badges, { id: generateId(), name, is_active: true }],
    });
  };

  const removePaymentBadge = (badgeId: string) => {
    updateConfig({ payment_badges: config.payment_badges.filter(b => b.id !== badgeId) });
  };

  // ── Helpers for preview ───────────────────────────────────────────
  const copyrightDisplay = (config.copyright_text || '').replace('{year}', String(new Date().getFullYear()));
  const activeBadges = config.payment_badges.filter(b => b.is_active);

  const getSocialIcon = (platform: string) => {
    const found = SOCIAL_PLATFORMS.find(p => p.value === platform);
    return found ? found.icon : Facebook;
  };

  const getSocialColor = (platform: string) => {
    const map: Record<string, string> = {
      facebook: 'hover:bg-blue-500 hover:border-blue-500',
      instagram: 'hover:bg-pink-500 hover:border-pink-500',
      twitter: 'hover:bg-sky-500 hover:border-sky-500',
      youtube: 'hover:bg-red-500 hover:border-red-500',
      linkedin: 'hover:bg-blue-700 hover:border-blue-700',
      tiktok: 'hover:bg-gray-900 hover:border-gray-900 dark:hover:bg-gray-100 dark:hover:border-gray-100 dark:hover:text-gray-900',
    };
    return map[platform] || 'hover:bg-gray-600 hover:border-gray-600';
  };

  const getBadgeColor = (name: string) => {
    const map: Record<string, string> = {
      Visa: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
      Mastercard: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
      'Amex': 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
      PayPal: 'text-blue-800 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
      Stripe: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
      bKash: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
      Nagad: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      Rocket: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
      COD: 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };
    return map[name] || 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  };

  const activeSocialLinks = config.social_links.filter(s => s.is_active && (s.url || '').trim());

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PanelBottom className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Footer Builder</h1>
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

      {/* ── Value Props Section ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Value Props Strip</h2>
          </div>
          <Toggle
            checked={config.value_props_enabled}
            onChange={v => updateConfig({ value_props_enabled: v })}
            id="value-props-toggle"
          />
        </div>

        {config.value_props_enabled && (
          <>
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={openAddValueProp}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Value Prop
              </button>
            </div>

            {/* Value-prop form */}
            {showValuePropForm && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                    <select
                      value={vpForm.icon}
                      onChange={e => setVpForm(f => ({ ...f, icon: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {Object.keys(VALUE_PROP_ICONS).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={vpForm.title}
                      onChange={e => setVpForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Free Shipping"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={vpForm.description}
                      onChange={e => setVpForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. On orders over \u09F75,000"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vpForm.is_active}
                    onChange={e => setVpForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={saveValueProp}
                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    {editingValueProp ? 'Update' : 'Add'}
                  </button>
                  <button
                    onClick={closeValuePropForm}
                    className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {config.value_props.length === 0 ? (
              <div className="flex items-center justify-center h-16 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
                <p className="text-xs text-gray-400">No value props yet. Click &quot;Add Value Prop&quot; to create one.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {config.value_props.map((vp, idx) => {
                  const Icon = VALUE_PROP_ICONS[vp.icon] || Truck;
                  return (
                    <div
                      key={vp.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />
                      <Icon className={`w-4 h-4 shrink-0 ${vp.is_active ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate ${vp.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                          {vp.title || 'Untitled'}
                        </span>
                        <p className="text-xs text-gray-400 truncate">{vp.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveValueProp(vp.id, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveValueProp(vp.id, 1)} disabled={idx === config.value_props.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditValueProp(vp)} className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => removeValueProp(vp.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer" title="Remove"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Newsletter Section ───────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Newsletter Section</h2>
          </div>
          <Toggle
            checked={config.newsletter_enabled}
            onChange={v => updateConfig({ newsletter_enabled: v })}
            id="newsletter-toggle"
          />
        </div>

        {config.newsletter_enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={config.newsletter_title}
                  onChange={e => updateConfig({ newsletter_title: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={config.newsletter_subtitle}
                  onChange={e => updateConfig({ newsletter_subtitle: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Columns ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PanelBottom className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Footer Columns</h2>
          </div>
          <button
            onClick={openAddColumn}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Column
          </button>
        </div>

        {/* Column form */}
        {showColumnForm && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Column Title</label>
              <input
                type="text"
                value={columnForm.title}
                onChange={e => setColumnForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Shop"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveColumn} className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer">
                {editingColumn ? 'Update' : 'Add'}
              </button>
              <button onClick={closeColumnForm} className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {config.columns.length === 0 ? (
          <div className="flex items-center justify-center h-16 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
            <p className="text-xs text-gray-400">No columns yet. Click &quot;Add Column&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.columns.map((col, colIdx) => (
              <div key={col.id} className="border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-750 overflow-hidden">
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                  <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {col.title || 'Untitled Column'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveColumn(col.id, -1)} disabled={colIdx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveColumn(col.id, 1)} disabled={colIdx === config.columns.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEditColumn(col)} className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer" title="Edit column title">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => removeColumn(col.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer" title="Remove column"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Links within column */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Links</span>
                    <button
                      onClick={() => openAddLink(col.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Add Link
                    </button>
                  </div>

                  {/* Inline link form */}
                  {showLinkForm && linkParentColId === col.id && (
                    <div className="mb-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Label</label>
                          <input
                            type="text"
                            value={linkForm.label}
                            onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))}
                            placeholder="Link label"
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">URL</label>
                          <input
                            type="text"
                            value={linkForm.url}
                            onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
                            placeholder="/help or https://"
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={linkForm.open_in_new_tab} onChange={e => setLinkForm(f => ({ ...f, open_in_new_tab: e.target.checked }))} className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">New Tab</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={linkForm.is_active} onChange={e => setLinkForm(f => ({ ...f, is_active: e.target.checked }))} className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Active</span>
                        </label>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={saveLink} className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer">
                          {editingLink ? 'Update' : 'Add'}
                        </button>
                        <button onClick={closeLinkForm} className="px-2 py-0.5 bg-gray-500 text-white text-[10px] font-medium rounded hover:bg-gray-600 transition-colors cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {col.links.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No links yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {col.links.map((link, linkIdx) => (
                        <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-500">
                          <GripVertical className="w-3 h-3 text-gray-400 shrink-0 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-medium truncate ${link.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                              {link.label || 'Untitled'}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-2">{link.url}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => moveLinkInColumn(col.id, link.id, -1)} disabled={linkIdx === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => moveLinkInColumn(col.id, link.id, 1)} disabled={linkIdx === col.links.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                            <button onClick={() => openEditLink(col.id, link)} className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => removeLink(col.id, link.id)} className="p-0.5 text-gray-400 hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Contact Info & About ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact Info & About</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">About Text</label>
            <textarea
              value={config.about_text}
              onChange={e => updateConfig({ about_text: e.target.value })}
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={config.contact_address}
                onChange={e => updateConfig({ contact_address: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="text"
                value={config.contact_phone}
                onChange={e => updateConfig({ contact_phone: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="text"
                value={config.contact_email}
                onChange={e => updateConfig({ contact_email: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Social Links ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Facebook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Social Links</h2>
          </div>
          <button
            onClick={openAddSocial}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Social Link
          </button>
        </div>

        {showSocialForm && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <select
                  value={socialForm.platform}
                  onChange={e => setSocialForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {SOCIAL_PLATFORMS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="text"
                  value={socialForm.url}
                  onChange={e => setSocialForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={socialForm.is_active}
                onChange={e => setSocialForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <div className="flex gap-2">
              <button onClick={saveSocial} className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer">
                {editingSocial ? 'Update' : 'Add'}
              </button>
              <button onClick={closeSocialForm} className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {config.social_links.length === 0 ? (
          <div className="flex items-center justify-center h-16 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
            <p className="text-xs text-gray-400">No social links yet. Click &quot;Add Social Link&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {config.social_links.map(sl => {
              const PlatIcon = getSocialIcon(sl.platform);
              return (
                <div key={sl.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
                  <PlatIcon className={`w-4 h-4 shrink-0 ${sl.is_active ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate ${sl.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                      {SOCIAL_PLATFORMS.find(p => p.value === sl.platform)?.label || sl.platform}
                    </span>
                    <p className="text-xs text-gray-400 truncate">{sl.url || '(no URL)'}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEditSocial(sl)} className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => removeSocial(sl.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer" title="Remove"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Copyright & Payment Badges ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Copyright & Bottom Bar</h2>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Copyright Text <span className="text-gray-400 font-normal">(use {'{year}'} for dynamic year)</span>
            </label>
            <input
              type="text"
              value={config.copyright_text}
              onChange={e => updateConfig({ copyright_text: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Show Payment Badges</span>
            <Toggle
              checked={config.show_payment_badges}
              onChange={v => updateConfig({ show_payment_badges: v })}
              id="payment-badges-toggle"
            />
          </div>

          {config.show_payment_badges && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Active Badges</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {config.payment_badges.map(badge => (
                  <span
                    key={badge.id}
                    onClick={() => togglePaymentBadge(badge.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-bold cursor-pointer transition-all ${badge.is_active
                        ? getBadgeColor(badge.name) + ' ring-1 ring-indigo-400'
                        : 'text-gray-400 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 line-through'
                      }`}
                  >
                    {badge.name}
                    <X className="w-3 h-3 ml-0.5 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removePaymentBadge(badge.id); }} />
                  </span>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Add Badge</label>
                <div className="flex gap-2">
                  <select
                    id="add-badge-select"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value=""
                    onChange={e => { if (e.target.value) { addPaymentBadge(e.target.value); e.target.value = ''; } }}
                  >
                    <option value="" disabled>Select a badge...</option>
                    {DEFAULT_PAYMENT_BADGES.filter(n => !config.payment_badges.some(b => b.name === n)).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Preview ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Preview</h2>
        </div>

        <div className="border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
          {/* Value props preview */}
          {config.value_props_enabled && config.value_props.filter(v => v.is_active).length > 0 && (
            <div className="bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {config.value_props.filter(v => v.is_active).map(vp => {
                  const Icon = VALUE_PROP_ICONS[vp.icon] || Truck;
                  return (
                    <div key={vp.id} className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{vp.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{vp.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Newsletter preview */}
          {config.newsletter_enabled && (
            <div className="bg-linear-to-r from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{config.newsletter_title}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400">{config.newsletter_subtitle}</p>
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-32 rounded-full border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700" />
                  <div className="h-6 rounded-full bg-indigo-600 px-3 flex items-center">
                    <span className="text-[10px] font-bold text-white">Subscribe</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main footer preview */}
          <div className="px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
              {/* Brand column */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-linear-to-br from-indigo-600 to-purple-600" />
                  <span className="text-sm font-black text-gray-900 dark:text-white">UIMS<span className="text-indigo-600">.</span></span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{config.about_text}</p>
                <div className="mt-2 space-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {config.contact_address && (
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-500" />{config.contact_address}</div>
                  )}
                  {config.contact_phone && (
                    <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-indigo-500" />{config.contact_phone}</div>
                  )}
                  {config.contact_email && (
                    <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-indigo-500" />{config.contact_email}</div>
                  )}
                </div>
                {activeSocialLinks.length > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    {activeSocialLinks.map(sl => {
                      const SI = getSocialIcon(sl.platform);
                      return <SI key={sl.id} className="w-3.5 h-3.5 text-gray-400" />;
                    })}
                  </div>
                )}
              </div>

              {/* Column links */}
              {config.columns.map(col => {
                const activeColLinks = col.links.filter(l => l.is_active);
                if (activeColLinks.length === 0) return null;
                return (
                  <div key={col.id}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">{col.title}</p>
                    <ul className="space-y-1.5">
                      {activeColLinks.map(link => (
                        <li key={link.id} className="text-[10px] text-gray-500 dark:text-gray-400">{link.label}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom bar preview */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{copyrightDisplay}</span>
              {config.show_payment_badges && activeBadges.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400">We accept:</span>
                  {activeBadges.map(b => (
                    <span key={b.id} className={`${getBadgeColor(b.name)} rounded border px-1.5 py-0.5 text-[8px] font-bold`}>{b.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
