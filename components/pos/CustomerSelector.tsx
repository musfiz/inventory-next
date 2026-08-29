'use client';

import { Search, XCircle, Plus, User } from 'lucide-react';
import Spinner from '@/components/ui/spinner';

interface CustomerSelectorProps {
  open: boolean;
  onClose: () => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  handleCustomerSearchChange: (v: string) => void;
  customerResults: any[];
  customerSearchLoading: boolean;
  selectCustomer: (c: any) => void;
  showCreateForm: boolean;
  setShowCreateForm: (v: boolean) => void;
  newCustomerName: string;
  setNewCustomerName: (v: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (v: string) => void;
  handleCreateCustomer: () => Promise<void>;
  customerCreateLoading: boolean;
}

export default function CustomerSelector({
  open,
  onClose,
  customerSearch,
  setCustomerSearch,
  handleCustomerSearchChange,
  customerResults,
  customerSearchLoading,
  selectCustomer,
  showCreateForm,
  setShowCreateForm,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  handleCreateCustomer,
  customerCreateLoading,
}: CustomerSelectorProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Select Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or mobile no..."
              value={customerSearch}
              onChange={e => handleCustomerSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {customerSearchLoading && (
              <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          {customerResults.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {customerResults.map((c: any) => (
                <li key={c.id}>
                  <button
                    onClick={() => selectCustomer(c)}
                    className="w-full flex items-center gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-1 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</p>}
                      {c.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : !customerSearchLoading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No customers found</p>
          ) : null}
        </div>

        {/* Quick Create Toggle */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Customer
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Quick Create Customer</p>
              <input
                autoFocus
                type="text"
                placeholder="Customer name *"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCustomer(); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Mobile no (optional)"
                value={newCustomerPhone}
                onChange={e => setNewCustomerPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCustomer(); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreateForm(false); setNewCustomerName(''); setNewCustomerPhone(''); }}
                  className="flex-1 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={customerCreateLoading || !newCustomerName.trim()}
                  className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {customerCreateLoading ? (
                    <Spinner size="sm" tone="white" />
                  ) : <Plus className="w-4 h-4" />}
                  Save &amp; Select
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}