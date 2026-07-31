declare module 'react-image-magnifiers' {
  import type { CSSProperties, FC, ReactNode } from 'react';

  export interface GlassMagnifierProps {
    imageSrc: string;
    largeImageSrc?: string;
    imageAlt?: string;
    allowOverflow?: boolean;
    magnifierBorderSize?: number;
    magnifierBorderColor?: string;
    magnifierBackgroundColor?: string;
    magnifierSize?: string | number;
    magnifierOffsetX?: number;
    magnifierOffsetY?: number;
    square?: boolean;
    cursorStyle?: string;
    renderOverlay?: (active: boolean) => ReactNode;
    className?: string;
    style?: CSSProperties;
    onImageLoad?: () => void;
    onLargeImageLoad?: () => void;
    onZoomStart?: () => void;
    onZoomEnd?: () => void;
  }

  export const GlassMagnifier: FC<GlassMagnifierProps>;
  export const Magnifier: FC<Record<string, unknown>>;
  export const SideBySideMagnifier: FC<Record<string, unknown>>;
  export const PictureInPictureMagnifier: FC<Record<string, unknown>>;
}
