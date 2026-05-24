#!/usr/bin/env node
/** Çalışan API'den OpenAPI JSON indirip `docs/contracts`'e yazar (`SWAGGER_ENABLED=true`). */
import { OPENAPI_SNAPSHOT_REL, fetchOpenApiJson, yazSnapshot } from './export-openapi-helper.ts';
import { fail, info, ok, section } from '../lib/logger.ts';
import { kokEnvYukle } from '../lib/root-dotenv.ts';

async function main(): Promise<number> {
  section('OpenAPI export');
  const env = await kokEnvYukle();
  const json = await fetchOpenApiJson(env);
  if (!json) {
    fail(
      'OpenAPI alınamadı — yerel API (127.0.0.1:3003) + SWAGGER_ENABLED=true doğrulayın veya OPENAPI_EXPORT_URL ayarlayın.',
    );
    return 1;
  }
  await yazSnapshot(json);
  ok(`Dosya yazıldı: ${OPENAPI_SNAPSHOT_REL.replace(/\\/g, '/')}`);
  info('Karşılaştırma için: git diff docs/contracts/openapi.snapshot.json');
  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
