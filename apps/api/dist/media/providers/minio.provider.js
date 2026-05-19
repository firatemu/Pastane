"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minioProvider = exports.MINIO_CLIENT = void 0;
const config_1 = require("@nestjs/config");
const minio_1 = require("minio");
exports.MINIO_CLIENT = 'MINIO_CLIENT';
exports.minioProvider = { provide: exports.MINIO_CLIENT, inject: [config_1.ConfigService], useFactory: (config) => new minio_1.Client({ endPoint: config.get('MINIO_ENDPOINT', 'localhost'), port: Number(config.get('MINIO_PORT', 9000)), useSSL: config.get('MINIO_USE_SSL', 'false') === 'true', accessKey: config.getOrThrow('MINIO_ACCESS_KEY'), secretKey: config.getOrThrow('MINIO_SECRET_KEY') }) };
//# sourceMappingURL=minio.provider.js.map