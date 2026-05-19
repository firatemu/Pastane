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
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const create_review_dto_1 = require("./dto/create-review.dto");
const query_pending_reviews_dto_1 = require("./dto/query-pending-reviews.dto");
const query_product_reviews_dto_1 = require("./dto/query-product-reviews.dto");
const reject_review_dto_1 = require("./dto/reject-review.dto");
const reviews_service_1 = require("./reviews.service");
let ReviewsController = class ReviewsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    create(user, dto) {
        return this.svc.create(user.sub, dto);
    }
    product(productId, q) {
        return this.svc.product(productId, q);
    }
    mine(user) {
        return this.svc.mine(user.sub);
    }
    pending(q) {
        return this.svc.pending(q);
    }
    approve(user, id) {
        return this.svc.approve(id, user.sub);
    }
    reject(user, id, dto) {
        return this.svc.reject(id, dto.reason, user.sub);
    }
    remove(user, id) {
        return this.svc.remove(id, user.sub);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.create'),
    (0, swagger_1.ApiBody)({ type: create_review_dto_1.CreateReviewDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_review_dto_1.CreateReviewDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "create", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('product/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_product_reviews_dto_1.QueryProductReviewsDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "product", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.view'),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "mine", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.moderate'),
    (0, common_1.Get)('pending'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_pending_reviews_dto_1.QueryPendingReviewsDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "pending", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.moderate'),
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "approve", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.moderate'),
    (0, swagger_1.ApiBody)({ type: reject_review_dto_1.RejectReviewDto }),
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, reject_review_dto_1.RejectReviewDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "reject", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('reviews.delete'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "remove", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiExtraModels)(query_pending_reviews_dto_1.QueryPendingReviewsDto, query_product_reviews_dto_1.QueryProductReviewsDto),
    (0, common_1.Controller)('reviews'),
    __param(0, (0, common_1.Inject)(reviews_service_1.ReviewsService)),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map