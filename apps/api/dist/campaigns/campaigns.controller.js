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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const campaigns_service_1 = require("./campaigns.service");
const campaign_dto_1 = require("./dto/campaign.dto");
let CampaignsController = class CampaignsController {
    campaigns;
    constructor(campaigns) {
        this.campaigns = campaigns;
    }
    list() { return this.campaigns.list(); }
    active() { return this.campaigns.active(); }
    create(user, dto) { return this.campaigns.create(dto, user); }
    update(user, id, dto) { return this.campaigns.update(id, dto, user); }
    remove(user, id) { return this.campaigns.remove(id, user); }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('campaigns.view'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "list", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "active", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('campaigns.create'),
    (0, swagger_1.ApiBody)({ type: campaign_dto_1.CreateCampaignDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, campaign_dto_1.CreateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('campaigns.update'),
    (0, swagger_1.ApiBody)({ type: campaign_dto_1.UpdateCampaignDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, campaign_dto_1.UpdateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('campaigns.delete'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "remove", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, swagger_1.ApiTags)('Campaigns'),
    (0, common_1.Controller)('campaigns'),
    __param(0, (0, common_1.Inject)(campaigns_service_1.CampaignsService)),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map