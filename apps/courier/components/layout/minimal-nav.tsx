import Link from 'next/link';

export function MinimalNav(): React.JSX.Element {
  return (
    <nav className="mx-auto flex max-w-7xl px-4 pb-4 pt-3 sm:px-6">
      <Link
        className="min-h-11 rounded-full bg-amber-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
        href="/deliveries"
      >
        Teslimatlarım
      </Link>
    </nav>
  );
}
