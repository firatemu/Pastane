import { SetMetadata } from '@nestjs/common';

/** Skip global {@link ResponseInterceptor} — use for raw StreamableFile/binary responses. */
export const SKIP_RESPONSE_ENVELOPE_KEY = 'skipResponseEnvelope';

export function SkipResponseEnvelope() {
  return SetMetadata(SKIP_RESPONSE_ENVELOPE_KEY, true);
}
