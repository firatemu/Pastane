"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderNumber = createOrderNumber;
const crypto_1 = require("crypto");
function createOrderNumber(now = new Date(), suffix = (0, crypto_1.randomUUID)().slice(0, 6).toUpperCase()) {
    const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    return `ORD-${stamp}-${suffix}`;
}
//# sourceMappingURL=order-number.util.js.map