'use client';

import { useEffect } from 'react';

/**
 * Globally prevents mouse-wheel from changing the value of number inputs.
 * Blurs the focused number input on scroll so the page scrolls instead.
 */
export default function NumberScrollGuard() {
  useEffect(() => {
    const handleWheel = () => {
      const active = document.activeElement as HTMLInputElement | null;
      if (active?.type === 'number') active.blur();
    };

    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  return null;
}
