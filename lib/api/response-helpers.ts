/**
 * Shared helpers for unwrapping list-endpoint response shapes.
 *
 * Backend list endpoints return various shapes depending on the service:
 * - Direct array: `[item1, item2, ...]`
 * - Wrapped in data: `{ data: [item1, ...] }`
 * - Custom key: `{ variations: [item1, ...] }`
 *
 * Centralizing this avoids repeating the same inline ternary in every caller.
 */
export function unwrapListResponse<T>(res: unknown, fallbackKey?: string): T[] {
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (fallbackKey && Array.isArray(obj[fallbackKey])) {
      return obj[fallbackKey] as T[];
    }
  }
  return [];
}
