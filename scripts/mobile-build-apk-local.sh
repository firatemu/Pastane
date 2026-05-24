#!/usr/bin/env bash
# Yerel EAS preview APK — tek komut: pnpm mobile:apk:local
# Çıktı: apps/mobile/artifacts/pasta-hane-preview.apk
#
# Önkoşullar: Docker (WSL2’de Docker Desktop), npx eas login
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ARTIFACT_DIR="${MOBILE_DIR}/artifacts"
OUTPUT_APK="${ARTIFACT_DIR}/pasta-hane-preview.apk"
EAS_LOG="${ARTIFACT_DIR}/.eas-build-last.log"

step() {
  echo ""
  echo "==> $*"
}

fail() {
  echo "HATA: $*" >&2
  exit 1
}

# Cursor / VS Code agent terminalinde PATH içindeki cursor-server, npm'in lib aramasını bozar.
sanitize_build_env() {
  unset npm_config_prefix NPM_CONFIG_PREFIX 2>/dev/null || true
  local part
  local -a clean_path=()
  local IFS=':'
  for part in ${PATH:-}; do
    [[ "${part}" == *cursor-server* ]] && continue
    [[ "${part}" == *cursor/resources* ]] && continue
    clean_path+=("${part}")
  done
  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "${HOME}/.nvm/nvm.sh"
    nvm use 22 >/dev/null 2>&1 || nvm use >/dev/null 2>&1 || true
  fi
  if [[ -n "${NVM_BIN:-}" && -d "${NVM_BIN}" ]]; then
    PATH="${NVM_BIN}:${clean_path[*]}"
  else
    PATH="$(IFS=:; echo "${clean_path[*]}")"
  fi
  export PATH
}

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    export PATH="${JAVA_HOME}/bin:${PATH}"
    return 0
  fi
  local candidate
  local -a candidates=(
    "/usr/lib/jvm/java-17-openjdk-amd64"
    "/usr/lib/jvm/java-21-openjdk-amd64"
    "/mnt/c/Program Files/Android/Android Studio/jbr"
    "/mnt/c/Program Files/Android/Android Studio/jbr/Contents/Home"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -x "${candidate}/bin/java" ]]; then
      export JAVA_HOME="${candidate}"
      export PATH="${JAVA_HOME}/bin:${PATH}"
      return 0
    fi
  done
  if command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || command -v java)"
    export JAVA_HOME="$(dirname "$(dirname "${java_bin}")")"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    return 0
  fi
  return 1
}

resolve_android_home() {
  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}" ]]; then
    export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME}}"
    export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"
    return 0
  fi
  local candidate
  local -a candidates=(
    "${HOME}/Android/Sdk"
    "/mnt/c/Users/${USER}/AppData/Local/Android/Sdk"
    "/mnt/c/Users/AZEM/AppData/Local/Android/Sdk"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -d "${candidate}/platforms" ]]; then
      export ANDROID_HOME="${candidate}"
      export ANDROID_SDK_ROOT="${candidate}"
      export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"
      return 0
    fi
  done
  return 1
}

step "Node ortamı"
sanitize_build_env
node_major="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${node_major}" != "22" ]]; then
  fail "Node 22 gerekli (mevcut: $(node -v)). Örn: nvm install 22 && nvm use 22"
fi

step "JDK (JAVA_HOME)"
if ! resolve_java_home; then
  fail "JDK 17 bulunamadı. WSL: sudo apt install openjdk-17-jdk — veya Android Studio JBR yolunu JAVA_HOME ile verin."
fi
echo "JAVA_HOME=${JAVA_HOME}"

step "Android SDK (ANDROID_HOME)"
if ! resolve_android_home; then
  fail "Android SDK bulunamadı. Android Studio kurun veya ANDROID_HOME ile Sdk yolunu verin (ör. ~/Android/Sdk)."
fi
echo "ANDROID_HOME=${ANDROID_HOME}"

step "Docker kontrolü"
if ! docker info >/dev/null 2>&1; then
  fail "Docker çalışmıyor. WSL2’de Docker Desktop’ı açın ve WSL entegrasyonunu etkinleştirin."
fi

step "EAS oturumu"
cd "${MOBILE_DIR}"
if ! npx eas whoami >/dev/null 2>&1; then
  fail "EAS oturumu yok. Önce: cd apps/mobile && npx eas login"
fi

step "Bağımlılıklar (pnpm install --frozen-lockfile)"
cd "${REPO_ROOT}"
pnpm install --frozen-lockfile

step "Paylaşılan paketler (@pastane/constants, @pastane/tr-api-errors)"
pnpm --filter @pastane/constants --filter @pastane/tr-api-errors run build

step "Metro / Expo önbellek temizliği (MessagePack cache bozulmasını önler)"
rm -rf \
  "${MOBILE_DIR}/.expo" \
  "${MOBILE_DIR}/dist" \
  "${MOBILE_DIR}/node_modules/.cache" \
  "${REPO_ROOT}/node_modules/.cache" \
  /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

step "EAS yerel build (preview / APK) — süre ~15–20 dk olabilir"
mkdir -p "${ARTIFACT_DIR}"
cd "${MOBILE_DIR}"
export EAS_BUILD_NO_EXPO_GO_WARNING=true
export CI=1
set +e
npx eas build --platform android --profile preview --local --non-interactive --clear-cache 2>&1 | tee "${EAS_LOG}"
eas_status=${PIPESTATUS[0]}
set -e
if [[ "${eas_status}" -ne 0 ]]; then
  fail "EAS build başarısız (çıkış ${eas_status}). Log: ${EAS_LOG}"
fi

step "APK dosyasını bulma"
source_apk=""
if [[ -f "${EAS_LOG}" ]]; then
  # Örnek: "Build artifact: /path/to/app.apk" veya satır içinde .apk yolu
  while IFS= read -r line; do
    if [[ "${line}" =~ ([^[:space:]]+\.apk) ]]; then
      candidate="${BASH_REMATCH[1]}"
      if [[ -f "${candidate}" ]]; then
        source_apk="${candidate}"
        break
      fi
    fi
  done < <(grep -E '\.apk' "${EAS_LOG}" || true)
fi

if [[ -z "${source_apk}" ]]; then
  source_apk="$(find "${MOBILE_DIR}" -name '*.apk' -type f -mmin 180 2>/dev/null | sort -r | head -n 1 || true)"
fi

if [[ -z "${source_apk}" || ! -f "${source_apk}" ]]; then
  fail "APK bulunamadı. ${EAS_LOG} dosyasını ve apps/mobile altını kontrol edin."
fi

step "APK kopyalama → ${OUTPUT_APK}"
cp -f "${source_apk}" "${OUTPUT_APK}"

abs_out="$(cd "$(dirname "${OUTPUT_APK}")" && pwd)/$(basename "${OUTPUT_APK}")"
size_human="$(du -h "${OUTPUT_APK}" | cut -f1)"
checksum="$(sha256sum "${OUTPUT_APK}" | awk '{print $1}')"

echo ""
echo "----------------------------------------"
echo "Yerel preview APK hazır."
echo "  Dosya:   ${abs_out}"
echo "  Boyut:   ${size_human}"
echo "  SHA256:  ${checksum}"
echo "  Kaynak:  ${source_apk}"
echo ""
echo "Cihaza yükleme (USB / adb):"
echo "  adb install -r \"${abs_out}\""
echo "----------------------------------------"
