import TableSkeleton from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <TableSkeleton
      showHeader
      rows={12}
      columnWidths={[
        '4%',
        '16%',
        '14%',
        '16%',
        '12%',
        '10%',
        '10%',
        '8%',
        '10%',
      ]}
      label="Loading purchase returns"
    />
  );
}
