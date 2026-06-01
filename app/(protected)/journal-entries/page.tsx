'use client';

import { useState } from 'react';
import { Plus, Check, RotateCcw, Eye } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import journalService from '@/services/journalService';
import accountService from '@/services/accountService';
import type { JournalEntry, JournalEntryFormData } from '@/types/accounting.types';
import type { Account } from '@/types/accounting.types';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reversed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function statusBadge(status?: string) {
  const cls = STATUS_COLORS[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>{status ?? '-'}</span>;
}

const emptyLine = () => ({ account_id: 0, debit: 0, credit: 0, description: '' });

const emptyForm: JournalEntryFormData = {
  entry_date: new Date().toISOString().split('T')[0],
  description: '',
  notes: '',
  lines: [emptyLine(), emptyLine()],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function JournalEntriesPage() {
  const { hasPermission } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<JournalEntryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [accountOptions, setAccountOptions] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const refreshTable = () => setTableKey(k => k + 1);

  const loadAccounts = async () => {
    if (accountOptions.length > 0) return;
    setLoadingAccounts(true);
    try {
      const res = await accountService.dropdown();
      setAccountOptions(res.data?.data ?? []);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const openCreate = async () => {
    await loadAccounts();
    setForm(emptyForm);
    setShowForm(true);
  };

  const viewDetail = async (entry: JournalEntry) => {
    try {
      const res = await journalService.show(entry.id);
      setShowDetail(res.data?.data ?? entry);
    } catch { setShowDetail(entry); }
  };

  const handlePost = async (entry: JournalEntry) => {
    if (!await confirm({ title: 'Post Journal Entry?', text: `${entry.entry_number} - This will update account balances.`, icon: 'question', confirmButtonText: 'Post', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await journalService.post(entry.id);
      notify.success('Journal entry posted.');
      refreshTable();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Post failed');
    }
  };

  const handleReverse = async (entry: JournalEntry) => {
    if (!await confirm({ title: 'Reverse Entry?', text: `${entry.entry_number} - A counter-entry will be created.`, icon: 'warning', confirmButtonText: 'Reverse', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await journalService.reverse(entry.id, 'Manual reversal');
      notify.success('Journal entry reversed.');
      refreshTable();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Reversal failed');
    }
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    setForm(p => {
      const lines = [...p.lines];
      lines[index] = { ...lines[index], [field]: field === 'account_id' ? Number(value) : (field === 'description' ? value : parseFloat(String(value)) || 0) };
      return { ...p, lines };
    });
  };

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
  const removeLine = (index: number) => setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== index) }));

  const totalDebit = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) { notify.error(`Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`); return; }
    if (form.lines.some(l => !l.account_id)) { notify.error('All lines must have an account selected.'); return; }
    setSaving(true);
    try {
      await journalService.store(form);
      notify.success('Journal entry created (draft).');
      setShowForm(false);
      refreshTable();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<JournalEntry>[] = [
    {
      header: 'Entry #',
      accessorKey: 'entry_number',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{row.original.entry_number}</span>
      ),
    },
    { header: 'Date', accessorKey: 'entry_date', cell: ({ row }) => row.original.entry_date?.slice(0, 10) ?? '-' },
    {
      header: 'Description', accessorKey: 'description', cell: ({ row }) => (
        <span className="truncate max-w-[200px] block" title={row.original.description ?? ''}>
          {row.original.description ?? '-'}
        </span>
      )
    },
    {
      header: 'Ref Type',
      accessorKey: 'reference_type',
      cell: ({ row }) => (
        <span className="capitalize text-xs text-gray-500">{row.original.reference_type ?? '-'}</span>
      ),
    },
    {
      header: 'Debit',
      accessorKey: 'total_debit',
      cell: ({ row }) => <span className="font-mono">৳{Number(row.original.total_debit).toFixed(2)}</span>,
    },
    {
      header: 'Credit',
      accessorKey: 'total_credit',
      cell: ({ row }) => <span className="font-mono">৳{Number(row.original.total_credit).toFixed(2)}</span>,
    },
    {
      header: 'Auto',
      accessorKey: 'is_auto',
      cell: ({ row }) => (
        <span className={`text-xs ${row.original.is_auto ? 'text-gray-400' : 'text-purple-600 dark:text-purple-400 font-medium'}`}>
          {row.original.is_auto ? 'Auto' : 'Manual'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => viewDetail(entry)} className="p-1 text-gray-400 hover:text-blue-600" title="View">
              <Eye size={14} />
            </button>
            {entry.status === 'draft' && (
              <button onClick={() => handlePost(entry)} className="p-1 text-green-500 hover:text-green-700" title="Post">
                <Check size={14} />
              </button>
            )}
            {entry.status === 'posted' && (
              <button onClick={() => handleReverse(entry)} className="p-1 text-orange-500 hover:text-orange-700" title="Reverse">
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Journal Entries</h1>
          <p className="text-sm text-gray-500">Double-entry bookkeeping ledger</p>
        </div>
        {hasPermission('create_journal_entries') && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <Plus size={14} />
            Manual Entry
          </button>
        )}
      </div>

      <DataTable<JournalEntry>
        key={tableKey}
        columns={columns}
        apiEndpoint="journal-entries"
        enableSearch
        searchPlaceholder="Search journal entries…"
      />

      {/* Create Manual Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-white">New Manual Journal Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={form.entry_date}
                    onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lines</span>
                  <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">
                    + Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>Account</span><span>Description</span><span>Debit</span><span>Credit</span><span></span>
                  </div>
                  {form.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 items-center">
                      <select
                        value={line.account_id || ''}
                        onChange={e => updateLine(i, 'account_id', e.target.value)}
                        className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select…</option>
                        {accountOptions.map(a => (
                          <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Note"
                        value={line.description || ''}
                        onChange={e => updateLine(i, 'description', e.target.value)}
                        className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={line.debit || ''}
                        onChange={e => updateLine(i, 'debit', e.target.value)}
                        className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={line.credit || ''}
                        onChange={e => updateLine(i, 'credit', e.target.value)}
                        className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={form.lines.length <= 2}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 px-1"
                      >✕</button>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="flex justify-end gap-6 mt-2 text-sm">
                  <span>Total Debit: <strong className="font-mono">৳{totalDebit.toFixed(2)}</strong></span>
                  <span>Total Credit: <strong className="font-mono">৳{totalCredit.toFixed(2)}</strong></span>
                  <span className={isBalanced ? 'text-green-600' : 'text-red-500 font-semibold'}>
                    {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm border rounded dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isBalanced}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{showDetail.entry_number}</h2>
                <p className="text-xs text-gray-500">{showDetail.entry_date?.slice(0, 10)} · {statusBadge(showDetail.status)}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{showDetail.description}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-1 font-medium text-gray-600 dark:text-gray-300">Account</th>
                    <th className="text-left py-1 font-medium text-gray-600 dark:text-gray-300">Note</th>
                    <th className="text-right py-1 font-medium text-gray-600 dark:text-gray-300">Debit</th>
                    <th className="text-right py-1 font-medium text-gray-600 dark:text-gray-300">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(showDetail.lines ?? []).map((line, i) => (
                    <tr key={i}>
                      <td className="py-1">
                        <span className="font-mono text-xs text-gray-500">{line.account?.code}</span>{' '}
                        <span>{line.account?.name}</span>
                      </td>
                      <td className="py-1 text-xs text-gray-500">{line.description ?? '-'}</td>
                      <td className="py-1 text-right font-mono text-xs">
                        {Number(line.debit) > 0 ? `৳${Number(line.debit).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-1 text-right font-mono text-xs">
                        {Number(line.credit) > 0 ? `৳${Number(line.credit).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t dark:border-gray-700 font-semibold">
                    <td colSpan={2} className="py-1">Total</td>
                    <td className="py-1 text-right font-mono text-xs">৳{Number(showDetail.total_debit).toFixed(2)}</td>
                    <td className="py-1 text-right font-mono text-xs">৳{Number(showDetail.total_credit).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
