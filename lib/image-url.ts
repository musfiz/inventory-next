export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/storage/')) {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    return `${base}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  return `${base}/storage/${path.replace(/^\//, '')}`;
}
