import type { Category, PaginatedReviews, Product } from '../catalog/types';
import { absoluteUrl } from './metadata';

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function productJsonLd(product: Product, reviews: PaginatedReviews) {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.shortDescription ?? product.name,
    image: primaryImage ? [primaryImage.url] : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      price: product.discountedPrice ?? product.price,
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/urun/${product.slug}`),
    },
    ...(reviews.meta.total
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (reviews.items.reduce((sum, review) => sum + review.rating, 0) / reviews.items.length).toFixed(1),
            reviewCount: reviews.meta.total,
          },
        }
      : {}),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: 'Pastane',
    url: absoluteUrl('/'),
  };
}

export function categoryBreadcrumbs(category: Category) {
  return breadcrumbJsonLd([
    { name: 'Ana sayfa', path: '/' },
    { name: category.name, path: `/kategori/${category.slug}` },
  ]);
}
