'use client';

import { useEffect, useState } from 'react';
import { XCircle, RefreshCw, Trash2, Clock, ShoppingBag } from 'lucide-react';
import { notify } from '@/lib/notifications';
import Spinner from '@/components/ui/spinner';
import posService from '@/services/posService';
import type { PosHeldOrder, PosHoldPayload } from '@/types/api.types';

interface HeldOrdersDialogProps {
  open: boolean;
  sessionId: string | number;
  registerId: string | number;
  onClose: () => void;
  onRestore: (orderData: PosHoldPayload['order_data']) => void;
}

export default function HeldOrdersDialog({
  open,
  sessionId,
  registerId,
  onClose,
  onRestore,
}: HeldOrdersDialogProps) {
  const [holds, setHolds] = useState<PosHeldOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadHolds();
    }
  }, [open, sessionId]);

  const loadHolds = async () => {
    setLoading(true);
    try {
      const data = await posService.getHeldOrders({ session_id: sessionId, register_id: registerId });
      setHolds(data);
    } catch {
      notify.error('Failed to load held orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (hold: PosHeldOrder) => {
    setRestoringId(hold.id);
    try {
      const orderData = await posService.restoreHeldOrder(hold.id);
      notify.success(`Hold #${hold.hold_number} restored`);
      onRestore(orderData);
      onClose();
    } catch {
      notify.error('Failed to restore hold order');
    } finally {
      setRestoringId(null);
    }
  };

  const handleCancel = async (hold: PosHeldOrder) => {
    setCancellingId(hold.id);
    try {
      await posService.cancelHeldOrder(hold.id);
      notify.success(`Hold #${hold.hold_number} cancelled`);
      setHolds(prev => prev.filter(h => h.id !== hold.id));
    } catch {
      notify.error('Failed to cancel hold order');
    } finally {
      setCancellingId(null);
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Held Orders</h2>
            {holds.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full font-medium">
                {holds.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : holds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <ShoppingBag className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No active held orders</p>
              <p className="text-xs mt-1">Hold orders from this session will appear here</p>
            </div>
          ) : (
            holds.map(hold => {
              const itemCount = Array.isArray(hold.order_data?.cart) ? hold.order_data.cart.length : 0;
              const isRestoring = restoringId === hold.id;
              const isCancelling = cancellingId === hold.id;

              return (
                <div
                  key={hold.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {hold.hold_number}
                        </span>
                        {hold.customer_name && (
                          <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            {hold.customer_name}
                          </span>
                        )}
                        {itemCount > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(hold.created_at)}</span>
                        {hold.expires_at && (
                          <span className="ml-2 text-amber-500 dark:text-amber-400">
                            · expires {formatTime(hold.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore(hold)}
                        disabled={isRestoring || isCancelling}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                      >
                        {isRestoring ? (
                          <Spinner size="xs" tone="white" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Restore
                      </button>
                      <button
                        onClick={() => handleCancel(hold)}
                        disabled={isRestoring || isCancelling}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                        title="Cancel hold"
                      >
                        {isCancelling ? (
                          <Spinner size="xs" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={loadHolds}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
