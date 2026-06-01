'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { notify, confirm } from '@/lib/notifications';
import accountService from '@/services/accountService';
import type { Account, AccountFormData, AccountType, AccountSubtype } from '@/types/accounting.types';
import { usePermissions } from '@/hooks/use-permissions';
// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense', 'contra'];

const SUBTYPES_BY_TYPE: Record<string, { value: AccountSubtype; label: string }[]> = {
  asset: [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'mobile_banking', label: 'Mobile Banking' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'accounts_receivable', label: 'Accounts Receivable' },
    { value: 'fixed_asset', label: 'Fixed Asset' },
    { value: 'tax_receivable', label: 'Tax Receivable' },
    { value: 'other', label: 'Other' },
  ],
  liability: [
    { value: 'accounts_payable', label: 'Accounts Payable' },
    { value: 'current_liability', label: 'Current Liability' },
    { value: 'long_term_liability', label: 'Long Term Liability' },
    { value: 'tax_liability', label: 'Tax Liability' },
    { value: 'other', label: 'Other' },
  ],
  equity: [
    { value: 'equity', label: 'Equity' },
    { value: 'retained_earnings', label: 'Retained Earnings' },
  ],
  revenue: [
    { value: 'sales_revenue', label: 'Sales Revenue' },
    { value: 'other', label: 'Other Income' },
  ],
  expense: [
    { value: 'purchase_expense', label: 'Purchase Expense' },
    { value: 'operating_expense', label: 'Operating Expense' },
    { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold' },
    { value: 'other', label: 'Other' },
  ],
  contra: [
    { value: 'discount', label: 'Discount' },
    { value: 'return', label: 'Return' },
    { value: 'other', label: 'Other' },
  ],
};

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-600 dark:text-blue-400',
  liability: 'text-red-600 dark:text-red-400',
  equity: 'text-purple-600 dark:text-purple-400',
  revenue: 'text-green-600 dark:text-green-400',
  expense: 'text-orange-600 dark:text-orange-400',
  contra: 'text-gray-600 dark:text-gray-400',
};

function typeBadge(type: string) {
  const cls = TYPE_COLORS[type] ?? 'text-gray-500';
  return <span className={`text-xs font-medium capitalize ${cls}`}>{type}</span>;
}

const emptyForm: AccountFormData = {
  code: '', name: '', account_type: 'asset', account_subtype: 'cash',
  parent_id: null, description: '', currency: 'BDT',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { hasPermission } = usePermissions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: true, liability: true, equity: true, revenue: true, expense: true, contra: false,
  });
  const [search, setSearch] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await accountService.list({ per_page: 200, search });
      setAccounts(res.data?.data?.data ?? res.data?.data ?? []);
    } catch {
      notify.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [search]);

  const handleSeedDefaults = async () => {
    if (!await confirm({ title: 'Seed Default Accounts?', text: 'Existing accounts with same codes will be skipped.', icon: 'question', confirmButtonText: 'Yes, Seed', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    setSeeding(true);
    try {
      await accountService.seedDefaults();
      notify.success('Default Chart of Accounts created!');
      fetchAccounts();
    } catch {
      notify.error('Failed to seed defaults');
    } finally {
      setSeeding(false);
    }
  };

  const openCreate = () => {
    setEditAccount(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (account: Account) => {
    if (account.is_system) { notify.error('System accounts cannot be edited.'); return; }
    setEditAccount(account);
    setForm({
      code: account.code, name: account.name,
      account_type: account.account_type, account_subtype: account.account_subtype,
      parent_id: account.parent_id, description: account.description ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = async (account: Account) => {
    if (account.is_system) { notify.error('System accounts cannot be deleted.'); return; }
    if (!await confirm({ title: 'Delete Account?', text: `${account.code} - ${account.name}`, icon: 'warning', confirmButtonText: 'Delete', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await accountService.destroy(account.id);
      notify.success('Account deleted.');
      fetchAccounts();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Delete failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editAccount) {
        await accountService.update(editAccount.id, form);
        notify.success('Account updated.');
      } else {
        await accountService.store(form);
        notify.success('Account created.');
      }
      setShowForm(false);
      fetchAccounts();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Group accounts by type
  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter(a => a.account_type === type);
    return acc;
  }, {} as Record<string, Account[]>);

  const toggleType = (type: string) =>
    setExpandedTypes(p => ({ ...p, [type]: !p[type] }));

  const subtypeOptions = SUBTYPES_BY_TYPE[form.account_type] ?? [];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-sm text-gray-500">Manage your accounting structure</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded"
          >
            <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
            Seed Defaults
          </button>
          {hasPermission('create_accounts') && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              <Plus size={14} />
              New Account
            </button>
          )}
        </div>
      </div>

      {/* Account Tree */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Code</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Account Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Type</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Balance</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">Active</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ACCOUNT_TYPES.map(type => (
                <>
                  {/* Type header row */}
                  <tr
                    key={`header-${type}`}
                    className="bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none"
                    onClick={() => toggleType(type)}
                  >
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {expandedTypes[type] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className={`font-semibold capitalize text-sm ${TYPE_COLORS[type]}`}>{type}s</span>
                        <span className="text-xs text-gray-400">({grouped[type]?.length ?? 0})</span>
                      </div>
                    </td>
                  </tr>
                  {/* Account rows */}
                  {expandedTypes[type] && grouped[type]?.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{account.code}</td>
                      <td className="px-4 py-2">
                        <span className="text-gray-900 dark:text-white">{account.name}</span>
                        {account.is_system && (
                          <span className="ml-1 text-xs text-gray-400">(system)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{typeBadge(account.account_type)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {Number(account.balance).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`w-2 h-2 rounded-full inline-block ${account.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(account)}
                            disabled={account.is_system}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(account)}
                            disabled={account.is_system}
                            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {editAccount ? 'Edit Account' : 'New Account'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editAccount}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
                    placeholder="e.g. 1101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type *</label>
                  <select
                    required
                    value={form.account_type}
                    onChange={e => {
                      const t = e.target.value as AccountType;
                      const first = SUBTYPES_BY_TYPE[t]?.[0]?.value ?? 'other';
                      setForm(p => ({ ...p, account_type: t, account_subtype: first }));
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subtype *</label>
                  <select
                    required
                    value={form.account_subtype}
                    onChange={e => setForm(p => ({ ...p, account_subtype: e.target.value as AccountSubtype }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {subtypeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description ?? ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm border rounded dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60">
                  {saving ? 'Saving…' : (editAccount ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
