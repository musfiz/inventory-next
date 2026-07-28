'use client';
import { useRef, useEffect, useState, createElement, type ReactNode } from 'react';

type AnimationVariant =
  | 'fade-up'
  | 'zoom-in'
  | 'fade-in'
  | 'slide-left'
  | 'slide-right'
  | 'pop';

type DurationVariant = 'fast' | 'normal' | 'slow';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** animation variant (default: 'fade-up') */
  animation?: AnimationVariant;
  /** duration preset: fast=300ms, normal=500ms, slow=800ms (default: 'normal') */
  duration?: DurationVariant;
  /** position in stagger sequence — delay = staggerIndex × staggerGap */
  staggerIndex?: number;
  /** gap between stagger items in ms (default: 80) */
  staggerGap?: number;
  /** animate only on first appearance (default: true) */
  once?: boolean;
  /** IntersectionObserver threshold (default: 0.15) */
  threshold?: number;
  /** IntersectionObserver rootMargin (default: '0px 0px -50px 0px') */
  rootMargin?: string;
  /** HTML element to render as (default: 'div') */
  as?: 'div' | 'section' | 'article' | 'li' | 'span' | 'aside' | 'header' | 'footer';
}

const DURATION_MAP: Record<DurationVariant, string> = {
  fast: '600ms',
  normal: '1000ms',
  slow: '2000ms',
};

export default function ScrollReveal({
  children,
  className = '',
  animation = 'fade-up',
  duration = 'slow',
  staggerIndex = 0,
  staggerGap = 200,
  once = true,
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
  as = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Use rAF to guarantee the browser paints the initial hidden frame
          // before the animation class is applied — prevents "appears instantly" bug
          requestAnimationFrame(() => {
            setVisible(true);
          });
          if (once) observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  const delay = staggerIndex * staggerGap;
  const animationClass = visible ? `sf-${animation}` : '';
  const hiddenClass = !visible ? 'opacity-0' : '';

  const style: React.CSSProperties = {
    '--sf-duration': DURATION_MAP[duration],
    '--sf-delay': `${delay}ms`,
  } as React.CSSProperties;

  return createElement(
    as,
    {
      ref,
      className: `${className} ${hiddenClass} ${animationClass}`.trim(),
      style,
    },
    children,
  );
}
