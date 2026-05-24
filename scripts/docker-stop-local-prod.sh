#!/usr/bin/env bash
# Bu makinede çalışan pastane *prod* Compose yığınını güvenli biçimde durdurur.
# Yerel geliştirme için `:3000` / `:3003` vb. portları ayırmada kullanılır; VPS'e dokunmaz.
#
# Varsa önce Compose ile düşürür; sonra isimleri bilinen konteynerler için ek `docker stop` (env dosyası
# eksik olduğunda kalan süreçler için).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="$ROOT/docker/docker-compose.prod.yml"
ENV="$ROOT/.env.production"

if [[ -f "$ENV" ]] && [[ -f "$COMPOSE" ]]; then
  docker compose --env-file "$ENV" -f "$COMPOSE" down --remove-orphans 2>/dev/null || true
fi

for name in pastane_web_prod pastane_admin_prod pastane_courier_prod pastane_api_prod pastane_minio_prod pastane_redis_prod pastane_postgres_prod; do
  docker stop "$name" 2>/dev/null || true
done

exit 0
