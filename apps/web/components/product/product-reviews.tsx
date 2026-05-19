import type { PaginatedReviews } from '../../lib/catalog/types';

export function ProductReviews({ reviews }: Readonly<{ reviews: PaginatedReviews }>): React.JSX.Element {
  return (
    <section className="mt-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Yorumlar</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold">Müşteri deneyimleri</h2>
        {reviews.meta.total ? <p className="text-sm text-stone-500">{reviews.meta.total} onaylı yorum</p> : null}
      </div>
      {!reviews.items.length ? <p className="mt-4 text-stone-600">Bu ürün için henüz onaylanmış yorum yok.</p> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {reviews.items.map((review) => (
            <article className="rounded-[1.5rem] border border-amber-200/70 bg-white p-5 shadow-sm" key={review.id}>
              <p className="text-amber-700">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">{review.comment ?? 'Yorum bırakılmadı.'}</p>
              <p className="mt-4 text-sm font-medium text-stone-500">{review.user.firstName} {review.user.lastName.charAt(0)}.</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}