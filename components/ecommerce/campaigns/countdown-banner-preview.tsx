'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, ImageIcon } from 'lucide-react';

interface CountdownBannerPreviewProps {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  banner_image_url?: string | null;
  /** Blob URL from an unsaved file upload */
  banner_preview?: string | null;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(target: Date): Countdown {
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function CountdownBannerPreview({
  name,
  description,
  start_date,
  end_date,
  discount_type,
  discount_value,
  banner_image_url,
  banner_preview,
}: CountdownBannerPreviewProps) {
  const [now, setNow] = useState<number>(Date.now());

  // Prefix relative backend URLs (e.g. /storage/...) with the API origin
  const resolvedBanner = (() => {
    const url = banner_preview || banner_image_url;
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:'))
      return url;
    const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
    if (!baseUrl) return url;
    return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  })();

  const hasBanner = !!resolvedBanner;

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Determine phase
  const missingDates = !start_date || !end_date;
  const start = new Date(start_date);
  const end = new Date(end_date);
  const isValid = !missingDates && end.getTime() > start.getTime();

  let phase: 'before' | 'during' | 'after' | 'invalid' | 'missing' = 'missing';
  let countdownTarget: Date | null = null;
  let label = '';

  if (missingDates) {
    phase = 'missing';
    label = 'Set start and end dates to see the countdown';
  } else if (!isValid) {
    phase = 'invalid';
    label = 'End date must be after start date';
  } else if (now < start.getTime()) {
    phase = 'before';
    countdownTarget = start;
    label = 'Starts in';
  } else if (now > end.getTime()) {
    phase = 'after';
    label = 'This campaign has ended';
  } else {
    phase = 'during';
    countdownTarget = end;
    label = 'Ends in';
  }

  const countdown = countdownTarget ? computeCountdown(countdownTarget) : null;

  const discountLabel =
    discount_type === 'percentage' ? `${discount_value}% OFF` : `৳${discount_value} OFF`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`relative w-full overflow-hidden rounded-md border ${phase === 'after'
          ? 'border-gray-300 dark:border-gray-600 opacity-60'
          : phase === 'invalid'
            ? 'border-red-300 dark:border-red-700'
            : 'border-gray-200 dark:border-gray-700'
        } ${hasBanner ? '' : 'bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500'}`}
      style={{
        aspectRatio: '3 / 1',
        ...(hasBanner
          ? {
            backgroundImage: `url(${resolvedBanner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
          : {}),
      }}
    >
      {/* Dark overlay for text readability */}
      <div
        className={`absolute inset-0 ${hasBanner
            ? 'bg-linear-to-r from-black/60 via-black/30 to-transparent'
            : 'bg-black/10'
          }`}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-3 sm:p-4">
        {/* Top row: name + discount badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {name ? (
              <h3 className="text-sm sm:text-base font-bold text-white truncate drop-shadow-sm">
                {name}
              </h3>
            ) : (
              <p className="text-xs text-white/60 italic drop-shadow-sm">
                Campaign name
              </p>
            )}
            {description && (
              <p className="text-xs text-white/80 mt-0.5 line-clamp-1 drop-shadow-sm">
                {description}
              </p>
            )}
          </div>
          {discount_value > 0 && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-bold text-white bg-red-500/90 rounded-sm shadow-sm">
              {discountLabel}
            </span>
          )}
        </div>

        {/* Bottom row: countdown */}
        <div>
          {(phase === 'before' || phase === 'during') && countdown ? (
            <div>
              <p className="text-xs font-medium text-white/80 mb-1 drop-shadow-sm">
                {label}
              </p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/80" />
                <div className="flex items-center gap-0.5 font-mono text-lg sm:text-xl font-bold text-white drop-shadow-sm tabular-nums">
                  {countdown.days > 0 && (
                    <>
                      <span>{countdown.days}</span>
                      <span className="text-xs text-white/70 mr-1">d</span>
                    </>
                  )}
                  <span>{pad(countdown.hours)}</span>
                  <span className="text-white/50 mx-0.5 animate-pulse">:</span>
                  <span>{pad(countdown.minutes)}</span>
                  <span className="text-white/50 mx-0.5 animate-pulse">:</span>
                  <span>{pad(countdown.seconds)}</span>
                </div>
              </div>
            </div>
          ) : phase === 'after' ? (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span className="text-sm font-medium text-white/70 drop-shadow-sm">
                {label}
              </span>
            </div>
          ) : phase === 'missing' || phase === 'invalid' ? (
            <div className="flex items-center gap-1.5">
              {!hasBanner && <ImageIcon className="w-4 h-4 text-white/50" />}
              <span
                className={`text-xs italic drop-shadow-sm ${phase === 'invalid' ? 'text-red-300' : 'text-white/60'
                  }`}
              >
                {label}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
