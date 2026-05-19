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
exports.LoyaltyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const loyalty_dto_1 = require("./dto/loyalty.dto");
const loyalty_service_1 = require("./loyalty.service");
let LoyaltyController = class LoyaltyController {
    loyalty;
    constructor(loyalty) {
        this.loyalty = loyalty;
    }
    me(user) { return this.loyalty.me(user.sub); }
    movements(user) { return this.loyalty.movements(user.sub); }
    scan(dto) { return this.loyalty.scan(dto.qrCode); }
    redeem(user, dto) { return this.loyalty.redeem(dto, user); }
    adjust(user, dto) { return this.loyalty.adjust(dto, user); }
    settings() { return this.loyalty.settings(); }
    updateSettings(user, dto) { return this.loyalty.updateSettings(dto, user); }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.viewOwn'),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "me", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.viewOwn'),
    (0, common_1.Get)('me/movements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "movements", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.scan'),
    (0, swagger_1.ApiBody)({ type: loyalty_dto_1.ScanLoyaltyDto }),
    (0, common_1.Post)('scan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [loyalty_dto_1.ScanLoyaltyDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "scan", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.redeem'),
    (0, swagger_1.ApiBody)({ type: loyalty_dto_1.RedeemLoyaltyDto }),
    (0, common_1.Post)('redeem'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, loyalty_dto_1.RedeemLoyaltyDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "redeem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.manageSettings'),
    (0, swagger_1.ApiBody)({ type: loyalty_dto_1.AdjustLoyaltyDto }),
    (0, common_1.Post)('adjust'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, loyalty_dto_1.AdjustLoyaltyDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "adjust", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.manageSettings'),
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "settings", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty.manageSettings'),
    (0, swagger_1.ApiBody)({ type: loyalty_dto_1.UpdateLoyaltySettingDto }),
    (0, common_1.Patch)('settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, loyalty_dto_1.UpdateLoyaltySettingDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "updateSettings", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, swagger_1.ApiTags)('Loyalty'),
    (0, common_1.Controller)('loyalty'),
    __param(0, (0, common_1.Inject)(loyalty_service_1.LoyaltyService)),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map