'use client';

import { useState } from 'react';
import { CheckSquare, X, Download, Loader2 } from 'lucide-react';
import type { EcommerceOrder, BulkActionType } from '@/types/ecommerce';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import { notify } from '@/lib/notifications';

interface OrderBulkActionsProps {
  selectedIds: string[];
  orders: EcommerceOrder[];
  onClear: () => void;
  onComplete: () => void;
}

const STATUS_OPTIONS: { value: EcommerceOrder['status']; label: string }[] = [
  { value: 'confirmed', label: 'Confirm' },
  { value: 'packed', label: 'Pack' },
  { value: 'shipped', label: 'Ship' },
  { value: 'delivered', label: 'Deliver' },
  { value: 'cancelled', label: 'Cancel' },
];

export default function OrderBulkActions({ selectedIds, orders, onClear, onComplete }: OrderBulkActionsProps) {
  const [updating, setUpdating] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
  const count = selectedIds.length;
  if (count === 0) return null;

  const handleBulkStatus = async (status: EcommerceOrder['status']) => {
    setUpdating(true);
    setShowStatusDropdown(false);
    try {
      const result = await ecommerceOrderService.bulkAction(selectedIds, 'update_status', { status });
      notify.success(`${result.success} orders updated`);
      if (result.failed > 0) notify.error(`${result.failed} orders failed`);
      onComplete();
    } catch {
      notify.error('Bulk update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = (type: 'export_csv' | 'export_pdf') => {
    const label = type === 'export_csv' ? 'CSV' : 'PDF';
    notify.success(`Exporting ${count} orders as ${label}...`);
    // In real implementation, this would trigger a download
    onComplete();
  };

  return (
    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-sm px-3 py-1.5">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
          {count} order{count !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={onClear}
          disabled={updating}
          className="p-0.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 rounded cursor-pointer disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Status update dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            disabled={updating}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Update Status
          </button>
          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg z-20 py-1">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleBulkStatus(s.value)}
                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Export */}
        <div className="relative group">
          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer">
            <Download className="w-3 h-3" /> Export
          </button>
          <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg z-20 py-1 hidden group-hover:block">
            <button onClick={() => handleExport('export_csv')} className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Export CSV</button>
            <button onClick={() => handleExport('export_pdf')} className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Export PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
