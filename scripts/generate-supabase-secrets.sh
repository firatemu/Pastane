#!/usr/bin/env bash
# Generate Supabase ANON_KEY, SERVICE_ROLE_KEY, and related secrets for .env.production.
# Run once locally; paste output into VPS .env.production (never commit real values).
#
# Usage: bash scripts/generate-supabase-secrets.sh
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl required" >&2
  exit 1
fi

rand_hex() {
  openssl rand -hex "$1"
}

rand_base64() {
  openssl rand -base64 "$1" | tr -d '\n/'
}

JWT_SECRET="$(rand_hex 32)"
SECRET_KEY_BASE="$(rand_base64 48)"
VAULT_ENC="$(rand_hex 16)"
PG_META="$(rand_hex 16)"
LOG_PUBLIC="$(rand_hex 24)"
LOG_PRIVATE="$(rand_hex 24)"
DASH_PASS="$(rand_base64 24)"

# HS256 JWT keys (legacy anon / service_role) — same algorithm as upstream demo keys
gen_jwt() {
  local role="$1"
  python3 - "$JWT_SECRET" "$role" <<'PY'
import base64, hashlib, hmac, json, sys, time

secret, role = sys.argv[1], sys.argv[2]
header = {"alg": "HS256", "typ": "JWT"}
payload = {
    "role": role,
    "iss": "supabase",
    "iat": int(time.time()),
    "exp": int(time.time()) + 10 * 365 * 24 * 3600,
}

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

segments = [
    b64url(json.dumps(header, separators=(",", ":")).encode()),
    b64url(json.dumps(payload, separators=(",", ":")).encode()),
]
signing_input = ".".join(segments).encode()
sig = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
print(".".join(segments + [b64url(sig)]))
PY
}

ANON_KEY="$(gen_jwt anon)"
SERVICE_KEY="$(gen_jwt service_role)"

cat <<EOF
# Paste into .env.production (Supabase stack — separate from Pastane JWT_SECRET)
SUPABASE_JWT_SECRET=${JWT_SECRET}
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SUPABASE_SECRET_KEY_BASE=${SECRET_KEY_BASE}
SUPABASE_VAULT_ENC_KEY=${VAULT_ENC}
SUPABASE_PG_META_CRYPTO_KEY=${PG_META}
SUPABASE_LOGFLARE_PUBLIC_TOKEN=${LOG_PUBLIC}
SUPABASE_LOGFLARE_PRIVATE_TOKEN=${LOG_PRIVATE}
DASHBOARD_USERNAME=studio-admin
DASHBOARD_PASSWORD=${DASH_PASS}
SUPABASE_PUBLIC_URL=https://studio.azem.cloud
SUPABASE_STUDIO_ENABLED=1
EOF

echo "# Done. DASHBOARD_PASSWORD length: ${#DASH_PASS}" >&2
