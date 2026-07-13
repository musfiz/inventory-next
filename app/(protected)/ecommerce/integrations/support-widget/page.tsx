'use client';

import { MessagesSquare } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Enable / Disable Widget', description: 'Toggle the chat/support widget on or off globally.' },
  { name: 'Provider Selection', description: 'Choose provider: Tawk.to, WhatsApp click-to-chat, or custom script.' },
  { name: 'WhatsApp Number', description: 'Enter WhatsApp number for click-to-chat button.' },
  { name: 'Widget Script', description: 'Paste provider widget script or configure custom widget settings.' },
];

export default function SupportWidgetPage() {
  return <PageStub title="Chat / Support Widget" icon={MessagesSquare} features={features} />;
}
