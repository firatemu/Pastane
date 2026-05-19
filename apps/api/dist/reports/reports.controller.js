"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const query_report_range_dto_1 = require("./dto/query-report-range.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard() { return this.svc.dashboard(); }
    sales(q) { return this.svc.sales(q); }
    products(q) { return this.svc.products(q); }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('reports.sales'),
    (0, common_1.Get)('dashboard-summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "dashboard", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reports.sales'),
    (0, common_1.Get)('sales/summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_report_range_dto_1.QueryReportRangeDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "sales", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reports.products'),
    (0, common_1.Get)('products/summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_report_range_dto_1.QueryReportRangeDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "products", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiExtraModels)(query_report_range_dto_1.QueryReportRangeDto),
    (0, common_1.Controller)('reports'),
    __param(0, (0, common_1.Inject)(reports_service_1.ReportsService)),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map