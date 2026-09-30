import { describe, it, expect } from 'vitest';
import { isDemoModeForbidden } from '@/lib/api/axios';

describe('demo mode 403 handling', () => {
  it('detects 403 with code DEMO_MODE (no access-denied redirect)', () => {
    expect(isDemoModeForbidden({ response: { status: 403, data: { code: 'DEMO_MODE' } } })).toBe(true);
  });

  it('does not treat other 403s as demo mode', () => {
    expect(isDemoModeForbidden({ response: { status: 403, data: {} } })).toBe(false);
    expect(isDemoModeForbidden({ response: { status: 403 } })).toBe(false);
    expect(isDemoModeForbidden({ response: { status: 401, data: { code: 'DEMO_MODE' } } })).toBe(false);
  });
});
