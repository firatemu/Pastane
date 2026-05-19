"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.money = void 0;
const client_1 = require("@prisma/client");
exports.money = {
    of: (value) => new client_1.Prisma.Decimal(value),
    add: (...values) => values.reduce((a, b) => a.add(b), new client_1.Prisma.Decimal(0)),
    subtract: (a, b) => new client_1.Prisma.Decimal(a).sub(b),
    multiply: (a, b) => new client_1.Prisma.Decimal(a).mul(b),
    compare: (a, b) => new client_1.Prisma.Decimal(a).cmp(b),
    round: (a) => new client_1.Prisma.Decimal(a).toDecimalPlaces(2, client_1.Prisma.Decimal.ROUND_HALF_UP),
};
//# sourceMappingURL=money.util.js.map