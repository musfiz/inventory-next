'use client';

import { useEffect } from 'react';
import { loadCaptchaEnginge, LoadCanvasTemplate } from 'react-simple-captcha';

/**
 * Client-only captcha widget. Loaded with `next/dynamic({ ssr: false })` so the
 * canvas + reload link render only in the browser (avoids the package reading
 * `document` during SSR). Validation happens in the parent via
 * `validateCaptcha()` — the generated code lives in the module's shared state.
 */
export default function CaptchaBox() {
  useEffect(() => {
    loadCaptchaEnginge(6, 'white', 'black', 'upper');
  }, []);

  return (
    <span className="inline-block">
      <LoadCanvasTemplate />
    </span>
  );
}