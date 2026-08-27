import { describe, it, expect, afterEach } from 'vitest';
import { imageUrl } from './image-url';

const BACKEND = 'http://api.test';

describe('imageUrl', () => {
  const original = process.env.NEXT_PUBLIC_BACKEND_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = original;
  });

  it('returns null for empty input', () => {
    expect(imageUrl(null)).toBeNull();
    expect(imageUrl(undefined)).toBeNull();
    expect(imageUrl('')).toBeNull();
  });

  it('passes through absolute URLs unchanged', () => {
    expect(imageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(imageUrl('http://cdn.example.com/a.png')).toBe('http://cdn.example.com/a.png');
  });

  it('prefixes the backend URL for /storage/ paths', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = BACKEND;
    expect(imageUrl('/storage/photos/a.png')).toBe(`${BACKEND}/storage/photos/a.png`);
  });

  it('resolves relative paths as backend /storage/ paths', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = BACKEND;
    expect(imageUrl('photos/a.png')).toBe(`${BACKEND}/storage/photos/a.png`);
    expect(imageUrl('/photos/a.png')).toBe(`${BACKEND}/storage/photos/a.png`);
  });

  it('does not double-prefix when backend is absent', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = '';
    expect(imageUrl('/storage/a.png')).toBe('/storage/a.png');
  });
});
