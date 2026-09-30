import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/api/axios';
import { demoService } from './demoService';

vi.mock('@/lib/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

describe('demoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns users when backend is in demo mode', async () => {
    const users = [{ id: '1', name: 'Admin', email: 'a@x.com', user_type: 'tenant_admin' }];
    mockedGet.mockResolvedValue({ data: users } as any);

    await expect(demoService.getDemoUsers()).resolves.toEqual(users);
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/demo-users');
  });

  it('returns [] on 404 (demo off)', async () => {
    mockedGet.mockRejectedValue({ response: { status: 404 } });

    await expect(demoService.getDemoUsers()).resolves.toEqual([]);
  });

  it('rethrows non-404 errors', async () => {
    const err = { response: { status: 500 } };
    mockedGet.mockRejectedValue(err);

    await expect(demoService.getDemoUsers()).rejects.toBe(err);
  });

  it('posts user_id to demo-login', async () => {
    mockedPost.mockResolvedValue({ data: { id: '1' } } as any);

    await demoService.demoLogin('user-123');

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/demo-login', { user_id: 'user-123' });
  });
});
