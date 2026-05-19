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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const minio_public_bucket_util_1 = require("../common/utils/minio-public-bucket.util");
const mime_util_1 = require("../common/utils/mime.util");
const prisma_service_1 = require("../database/prisma.service");
const minio_provider_1 = require("./providers/minio.provider");
let MediaService = MediaService_1 = class MediaService {
    prisma;
    config;
    minio;
    logger = new common_1.Logger(MediaService_1.name);
    constructor(prisma, config, minio) {
        this.prisma = prisma;
        this.config = config;
        this.minio = minio;
    }
    async onModuleInit() {
        const bucket = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
        try {
            await (0, minio_public_bucket_util_1.ensureBucketWithPublicRead)(this.minio, bucket);
        }
        catch (err) {
            this.logger.warn(`Product images bucket public read policy could not be applied (${bucket}): ${err instanceof Error ? err.message : err}`);
        }
    }
    async upload(file, dto) {
        if (!file)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'File is required', common_1.HttpStatus.BAD_REQUEST);
        if (file.size > 5 * 1024 * 1024)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_FILE_TOO_LARGE, 'File is too large', common_1.HttpStatus.BAD_REQUEST);
        const mime = (0, mime_util_1.detectImageMime)(file.buffer);
        if (!mime)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_INVALID_TYPE, 'Unsupported media type', common_1.HttpStatus.BAD_REQUEST);
        const product = await this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null } });
        if (!product)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', common_1.HttpStatus.NOT_FOUND);
        const bucket = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
        await (0, minio_public_bucket_util_1.ensureBucketWithPublicRead)(this.minio, bucket);
        const extension = mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : mime === 'image/gif' ? '.gif' : '.webp';
        const key = `${dto.folder ?? 'products'}/${(0, crypto_1.randomUUID)()}${extension}`;
        try {
            await this.minio.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': mime });
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_UPLOAD_FAILED, 'Media upload failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (dto.isPrimary) {
            await this.prisma.productImage.updateMany({ where: { productId: dto.productId, deletedAt: null }, data: { isPrimary: false } });
        }
        return this.prisma.productImage.create({
            data: {
                productId: dto.productId,
                bucket,
                objectKey: key,
                url: `${this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000')}/${bucket}/${key}`,
                mimeType: mime,
                size: file.size,
                altText: dto.altText,
                sortOrder: dto.sortOrder ?? 0,
                isPrimary: dto.isPrimary ?? false,
            },
        });
    }
    async get(id) {
        const x = await this.prisma.productImage.findFirst({ where: { id, deletedAt: null } });
        if (!x)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_NOT_FOUND, 'Media not found', common_1.HttpStatus.NOT_FOUND);
        return x;
    }
    async remove(id) {
        const x = await this.get(id);
        try {
            if (x.bucket && x.objectKey)
                await this.minio.removeObject(x.bucket, x.objectKey);
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_DELETE_FAILED, 'Media delete failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.prisma.productImage.update({ where: { id }, data: { deletedAt: new Date(), isPrimary: false } });
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __param(2, (0, common_1.Inject)(minio_provider_1.MINIO_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService, Function])
], MediaService);
//# sourceMappingURL=media.service.js.map