'use client';

import { Fragment, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, ChevronRight, ChevronDown, Search, Layers3 } from 'lucide-react';
import { notify, confirm } from '@/lib/notifications';
import accountService from '@/services/accountService';
import type { Account, AccountFormData, AccountType, AccountSubtype } from '@/types/accounting.types';
import { usePermissions } from '@/hooks/use-permissions';
import TenantSelect from '@/components/ui/tenant-select';
import { useAuthStore } from '@/stores/auth-store';
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
  const { hasPermission, isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: false, liability: false, equity: false, revenue: false, expense: false, contra: false,
  });
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const fetchAccounts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, unknown> = { per_page: 200, search };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await accountService.list(params);
      setAccounts(res.data ?? []);
    } catch (error) {
      console.error('Failed to load accounts', error);
      setAccounts([]);
      setLoadError('Failed to load chart of accounts. Please try again.');
      notify.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [search, selectedTenantId]);

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

  const totalAccounts = accounts.length;
  const systemAccounts = accounts.filter(account => account.is_system).length;
  const activeAccounts = accounts.filter(account => account.is_active).length;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              <Layers3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Accounting
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage the account structure, balances, and default seed accounts.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {isSuperAdmin && (
              <div className="w-full sm:w-48">
                <TenantSelect
                  value={selectedTenantId}
                  onChange={(tid) => setSelectedTenantId(tid || '')}
                  placeholder="All Tenants"
                />
              </div>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                placeholder="Search accounts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
              />
            </div>
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw
                size={14}
                className={seeding ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              Seed Defaults
            </button>
            {hasPermission('create_accounts') && (
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus size={14} />
                New Account
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Accounts</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalAccounts}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Accounts</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{activeAccounts}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">System Accounts</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{systemAccounts}</div>
          </div>
        </div>
      </div>

      {/* Account Tree */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Loading accounts...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {loadError ? (
            <div className="bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {loadError}
            </div>
          ) : null}

          {accounts.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-white">No accounts found</div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Seed the default chart or refine your search to populate the table.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Account Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Balance</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Active</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ACCOUNT_TYPES.map(type => (
                    <Fragment key={type}>
                      <tr
                        className="cursor-pointer select-none bg-gray-50/80 transition-colors hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800"
                        onClick={() => toggleType(type)}
                      >
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {expandedTypes[type] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className={`text-sm font-semibold capitalize ${TYPE_COLORS[type]}`}>{type}s</span>
                            <span className="text-xs text-gray-400">({grouped[type]?.length ?? 0})</span>
                          </div>
                        </td>
                      </tr>
                      {expandedTypes[type] && grouped[type]?.map(account => (
                        <tr key={account.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{account.code}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{account.account_subtype.replace(/_/g, ' ')}</span>
                                {account.is_system && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                                    System
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{typeBadge(account.account_type)}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                            {Number(account.balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                              title={account.is_active ? 'Active' : 'Inactive'}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {hasPermission('update-account') && (
                                <button
                                  onClick={() => openEdit(account)}
                                  disabled={account.is_system}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:border-blue-900 dark:hover:bg-blue-950/40"
                                  title="Edit"
                                 aria-label="Edit">
                                  <Pencil size={14} />
                                </button>
                              )}
                              {hasPermission('delete-account') && (
                                <button
                                  onClick={() => handleDelete(account)}
                                  disabled={account.is_system}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:border-red-900 dark:hover:bg-red-950/40"
                                  title="Delete"
                                 aria-label="Delete">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4">
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
                    className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 disabled:opacity-50"
                    placeholder="e.g. 1101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
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
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
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
                    className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
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
                    className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
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
                  className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-60">
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
