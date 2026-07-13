'use client';

import { Sliders } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Slide List (Drag & Reorder)', description: 'Sortable carousel slides with image, title, subtitle, CTA text and link.' },
  { name: 'Image Upload with Crop', description: 'Upload slide images with crop and preview functionality.' },
  { name: 'Slide Scheduling', description: 'Set start/end dates for each slide to control automatic rotation.' },
  { name: 'Active / Inactive Toggle', description: 'Enable or disable individual slides without deleting them.' },
  { name: 'Text Alignment', description: 'Choose text position (left/center/right) per slide.' },
];

export default function HeroSliderPage() {
  return <PageStub title="Hero Slider" icon={Sliders} features={features} />;
}
