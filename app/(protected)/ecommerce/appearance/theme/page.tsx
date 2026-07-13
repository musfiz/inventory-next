'use client';

import { Palette } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Primary / Accent Color Picker', description: 'Live preview swatches for primary and accent colors across the storefront.' },
  { name: 'Font Pairing Selector', description: 'Choose heading and body font combinations from available Google Fonts.' },
  { name: 'Dark Mode Toggle', description: 'Enable optional dark mode for the storefront with styled variants.' },
  { name: 'Color Presets', description: 'Quick-apply pre-designed color scheme presets.' },
];

export default function ThemePage() {
  return <PageStub title="Theme & Colors" icon={Palette} features={features} />;
}
