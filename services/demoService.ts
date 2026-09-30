import apiClient from '@/lib/api/axios';
import type { DemoUser } from '@/types/demo';

/**
 * Demo Mode Service
 * Backend decides demo availability:
 * - GET /api/v1/demo-users → 200 with users when demo on, 404 when off.
 * - POST /api/v1/demo-login { user_id } → 200 user JSON when demo on, 404 when off.
 */
class DemoService {
  async getDemoUsers(): Promise<DemoUser[]> {
    try {
      const res = await apiClient.get<DemoUser[]>('/api/v1/demo-users');
      return Array.isArray(res.data) ? res.data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async demoLogin(userId: string) {
    const res = await apiClient.post('/api/v1/demo-login', { user_id: userId });
    return res.data;
  }
}

export const demoService = new DemoService();
export default demoService;
