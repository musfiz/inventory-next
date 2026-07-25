'use client';

import { useState, useCallback } from 'react';
import { Filter, X, Search, Calendar } from 'lucide-react';
import type { EcommerceOrder } from '@/types/ecommerce';

export interface OrderFiltersState {
  status: string;
  payment_status: string;
  payment_method: string;
  date_preset: string;
  date_from: string;
  date_to: string;
  search: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

function getDateRange(preset: string): { date_from: string; date_to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today': {
      const s = new Date(y, m, d);
      return { date_from: s.toISOString().slice(0, 10), date_to: s.toISOString().slice(0, 10) };
    }
    case 'yesterday': {
      const s = new Date(y, m, d - 1);
      return { date_from: s.toISOString().slice(0, 10), date_to: s.toISOString().slice(0, 10) };
    }
    case 'last7': {
      const s = new Date(y, m, d - 7);
      return { date_from: s.toISOString().slice(0, 10), date_to: now.toISOString().slice(0, 10) };
    }
    case 'this_month': {
      const s = new Date(y, m, 1);
      return { date_from: s.toISOString().slice(0, 10), date_to: now.toISOString().slice(0, 10) };
    }
    case 'last_month': {
      const s = new Date(y, m - 1, 1);
      const e = new Date(y, m, 0);
      return { date_from: s.toISOString().slice(0, 10), date_to: e.toISOString().slice(0, 10) };
    }
    default:
      return { date_from: '', date_to: '' };
  }
}

export default function OrderFilters({ filters, onChange, onReset }: OrderFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = useCallback(
    (key: keyof OrderFiltersState, value: string) => {
      if (key === 'date_preset') {
        if (value === 'custom') {
          onChange({ ...filters, date_preset: value, date_from: '', date_to: '' });
        } else {
          const range = getDateRange(value);
          onChange({ ...filters, date_preset: value, ...range });
        }
      } else {
        onChange({ ...filters, [key]: value });
      }
    },
    [filters, onChange]
  );

  const activeCount = [
    filters.status, filters.payment_status, filters.payment_method,
    filters.date_preset && filters.date_preset !== 'all',
  ].filter(Boolean).length;

  const inputClass = 'px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400';
  const labelClass = 'text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Filter bar header — always visible */}
      <div className="flex items-center justify-between p-1.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={filters.search}
              onChange={e => handleChange('search', e.target.value)}
              className={`${inputClass} pl-7 w-full`}
            />
          </div>

          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <select value={filters.status} onChange={e => handleChange('status', e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filters.payment_status} onChange={e => handleChange('payment_status', e.target.value)} className={inputClass}>
              {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filters.payment_method} onChange={e => handleChange('payment_method', e.target.value)} className={inputClass}>
              {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filters.date_preset || 'all'} onChange={e => handleChange('date_preset', e.target.value)} className={inputClass}>
              {DATE_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button onClick={onReset} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="md:hidden flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <Filter className="w-3 h-3" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>

      {/* Mobile expanded filters */}
      {expanded && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <span className={labelClass}>Status</span>
              <select value={filters.status} onChange={e => handleChange('status', e.target.value)} className={`${inputClass} w-full mt-0.5`}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span className={labelClass}>Payment</span>
              <select value={filters.payment_status} onChange={e => handleChange('payment_status', e.target.value)} className={`${inputClass} w-full mt-0.5`}>
                {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span className={labelClass}>Method</span>
              <select value={filters.payment_method} onChange={e => handleChange('payment_method', e.target.value)} className={`${inputClass} w-full mt-0.5`}>
                {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span className={labelClass}>Date</span>
              <select value={filters.date_preset || 'all'} onChange={e => handleChange('date_preset', e.target.value)} className={`${inputClass} w-full mt-0.5`}>
                {DATE_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {filters.date_preset === 'custom' && (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className={labelClass}>From</span>
                <input type="date" value={filters.date_from} onChange={e => handleChange('date_from', e.target.value)} className={`${inputClass} w-full mt-0.5`} />
              </div>
              <div>
                <span className={labelClass}>To</span>
                <input type="date" value={filters.date_to} onChange={e => handleChange('date_to', e.target.value)} className={`${inputClass} w-full mt-0.5`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom date range (desktop) */}
      {filters.date_preset === 'custom' && (
        <div className="hidden md:flex items-center gap-2 px-1.5 pb-1.5 border-t border-gray-200 dark:border-gray-700 pt-1.5">
          <Calendar className="w-3 h-3 text-gray-400" />
          <input type="date" value={filters.date_from} onChange={e => handleChange('date_from', e.target.value)} className={inputClass} />
          <span className="text-xs text-gray-400">→</span>
          <input type="date" value={filters.date_to} onChange={e => handleChange('date_to', e.target.value)} className={inputClass} />
        </div>
      )}
    </div>
  );
}
