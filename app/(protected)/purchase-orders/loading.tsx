import TableSkeleton from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <TableSkeleton
      showHeader
      rows={12}
      columnWidths={[
        '4%',
        '16%',
        '20%',
        '16%',
        '12%',
        '10%',
        '8%',
        '14%',
      ]}
      label="Loading purchase orders"
    />
  );
}
