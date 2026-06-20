import EditProductVariationForm from './EditProductVariationForm';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <EditProductVariationForm />;
}
