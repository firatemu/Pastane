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
exports.DeliveryZonesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const create_delivery_zone_dto_1 = require("./dto/create-delivery-zone.dto");
const update_delivery_zone_dto_1 = require("./dto/update-delivery-zone.dto");
const delivery_zones_service_1 = require("./delivery-zones.service");
let DeliveryZonesController = class DeliveryZonesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(page, limit) { return this.svc.list(Number(page) || undefined, Number(limit) || undefined); }
    create(dto) { return this.svc.create(dto); }
    update(id, dto) { return this.svc.update(id, dto); }
    remove(id) { return this.svc.remove(id); }
};
exports.DeliveryZonesController = DeliveryZonesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], DeliveryZonesController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiBody)({ type: create_delivery_zone_dto_1.CreateDeliveryZoneDto }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_delivery_zone_dto_1.CreateDeliveryZoneDto]),
    __metadata("design:returntype", void 0)
], DeliveryZonesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiBody)({ type: update_delivery_zone_dto_1.UpdateDeliveryZoneDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_delivery_zone_dto_1.UpdateDeliveryZoneDto]),
    __metadata("design:returntype", void 0)
], DeliveryZonesController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeliveryZonesController.prototype, "remove", null);
exports.DeliveryZonesController = DeliveryZonesController = __decorate([
    (0, common_1.Controller)('delivery-zones'),
    __param(0, (0, common_1.Inject)(delivery_zones_service_1.DeliveryZonesService)),
    __metadata("design:paramtypes", [delivery_zones_service_1.DeliveryZonesService])
], DeliveryZonesController);
//# sourceMappingURL=delivery-zones.controller.js.map