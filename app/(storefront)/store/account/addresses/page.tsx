'use client';

import { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Home,
  Briefcase,
  X,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import type { Address } from '@/types/storefront';
import { notify } from '@/lib/notifications';

const EMPTY: Omit<Address, 'id'> = {
  label: 'Home',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: 'Dhaka',
  area: '',
  zipCode: '',
  country: 'Bangladesh',
  isDefault: false,
};

export default function AddressesPage() {
  const addresses = useCustomerAuthStore(s => s.addresses);
  const addAddress = useCustomerAuthStore(s => s.addAddress);
  const removeAddress = useCustomerAuthStore(s => s.removeAddress);
  const setDefault = useCustomerAuthStore(s => s.setDefaultAddress);

  const [modal, setModal] = useState<Omit<Address, 'id'> | null>(null);

  const handleSave = () => {
    if (!modal?.name || !modal?.phone || !modal?.addressLine1) {
      notify.error('Please fill in all required fields');
      return;
    }
    addAddress(modal);
    notify.success('Address added');
    setModal(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            Saved Addresses
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your delivery addresses
          </p>
        </div>
        <button
          onClick={() => setModal({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add new
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <MapPin className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            No addresses saved
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Add an address for faster checkout
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map(a => {
            const Icon = a.label.toLowerCase() === 'office' ? Briefcase : Home;
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {a.label}
                      </p>
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this address?')) {
                        removeAddress(a.id);
                        notify.success('Address deleted');
                      }
                    }}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                  {a.name}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {a.addressLine1}
                  {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {a.city}, {a.zipCode}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {a.phone}
                </p>
                {!a.isDefault && (
                  <button
                    onClick={() => {
                      setDefault(a.id);
                      notify.success('Default address updated');
                    }}
                    className="mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Set as default
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModal(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-950 sf-fade-in-zoom">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Add new address
              </h3>
              <button
                onClick={() => setModal(null)}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setModal({ ...modal, label: 'Home' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-semibold ${
                    modal.label === 'Home'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30'
                      : 'border-gray-200 text-gray-700 dark:border-gray-700'
                  }`}
                >
                  <Home className="h-4 w-4" /> Home
                </button>
                <button
                  onClick={() => setModal({ ...modal, label: 'Office' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-semibold ${
                    modal.label === 'Office'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30'
                      : 'border-gray-200 text-gray-700 dark:border-gray-700'
                  }`}
                >
                  <Briefcase className="h-4 w-4" /> Office
                </button>
              </div>
              <input
                placeholder="Full name *"
                value={modal.name}
                onChange={e => setModal({ ...modal, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <input
                placeholder="Phone *"
                value={modal.phone}
                onChange={e => setModal({ ...modal, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <input
                placeholder="Address line 1 *"
                value={modal.addressLine1}
                onChange={e => setModal({ ...modal, addressLine1: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <input
                placeholder="Address line 2"
                value={modal.addressLine2 || ''}
                onChange={e => setModal({ ...modal, addressLine2: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City"
                  value={modal.city}
                  onChange={e => setModal({ ...modal, city: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <input
                  placeholder="ZIP"
                  value={modal.zipCode}
                  onChange={e => setModal({ ...modal, zipCode: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="sf-check"
                  checked={modal.isDefault || false}
                  onChange={e => setModal({ ...modal, isDefault: e.target.checked })}
                />
                Set as default address
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
