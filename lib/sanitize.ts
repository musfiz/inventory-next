import DOMPurify, { type Config } from 'dompurify';

const SANITIZE_CONFIG: Config = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'rel', 'aria-label'],
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
