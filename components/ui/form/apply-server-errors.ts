'use client';

import { useFormContext } from 'react-hook-form';
import { normalizeServerErrors } from '@/lib/utils/validation';

type ServerErrors = Record<string, string | string[]>;

/**
 * Push backend 422 field errors into the surrounding react-hook-form instance.
 * Returns true if any errors were applied (so callers can skip the success path).
 */
export function useApplyServerErrors() {
  const { setError } = useFormContext();
  return function apply(errors: ServerErrors | undefined) {
    const normalized = normalizeServerErrors(errors);
    if (Object.keys(normalized).length === 0) return false;
    for (const [field, msg] of Object.entries(normalized)) {
      setError(field, { type: 'server', message: msg });
    }
    return true;
  };
}
