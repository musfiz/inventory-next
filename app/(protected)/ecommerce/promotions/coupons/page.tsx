'use client';

import { useState } from 'react';
import { Ticket, Edit, Trash2, Plus, X } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { Coupon } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import couponService from '@/services/couponService';
import { formatDate } from '@/lib/utils/date';

export default function CouponsPage() {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed', value: 0,
    min_order_amount: '', max_discount_amount: '', usage_limit: '',
    description: '', is_active: true, valid_from: '', valid_until: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = () => {
    setIsEditing(false); setCurrent(null);
    setFormData({ code: '', type: 'percentage', value: 0, min_order_amount: '', max_discount_amount: '', usage_limit: '', description: '', is_active: true, valid_from: '', valid_until: '' });
    setFormErrors({}); setShowForm(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setIsEditing(true); setCurrent(coupon);
    setFormData({
      code: coupon.code, type: coupon.type, value: coupon.value,
      min_order_amount: coupon.min_order_amount?.toString() || '',
      max_discount_amount: coupon.max_discount_amount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      description: coupon.description, is_active: coupon.is_active,
      valid_from: coupon.valid_from?.slice(0, 10) || '',
      valid_until: coupon.valid_until?.slice(0, 10) || '',
    });
    setFormErrors({}); setShowForm(true);
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.code.trim()) errors.code = 'Coupon code is required';
    if (formData.value <= 0) errors.value = 'Value must be greater than 0';
    if (!formData.valid_from) errors.valid_from = 'Valid from date is required';
    if (!formData.valid_until) errors.valid_until = 'Valid until date is required';
    setFormErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({}); if (!validate()) return;
    try {
      await couponService.store({
        id: isEditing && current?.id ? current.id : undefined,
        code: formData.code, type: formData.type, value: formData.value,
        min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : null,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        description: formData.description, is_active: formData.is_active,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : '',
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : '',
      });
      notify.success(isEditing ? 'Coupon updated' : 'Coupon added');
      setShowForm(false); setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const d = error?.response?.data;
      if (d?.errors) setFormErrors(d.errors);
      else notify.error(d?.message || error?.message || 'Failed to save coupon');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    const result = await confirm({ title: 'Delete Coupon', html: `Are you sure you want to delete <strong>${coupon.code}</strong>?`, confirmButtonText: 'Delete', icon: 'warning' });
    if (!result.isConfirmed) return;
    try { await couponService.delete(coupon.id); notify.success('Coupon deleted'); setRefreshKey(prev => prev + 1); }
    catch (e: any) { notify.error(e?.response?.data?.message || 'Failed to delete'); }
  };

  const columns: ColumnDef<Coupon>[] = [
    { id: 'serial', header: '#', meta: { width: '4%' }, cell: ({ row, table }) => { const p = table.getState().pagination; return <span className="text-xs text-gray-600 dark:text-gray-400">{(p?.pageIndex||0)*(p?.pageSize||15)+row.index+1}</span>; } },
    { accessorKey: 'code', header: 'Code', meta: { width: '14%' }, cell: ({ row }) => <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">{row.original.code}</span> },
    { accessorKey: 'type', header: 'Type', meta: { width: '6%' }, cell: ({ row }) => <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${row.original.type==='percentage'?'bg-blue-100 text-blue-800 dark:bg-blue-900/30':'bg-green-100 text-green-800 dark:bg-green-900/30'}`}>{row.original.type==='percentage'?'%':'৳'}</span> },
    { accessorKey: 'value', header: 'Value', meta: { width: '8%' }, cell: ({ row }) => <span className="text-xs">{row.original.type==='percentage'?`${row.original.value}%`:`৳${row.original.value}`}</span> },
    { accessorKey: 'description', header: 'Description', meta: { width: '20%' }, cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[200px]">{row.original.description||'N/A'}</span> },
    { id: 'usage', header: 'Usage', meta: { width: '10%' }, cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.used_count}{row.original.usage_limit?` / ${row.original.usage_limit}`:''}</span> },
    { accessorKey: 'valid_until', header: 'Valid Until', meta: { width: '12%' }, cell: ({ row }) => <span className="text-xs">{row.original.valid_until?formatDate(row.original.valid_until):'N/A'}</span> },
    { accessorKey: 'is_active', header: 'Status', meta: { width: '8%' }, cell: ({ row }) => <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${row.original.is_active?'bg-green-100 text-green-800 dark:bg-green-900/30':'bg-red-100 text-red-800 dark:bg-red-900/30'}`}>{row.original.is_active?'Active':'Inactive'}</span> },
    { id: 'actions', header: 'Actions', meta: { width: '10%' }, cell: ({ row }) => <div className="flex gap-1"><button className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 rounded cursor-pointer" title="Edit" onClick={()=>handleEdit(row.original)} aria-label="Edit"><Edit className="w-3.5 h-3.5"/></button><button className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 rounded cursor-pointer" title="Delete" onClick={()=>handleDelete(row.original)} aria-label="Delete"><Trash2 className="w-3.5 h-3.5"/></button></div> },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Coupons</h1>
        <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm cursor-pointer"><Plus className="w-4 h-4" /> Add Coupon</button>
      </div>
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">{isEditing?'Edit Coupon':'Add New Coupon'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Code</label>
                <input type="text" placeholder="e.g., SUMMER25" value={formData.code} onChange={e=>setFormData({...formData,code:e.target.value.toUpperCase()})} className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 uppercase ${formErrors.code?'border-red-500':'border-gray-300 dark:border-gray-600'}`} required />
                {formErrors.code && <p className="text-red-600 text-xs mt-1">{formErrors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Type</label>
                <select value={formData.type} onChange={e=>setFormData({...formData,type:e.target.value as 'percentage'|'fixed'})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100">
                  <option value="percentage">Percentage (%)</option><option value="fixed">Fixed (৳)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Value</label>
                <input type="number" placeholder={formData.type==='percentage'?'e.g. 10':'e.g. 500'} value={formData.value||''} onChange={e=>setFormData({...formData,value:Number(e.target.value)})} className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.value?'border-red-500':'border-gray-300 dark:border-gray-600'}`} required min="1" />
                {formErrors.value && <p className="text-red-600 text-xs mt-1">{formErrors.value}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Status</label>
                <select value={formData.is_active?'active':'inactive'} onChange={e=>setFormData({...formData,is_active:e.target.value==='active'})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Min Order</label>
                <input type="number" placeholder="Optional" value={formData.min_order_amount} onChange={e=>setFormData({...formData,min_order_amount:e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Max Discount</label>
                <input type="number" placeholder="Optional" value={formData.max_discount_amount} onChange={e=>setFormData({...formData,max_discount_amount:e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Usage Limit</label>
                <input type="number" placeholder="Unlimited" value={formData.usage_limit} onChange={e=>setFormData({...formData,usage_limit:e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Valid From</label>
                <input type="date" value={formData.valid_from} onChange={e=>setFormData({...formData,valid_from:e.target.value})} className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.valid_from?'border-red-500':'border-gray-300 dark:border-gray-600'}`} required />
                {formErrors.valid_from && <p className="text-red-600 text-xs mt-1">{formErrors.valid_from}</p>}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-1">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Description</label>
                <input type="text" placeholder="Describe the coupon offer" value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Valid Until</label>
                <input type="date" value={formData.valid_until} onChange={e=>setFormData({...formData,valid_until:e.target.value})} className={`w-full px-2 py-1.5 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.valid_until?'border-red-500':'border-gray-300 dark:border-gray-600'}`} required />
                {formErrors.valid_until && <p className="text-red-600 text-xs mt-1">{formErrors.valid_until}</p>}
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2 mt-1.5">
              <button type="submit" className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm cursor-pointer"><GiSave className="w-4 h-4" />{isEditing?'Update Coupon':'Save Coupon'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 cursor-pointer flex items-center gap-2"><X className="w-4 h-4"/>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable key={refreshKey} columns={columns} fetchData={(p:any)=>couponService.list(p)} pageSize={15} enableSearch={true} searchPlaceholder="Search by code, description..." />
    </div>
  );
}
