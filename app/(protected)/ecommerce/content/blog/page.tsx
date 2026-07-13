'use client';

import { MdOutlinePostAdd } from 'react-icons/md';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Blog Post List', description: 'Manage blog posts with title, body, cover image, and publish date.' },
  { name: 'Rich-Text Editor', description: 'Create blog content with a WYSIWYG editor.' },
  { name: 'Publish / Draft', description: 'Control publishing state for each blog post.' },
];

export default function BlogPage() {
  return <PageStub title="Blog / News" icon={MdOutlinePostAdd} features={features} />;
}
