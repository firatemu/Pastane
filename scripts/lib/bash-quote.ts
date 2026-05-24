/** Bash için çift tırnak içinde güvenli dize (köşeli yollar için). */
export function bashCiftTırnak(deger: string): string {
  return `"${deger.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`;
}
