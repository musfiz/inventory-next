'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import apiClient from '@/lib/api/axios';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
} from 'lucide-react';

export interface ServerDataTableProps<T = any> {
  columns: ColumnDef<T>[];
  apiEndpoint?: string;
  fetchData?: (params: any) => Promise<{ data: T[]; total: number; page: number; per_page: number }>;
  pageSize?: number;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  enablePagination?: boolean;
  enableSorting?: boolean;
  baseApiPath?: string;
  searchValue?: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  apiEndpoint,
  fetchData,
  pageSize = 10,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  enablePagination = true,
  enableSorting = true,
  baseApiPath = '/api/v1',
}: ServerDataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const prevSearchRef = useRef('');
  const prevEndpointRef = useRef(apiEndpoint);

  // Fetch data from server
  const fetchDataInternal = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        per_page: pagination.pageSize,
        search: debouncedSearch || undefined,
        sortBy: sorting.length > 0 ? sorting[0].id : undefined,
        sortOrder: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
      };

      let result;
      if (fetchData) {
        // Use custom fetchData function
        result = await fetchData(params);
      } else if (apiEndpoint) {
        // Use API endpoint
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
        const fullEndpoint = `${baseApiPath}${apiEndpoint.startsWith('/') ? '' : '/'}${apiEndpoint}`;
        const response = await apiClient.get(`${fullEndpoint}${fullEndpoint.includes('?') ? '&' : '?'}${queryParams.toString()}`);
        result = response.data;
      } else {
        throw new Error('Either apiEndpoint or fetchData must be provided');
      }

      // Handle custom pagination format
      setData(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      } else if (result.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: Math.ceil(result.total / prev.pageSize),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Single effect to handle all data fetching
  useEffect(() => {
    const searchChanged = prevSearchRef.current !== debouncedSearch;
    const endpointChanged = prevEndpointRef.current !== apiEndpoint;

    // Update refs
    prevSearchRef.current = debouncedSearch;
    prevEndpointRef.current = apiEndpoint;

    // If search or endpoint changed, reset to page 1
    if ((searchChanged || endpointChanged) && pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
      return; // Don't fetch yet, let the page change trigger the fetch
    }

    // Otherwise fetch data
    fetchDataInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearch, sorting, apiEndpoint]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.page - 1, // Convert 1-based to 0-based for TanStack Table
        pageSize: pagination.pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination.totalPages,
  });

  const goToPage = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages)),
    }));
  };

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      {enableSearch && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                      style={{
                        width: (header.column.columnDef as any).meta?.width || 'auto',
                        minWidth: (header.column.columnDef as any).meta?.width || 'auto'
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-1 cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors group'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                              {{
                                asc: <ArrowUp className="h-3 w-3" />,
                                desc: <ArrowDown className="h-3 w-3" />,
                              }[header.column.getIsSorted() as string] ?? (
                                  <ArrowUpDown className="h-3 w-3" />
                                )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2 text-left align-middle whitespace-nowrap text-xs text-gray-900 dark:text-gray-100"
                        style={{
                          width: (cell.column.columnDef as any).meta?.width || 'auto',
                          minWidth: (cell.column.columnDef as any).meta?.width || 'auto'
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-900/30 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-700 dark:text-gray-300">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span>{' '}
                results
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1 || loading}
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center gap-0.5">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  )
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.page - 1 &&
                          page <= pagination.page + 1)
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-1 text-xs text-gray-500 dark:text-gray-400">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => goToPage(page)}
                          disabled={loading}
                          className={`min-w-6 px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${pagination.page === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={
                    pagination.page === pagination.totalPages || loading
                  }
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={
                    pagination.page === pagination.totalPages || loading
                  }
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
