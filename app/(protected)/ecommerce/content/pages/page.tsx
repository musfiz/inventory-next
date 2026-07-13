'use client';

import { FileText } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Static Pages List', description: 'Manage About, Contact, Terms, Privacy, Return Policy, FAQ pages.' },
  { name: 'Rich-Text Editor', description: 'Create and edit page content with a WYSIWYG editor.' },
  { name: 'Custom Pages', description: 'Create custom pages with slug, title, body, SEO meta, and publish toggle.' },
  { name: 'Publish / Draft Toggle', description: 'Control which pages are published or saved as draft.' },
];

export default function CmsPagesPage() {
  return <PageStub title="Static Pages (CMS)" icon={FileText} features={features} />;
}
