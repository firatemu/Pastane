#!/usr/bin/env bash
# Müşteri web (apps/web) için temiz üretim derlemesi — repo kökünden çalıştırın:
#   pnpm build:web:clean
#
# Önceki elle komutlar (rm + filter build) bazı ortamlarda turbo/cache veya .next izleriyle çakışabiliyor;
# bu script her zaman monorepo kökünü baz alır ve standart prisma + turbo sırasını kullanır.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[build:web:clean] Temizleniyor: apps/web/.next, apps/web/.next-ci"
rm -rf apps/web/.next apps/web/.next-ci

echo "[build:web:clean] prisma generate"
pnpm prisma:generate

echo "[build:web:clean] turbo build --filter=@pastane/web"
pnpm exec turbo run build --filter=@pastane/web --force

echo "[build:web:clean] Tamam."
