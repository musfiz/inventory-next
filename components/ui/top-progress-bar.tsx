'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLoadingStore } from '@/stores/loading-store';

const TRICKLE_INTERVAL = 200; // ms between trickle steps
const TRICKLE_MAX = 90; // cap while work is active
const NAV_WINDOW = 500; // ms to keep the bar alive for a pure route transition
const FADE_DELAY = 300; // ms before fade-out / width reset

/**
 * Non-blocking top progress bar mounted once in the root layout.
 *
 * It starts when an API request begins (driven by `useLoadingStore`) or when a
 * client-side route transition begins (`usePathname`), trickles toward ~90%
 * while work is active, then completes to 100% and fades out when everything
 * settles. It never blocks clicks or keyboard interaction and uses the original
 * indigo→purple→pink gradient bar at the top (`h-1`, `z-100`) — a stable,
 * fixed position so the indicator does not shift during navigation.
 */
export default function TopProgressBar() {
  const pathname = usePathname();
  const activeRequests = useLoadingStore((s) => s.activeRequests);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath = useRef(pathname);

  const visibleRef = useRef(false);
  visibleRef.current = visible;
  const activeRef = useRef(activeRequests);
  activeRef.current = activeRequests;

  const startTrickle = () => {
    if (trickleRef.current) return;
    trickleRef.current = setInterval(() => {
      setProgress((p) =>
        p >= TRICKLE_MAX ? TRICKLE_MAX : p + (TRICKLE_MAX - p) * 0.08 + 0.4,
      );
    }, TRICKLE_INTERVAL);
  };

  const stopTrickle = () => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
  };

  const activate = () => {
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    setVisible(true);
    setProgress((p) => (p < 8 ? 8 : p));
    startTrickle();
  };

  const finish = () => {
    stopTrickle();
    if (!visibleRef.current) return;
    if (activeRef.current > 0) {
      // A request is still in flight; keep the bar alive.
      startTrickle();
      return;
    }
    setProgress(100);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      // Reset width after the fade-out transition completes.
      setTimeout(() => setProgress(0), FADE_DELAY);
    }, FADE_DELAY);
  };

  // API request activity
  useEffect(() => {
    if (activeRequests > 0) activate();
    else finish();
  }, [activeRequests]);

  // Client-side route transitions
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    activate();
    if (navRef.current) clearTimeout(navRef.current);
    navRef.current = setTimeout(finish, NAV_WINDOW);
  }, [pathname]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTrickle();
      if (hideRef.current) clearTimeout(hideRef.current);
      if (navRef.current) clearTimeout(navRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-1 overflow-hidden"
      aria-hidden={!visible}
    >
      <div
        className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {visible ? 'Loading' : ''}
      </span>
    </div>
  );
}
