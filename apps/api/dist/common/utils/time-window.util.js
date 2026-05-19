"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOCK_TIMEZONE = void 0;
exports.isTimeWindowValid = isTimeWindowValid;
exports.windowsOverlap = windowsOverlap;
exports.timeFallsWithinWindow = timeFallsWithinWindow;
exports.istanbulDay = istanbulDay;
exports.STOCK_TIMEZONE = 'Europe/Istanbul';
const hhmmPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
function isTimeWindowValid(from, to) {
    if (!from && !to)
        return true;
    if (!from || !to || !hhmmPattern.test(from) || !hhmmPattern.test(to))
        return false;
    return from < to;
}
function windowsOverlap(aFrom, aTo, bFrom, bTo) {
    const leftFrom = aFrom ?? '00:00';
    const leftTo = aTo ?? '24:00';
    const rightFrom = bFrom ?? '00:00';
    const rightTo = bTo ?? '24:00';
    return leftFrom < rightTo && rightFrom < leftTo;
}
function timeFallsWithinWindow(time, from, to) {
    if (!hhmmPattern.test(time))
        return false;
    return (from ?? '00:00') <= time && time < (to ?? '24:00');
}
function istanbulDay(value) {
    return new Date(`${value}T00:00:00.000+03:00`);
}
//# sourceMappingURL=time-window.util.js.map