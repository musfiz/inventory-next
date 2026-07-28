'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: 'none' | 'd1' | 'd2' | 'd3' | 'd4';
  delayMs?: number;
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 'none',
  delayMs,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass = delay === 'none' ? '' : `sf-zoom-in-${delay}`;
  const delayStyle = delayMs !== undefined ? { animationDelay: `${delayMs}ms` } : undefined;

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? `sf-zoom-in ${delayClass}` : 'opacity-0'}`}
      style={delayStyle}
    >
      {children}
    </div>
  );
}
