'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import type { ProductVariation, PaginationMeta } from '@/types/api.types';

export default function ProductVariationsPage() {
  const router = useRouter();
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  useEffect(() => {
    fetchVariations();
  }, [pagination.current_page, searchTerm]);

  const fetchVariations = async () => {
    try {
      setLoading(true);
      const response = await productVariationService.getVariations({
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: searchTerm || undefined,
      });

      setVariations(response.data || []);
      if (response.meta) {
        setPagination(response.meta);
      }
    } catch (error: any) {
      console.error('Error fetching variations:', error);
      notify.error('Failed to load product variations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      await productVariationService.deleteVariation(id);
      notify.success('Variation deleted successfully');
      fetchVariations();
    } catch (error: any) {
      notify.error(error.response?.data?.message || 'Failed to delete variation');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Product Variations
          </h1>
        </div>
      </div>

      {/* Variations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Variation Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attributes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading variations...
                  </td>
                </tr>
              ) : variations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No variations found
                  </td>
                </tr>
              ) : (
                variations.map((variation) => (
                  <tr key={variation.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {variation.sku}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {variation.product?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {variation.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {variation.variation_attributes?.map((attr) => (
                          <span
                            key={attr.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          >
                            {attr.attribute?.name}: {attr.attribute_value?.value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      ${Number(variation.cost_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      ${Number(variation.selling_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${variation.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                      >
                        {variation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/product-variations/${variation.id}/edit`)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(variation.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && variations.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {pagination.from} to {pagination.to} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
