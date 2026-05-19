"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKIP_RESPONSE_ENVELOPE_KEY = void 0;
exports.SkipResponseEnvelope = SkipResponseEnvelope;
const common_1 = require("@nestjs/common");
/** Skip global {@link ResponseInterceptor} — use for raw StreamableFile/binary responses. */
exports.SKIP_RESPONSE_ENVELOPE_KEY = 'skipResponseEnvelope';
function SkipResponseEnvelope() {
    return (0, common_1.SetMetadata)(exports.SKIP_RESPONSE_ENVELOPE_KEY, true);
}
//# sourceMappingURL=skip-response-envelope.decorator.js.map