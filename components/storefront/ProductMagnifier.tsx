'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ProductMagnifierProps {
  /** Display image shown in the box (medium). */
  src: string;
  /** Higher-res image shown inside the glass lens (zoom/large). */
  largeSrc: string;
  alt: string;
  /** Zoom multiplier applied to the image inside the lens. */
  zoom?: number;
  /** Lens diameter in px. */
  lensSize?: number;
}

export default function ProductMagnifier({
  src,
  largeSrc,
  alt,
  zoom = 2.5,
  lensSize = 180,
}: ProductMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });
  // Natural dimensions of the large image. Both the display image (medium)
  // and the zoom image share the same aspect ratio, so this drives the
  // letterbox-fit calculation and the proportional lens mapping.
  const [largeDim, setLargeDim] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setLargeDim(null);
    const img = new window.Image();
    img.onload = () => setLargeDim({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = largeSrc;
  }, [largeSrc]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setLens({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleLeave = useCallback(
    () => setLens(prev => ({ ...prev, show: false })),
    []
  );

  const el = containerRef.current;
  const cw = el?.clientWidth ?? 0;
  const ch = el?.clientHeight ?? 0;

  // Image aspect ratio (w/h); assume square until the large image loads.
  const iw = largeDim?.w ?? cw;
  const ih = largeDim?.h ?? ch;
  const iAspect = iw / ih;
  const cAspect = cw / ch;

  // Bounds of the image within the container under `object-contain`
  // (letterboxed, centered). The lens must map against these, not the whole
  // container, so the zoom matches what is actually visible.
  let imgW = cw;
  let imgH = ch;
  let offsetX = 0;
  let offsetY = 0;
  if (iAspect > cAspect) {
    // Image wider than the container: fit to width, letterbox top/bottom.
    imgH = cw / iAspect;
    offsetY = (ch - imgH) / 2;
  } else {
    // Image taller than the container: fit to height, letterbox left/right.
    imgW = ch * iAspect;
    offsetX = (cw - imgW) / 2;
  }

  // Cursor position mapped into the visible image, clamped to its edges.
  const imgX = Math.max(0, Math.min(imgW, lens.x - offsetX));
  const imgY = Math.max(0, Math.min(imgH, lens.y - offsetY));
  const inImage =
    lens.x >= offsetX &&
    lens.x <= offsetX + imgW &&
    lens.y >= offsetY &&
    lens.y <= offsetY + imgH;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-zoom-in overflow-hidden"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        className="object-contain"
      />

      {lens.show && inImage && cw > 0 && ch > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full border border-white/70 shadow-lg"
          style={{
            width: lensSize,
            height: lensSize,
            left: lens.x - lensSize / 2,
            top: lens.y - lensSize / 2,
            backgroundImage: `url(${largeSrc})`,
            backgroundRepeat: 'no-repeat',
            // Show the large image at `zoom` the size of the *displayed* image,
            // preserving its real aspect ratio.
            backgroundSize: `${imgW * zoom}px ${imgH * zoom}px`,
            // Center the pixel under the cursor in the lens.
            backgroundPosition: `${-(imgX * zoom - lensSize / 2)}px ${-(imgY * zoom - lensSize / 2)}px`,
          }}
        />
      )}
    </div>
  );
}
