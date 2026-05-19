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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const assign_courier_dto_1 = require("./dto/assign-courier.dto");
const create_order_dto_1 = require("./dto/create-order.dto");
const query_orders_dto_1 = require("./dto/query-orders.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const orders_service_1 = require("./orders.service");
let OrdersController = class OrdersController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    create(u, d) { return this.svc.create(u.sub, d); }
    list(q) { return this.svc.listAdmin(q); }
    mine(u) { return this.svc.mine(u.sub); }
    get(u, id) { return this.svc.getForUser(u, id); }
    status(u, id, d) { return this.svc.updateStatus(id, d, u); }
    assign(u, id, d) { return this.svc.assignCourier(id, d, u); }
    cancel(u, id) { return this.svc.cancel(u.sub, id); }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, swagger_1.ApiBody)({ type: create_order_dto_1.CreateOrderDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('orders.viewAll'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_orders_dto_1.QueryOrdersDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "get", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('orders.updateStatus'),
    (0, swagger_1.ApiBody)({ type: update_order_status_dto_1.UpdateOrderStatusDto }),
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_order_status_dto_1.UpdateOrderStatusDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "status", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('orders.assignCourier'),
    (0, swagger_1.ApiBody)({ type: assign_courier_dto_1.AssignCourierDto }),
    (0, common_1.Post)(':id/assign-courier'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_courier_dto_1.AssignCourierDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "cancel", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiExtraModels)(query_orders_dto_1.QueryOrdersDto),
    (0, common_1.Controller)('orders'),
    __param(0, (0, common_1.Inject)(orders_service_1.OrdersService)),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map