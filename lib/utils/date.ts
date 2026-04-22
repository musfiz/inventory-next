export const formatDate = (dateString?: string | null, format?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';

  // If no explicit format provided, keep previous short-month format
  if (!format) {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Support simple token formats like DD, MM, YYYY
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = String(d.getFullYear());

  return format.replace('DD', DD).replace('MM', MM).replace('YYYY', YYYY);
};
