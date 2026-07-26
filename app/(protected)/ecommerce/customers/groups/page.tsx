'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users2,
  Plus,
  X,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  UserPlus,
  UserMinus,
  Search,
  Tag,
  Percent,
  DollarSign,
  Layers,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { CustomerGroup, EcommerceCustomer } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';
import customerGroupService from '@/services/customerGroupService';

// ── Constants ─────────────────────────────────────────────────────────

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed (৳)' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// ── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

function getDiscountLabel(type: string, value: number): string {
  if (type === 'percentage') return `${value}% OFF`;
  return `${formatCurrency(value)} OFF`;
}

function getDiscountColor(type: string): string {
  return type === 'percentage'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
}

function getStatusColor(isActive: boolean): string {
  return isActive
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
}

// ── Interface for inline form state ───────────────────────────────────

interface GroupFormState {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number | '';
  min_order_amount: number | '';
  is_active: boolean;
  sort_order: number | '';
}

const emptyForm: GroupFormState = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  is_active: true,
  sort_order: '',
};

// ── Stat Cards ─────────────────────────────────────────────────────────

function GroupStatCards({ groups, loading }: { groups: CustomerGroup[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalGroups = groups.length;
  const activeGroups = groups.filter(g => g.is_active).length;
  const totalCustomers = groups.reduce((s, g) => s + (g.customers_count || 0), 0);

  const cards = [
    {
      label: 'Total Groups',
      value: totalGroups,
      icon: <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      color: 'text-gray-900 dark:text-gray-100',
    },
    {
      label: 'Active Groups',
      value: activeGroups,
      icon: <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Total Assigned Customers',
      value: totalCustomers,
      icon: <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      color: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center shrink-0">
            {card.icon}
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Customer Assignment Modal ──────────────────────────────────────────

function CustomerAssignmentModal({
  group,
  onClose,
  onUpdate,
}: {
  group: CustomerGroup;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [assignedCustomers, setAssignedCustomers] = useState<EcommerceCustomer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<EcommerceCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAddIds, setPendingAddIds] = useState<Set<number>>(new Set());
  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assigned, available] = await Promise.all([
        customerGroupService.getCustomers(group.id),
        customerGroupService.getAvailableCustomers(group.id),
      ]);
      setAssignedCustomers(assigned);
      setAvailableCustomers(available);
      setPendingAddIds(new Set());
      setPendingRemoveIds(new Set());
    } catch {
      notify.error('Failed to load customers');
    }
    setLoading(false);
  }, [group.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAvailable = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return availableCustomers.filter(
      c => c.name.toLowerCase().includes(q) ||
           (c.email && c.email.toLowerCase().includes(q)) ||
           (c.phone && c.phone.includes(q))
    );
  }, [availableCustomers, searchTerm]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || filteredAvailable.length === 0) return;
    const customer = filteredAvailable[0];
    const customerId = Number(customer.id);

    setAssignedCustomers(prev => [...prev, customer]);
    setAvailableCustomers(prev => prev.filter(c => c.id !== customer.id));
    setPendingAddIds(prev => new Set(prev).add(customerId));
    setPendingRemoveIds(prev => {
      const next = new Set(prev);
      next.delete(customerId);
      return next;
    });
    setSearchTerm('');
  };

  const handleRemove = (customerId: number) => {
    const customer = assignedCustomers.find(c => Number(c.id) === customerId);
    if (!customer) return;

    setAssignedCustomers(prev => prev.filter(c => Number(c.id) !== customerId));
    setAvailableCustomers(prev => [customer, ...prev]);

    if (pendingAddIds.has(customerId)) {
      setPendingAddIds(prev => {
        const next = new Set(prev);
        next.delete(customerId);
        return next;
      });
    } else {
      setPendingRemoveIds(prev => new Set(prev).add(customerId));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (pendingAddIds.size > 0) {
        await customerGroupService.assignCustomers(group.id, [...pendingAddIds]);
      }
      for (const id of pendingRemoveIds) {
        await customerGroupService.removeCustomer(group.id, id);
      }
      notify.success('Changes saved');
      onUpdate();
      onClose();
    } catch {
      notify.error('Failed to save changes');
    }
    setSaving(false);
  };

  const hasChanges = pendingAddIds.size > 0 || pendingRemoveIds.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate max-w-[220px]">
              {group.name}
            </h2>
            <span className="text-xs text-gray-400">— Manage Customers</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Search + Enter to Add */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Add Customers
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search and press Enter to add..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                {searchTerm && filteredAvailable.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No matching customers found</p>
                )}
                {searchTerm && filteredAvailable.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Press Enter to add <strong>{filteredAvailable[0].name}</strong>
                    {filteredAvailable.length > 1 ? ` (+${filteredAvailable.length - 1} more)` : ''}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Assigned Customers Table */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Assigned Customers ({assignedCustomers.length})
                </p>
                {assignedCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <Users2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No customers assigned yet</p>
                    <p className="text-[10px] mt-0.5">Search and press Enter to add customers</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-sm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Name</th>
                          <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Email / Phone</th>
                          <th className="text-center px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-16">Orders</th>
                          <th className="text-right px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedCustomers.map((c, i) => (
                          <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                            <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400">{c.email || c.phone || '-'}</td>
                            <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400 text-center">{c.orders_count}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                onClick={() => handleRemove(Number(c.id))}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                                title="Remove from group"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<CustomerGroup | null>(null);
  const [form, setForm] = useState<GroupFormState>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Customer assignment modal
  const [assignModalGroup, setAssignModalGroup] = useState<CustomerGroup | null>(null);

  // ── Data Fetching ──────────────────────────────────────────────────

  const fetchGroups = useCallback(async () => {
    try {
      const res = await customerGroupService.list({ per_page: 100 });
      setGroups(res.data);
    } catch {
      /* handled by service */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, refreshKey]);

  // ── Form Helpers ──────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ ...emptyForm });
    setFormErrors({});
    setIsEditing(false);
    setCurrentGroup(null);
    setShowForm(false);
  };

  const openEditForm = (group: CustomerGroup) => {
    setForm({
      name: group.name,
      description: group.description || '',
      discount_type: group.discount_type,
      discount_value: group.discount_value,
      min_order_amount: group.min_order_amount ?? '',
      is_active: group.is_active,
      sort_order: group.sort_order,
    });
    setFormErrors({});
    setIsEditing(true);
    setCurrentGroup(group);
    setShowForm(true);
  };

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // ── Validation ────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Group name is required';
    if (form.discount_value === '' || Number(form.discount_value) < 0) {
      errors.discount_value = 'Discount value must be 0 or greater';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validate()) return;

    setSaving(true);
    try {
      await customerGroupService.store({
        id: isEditing && currentGroup?.id ? currentGroup.id : undefined,
        name: form.name,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: form.discount_value === '' ? 0 : Number(form.discount_value),
        min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
        is_active: form.is_active,
        sort_order: form.sort_order === '' ? 0 : Number(form.sort_order),
      });

      notify.success(isEditing ? 'Group updated successfully' : 'Group created successfully');
      resetForm();
      setRefreshKey(prev => prev + 1);
      fetchGroups();
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.errors) {
        setFormErrors(errData.errors);
      } else {
        notify.error(errData?.message || err?.message || 'Failed to save group');
      }
    }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────

  const handleDelete = async (group: CustomerGroup) => {
    const result = await confirm({
      title: 'Delete Group',
      html: `Are you sure you want to delete <strong>${group.name}</strong>?<br><br>
            <em style="color: #dc2626; font-size: 12px;">All customer assignments will be removed.</em>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;

    try {
      await customerGroupService.delete(group.id);
      notify.success('Group deleted');
      setRefreshKey(prev => prev + 1);
      fetchGroups();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete group');
    }
  };

  // ── Toggle Active ─────────────────────────────────────────────────

  const handleToggleActive = async (group: CustomerGroup) => {
    try {
      const updated = await customerGroupService.toggleActive(group.id);
      setGroups(prev => prev.map(g => g.id === updated.id ? { ...g, is_active: updated.is_active } : g));
      setRefreshKey(prev => prev + 1);
      notify.success(updated.is_active ? 'Group activated' : 'Group deactivated');
    } catch {
      notify.error('Failed to toggle group status');
    }
  };

  // ── DataTable Columns ─────────────────────────────────────────────

  const columns: ColumnDef<CustomerGroup>[] = useMemo(() => [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
      cell: ({ row, table }) => {
        const p = table.getState().pagination;
        return (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(p?.pageIndex || 0) * (p?.pageSize || 15) + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]" title={row.original.name}>
              {row.original.name}
            </p>
            {row.original.description && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[160px]">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      meta: { width: '12%' },
      cell: ({ row }) => {
        const { discount_type, discount_value } = row.original;
        return (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getDiscountColor(discount_type)}`}>
            {getDiscountLabel(discount_type, discount_value)}
          </span>
        );
      },
    },
    {
      id: 'customers_count',
      header: 'Customers',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users2 className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
            {row.original.customers_count || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${getStatusColor(isActive)}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => openEditForm(row.original)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded cursor-pointer"
            title="Manage Customers"
            onClick={() => setAssignModalGroup(row.original)}
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1 rounded cursor-pointer ${
              row.original.is_active
                ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={row.original.is_active ? 'Deactivate' : 'Activate'}
            onClick={() => handleToggleActive(row.original)}
          >
            {row.original.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => handleDelete(row.original)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Customer Groups
          </h1>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      {!loading && <GroupStatCards groups={groups} loading={loading} />}

      {/* ── Add / Edit Form ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {isEditing ? 'Edit Group' : 'New Customer Group'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Row 1: Name, Discount Type, Discount Value */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., VIP Customers"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-0.5">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Discount Type
                </label>
                <select
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                >
                  {DISCOUNT_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {form.discount_type === 'percentage' ? (
                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={form.discount_type === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${
                      formErrors.discount_value ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
                {formErrors.discount_value && <p className="text-red-600 text-xs mt-0.5">{formErrors.discount_value}</p>}
              </div>
            </div>

            {/* Row 2: Min Order, Sort Order, Is Active */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Min. Order Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                    value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>

            {/* Row 3: Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Description
              </label>
              <textarea
                placeholder="Describe the customer group and its purpose..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : isEditing ? 'Update Group' : 'Save Group'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DataTable ──────────────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(p: any) =>
          customerGroupService.list(p).then(res => ({
            data: res.data,
            total: res.total,
            page: res.page,
            per_page: res.per_page,
          }))
        }
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by group name, description..."
      />

      {/* ── Customer Assignment Modal ─────────────────────────────────── */}
      {assignModalGroup && (
        <CustomerAssignmentModal
          group={assignModalGroup}
          onClose={() => setAssignModalGroup(null)}
          onUpdate={() => setRefreshKey(prev => prev + 1)}
        />
      )}
    </div>
  );
}
