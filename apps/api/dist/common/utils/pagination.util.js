"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LIMIT = exports.DEFAULT_LIMIT = exports.DEFAULT_PAGE = void 0;
exports.normalizePagination = normalizePagination;
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_LIMIT = 20;
exports.MAX_LIMIT = 100;
function normalizePagination(page, limit) {
    return { page: Math.max(page ?? exports.DEFAULT_PAGE, 1), limit: Math.min(Math.max(limit ?? exports.DEFAULT_LIMIT, 1), exports.MAX_LIMIT) };
}
//# sourceMappingURL=pagination.util.js.map