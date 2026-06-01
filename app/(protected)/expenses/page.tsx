'use client';

import { useEffect, useState } from 'react';
import { Plus, Check, X, DollarSign } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import expenseService from '@/services/expenseService';
import type { Expense, ExpenseFormData, PaymentMethod } from '@/types/accounting.types';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function statusBadge(status?: string) {
  const cls = STATUS_COLORS[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${cls}`}>{status ?? '-'}</span>;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'check', 'credit', 'other'];

const EXPENSE_CATEGORIES = [
  'Rent & Utilities', 'Salaries & Wages', 'Marketing & Advertising',
  'Maintenance & Repair', 'Transportation', 'Office Supplies',
  'Payment Processing Fees', 'Depreciation', 'Insurance',
  'Interest Expense', 'Miscellaneous',
];

const emptyForm: ExpenseFormData = {
  expense_date: new Date().toISOString().split('T')[0],
  category: '', description: '', amount: 0, tax_amount: 0,
  payment_method: 'cash', payment_status: 'pending', vendor_name: '', vendor_phone: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { hasPermission } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const refreshTable = () => setTableKey(k => k + 1);

  const handleApprove = async (exp: Expense) => {
    if (!await confirm({ title: 'Approve Expense?', text: exp.expense_number, icon: 'question', confirmButtonText: 'Approve', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await expenseService.approve(exp.id);
      notify.success('Expense approved.');
      refreshTable();
    } catch { notify.error('Approve failed'); }
  };

  const handlePay = async (exp: Expense) => {
    if (!await confirm({ title: 'Mark as Paid?', text: `${exp.expense_number} - A journal entry will be created.`, icon: 'warning', confirmButtonText: 'Yes, Pay', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await expenseService.pay(exp.id);
      notify.success('Expense paid and journal entry created.');
      refreshTable();
    } catch { notify.error('Payment failed'); }
  };

  const handleDelete = async (exp: Expense) => {
    if (!await confirm({ title: 'Delete Expense?', text: exp.expense_number, icon: 'warning', confirmButtonText: 'Delete', cancelButtonText: 'Cancel' }).then(r => r.isConfirmed)) return;
    try {
      await expenseService.destroy(exp.id);
      notify.success('Expense deleted.');
      refreshTable();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Delete failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { notify.error('Category is required'); return; }
    if (!form.amount || form.amount <= 0) { notify.error('Amount must be greater than 0'); return; }
    setSaving(true);
    try {
      await expenseService.store(form);
      notify.success('Expense created.');
      setShowForm(false);
      setForm(emptyForm);
      refreshTable();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify.error(msg ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      header: 'Number',
      accessorKey: 'expense_number',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{row.original.expense_number}</span>
      ),
    },
    { header: 'Date', accessorKey: 'expense_date', cell: ({ row }) => row.original.expense_date?.slice(0, 10) ?? '-' },
    { header: 'Category', accessorKey: 'category' },
    {
      header: 'Vendor',
      accessorKey: 'vendor_name',
      cell: ({ row }) => row.original.vendor_name ?? <span className="text-gray-400">-</span>,
    },
    {
      header: 'Amount',
      accessorKey: 'total_amount',
      cell: ({ row }) => (
        <span className="font-semibold">৳{Number(row.original.total_amount).toFixed(2)}</span>
      ),
    },
    {
      header: 'Payment',
      accessorKey: 'payment_method',
      cell: ({ row }) => (
        <span className="capitalize text-xs">{row.original.payment_method}</span>
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
        const exp = row.original;
        return (
          <div className="flex items-center gap-1">
            {exp.status === 'pending' && (
              <button
                onClick={() => handleApprove(exp)}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Approve"
              >
                <Check size={14} />
              </button>
            )}
            {(exp.status === 'approved' || exp.status === 'pending') && (
              <button
                onClick={() => handlePay(exp)}
                className="p-1 text-green-600 hover:text-green-700"
                title="Mark Paid"
              >
                <DollarSign size={14} />
              </button>
            )}
            {exp.status !== 'paid' && (
              <button
                onClick={() => handleDelete(exp)}
                className="p-1 text-red-400 hover:text-red-600"
                title="Delete"
              >
                <X size={14} />
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500">Record and track business expenses</p>
        </div>
        {hasPermission('create_expenses') && (
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <Plus size={14} />
            New Expense
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable<Expense>
        key={tableKey}
        columns={columns}
        apiEndpoint="expenses"
        enableSearch
        searchPlaceholder="Search expenses…"
      />

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">New Expense</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.expense_date}
                    onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
                  <select
                    required
                    value={form.payment_method}
                    onChange={e => setForm(p => ({ ...p, payment_method: e.target.value as PaymentMethod }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select category…</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description ?? ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Brief description…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    value={form.amount || ''}
                    onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Amount</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.tax_amount || ''}
                    onChange={e => setForm(p => ({ ...p, tax_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={form.vendor_name ?? ''}
                    onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Phone</label>
                  <input
                    type="text"
                    value={form.vendor_phone ?? ''}
                    onChange={e => setForm(p => ({ ...p, vendor_phone: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total: ৳{((form.amount || 0) + (form.tax_amount || 0)).toFixed(2)}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm border rounded dark:border-gray-600 dark:text-gray-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Expense'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
