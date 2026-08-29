'use client';

import { useEffect } from 'react';
import { absoluteUrl, getSiteUrl } from './seo';

interface UseSeoOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
  /** Page-level JSON-LD to inject. Replaces any previously injected page JSON-LD. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Inject JSON-LD as site-wide (persistent, not cleared by page-level useSeo). */
  siteJsonLd?: boolean;
  /** When false, only inject JSON-LD and skip title/OG/Twitter meta tags. */
  meta?: boolean;
}

function upsertMeta(key: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertJsonLd(id: string, data: unknown, pageLevel: boolean) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    if (pageLevel) el.setAttribute('data-seo-jsonld', 'true');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Runtime SEO for client-component storefront pages (App Router client pages
 * cannot export `generateMetadata`). Injects/updates the document title,
 * standard + Open Graph + Twitter meta tags, and JSON-LD into <head>.
 *
 * Note: this runs after mount, so it relies on JS-executing crawlers. It is the
 * correct pattern given the storefront is fully client-rendered.
 */
export function useSeo(opts: UseSeoOptions = {}) {
  const jsonLdKey = opts.jsonLd ? JSON.stringify(opts.jsonLd) : '';

  useEffect(() => {
    const site = getSiteUrl();
    const url = opts.url ? absoluteUrl(opts.url) : site;

    if (opts.meta !== false) {
      if (opts.title) document.title = opts.title;

      if (opts.description) {
        upsertMeta('description', opts.description);
        upsertMeta('og:description', opts.description, true);
        upsertMeta('twitter:description', opts.description);
      }

      if (opts.title) {
        upsertMeta('og:title', opts.title, true);
        upsertMeta('twitter:title', opts.title);
      }

      if (opts.image) {
        const img = absoluteUrl(opts.image);
        upsertMeta('og:image', img, true);
        upsertMeta('twitter:image', img);
      }

      upsertMeta('og:type', opts.type || 'website', true);
      upsertMeta('og:url', url, true);
      upsertMeta('twitter:card', 'summary_large_image');
    }

    if (opts.jsonLd) {
      const arr = Array.isArray(opts.jsonLd) ? opts.jsonLd : [opts.jsonLd];
      // Page-level JSON-LD is cleared on each page navigation; site-wide is kept.
      if (!opts.siteJsonLd) {
        document
          .querySelectorAll('script[data-seo-jsonld="true"]')
          .forEach((n) => n.remove());
      }
      arr.forEach((d, i) =>
        upsertJsonLd(opts.siteJsonLd ? `seo-site-${i}` : `seo-page-jsonld-${i}`, d, !opts.siteJsonLd),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.title, opts.description, opts.image, opts.type, opts.url, jsonLdKey, opts.siteJsonLd, opts.meta]);
}
