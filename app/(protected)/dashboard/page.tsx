'use client';

import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import TenantDashboard from '@/components/dashboard/TenantDashboard';

export default function AdminDashboard() {
  const user = useAuthStore(state => state.user);
  const { isSuperAdmin } = usePermissions();

  return (
    <div className="p-1">
      {isSuperAdmin ? <SuperAdminDashboard /> : <TenantDashboard />}
    </div>
  );
}
