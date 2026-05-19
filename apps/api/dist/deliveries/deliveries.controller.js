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
exports.DeliveriesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const deliveries_service_1 = require("./deliveries.service");
const fail_delivery_dto_1 = require("./dto/fail-delivery.dto");
const query_my_deliveries_dto_1 = require("./dto/query-my-deliveries.dto");
let DeliveriesController = class DeliveriesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    mine(u, q) { return this.svc.mine(u.sub, q); }
    get(u, id) { return this.svc.getMine(u.sub, id); }
    pickUp(u, id) { return this.svc.pickUp(u.sub, id); }
    deliver(u, id) { return this.svc.deliver(u.sub, id); }
    fail(u, id, d) { return this.svc.fail(u.sub, id, d); }
};
exports.DeliveriesController = DeliveriesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('deliveries.viewOwn'),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_my_deliveries_dto_1.QueryMyDeliveriesDto]),
    __metadata("design:returntype", void 0)
], DeliveriesController.prototype, "mine", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('deliveries.viewOwn'),
    (0, common_1.Get)('my/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeliveriesController.prototype, "get", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('deliveries.updateOwn'),
    (0, common_1.Patch)('my/:id/pick-up'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeliveriesController.prototype, "pickUp", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('deliveries.updateOwn'),
    (0, common_1.Patch)('my/:id/deliver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeliveriesController.prototype, "deliver", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('deliveries.updateOwn'),
    (0, swagger_1.ApiBody)({ type: fail_delivery_dto_1.FailDeliveryDto }),
    (0, common_1.Patch)('my/:id/fail'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, fail_delivery_dto_1.FailDeliveryDto]),
    __metadata("design:returntype", void 0)
], DeliveriesController.prototype, "fail", null);
exports.DeliveriesController = DeliveriesController = __decorate([
    (0, swagger_1.ApiExtraModels)(query_my_deliveries_dto_1.QueryMyDeliveriesDto, fail_delivery_dto_1.FailDeliveryDto),
    (0, roles_decorator_1.Roles)(client_1.RoleType.COURIER),
    (0, common_1.Controller)('deliveries'),
    __param(0, (0, common_1.Inject)(deliveries_service_1.DeliveriesService)),
    __metadata("design:paramtypes", [deliveries_service_1.DeliveriesService])
], DeliveriesController);
//# sourceMappingURL=deliveries.controller.js.map