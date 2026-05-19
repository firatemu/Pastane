"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationDetailsUserHint = exports.mapUnknownErrorToTurkish = exports.mapPayloadToTurkish = exports.mapApiErrorToTurkish = exports.looksLikeGenericEnglish = exports.DEFAULT_ERROR = exports.messageForCode = exports.COURIER_OVERRIDES = exports.CUSTOMER_OVERRIDES = exports.CORE_CODE_MESSAGES = void 0;
var core_code_messages_1 = require("./core-code-messages");
Object.defineProperty(exports, "CORE_CODE_MESSAGES", { enumerable: true, get: function () { return core_code_messages_1.CORE_CODE_MESSAGES; } });
var audience_overrides_1 = require("./audience-overrides");
Object.defineProperty(exports, "CUSTOMER_OVERRIDES", { enumerable: true, get: function () { return audience_overrides_1.CUSTOMER_OVERRIDES; } });
Object.defineProperty(exports, "COURIER_OVERRIDES", { enumerable: true, get: function () { return audience_overrides_1.COURIER_OVERRIDES; } });
Object.defineProperty(exports, "messageForCode", { enumerable: true, get: function () { return audience_overrides_1.messageForCode; } });
var map_error_1 = require("./map-error");
Object.defineProperty(exports, "DEFAULT_ERROR", { enumerable: true, get: function () { return map_error_1.DEFAULT_ERROR; } });
Object.defineProperty(exports, "looksLikeGenericEnglish", { enumerable: true, get: function () { return map_error_1.looksLikeGenericEnglish; } });
Object.defineProperty(exports, "mapApiErrorToTurkish", { enumerable: true, get: function () { return map_error_1.mapApiErrorToTurkish; } });
Object.defineProperty(exports, "mapPayloadToTurkish", { enumerable: true, get: function () { return map_error_1.mapPayloadToTurkish; } });
Object.defineProperty(exports, "mapUnknownErrorToTurkish", { enumerable: true, get: function () { return map_error_1.mapUnknownErrorToTurkish; } });
Object.defineProperty(exports, "validationDetailsUserHint", { enumerable: true, get: function () { return map_error_1.validationDetailsUserHint; } });
//# sourceMappingURL=index.js.map