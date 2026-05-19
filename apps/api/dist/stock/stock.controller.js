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
exports.StockController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const create_stock_entry_dto_1 = require("./dto/create-stock-entry.dto");
const create_stock_movement_dto_1 = require("./dto/create-stock-movement.dto");
const update_stock_entry_dto_1 = require("./dto/update-stock-entry.dto");
const stock_service_1 = require("./stock.service");
let StockController = class StockController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list() { return this.svc.list(); }
    byProduct(id) { return this.svc.byProduct(id); }
    create(user, dto) { return this.svc.create(dto, user); }
    update(user, id, dto) { return this.svc.update(id, dto, user); }
    movement(user, id, dto) { return this.svc.movement(id, dto, user); }
    movements(id) { return this.svc.movements(id); }
};
exports.StockController = StockController;
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.view'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StockController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.view'),
    (0, common_1.Get)('product/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StockController.prototype, "byProduct", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.create'),
    (0, swagger_1.ApiBody)({ type: create_stock_entry_dto_1.CreateStockEntryDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_stock_entry_dto_1.CreateStockEntryDto]),
    __metadata("design:returntype", void 0)
], StockController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.update'),
    (0, swagger_1.ApiBody)({ type: update_stock_entry_dto_1.UpdateStockEntryDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_stock_entry_dto_1.UpdateStockEntryDto]),
    __metadata("design:returntype", void 0)
], StockController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.adjust'),
    (0, swagger_1.ApiBody)({ type: create_stock_movement_dto_1.CreateStockMovementDto }),
    (0, common_1.Post)(':id/movements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_stock_movement_dto_1.CreateStockMovementDto]),
    __metadata("design:returntype", void 0)
], StockController.prototype, "movement", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('stock.viewMovements'),
    (0, common_1.Get)(':id/movements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StockController.prototype, "movements", null);
exports.StockController = StockController = __decorate([
    (0, swagger_1.ApiTags)('Stock'),
    (0, common_1.Controller)('stock'),
    __param(0, (0, common_1.Inject)(stock_service_1.StockService)),
    __metadata("design:paramtypes", [stock_service_1.StockService])
], StockController);
//# sourceMappingURL=stock.controller.js.map