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
exports.PublicFilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const minio_provider_1 = require("./providers/minio.provider");
function contentTypeForObjectKey(objectKey) {
    const lower = objectKey.toLowerCase();
    if (lower.endsWith('.png'))
        return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
        return 'image/jpeg';
    if (lower.endsWith('.webp'))
        return 'image/webp';
    if (lower.endsWith('.gif'))
        return 'image/gif';
    if (lower.endsWith('.mp4'))
        return 'video/mp4';
    if (lower.endsWith('.webm'))
        return 'video/webm';
    return 'application/octet-stream';
}
let PublicFilesService = class PublicFilesService {
    config;
    minio;
    constructor(config, minio) {
        this.config = config;
        this.minio = minio;
    }
    allowedBucket(name) {
        const banners = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
        const products = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
        return name === banners || name === products;
    }
    async stream(bucket, objectKey) {
        if (!this.allowedBucket(bucket))
            throw new common_1.NotFoundException();
        if (!objectKey || objectKey.includes('..') || objectKey.startsWith('/'))
            throw new common_1.NotFoundException();
        try {
            const stream = await this.minio.getObject(bucket, objectKey);
            const type = contentTypeForObjectKey(objectKey);
            return new common_1.StreamableFile(stream, { type, disposition: 'inline' });
        }
        catch {
            throw new common_1.NotFoundException();
        }
    }
};
exports.PublicFilesService = PublicFilesService;
exports.PublicFilesService = PublicFilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __param(1, (0, common_1.Inject)(minio_provider_1.MINIO_CLIENT)),
    __metadata("design:paramtypes", [config_1.ConfigService, Function])
], PublicFilesService);
//# sourceMappingURL=public-files.service.js.map