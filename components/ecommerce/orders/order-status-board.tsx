'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, Info } from 'lucide-react';
import type { EcommerceOrder, StatusConfig } from '@/types/ecommerce';
import OrderCard from './order-card';

interface OrderStatusBoardProps {
  orders: EcommerceOrder[];
  statusConfig: StatusConfig[];
  onStatusChange: (orderId: string, newStatus: EcommerceOrder['status']) => void;
  onCardClick: (order: EcommerceOrder) => void;
  loading?: boolean;
  compact?: boolean;
}

const STATUS_BG: Record<string, string> = {
  placed: 'bg-blue-50 dark:bg-blue-900/10',
  confirmed: 'bg-indigo-50 dark:bg-indigo-900/10',
  packed: 'bg-purple-50 dark:bg-purple-900/10',
  shipped: 'bg-yellow-50 dark:bg-yellow-900/10',
  delivered: 'bg-green-50 dark:bg-green-900/10',
  cancelled: 'bg-red-50 dark:bg-red-900/10',
  returned: 'bg-gray-50 dark:bg-gray-800',
};

const COLUMN_HEADER_BG: Record<string, string> = {
  placed: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  packed: 'bg-purple-500',
  shipped: 'bg-yellow-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-orange-500',
};

const STATUS_COLORS: Record<string, string> = {
  placed: 'blue',
  confirmed: 'indigo',
  packed: 'purple',
  shipped: 'yellow',
  delivered: 'green',
  cancelled: 'red',
  returned: 'orange',
};

export default function OrderStatusBoard({
  orders,
  statusConfig,
  onStatusChange,
  onCardClick,
  loading,
  compact,
}: OrderStatusBoardProps) {
  const [search, setSearch] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const configByStatus = Object.fromEntries(
    statusConfig.map(c => [c.status, c])
  );

  // Group orders by status
  const grouped = statusConfig.reduce<Record<string, EcommerceOrder[]>>((acc, cfg) => {
    const filtered = orders
      .filter(o => o.status === cfg.status)
      .filter(o =>
        !search.trim() ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase())
      );
    acc[cfg.status] = filtered;
    return acc;
  }, {});

  const handleDragStart = useCallback((e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', orderId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: string) => {
      e.preventDefault();
      setDragOverColumn(null);
      const orderId = e.dataTransfer.getData('text/plain');
      if (!orderId) return;

      const order = orders.find(o => o.id === orderId);
      if (!order || order.status === targetStatus) return;

      // Validate transition
      const config = configByStatus[order.status];
      const allowed = config?.allowed_transitions?.some(t => t.to === targetStatus);
      if (!allowed) return;

      onStatusChange(orderId, targetStatus as EcommerceOrder['status']);
      setDraggedOrderId(null);
    },
    [orders, statusConfig, onStatusChange, configByStatus]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverColumn(null);
    setDraggedOrderId(null);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {statusConfig.map(cfg => (
          <div key={cfg.status} className="flex-shrink-0 w-56 md:w-64 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-t-md mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visibleStatuses = statusConfig.filter(c => c.status !== 'cancelled' && c.status !== 'returned');
  const collapsedStatuses = statusConfig.filter(c => c.status === 'cancelled' || c.status === 'returned');
  const [showCollapsed, setShowCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search across all columns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Board with scroll arrows */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer hidden md:flex"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer hidden md:flex"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Main status columns */}
          {visibleStatuses.map(cfg => (
            <StatusColumn
              key={cfg.status}
              config={cfg}
              orders={grouped[cfg.status] || []}
              isDragOver={dragOverColumn === cfg.status}
              isDragging={draggedOrderId !== null}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onCardClick={onCardClick}
              compact={compact}
            />
          ))}

          {/* Collapsed (cancelled/returned) */}
          <div className="flex-shrink-0 w-48 md:w-56">
            <button
              onClick={() => setShowCollapsed(!showCollapsed)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-t-sm hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            >
              <span>Cancelled / Returned</span>
              <span className="text-xs opacity-60">
                {(grouped['cancelled']?.length || 0) + (grouped['returned']?.length || 0)}
              </span>
            </button>
            {showCollapsed && (
              <div className="space-y-1.5 mt-1.5">
                {collapsedStatuses.map(cfg => (
                  <StatusColumn
                    key={cfg.status}
                    config={cfg}
                    orders={grouped[cfg.status] || []}
                    isDragOver={dragOverColumn === cfg.status}
                    isDragging={draggedOrderId !== null}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onCardClick={onCardClick}
                    compact={compact}
                    mini
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
        <Info className="w-3 h-3" />
        <span>Drag cards between columns to update order status</span>
      </div>
    </div>
  );
}

// ── Status Column ────────────────────────────────────────────────────────

function StatusColumn({
  config,
  orders,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCardClick,
  compact,
  mini,
}: {
  config: StatusConfig;
  orders: EcommerceOrder[];
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragEnd: () => void;
  onCardClick: (order: EcommerceOrder) => void;
  compact?: boolean;
  mini?: boolean;
}) {
  const bgColor = STATUS_BG[config.status] || '';
  const headerBg = COLUMN_HEADER_BG[config.status] || 'bg-gray-500';
  const canDrop = config.allowed_transitions.length > 0;
  const borderStyle = isDragOver && canDrop
    ? 'border-2 border-dashed border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
    : '';

  return (
    <div
      className={`flex-shrink-0 ${mini ? 'w-full' : 'w-56 md:w-64'} ${borderStyle} rounded-sm`}
      onDragOver={(e) => onDragOver(e, config.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, config.status)}
    >
      {/* Column header */}
      <div className={`${headerBg} text-white px-2.5 py-1.5 rounded-t-sm flex items-center justify-between`}>
        <span className={`font-semibold ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {config.icon} {config.label}
        </span>
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} bg-white/20 rounded-full px-1.5 py-0.5`}>
          {orders.length}
        </span>
      </div>

      {/* Column body */}
      <div
        className={`${bgColor} ${mini ? '' : 'max-h-[calc(100vh-320px)] overflow-y-auto'} p-1.5 space-y-1.5 rounded-b-sm`}
        style={{ minHeight: mini ? 'auto' : '80px' }}
      >
        {orders.length === 0 ? (
          <div className="text-center py-4 text-[10px] text-gray-400 dark:text-gray-500 italic">
            No orders
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              draggable={canDrop}
              onDragStart={(e) => onDragStart(e, order.id)}
              onDragEnd={onDragEnd}
            >
              <OrderCard
                order={order}
                onClick={onCardClick}
                compact={compact || mini}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
