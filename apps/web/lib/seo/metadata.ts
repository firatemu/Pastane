export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
