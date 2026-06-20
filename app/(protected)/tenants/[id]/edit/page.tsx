import TenantEditForm from './TenantEditForm';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <TenantEditForm />;
}
