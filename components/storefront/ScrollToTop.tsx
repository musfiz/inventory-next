'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      prev.current = pathname;
    }
  }, [pathname]);

  return null;
}
