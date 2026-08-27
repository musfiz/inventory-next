import TableSkeleton from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <TableSkeleton
      showHeader
      rows={12}
      columnWidths={[
        '4%',
        '20%',
        '15%',
        '10%',
        '12%',
        '8%',
        '8%',
        '10%',
        '15%',
      ]}
      label="Loading products"
    />
  );
}
