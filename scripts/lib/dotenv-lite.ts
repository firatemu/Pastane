/** Sade iç satır bazlı `.env` ayrıştırma — gizli değerleri loglamayın. */

export function parseDotEnvSatirleri(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split('\n')) {
    const satir = raw.trim();
    if (!satir || satir.startsWith('#')) continue;
    const stripped = satir.startsWith('export ') ? satir.slice('export '.length).trim() : satir;
    const eq = stripped.indexOf('=');
    if (eq <= 0) continue;
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    const qMatch = /^"(.*)"$/.exec(val) ?? /^'(.*)'$/.exec(val);
    if (qMatch?.[1] !== undefined) val = qMatch[1];
    if (key) out[key] = val;
  }
  return out;
}
