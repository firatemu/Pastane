/** Shared Tailwind classes for admin forms (catalog, operations). */
export const adminInputClass =
  'w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-[15px] text-on-surface outline-none transition placeholder:text-outline focus:border-secondary/50 focus:ring-2 focus:ring-secondary-container';

export const adminSelectClass = adminInputClass;

export const adminTextareaClass = `${adminInputClass} min-h-[88px] resize-y`;

export const adminPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-chocolate px-5 py-2.5 text-sm font-semibold text-surface-container-lowest shadow-bakery transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary';

export const adminSecondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low';
