import TenantSettingsForm from './TenantSettingsForm';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <TenantSettingsForm />;
}
