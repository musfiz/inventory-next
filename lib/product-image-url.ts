interface ProductMediaUrls {
  thumb: string | null;
  medium: string | null;
  magnify: string | null;
}

export function getProductImageUrls(
  item: { file_url_thumb?: string | null; file_url_medium?: string | null; file_url_magnify?: string | null } | string | null | undefined
): ProductMediaUrls {
  const result: ProductMediaUrls = { thumb: null, medium: null, magnify: null };

  if (!item) return result;

  if (typeof item === 'string') {
    result.medium = item;
    return result;
  }

  result.thumb = item.file_url_thumb ?? null;
  result.medium = item.file_url_medium ?? null;
  result.magnify = item.file_url_magnify ?? null;

  return result;
}
