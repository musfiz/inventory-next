'use client';

import { useState, useMemo } from 'react';
import { Truck, Plus, Edit, Trash2, X, MapPin, Globe, DollarSign, Clock, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { ShippingZone, ShippingZoneRate } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import shippingZoneService from '@/services/shippingZoneService';
import { formatDate } from '@/lib/utils/date';

// ── Constants ─────────────────────────────────────────────────────────

const emptyForm = {
  name: '',
  description: '',
  cities: '',
  countries: '',
  base_rate: 0,
  free_shipping_threshold: '',
  estimated_days_min: 3,
  estimated_days_max: 7,
  is_active: true,
};

// ── Rate Modal Component ──────────────────────────────────────────────

function RateManagerModal({
  zone,
  onClose,
  onUpdate,
}: {
  zone: ShippingZone;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [rates, setRates] = useState<ShippingZoneRate[]>(zone.rates || []);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [rateForm, setRateForm] = useState({
    min_weight: '', max_weight: '', min_amount: '', max_amount: '',
    rate: 0, estimated_days: '3-5', is_free: false,
  });

  const handleLoadRates = async () => {
    setLoading(true);
    try {
      const data = await shippingZoneService.getRates(zone.id);
      setRates(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleAddRate = async () => {
    if (rateForm.rate <= 0 && !rateForm.is_free) {
      notify.warning('Rate must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      await shippingZoneService.saveRate(zone.id, {
        zone_id: zone.id,
        min_weight: rateForm.min_weight ? Number(rateForm.min_weight) : undefined,
        max_weight: rateForm.max_weight ? Number(rateForm.max_weight) : undefined,
        min_amount: rateForm.min_amount ? Number(rateForm.min_amount) : undefined,
        max_amount: rateForm.max_amount ? Number(rateForm.max_amount) : undefined,
        rate: rateForm.rate,
        estimated_days: rateForm.estimated_days,
        is_free: rateForm.is_free,
      });
      notify.success('Rate added');
      setShowAddForm(false);
      setRateForm({ min_weight: '', max_weight: '', min_amount: '', max_amount: '', rate: 0, estimated_days: '3-5', is_free: false });
      handleLoadRates();
    } catch { notify.error('Failed to add rate'); }
    setLoading(false);
  };

  const handleDeleteRate = async (rateId: string) => {
    const result = await confirm({ title: 'Delete Rate', html: 'Are you sure you want to delete this rate?', confirmButtonText: 'Delete', icon: 'warning' });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await shippingZoneService.deleteRate(zone.id, rateId);
      notify.success('Rate deleted');
      handleLoadRates();
    } catch { notify.error('Failed to delete rate'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-600" />
            Rates for {zone.name}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          {rates.length === 0 && !loading && (
            <div className="text-center py-6 text-xs text-gray-500">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p>No rates configured for this zone.</p>
            </div>
          )}
          {rates.map(rate => (
            <div key={rate.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-md px-2.5 py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {rate.is_free ? 'Free' : `৳${rate.rate.toLocaleString('en-IN')}`}
                  </span>
                  <span className="text-[10px] text-gray-500">{rate.estimated_days} days</span>
                  {rate.is_free && <span className="text-[10px] font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1 py-0.5 rounded">Free</span>}
                </div>
                <div className="text-[10px] text-gray-500">
                  {rate.min_weight != null && `Weight: ${rate.min_weight} - ${rate.max_weight ?? '∞'} kg`}
                  {rate.min_amount != null && `Amount: ৳${rate.min_amount} - ${rate.max_amount ? `৳${rate.max_amount}` : '∞'}`}
                  {rate.min_weight == null && rate.min_amount == null && 'No conditions'}
                </div>
              </div>
              <button
                onClick={() => handleDeleteRate(rate.id)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
               aria-label="Delete" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add Rate Form */}
          {showAddForm ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md p-2.5 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400">Min Weight (kg)</label>
                  <input type="number" value={rateForm.min_weight} onChange={e => setRateForm({...rateForm, min_weight: e.target.value})} className="w-full px-1.5 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" min="0" step="0.1" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400">Max Weight (kg)</label>
                  <input type="number" value={rateForm.max_weight} onChange={e => setRateForm({...rateForm, max_weight: e.target.value})} className="w-full px-1.5 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" min="0" step="0.1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400">Rate (৳)</label>
                  <input type="number" value={rateForm.rate || ''} onChange={e => setRateForm({...rateForm, rate: Number(e.target.value)})} className="w-full px-1.5 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" min="0" disabled={rateForm.is_free} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400">Est. Days</label>
                  <input type="text" value={rateForm.estimated_days} onChange={e => setRateForm({...rateForm, estimated_days: e.target.value})} className="w-full px-1.5 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="3-5" />
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                <input type="checkbox" checked={rateForm.is_free} onChange={e => setRateForm({...rateForm, is_free: e.target.checked})} className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
                <span className="text-[11px] text-gray-700 dark:text-gray-300">Free shipping</span>
              </label>
              <div className="flex gap-1.5">
                <button onClick={handleAddRate} disabled={loading} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer">
                  <GiSave className="w-3 h-3" /> Add Rate
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-sm cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Rate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function ShippingZonesPage() {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<ShippingZone | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [ratesZone, setRatesZone] = useState<ShippingZone | null>(null);
  const [expandedFilter, setExpandedFilter] = useState(false);

  // ── Form Handlers ──────────────────────────────────────────────────

  const handleAdd = () => {
    setIsEditing(false);
    setCurrent(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (zone: ShippingZone) => {
    setIsEditing(true);
    setCurrent(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      cities: zone.cities.join(', '),
      countries: zone.countries.join(', '),
      base_rate: zone.base_rate,
      free_shipping_threshold: zone.free_shipping_threshold?.toString() || '',
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max,
      is_active: zone.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) errors.name = 'Zone name is required';
    if (formData.base_rate < 0) errors.base_rate = 'Rate cannot be negative';
    if (!formData.cities.trim() && !formData.countries.trim()) {
      errors.cities = 'At least one city or country is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validate()) return;

    try {
      await shippingZoneService.store({
        id: isEditing && current?.id ? current.id : undefined,
        name: formData.name,
        description: formData.description,
        cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean),
        countries: formData.countries.split(',').map(c => c.trim()).filter(Boolean),
        base_rate: formData.base_rate,
        free_shipping_threshold: formData.free_shipping_threshold ? Number(formData.free_shipping_threshold) : null,
        estimated_days_min: formData.estimated_days_min,
        estimated_days_max: formData.estimated_days_max,
        is_active: formData.is_active,
      });
      notify.success(isEditing ? 'Zone updated' : 'Zone created');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      const d = error?.response?.data;
      if (d?.errors) setFormErrors(d.errors);
      else notify.error(d?.message || error?.message || 'Failed to save zone');
    }
  };

  const handleDelete = async (zone: ShippingZone) => {
    const result = await confirm({
      title: 'Delete Zone',
      html: `Are you sure you want to delete <strong>${zone.name}</strong>?`,
      confirmButtonText: 'Delete',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await shippingZoneService.delete(zone.id);
      notify.success('Zone deleted');
      setRefreshKey(prev => prev + 1);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleToggleActive = async (zone: ShippingZone) => {
    try {
      await shippingZoneService.toggleActive(zone.id);
      notify.success(zone.is_active ? 'Zone deactivated' : 'Zone activated');
      setRefreshKey(prev => prev + 1);
    } catch { notify.error('Failed to toggle status'); }
  };

  const handleManageRates = async (zone: ShippingZone) => {
    // Load fresh data including rates
    const fresh = await shippingZoneService.getById(zone.id);
    setRatesZone(fresh || zone);
    setShowRatesModal(true);
  };

  // ── Columns ────────────────────────────────────────────────────────

  const columns: ColumnDef<ShippingZone>[] = useMemo(() => [
    {
      id: 'serial',
      header: '#',
      meta: { width: '3%' },
      cell: ({ row, table }) => {
        const p = table.getState().pagination;
        return <span className="text-xs text-gray-500 dark:text-gray-400">{(p?.pageIndex || 0) * (p?.pageSize || 15) + row.index + 1}</span>;
      },
    },
    {
      accessorKey: 'name',
      header: 'Zone Name',
      meta: { width: '16%' },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{row.original.name}</span>
          <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{row.original.description}</span>
        </div>
      ),
    },
    {
      id: 'coverage',
      header: 'Coverage',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          {row.original.cities.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate max-w-[180px]">{row.original.cities.slice(0, 3).join(', ')}{row.original.cities.length > 3 ? ` +${row.original.cities.length - 3}` : ''}</span>
            </div>
          )}
          {row.original.countries.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
              <Globe className="w-2.5 h-2.5" />
              <span className="truncate max-w-[180px]">{row.original.countries.slice(0, 2).join(', ')}{row.original.countries.length > 2 ? ` +${row.original.countries.length - 2}` : ''}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'base_rate',
      header: 'Base Rate',
      meta: { width: '7%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          ৳{row.original.base_rate.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      id: 'est_days',
      header: 'Est. Days',
      meta: { width: '7%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <Clock className="w-2.5 h-2.5" />
          <span>{row.original.estimated_days_min} - {row.original.estimated_days_max}</span>
        </div>
      ),
    },
    {
      id: 'free_threshold',
      header: 'Free Over',
      meta: { width: '7%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.free_shipping_threshold ? `৳${row.original.free_shipping_threshold.toLocaleString('en-IN')}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '6%' },
      cell: ({ row }) => (
        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${row.original.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '14%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleManageRates(row.original)}
            className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
            title="Manage Rates"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleActive(row.original)}
            className={`p-1 rounded cursor-pointer ${row.original.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={row.original.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.original.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
           aria-label="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
           aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-2">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Shipping Zones
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Zone
          </button>
        </div>
      </div>

      {/* ── Add/Edit Form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2">
          <h2 className="text-base font-semibold mb-1.5 text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-600" />
            {isEditing ? 'Edit Shipping Zone' : 'Add New Shipping Zone'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Zone Name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g., Dhaka Metro" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-2 py-1.5 text-xs border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                {formErrors.name && <p className="text-red-500 text-[10px] mt-0.5">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Base Rate (৳)</label>
                <input type="number" value={formData.base_rate} onChange={e => setFormData({...formData, base_rate: Number(e.target.value)})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Free Shipping Over (optional)</label>
                <input type="number" value={formData.free_shipping_threshold} onChange={e => setFormData({...formData, free_shipping_threshold: e.target.value})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" placeholder="e.g., 500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Cities <span className="text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input type="text" placeholder="e.g., Dhaka, Mirpur, Uttara" value={formData.cities} onChange={e => setFormData({...formData, cities: e.target.value})} className={`w-full px-2 py-1.5 text-xs border rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${formErrors.cities ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                {formErrors.cities && <p className="text-red-500 text-[10px] mt-0.5">{formErrors.cities}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Countries <span className="text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input type="text" placeholder="e.g., Bangladesh" value={formData.countries} onChange={e => setFormData({...formData, countries: e.target.value})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Description</label>
                <input type="text" placeholder="Describe this zone" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Est. Min (days)</label>
                  <input type="number" value={formData.estimated_days_min} onChange={e => setFormData({...formData, estimated_days_min: Number(e.target.value)})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Est. Max (days)</label>
                  <input type="number" value={formData.estimated_days_max} onChange={e => setFormData({...formData, estimated_days_max: Number(e.target.value)})} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="1" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-0.5">
              <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm cursor-pointer">
                <GiSave className="w-3.5 h-3.5" /> {isEditing ? 'Update Zone' : 'Save Zone'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 text-white rounded-sm hover:bg-gray-700 cursor-pointer">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(params: any) => shippingZoneService.list({
          ...params,
          search: params.search || undefined,
        })}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by zone name, city, country..."
      />

      {/* ── Rate Manager Modal ───────────────────────────────────────── */}
      {showRatesModal && ratesZone && (
        <RateManagerModal
          zone={ratesZone}
          onClose={() => { setShowRatesModal(false); setRatesZone(null); setRefreshKey(prev => prev + 1); }}
          onUpdate={() => setRefreshKey(prev => prev + 1)}
        />
      )}
    </div>
  );
}
