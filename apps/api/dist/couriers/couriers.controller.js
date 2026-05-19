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
exports.CouriersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const couriers_service_1 = require("./couriers.service");
const create_courier_dto_1 = require("./dto/create-courier.dto");
const query_couriers_dto_1 = require("./dto/query-couriers.dto");
const update_courier_dto_1 = require("./dto/update-courier.dto");
let CouriersController = class CouriersController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(user, q) {
        return this.svc.list(q, user);
    }
    get(user, id) {
        return this.svc.getById(id, user);
    }
    create(user, dto) {
        return this.svc.create(dto, user);
    }
    update(user, id, dto) {
        return this.svc.update(id, dto, user);
    }
    deactivate(user, id) {
        return this.svc.deactivate(id, user);
    }
    reactivate(user, id) {
        return this.svc.reactivate(id, user);
    }
};
exports.CouriersController = CouriersController;
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.view'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_couriers_dto_1.QueryCouriersDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.view'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "get", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.create'),
    (0, swagger_1.ApiBody)({ type: create_courier_dto_1.CreateCourierDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_courier_dto_1.CreateCourierDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.update'),
    (0, swagger_1.ApiBody)({ type: update_courier_dto_1.UpdateCourierDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_courier_dto_1.UpdateCourierDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.update'),
    (0, common_1.Post)(':id/deactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "deactivate", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('couriers.update'),
    (0, common_1.Post)(':id/reactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "reactivate", null);
exports.CouriersController = CouriersController = __decorate([
    (0, swagger_1.ApiTags)('Couriers'),
    (0, swagger_1.ApiExtraModels)(query_couriers_dto_1.QueryCouriersDto, create_courier_dto_1.CreateCourierDto, update_courier_dto_1.UpdateCourierDto),
    (0, common_1.Controller)('couriers'),
    __param(0, (0, common_1.Inject)(couriers_service_1.CouriersService)),
    __metadata("design:paramtypes", [couriers_service_1.CouriersService])
], CouriersController);
//# sourceMappingURL=couriers.controller.js.map