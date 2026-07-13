'use client';

import { useState } from 'react';
import { ClipboardCheck, Check, X, Edit, Trash2, Star } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { Review } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import reviewService from '@/services/reviewService';
import { formatDate } from '@/lib/utils/date';

export default function ReviewQueuePage() {
  const [respondReview, setRespondReview] = useState<Review | null>(null);
  const [respondText, setRespondText] = useState('');
  const [showRespond, setShowRespond] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const handleApprove = async (r: Review) => { try { await reviewService.approve(r.id); notify.success('Approved'); setRefreshKey(k=>k+1); } catch { notify.error('Failed'); } };
  const handleReject = async (r: Review) => { try { await reviewService.reject(r.id); notify.success('Rejected'); setRefreshKey(k=>k+1); } catch { notify.error('Failed'); } };
  const handleRespond = (r: Review) => { setRespondReview(r); setRespondText(r.admin_response||''); setShowRespond(true); };
  const handleRespondSubmit = async (e: React.FormEvent) => { e.preventDefault(); if(!respondReview) return; try { await reviewService.respond(respondReview.id, respondText); notify.success('Response saved'); setShowRespond(false); setRespondReview(null); setRefreshKey(k=>k+1); } catch { notify.error('Failed'); } };
  const handleDelete = async (r: Review) => { const result = await confirm({ title:'Delete Review', html:`Delete review from <strong>${r.customer_name}</strong>?`, confirmButtonText:'Delete', icon:'warning' }); if(!result.isConfirmed) return; try { await reviewService.delete(r.id); notify.success('Deleted'); setRefreshKey(k=>k+1); } catch { notify.error('Failed'); } };

  const getStars = (rating: number) => <div className="flex gap-0.5">{ [1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s<=rating?'text-yellow-400 fill-yellow-400':'text-gray-300 dark:text-gray-600'}`} />) }</div>;

  const columns: ColumnDef<Review>[] = [
    { id:'serial', header:'#', meta:{width:'4%'}, cell:({row,table})=>{const p=table.getState().pagination;return <span className="text-xs">{(p?.pageIndex||0)*(p?.pageSize||15)+row.index+1}</span>;} },
    { accessorKey:'product_name', header:'Product', meta:{width:'18%'}, cell:({row})=><span className="text-xs font-medium truncate block max-w-[180px]">{row.original.product_name}</span> },
    { accessorKey:'customer_name', header:'Customer', meta:{width:'14%'}, cell:({row})=><div className="flex flex-col"><span className="text-xs">{row.original.customer_name}</span><span className="text-[10px] text-gray-500">{row.original.customer_email}</span></div> },
    { accessorKey:'rating', header:'Rating', meta:{width:'8%'}, cell:({row})=>getStars(row.original.rating) },
    { accessorKey:'title', header:'Review', meta:{width:'18%'}, cell:({row})=><div className="flex flex-col"><span className="text-xs font-medium truncate max-w-[180px]">{row.original.title}</span><span className="text-[10px] text-gray-500 truncate max-w-[180px]">{row.original.body}</span></div> },
    { accessorKey:'is_approved', header:'Status', meta:{width:'10%'}, cell:({row})=><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${row.original.is_approved?'bg-green-100 text-green-800 dark:bg-green-900/30':'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'}`}>{row.original.is_approved?<><Check className="w-3 h-3"/>Approved</>:<><X className="w-3 h-3"/>Pending</>}</span> },
    { accessorKey:'created_at', header:'Date', meta:{width:'10%'}, cell:({row})=><span className="text-xs">{row.original.created_at?formatDate(row.original.created_at):'N/A'}</span> },
    { id:'actions', header:'Actions', meta:{width:'16%'}, cell:({row})=><div className="flex gap-1">
      {!row.original.is_approved?<button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded cursor-pointer" title="Approve" onClick={()=>handleApprove(row.original)}><Check className="w-3.5 h-3.5"/></button>:<button className="p-1 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded cursor-pointer" title="Reject" onClick={()=>handleReject(row.original)}><X className="w-3.5 h-3.5"/></button>}
      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer" title="Respond" onClick={()=>handleRespond(row.original)}><Edit className="w-3.5 h-3.5"/></button>
      <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer" title="Delete" onClick={()=>handleDelete(row.original)}><Trash2 className="w-3.5 h-3.5"/></button>
    </div> },
  ];

  const fetchReviews = async (params: any) => reviewService.list({ ...params, filterParams: { is_approved: approvalFilter||undefined, rating: ratingFilter||undefined } });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Moderation Queue</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1">
        <div className="flex gap-3 flex-wrap">
          <select value={approvalFilter} onChange={e=>setApprovalFilter(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100">
            <option value="">All Status</option><option value="true">Approved</option><option value="false">Pending</option>
          </select>
          <select value={ratingFilter} onChange={e=>setRatingFilter(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100">
            <option value="">All Ratings</option>{[5,4,3,2,1].map(r=><option key={r} value={r}>{r} Star{r>1?'s':''}</option>)}
          </select>
        </div>
      </div>
      {showRespond && respondReview && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5">Respond to Review</h2>
          <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-sm">
            <div className="flex items-center gap-2 mb-1">{getStars(respondReview.rating)}<span className="text-xs font-medium">{respondReview.title}</span></div>
            <p className="text-xs text-gray-600">{respondReview.body}</p>
            <p className="text-[10px] text-gray-500 mt-1">by {respondReview.customer_name} on {formatDate(respondReview.created_at)}</p>
          </div>
          <form onSubmit={handleRespondSubmit}>
            <textarea placeholder="Write your response..." value={respondText} onChange={e=>setRespondText(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100 h-20 resize-none" />
            <div className="flex gap-2 mt-1.5">
              <button type="submit" className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer"><GiSave className="w-4 h-4"/>Save Response</button>
              <button type="button" onClick={()=>{setShowRespond(false);setRespondReview(null);}} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-sm hover:bg-gray-700 cursor-pointer flex items-center gap-2"><X className="w-4 h-4"/>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable key={refreshKey} columns={columns} fetchData={fetchReviews} pageSize={15} enableSearch={true} searchPlaceholder="Search by product, customer..." />
    </div>
  );
}
