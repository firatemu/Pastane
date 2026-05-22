import type { CartItem, Category, Product } from '../types';

export const fallbackImages = {
  cake:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA5w9q3CcMqg0VARo-LS9bcMLaxsstrKBS1Cv0_xYJawpOZfduCo4cy3YncKpGikGmWnzrJhTZYBsoF4trkRVlWyBQ_rRHcbOBcYSibKyl86Y8YTgoZ6kMWWzEjqMI71VSxIrDL3zgjGHP2WhWAgAWehLSp7H6c9LrCSK66k4usmJo716iHA-T1cmiJdzNxmmDcSdfHTNC18U2dFVlopn4_LhX28eEVOsHBm9fLKyaBMpup3cfXTOpipQNtXgUI0lHvyXoP6DhEMg6O',
  croissant:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUXsOI1A4tR_ZW8k4-XnIgj6_HiAFoeIyEUO9RqREPFP-F0p4RRSnWeuEy6bx40hfrHP6o0kkjcnnLYD1pu84UqO7VtFnWvhEL7eaxN9UeH9z22g6TEGzunRJTq_ifEx9S44e2BN6uF2zBR61BNb87-LdRvhk-WNlsoaDpH8SrsVJ3DGsU2OwM9-GwGIAOYL3rpJwk2uBbfkmFU3IaAWky6TUk8gWQAI3Y8MD-YhPkBcgogRH06vFXJGBMi7whcBbtF93EIvNfIFSX',
  hero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDyKCO640e3NlyuBm6259Aoi4BUbXeNejjFKv_JTJjrhABzsrlR_YPo-drao2rT_4BJ3yp3HF58joyttoFxslHL07TkNADSDMXSwkWsbSJc_addao3pNgVbQJUD6RA8ZAKWlfrRRS_wvMpoLZRdv7Zy9xdvAq6HSaBF_B2oQgZHelPEsoN58u0nq2pukfGiCNSHV0JbPGc4mryqhLdntd3Lr08mqTdC23DwGcNDsN8Y_8FpWuuyWeJI_bLN-RV-4N4rQ498p1yU6ioy',
  pastry:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBFYfSvnXReBYlz20eWnsLw7tu-axw6LcnYvihSwnHQEBBLTPPQxAUWbu8ZTKWVs1-_cTHVYHIYaENFuZXAxOu4a0sxNkdzYMEdviZ7KDOyRe10k6pde7EciIzFDuqpnXzn4ua_JOvAPQKPfKZeeO-oXv1C4d4c0Y8wcar5hd83ee-odQ_lCm7DqTcwd6vxfR7HHlFVYjSgMRszRstFNNjzmi1jwij_w6H6xszoLO9kvZNWxbqCc0ZDgXRp7RuWGRUmV3CHJzz3cFy8',
  tart:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDw7OrtU6htVAfaBULvGmpZ5q31ikuV4OSqn5-ubSO7xDrsu_I93e3y8mwvLtBjf10wOEmLPBTwnn44cvtJUL7LYGTYt7kO_WoUZeVyj4L9J0KqFGoTzMYRudXYp939Sf_8llZ38cMj4wVejclZoFdoHxYJU65gDMnvg7nXUXEnLXVRG0YizY2x1udHM0hh1NPGjflQ4OP9ZK8nn4GekOKxPABayo8X77X9BHdnZxYd76QSS2oZP9kC0yAwBVZwo1TGKiupfioTUswE',
};

export const fallbackCategories: Category[] = [
  { id: 'cakes', name: 'Pastalar', slug: 'pastalar' },
  { id: 'desserts', name: 'Tatlılar', slug: 'tatlilar' },
  { id: 'bakery', name: 'Unlu Mamuller', slug: 'unlu-mamuller' },
  { id: 'gifts', name: 'Hediyelik', slug: 'hediyelik' },
];

export const fallbackProducts: Product[] = [
  {
    id: 'noir',
    name: 'Noir Signature',
    slug: 'noir-signature',
    shortDescription: 'Koyu kakao, ipeksi ganaj ve mevsim meyvesi.',
    price: '1450',
    discountedPrice: null,
    preparationMinutes: 45,
    category: fallbackCategories[0],
    images: [{ url: fallbackImages.cake, isPrimary: true }],
    isPurchasable: true,
  },
  {
    id: 'tart',
    name: 'Lemon Basil Tart',
    slug: 'lemon-basil-tart',
    shortDescription: 'Limon kreması, fesleğen dokunuşu ve çıtır taban.',
    price: '320',
    discountedPrice: null,
    preparationMinutes: 20,
    category: fallbackCategories[1],
    images: [{ url: fallbackImages.tart, isPrimary: true }],
    isPurchasable: true,
  },
  {
    id: 'croissant',
    name: 'Wild Honey Croissant',
    slug: 'wild-honey-croissant',
    shortDescription: 'Bal glazürlü, kat kat tereyağlı kruvasan.',
    price: '180',
    discountedPrice: '155',
    preparationMinutes: 15,
    category: fallbackCategories[2],
    images: [{ url: fallbackImages.croissant, isPrimary: true }],
    isPurchasable: true,
  },
  {
    id: 'velvet',
    name: 'Velvet Truffles',
    slug: 'velvet-truffles',
    shortDescription: 'Kadifemsi çikolata trüfleri.',
    price: '520',
    discountedPrice: null,
    preparationMinutes: 10,
    category: fallbackCategories[1],
    images: [{ url: fallbackImages.pastry, isPrimary: true }],
    isPurchasable: true,
  },
];

export const fallbackCart: CartItem[] = [
  { id: 'cart-1', quantity: 1, unitPrice: '155', product: fallbackProducts[2] },
  { id: 'cart-2', quantity: 1, unitPrice: '320', product: fallbackProducts[1] },
];

