"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderNumberDatePrefix = orderNumberDatePrefix;
exports.createOrderNumber = createOrderNumber;
const ORDER_NUMBER_TIME_ZONE = 'Europe/Istanbul';
function orderNumberDatePrefix(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        timeZone: ORDER_NUMBER_TIME_ZONE,
        year: 'numeric',
    }).formatToParts(now);
    const value = (type) => parts.find((part) => part.type === type)?.value ?? '';
    return `ORD-${value('year')}${value('month')}${value('day')}`;
}
function createOrderNumber(sequence, now = new Date()) {
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
        throw new Error('Order number sequence must be between 1 and 999.');
    }
    return `${orderNumberDatePrefix(now)}${String(sequence).padStart(3, '0')}`;
}
//# sourceMappingURL=order-number.util.js.map
