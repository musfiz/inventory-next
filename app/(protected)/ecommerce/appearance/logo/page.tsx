'use client';

import { Image } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Logo Upload (Light / Dark)', description: 'Upload separate logo variants for light and dark storefront themes.' },
  { name: 'Favicon Upload', description: 'Upload favicon with auto-resize preview for different device sizes.' },
  { name: 'Logo Preview', description: 'Live preview showing how the logo appears on the storefront.' },
];

export default function LogoPage() {
  return <PageStub title="Logo & Favicon" icon={Image} features={features} />;
}
