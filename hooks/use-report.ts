'use client';

import { useState, useCallback, useRef } from 'react';
import { notify } from '@/lib/notifications';

interface UseReportOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseReportResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  generate: () => Promise<T | null>;
  reset: () => void;
}

export function useReport<T = any>(
  fetcher: () => Promise<T>,
  options: UseReportOptions = {},
): UseReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const generate = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      if (options.successMessage) {
        notify.success(options.successMessage);
      }
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || options.errorMessage || 'Failed to generate report';
      setError(message);
      notify.error(message);
      options.onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, generate, reset };
}
