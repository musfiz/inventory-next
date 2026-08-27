'use client';

import { useEffect, useState } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface SafeHTMLProps {
  html?: string | null;
  className?: string;
}

export default function SafeHTML({ html, className }: SafeHTMLProps) {
  const [clean, setClean] = useState('');

  useEffect(() => {
    setClean(html ? sanitizeHtml(html) : '');
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
