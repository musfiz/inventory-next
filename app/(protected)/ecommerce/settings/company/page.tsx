'use client';

import { redirect } from 'next/navigation';

export default function CompanyInfoRedirect() {
  redirect('/ecommerce/settings/status');
  return null;
}