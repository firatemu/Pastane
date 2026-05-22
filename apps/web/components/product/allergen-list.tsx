import type { ProductAllergen } from '../../lib/catalog/types';

export function AllergenList({ allergens }: Readonly<{ allergens: ProductAllergen[] }>): React.JSX.Element | null {
  if (!allergens.length) return null;
  return (
    <section className="mt-6">
      <p className="text-sm font-semibold text-muted">Alerjenler</p>
      <div className="mt-3 flex flex-wrap gap-2">{allergens.map(({ allergen }) => <span className="rounded-full bg-honey/40 px-3 py-1 text-sm text-secondary" key={allergen.id}>{allergen.name}</span>)}</div>
    </section>
  );
}
