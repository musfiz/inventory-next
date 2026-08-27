'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  RefreshCw,
} from 'lucide-react';

export interface ServerDataTableProps<T = any> {
  columns: ColumnDef<T>[];
  apiEndpoint?: string;
  fetchData?: (
    params: any
  ) => Promise<{ data: T[]; total: number; page: number; per_page: number }>;
  data?: T[];
  pageSize?: number;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  enablePagination?: boolean;
  enableSorting?: boolean;
  baseApiPath?: string;
  searchValue?: string;
  filterParams?: Record<string, string | number | undefined | null>;
  maxHeight?: string;
  refreshKey?: number;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function DataTableInner<T extends Record<string, any>>({
  columns,
  apiEndpoint,
  fetchData,
  data: initialData,
  pageSize = 10,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  enablePagination = true,
  enableSorting = true,
  baseApiPath = '/api/v1',
  filterParams,
  maxHeight,
  refreshKey,
}: ServerDataTableProps<T>) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlSearch = searchParams.get('search') || '';
  const urlSortBy = searchParams.get('sortBy') || '';
  const urlSortOrder = searchParams.get('sortOrder') || '';

  const [data, setData] = useState<T[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: urlPage,
    pageSize,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [sorting, setSorting] = useState<SortingState>(
    urlSortBy ? [{ id: urlSortBy, desc: urlSortOrder === 'desc' }] : []
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const prevRefreshKeyRef = useRef(refreshKey);
  const prevSearchRef = useRef(urlSearch);
  const prevEndpointRef = useRef(apiEndpoint);
  const prevFilterParamsKeyRef = useRef('');
  const initialSyncDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const filterParamsKey = JSON.stringify(filterParams);

  const updateURL = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchDataInternal = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
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
        result = await fetchData({ ...params, ...filterParams, signal });
      } else if (apiEndpoint) {
        const queryParams = new URLSearchParams();
        [...Object.entries(params), ...Object.entries(filterParams || {})].forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
        const fullEndpoint = `${baseApiPath}${apiEndpoint.startsWith('/') ? '' : '/'}${apiEndpoint}`;
        const response = await apiClient.get(
          `${fullEndpoint}${fullEndpoint.includes('?') ? '&' : '?'}${queryParams.toString()}`,
          { signal }
        );
        result = response.data;
      } else {
        throw new Error('Either apiEndpoint or fetchData must be provided');
      }

      setData(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      } else if (result.meta) {
        setPagination(prev => ({
          ...prev,
          page: result.meta.current_page,
          total: result.meta.total,
          totalPages: result.meta.last_page,
          pageSize: result.meta.per_page,
        }));
      } else if (result.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: Math.ceil(result.total / prev.pageSize),
        }));
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshKey !== undefined && prevRefreshKeyRef.current !== undefined && refreshKey !== prevRefreshKeyRef.current) {
      setRefreshTrigger(prev => prev + 1);
    }
    prevRefreshKeyRef.current = refreshKey;
  }, [refreshKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (initialData) {
      let filtered = initialData;
      const q = debouncedSearch.toLowerCase();
      if (debouncedSearch) {
        filtered = initialData.filter(row =>
          Object.values(row).some(v =>
            String(v).toLowerCase().includes(q)
          )
        );
      }
      const total = filtered.length;
      const totalPages = Math.ceil(total / pagination.pageSize);
      const page = Math.min(pagination.page, Math.max(totalPages, 1));
      setPagination(prev => ({ ...prev, total, totalPages }));
      const start = (page - 1) * pagination.pageSize;
      setData(filtered.slice(start, start + pagination.pageSize));
      return;
    }

    const searchChanged = prevSearchRef.current !== debouncedSearch;
    const endpointChanged = prevEndpointRef.current !== apiEndpoint;
    const filterChanged = prevFilterParamsKeyRef.current !== filterParamsKey;

    prevSearchRef.current = debouncedSearch;
    prevEndpointRef.current = apiEndpoint;
    prevFilterParamsKeyRef.current = filterParamsKey;

    if ((searchChanged || endpointChanged || filterChanged) && pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
      return;
    }

    fetchDataInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearch, sorting, apiEndpoint, refreshTrigger, initialData, filterParamsKey]);

  useEffect(() => {
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      return;
    }
    updateURL({
      page: pagination.page > 1 ? String(pagination.page) : null,
      search: debouncedSearch || null,
      sortBy: sorting[0]?.id || null,
      sortOrder: sorting[0]?.desc ? 'desc' : sorting[0]?.id ? 'asc' : null,
    });
  }, [pagination.page, debouncedSearch, sorting]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.page - 1,
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
    setPagination(prev => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages)),
    }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {enableSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
        )}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            aria-label={loading ? 'Refreshing…' : 'Refresh'}
            role={loading ? 'status' : undefined}
          />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto overflow-y-auto" style={maxHeight ? { maxHeight } : { maxHeight: 'calc(100vh - 200px)' }}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                      style={{
                        width: (header.column.columnDef as any).meta?.width || 'auto',
                        minWidth: (header.column.columnDef as any).meta?.width || 'auto',
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
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                  <td colSpan={columns.length} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-3 py-2 text-left align-middle whitespace-nowrap text-xs text-gray-900 dark:text-gray-100"
                        style={{
                          width: (cell.column.columnDef as any).meta?.width || 'auto',
                          minWidth: (cell.column.columnDef as any).meta?.width || 'auto',
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

        {enablePagination && pagination.totalPages > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/30 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-700 dark:text-gray-300">
                Showing{' '}
                <span className="font-medium">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </div>

              {pagination.totalPages > 1 && (
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
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.page - 1 && page <= pagination.page + 1)
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-1 text-xs text-gray-500 dark:text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => goToPage(page)}
                          disabled={loading}
                          className={`min-w-6 px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                            pagination.page === page
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
                  disabled={pagination.page === pagination.totalPages || loading}
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages || loading}
                  className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataTable<T extends Record<string, any>>(
  props: ServerDataTableProps<T>
) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    }>
      <DataTableInner {...props} />
    </Suspense>
  );
}
