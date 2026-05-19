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
var BannersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const parse_minio_public_object_url_util_1 = require("../common/utils/parse-minio-public-object-url.util");
const mime_util_1 = require("../common/utils/mime.util");
const minio_public_bucket_util_1 = require("../common/utils/minio-public-bucket.util");
const prisma_service_1 = require("../database/prisma.service");
const minio_provider_1 = require("../media/providers/minio.provider");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
let BannersService = BannersService_1 = class BannersService {
    prisma;
    audit;
    config;
    minio;
    logger = new common_1.Logger(BannersService_1.name);
    constructor(prisma, audit, config, minio) {
        this.prisma = prisma;
        this.audit = audit;
        this.config = config;
        this.minio = minio;
    }
    async onModuleInit() {
        const bucket = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
        try {
            await (0, minio_public_bucket_util_1.ensureBucketWithPublicRead)(this.minio, bucket);
        }
        catch (err) {
            this.logger.warn(`Banner bucket public read policy could not be applied (${bucket}): ${err instanceof Error ? err.message : err}`);
        }
    }
    async listHome() {
        const now = new Date();
        const rows = await this.prisma.banner.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                ],
            },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                title: true,
                subtitle: true,
                description: true,
                mediaType: true,
                desktopMediaUrl: true,
                desktopMediaBucket: true,
                desktopMediaObjectKey: true,
                mobileMediaUrl: true,
                mobileMediaBucket: true,
                mobileMediaObjectKey: true,
                buttonText: true,
                buttonUrl: true,
                sortOrder: true,
            },
        });
        return rows.map((r) => this.mapHomeRow(r));
    }
    async listAdmin() {
        const rows = await this.prisma.banner.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } });
        return rows.map((r) => this.mapAdminBannerRow(r));
    }
    async get(id) {
        const row = await this.getNonDeleted(id);
        return this.mapAdminBannerRow(row);
    }
    async create(dto, actor) {
        const sortOrder = dto.sortOrder ?? (await this.nextSortOrder());
        const item = await this.prisma.banner.create({
            data: {
                title: dto.title,
                subtitle: dto.subtitle,
                description: dto.description,
                mediaType: dto.mediaType,
                desktopMediaUrl: dto.desktopMediaUrl,
                desktopMediaBucket: dto.desktopMediaBucket ?? null,
                desktopMediaObjectKey: dto.desktopMediaObjectKey ?? null,
                mobileMediaUrl: dto.mobileMediaUrl,
                mobileMediaBucket: dto.mobileMediaBucket ?? null,
                mobileMediaObjectKey: dto.mobileMediaObjectKey ?? null,
                buttonText: dto.buttonText,
                buttonUrl: dto.buttonUrl,
                sortOrder,
                isActive: dto.isActive ?? true,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            },
        });
        await this.audit.log({
            actorId: actor?.sub,
            action: 'banners.create',
            entityType: 'Banner',
            entityId: item.id,
            newValues: item,
        });
        return this.mapAdminBannerRow(item);
    }
    async update(id, dto, actor) {
        const old = await this.getNonDeleted(id);
        if (dto.desktopMediaUrl !== undefined && dto.desktopMediaUrl !== old.desktopMediaUrl) {
            await this.removeStoredObject(old.desktopMediaBucket, old.desktopMediaObjectKey);
        }
        if (dto.mobileMediaUrl !== undefined && dto.mobileMediaUrl !== old.mobileMediaUrl) {
            await this.removeStoredObject(old.mobileMediaBucket, old.mobileMediaObjectKey);
        }
        const item = await this.prisma.banner.update({
            where: { id },
            data: this.buildUpdateData(dto),
        });
        await this.audit.log({
            actorId: actor?.sub,
            action: 'banners.update',
            entityType: 'Banner',
            entityId: id,
            oldValues: old,
            newValues: item,
        });
        return this.mapAdminBannerRow(item);
    }
    async remove(id, actor) {
        const old = await this.getNonDeleted(id);
        await this.deleteBannerStoredFiles(old);
        const item = await this.prisma.banner.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
        await this.audit.log({
            actorId: actor?.sub,
            action: 'banners.delete',
            entityType: 'Banner',
            entityId: id,
            oldValues: old,
        });
        return this.mapAdminBannerRow(item);
    }
    async setStatus(id, isActive, actor) {
        const old = await this.getNonDeleted(id);
        const item = await this.prisma.banner.update({ where: { id }, data: { isActive } });
        await this.audit.log({
            actorId: actor?.sub,
            action: 'banners.status',
            entityType: 'Banner',
            entityId: id,
            oldValues: old,
            newValues: item,
        });
        return this.mapAdminBannerRow(item);
    }
    async reorder(ids, actor) {
        const existing = await this.prisma.banner.findMany({ where: { deletedAt: null }, select: { id: true } });
        if (existing.length !== ids.length) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.BANNER_REORDER_INVALID, 'Reorder must include every banner id', common_1.HttpStatus.BAD_REQUEST);
        }
        const set = new Set(existing.map((row) => row.id));
        for (const id of ids) {
            if (!set.has(id)) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.BANNER_REORDER_INVALID, 'Invalid banner id in reorder list', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        await this.prisma.$transaction(ids.map((bannerId, index) => this.prisma.banner.update({ where: { id: bannerId }, data: { sortOrder: index } })));
        await this.audit.log({
            actorId: actor?.sub,
            action: 'banners.reorder',
            entityType: 'Banner',
            entityId: null,
            newValues: { ids },
        });
        return this.listAdmin();
    }
    async uploadMedia(file, variant, expectKind) {
        if (!file?.buffer) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'File is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const detected = (0, mime_util_1.detectBannerMedia)(file.buffer);
        if (!detected) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_INVALID_TYPE, 'Desteklenmeyen dosya türü. Görseller: JPEG, PNG, WebP veya GIF; video: MP4 veya WebM kullanın.', common_1.HttpStatus.BAD_REQUEST);
        }
        const max = detected.kind === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (file.size > max) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_FILE_TOO_LARGE, 'File is too large', common_1.HttpStatus.BAD_REQUEST);
        }
        if (expectKind !== undefined) {
            const want = expectKind === client_1.BannerMediaType.IMAGE ? 'IMAGE' : 'VIDEO';
            if (detected.kind !== want) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.BANNER_MEDIA_MISMATCH, 'File does not match selected media type', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        const bucket = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
        await (0, minio_public_bucket_util_1.ensureBucketWithPublicRead)(this.minio, bucket);
        const ext = extensionForMime(detected.mime);
        const key = `home/${variant}/${(0, node_crypto_1.randomUUID)()}${ext}`;
        try {
            await this.minio.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': detected.mime });
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_UPLOAD_FAILED, 'Media upload failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const minioUrl = `${this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000')}/${bucket}/${key}`;
        const url = this.proxiedMediaUrl(bucket, key, minioUrl);
        return {
            variant,
            url,
            bucket,
            objectKey: key,
            detectedMediaType: detected.kind === 'IMAGE' ? client_1.BannerMediaType.IMAGE : client_1.BannerMediaType.VIDEO,
            mime: detected.mime,
        };
    }
    mapHomeRow(row) {
        return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            description: row.description,
            mediaType: row.mediaType,
            desktopMediaUrl: this.proxiedMediaUrl(row.desktopMediaBucket, row.desktopMediaObjectKey, row.desktopMediaUrl),
            mobileMediaUrl: this.proxiedMediaUrl(row.mobileMediaBucket, row.mobileMediaObjectKey, row.mobileMediaUrl),
            buttonText: row.buttonText,
            buttonUrl: row.buttonUrl,
            sortOrder: row.sortOrder,
        };
    }
    mapAdminBannerRow(row) {
        return {
            ...row,
            desktopMediaUrl: this.proxiedMediaUrl(row.desktopMediaBucket, row.desktopMediaObjectKey, row.desktopMediaUrl),
            mobileMediaUrl: this.proxiedMediaUrl(row.mobileMediaBucket, row.mobileMediaObjectKey, row.mobileMediaUrl),
        };
    }
    proxiedMediaUrl(bucket, objectKey, storedUrl) {
        const base = (this.config.get('PUBLIC_API_URL') ?? this.config.get('API_URL') ?? '').trim();
        if (!base)
            return storedUrl;
        const banners = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
        const products = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
        const allowed = new Set([banners, products]);
        let b = bucket ?? null;
        let k = objectKey ?? null;
        if (!b || !k) {
            const parsed = (0, parse_minio_public_object_url_util_1.parseMinioPublicObjectUrl)(storedUrl, allowed);
            if (parsed) {
                b = b ?? parsed.bucket;
                k = k ?? parsed.objectKey;
            }
        }
        if (!b || !k)
            return storedUrl;
        return `${base.replace(/\/$/, '')}/api/v1/files/${b}/${encodeURIComponent(k)}`;
    }
    buildUpdateData(dto) {
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.subtitle !== undefined)
            data.subtitle = dto.subtitle;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.mediaType !== undefined)
            data.mediaType = dto.mediaType;
        if (dto.desktopMediaUrl !== undefined)
            data.desktopMediaUrl = dto.desktopMediaUrl;
        if (dto.desktopMediaBucket !== undefined)
            data.desktopMediaBucket = dto.desktopMediaBucket;
        if (dto.desktopMediaObjectKey !== undefined)
            data.desktopMediaObjectKey = dto.desktopMediaObjectKey;
        if (dto.mobileMediaUrl !== undefined)
            data.mobileMediaUrl = dto.mobileMediaUrl;
        if (dto.mobileMediaBucket !== undefined)
            data.mobileMediaBucket = dto.mobileMediaBucket;
        if (dto.mobileMediaObjectKey !== undefined)
            data.mobileMediaObjectKey = dto.mobileMediaObjectKey;
        if (dto.buttonText !== undefined)
            data.buttonText = dto.buttonText;
        if (dto.buttonUrl !== undefined)
            data.buttonUrl = dto.buttonUrl;
        if (dto.sortOrder !== undefined)
            data.sortOrder = dto.sortOrder;
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        if (dto.startsAt !== undefined)
            data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        if (dto.endsAt !== undefined)
            data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
        return data;
    }
    async nextSortOrder() {
        const agg = await this.prisma.banner.aggregate({ where: { deletedAt: null }, _max: { sortOrder: true } });
        return (agg._max.sortOrder ?? -1) + 1;
    }
    async getNonDeleted(id) {
        const item = await this.prisma.banner.findFirst({ where: { id, deletedAt: null } });
        if (!item)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.BANNER_NOT_FOUND, 'Banner not found', common_1.HttpStatus.NOT_FOUND);
        return item;
    }
    async deleteBannerStoredFiles(row) {
        await Promise.all([
            this.removeStoredObjectBestEffort(row.desktopMediaBucket, row.desktopMediaObjectKey),
            this.removeStoredObjectBestEffort(row.mobileMediaBucket, row.mobileMediaObjectKey),
        ]);
    }
    async removeStoredObjectBestEffort(bucket, objectKey) {
        if (!bucket || !objectKey)
            return;
        try {
            await this.minio.removeObject(bucket, objectKey);
        }
        catch (err) {
            this.logger.warn(`MinIO removeObject failed (${bucket}/${objectKey}): ${err instanceof Error ? err.message : err}`);
        }
    }
    async removeStoredObject(bucket, objectKey) {
        if (!bucket || !objectKey)
            return;
        try {
            await this.minio.removeObject(bucket, objectKey);
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.MEDIA_DELETE_FAILED, 'Media delete failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.BannersService = BannersService;
exports.BannersService = BannersService = BannersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(2, (0, common_1.Inject)(config_1.ConfigService)),
    __param(3, (0, common_1.Inject)(minio_provider_1.MINIO_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        config_1.ConfigService, Function])
], BannersService);
function extensionForMime(mime) {
    switch (mime) {
        case 'image/jpeg':
            return '.jpg';
        case 'image/png':
            return '.png';
        case 'image/webp':
            return '.webp';
        case 'image/gif':
            return '.gif';
        case 'video/mp4':
            return '.mp4';
        case 'video/webm':
            return '.webm';
        default:
            return '.bin';
    }
}
//# sourceMappingURL=banners.service.js.map