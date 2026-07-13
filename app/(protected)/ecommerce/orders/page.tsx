'use client';

import { useState } from 'react';
import { ClipboardList, Eye, X, Truck } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { EcommerceOrder } from '@/types/ecommerce';
import { notify } from '@/lib/notifications';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import { formatDate } from '@/lib/utils/date';

const STATUS_OPTIONS = [
  { value: 'placed' as const, label: 'Placed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' },
  { value: 'confirmed' as const, label: 'Confirmed', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30' },
  { value: 'packed' as const, label: 'Packed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30' },
  { value: 'shipped' as const, label: 'Shipped', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30' },
  { value: 'delivered' as const, label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30' },
  { value: 'cancelled' as const, label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30' },
  { value: 'returned' as const, label: 'Returned', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30' },
];
const PAYMENT_OPTIONS = [
  { value: 'pending' as const, label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid' as const, label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'failed' as const, label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'refunded' as const, label: 'Refunded', color: 'bg-orange-100 text-orange-800' },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<EcommerceOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleView = (order: EcommerceOrder) => { setSelected(order); setShowDetail(true); };
  const handleUpdateStatus = async (id: string, status: EcommerceOrder['status']) => {
    try { await ecommerceOrderService.updateStatus(id, status); notify.success('Status updated'); setRefreshKey(k=>k+1); setSelected(p=>p?.id===id?{...p,status}:p); }
    catch { notify.error('Failed'); }
  };

  const getBadge = (status: string, opts: readonly { value: string; label: string; color: string }[]) => {
    const o = opts.find(s=>s.value===status);
    return <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${o?.color||''}`}>{o?.label||status}</span>;
  };

  const columns: ColumnDef<EcommerceOrder>[] = [
    { id: 'serial', header: '#', meta:{width:'4%'}, cell:({row,table})=>{const p=table.getState().pagination;return <span className="text-xs text-gray-600 dark:text-gray-400">{(p?.pageIndex||0)*(p?.pageSize||15)+row.index+1}</span>;} },
    { accessorKey: 'order_number', header: 'Order #', meta:{width:'12%'}, cell:({row})=><span className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">{row.original.order_number}</span> },
    { accessorKey: 'customer_name', header: 'Customer', meta:{width:'14%'}, cell:({row})=><div className="flex flex-col"><span className="text-xs text-gray-900 dark:text-gray-100">{row.original.customer_name}</span><span className="text-[10px] text-gray-500">{row.original.customer_email}</span></div> },
    { id: 'items', header: 'Items', meta:{width:'5%'}, cell:({row})=><span className="text-xs">{row.original.items_count}</span> },
    { accessorKey: 'total', header: 'Total', meta:{width:'10%'}, cell:({row})=><span className="text-xs font-medium">৳{row.original.total.toLocaleString('en-IN')}</span> },
    { accessorKey: 'status', header: 'Status', meta:{width:'10%'}, cell:({row})=>getBadge(row.original.status, STATUS_OPTIONS) },
    { accessorKey: 'payment_status', header: 'Payment', meta:{width:'10%'}, cell:({row})=>getBadge(row.original.payment_status, PAYMENT_OPTIONS) },
    { accessorKey: 'created_at', header: 'Date', meta:{width:'10%'}, cell:({row})=><span className="text-xs">{row.original.created_at?formatDate(row.original.created_at):'N/A'}</span> },
    { id: 'actions', header: 'Actions', meta:{width:'8%'}, cell:({row})=><button className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer" title="View" onClick={()=>handleView(row.original)}><Eye className="w-3.5 h-3.5"/></button> },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> All Orders</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1">
        <div className="flex gap-3 flex-wrap">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100">
            <option value="">All Statuses</option>{STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100">
            <option value="">All Payments</option>{PAYMENT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <DataTable key={refreshKey} columns={columns} fetchData={(p:any)=>ecommerceOrderService.list({...p,filterParams:{status:statusFilter||undefined,payment_status:paymentFilter||undefined}})} pageSize={15} enableSearch={true} searchPlaceholder="Search order #, customer..." />

      {showDetail && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Order {selected.order_number}</h2>
              <button onClick={()=>setShowDetail(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Customer</h3>
                  <p className="text-sm">{selected.customer_name}</p>
                  <p className="text-xs text-gray-500">{selected.customer_email}<br/>{selected.customer_phone}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Order Info</h3>
                  <p className="text-sm">Items: {selected.items_count}</p>
                  <p className="text-sm">Total: ৳{selected.total.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{formatDate(selected.created_at)}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shipping Address</h3>
                <p className="text-sm">{selected.shipping_address}</p>
                <p className="text-xs text-gray-500">Method: {selected.shipping_method}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Order Status</h3>
                  <select value={selected.status} onChange={e=>handleUpdateStatus(selected.id,e.target.value as EcommerceOrder['status'])} className="w-full px-2 py-1 text-sm border border-gray-300 rounded-sm dark:bg-gray-700 dark:text-gray-100 mt-1">
                    {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="mt-2">{getBadge(selected.status,STATUS_OPTIONS)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment</h3>
                  <p className="text-sm">{selected.payment_method}</p>
                  <div className="mt-1">{getBadge(selected.payment_status,PAYMENT_OPTIONS)}</div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price Breakdown</h3>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>৳{selected.subtotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>৳{selected.shipping.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>৳{selected.tax.toLocaleString('en-IN')}</span></div>
                  {selected.discount>0&&<div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">-৳{selected.discount.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between font-semibold pt-1 border-t border-gray-200 dark:border-gray-600"><span>Total</span><span>৳{selected.total.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
