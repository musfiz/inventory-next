'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListTodo, LayoutDashboard, Settings, RefreshCw, Loader2 } from 'lucide-react';
import type { EcommerceOrder, StatusConfig, OrderKPIs } from '@/types/ecommerce';
import { notify } from '@/lib/notifications';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import OrderStatusBoard from '@/components/ecommerce/orders/order-status-board';
import StatusWorkflowDiagram from '@/components/ecommerce/orders/status-workflow-diagram';
import StatusEditor from '@/components/ecommerce/orders/status-editor';
import OrderDetailPanel from '@/components/ecommerce/orders/order-detail-panel';
import { OrderMiniStats } from '@/components/ecommerce/orders/order-stat-cards';

type TabView = 'board' | 'config';

export default function OrderStatusPage() {
  const [activeTab, setActiveTab] = useState<TabView>('board');
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [statusConfig, setStatusConfig] = useState<StatusConfig[]>([]);
  const [kpis, setKpis] = useState<OrderKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [ordersData, configData, kpiData] = await Promise.all([
        ecommerceOrderService.list({ per_page: 100 }),
        ecommerceOrderService.getStatusConfig(),
        ecommerceOrderService.getKPIs(),
      ]);
      setOrders(ordersData.data);
      setStatusConfig(configData);
      setKpis(kpiData);
    } catch {
      notify.error('Failed to load order data');
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: EcommerceOrder['status']) => {
      try {
        await ecommerceOrderService.updateStatus(orderId, newStatus);
        // Update orders optimistically
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );
        notify.success('Status updated');
      } catch {
        notify.error('Failed to update status');
        // Reload to get actual state
        setRefreshKey(k => k + 1);
      }
    },
    []
  );

  const handleCardClick = useCallback((order: EcommerceOrder) => {
    setSelectedOrderId(order.id);
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedOrderId(null);
  }, []);

  const handleConfigSave = useCallback(async (config: StatusConfig[]) => {
    try {
      await ecommerceOrderService.saveStatusConfig(config);
      setStatusConfig(config);
      notify.success('Status configuration saved');
    } catch {
      notify.error('Failed to save configuration');
    }
  }, []);

  // ── Stats from orders ────────────────────────────────────────────────

  const pendingCount = orders.filter(o => o.status === 'placed' || o.status === 'confirmed' || o.status === 'packed').length;
  const shippedCount = orders.filter(o => o.status === 'shipped').length;
  const deliveredToday = kpis?.delivered_today || 0;

  return (
    <div className="space-y-2">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Order Status Workflow
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Mini Stats ────────────────────────────────────────────────── */}
      {kpis && !loading && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-1.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Pending: <strong className="text-gray-700 dark:text-gray-200">{pendingCount}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            In Transit: <strong className="text-gray-700 dark:text-gray-200">{shippedCount}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Delivered Today: <strong className="text-gray-700 dark:text-gray-200">{deliveredToday}</strong>
          </span>
        </div>
      )}

      {/* ── Tab Toggle ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-0.5 w-fit">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer transition-colors ${
            activeTab === 'board'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Board View
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer transition-colors ${
            activeTab === 'config'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Config
        </button>
      </div>

      {/* ── Board View ───────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-56 md:w-64 animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-t-md mb-2" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-sm" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No orders found</p>
              <p className="text-xs text-gray-500 mt-1">Orders will appear here once customers start placing them.</p>
            </div>
          ) : (
            <OrderStatusBoard
              orders={orders}
              statusConfig={statusConfig}
              onStatusChange={handleStatusChange}
              onCardClick={handleCardClick}
              loading={ordersLoading}
            />
          )}
        </div>
      )}

      {/* ── Config View ──────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded mb-4" />
              <div className="h-32 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          ) : (
            <>
              {/* Workflow diagram */}
              <StatusWorkflowDiagram config={statusConfig} />

              {/* Status editor */}
              <StatusEditor config={statusConfig} onSave={handleConfigSave} />
            </>
          )}
        </div>
      )}

      {/* ── Order Detail Panel ───────────────────────────────────────── */}
      {showDetail && selectedOrderId && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          onClose={handleCloseDetail}
          onStatusUpdate={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
