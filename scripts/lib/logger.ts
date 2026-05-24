/** Türkçe, renkli terminal logları — bağımlılık yok. */

const cyan = (s: string): string => `\u001b[36m${s}\u001b[0m`;
const green = (s: string): string => `\u001b[32m${s}\u001b[0m`;
const yellow = (s: string): string => `\u001b[33m${s}\u001b[0m`;
const red = (s: string): string => `\u001b[31m${s}\u001b[0m`;
const dim = (s: string): string => `\u001b[2m${s}\u001b[0m`;

function ts(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function ok(message: string): void {
  console.log(`${dim(`[${ts()}]`)} ${green('✔')} ${message}`);
}

export function warn(message: string): void {
  console.log(`${dim(`[${ts()}]`)} ${yellow('⚠')} ${message}`);
}

export function fail(message: string): void {
  console.log(`${dim(`[${ts()}]`)} ${red('✖')} ${message}`);
}

export function info(message: string): void {
  console.log(`${dim(`[${ts()}]`)} ${cyan('●')} ${message}`);
}

export function section(title: string): void {
  console.log('');
  console.log(`${cyan(`══ ${title} ══`)}`);
}

export type StepResult = 'ok' | 'warn' | 'fail';

export interface DoctorSummaryRow {
  adim: string;
  sonuc: StepResult;
  detay?: string | undefined;
}

export function yazOzet(rows: DoctorSummaryRow[], sureMs: number): void {
  section('Özet');
  for (const r of rows) {
    const label = r.sonuc === 'ok' ? green('tamam') : r.sonuc === 'warn' ? yellow('uyarı') : red('hata');
    const extra = r.detay ? dim(` — ${r.detay}`) : '';
    console.log(`${label.padEnd(8, ' ')} ${r.adim}${extra}`);
  }
  console.log('');
  console.log(dim(`Toplam süre: ${Math.round(sureMs / 100) / 10}s`));
}
