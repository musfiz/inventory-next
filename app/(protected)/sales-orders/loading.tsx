import TableSkeleton from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <TableSkeleton
      showHeader
      rows={12}
      columnWidths={[
        '4%',
        '16%',
        '18%',
        '16%',
        '12%',
        '12%',
        '10%',
        '8%',
        '12%',
      ]}
      label="Loading sales orders"
    />
  );
}
