import type { PaginatedReviews } from '../../lib/catalog/types';

export function ProductReviews({ reviews }: Readonly<{ reviews: PaginatedReviews }>): React.JSX.Element {
  return (
    <section className="mt-12">
      <p className="stitch-eyebrow">Yorumlar</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold text-primary">Müşteri deneyimleri</h2>
        {reviews.meta.total ? <p className="text-sm text-muted">{reviews.meta.total} onaylı yorum</p> : null}
      </div>
      {!reviews.items.length ? <p className="mt-4 text-muted">Bu ürün için henüz onaylanmış yorum yok.</p> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {reviews.items.map((review) => (
            <article className="stitch-panel rounded-3xl p-5" key={review.id}>
              <p className="text-secondary">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{review.comment ?? 'Yorum bırakılmadı.'}</p>
              <p className="mt-4 text-sm font-medium text-muted">{review.user.firstName} {review.user.lastName.charAt(0)}.</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
