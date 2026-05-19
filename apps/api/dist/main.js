"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
async function bootstrap() {
    if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_DEV_AUTO_SUCCESS === 'true') {
        throw new Error('PAYMENT_DEV_AUTO_SUCCESS must not be enabled when NODE_ENV is production');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_1.urlencoded)({ extended: true, limit: '1mb' }));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor(app.get(core_1.Reflector)));
    const enableSwagger = process.env.SWAGGER_ENABLED === 'true';
    if (enableSwagger) {
        const config = new swagger_1.DocumentBuilder().setTitle('Pastane API').setVersion('1.0').addBearerAuth().build();
        swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, config));
    }
    await app.listen(process.env.API_PORT ?? 3003);
}
void bootstrap();
//# sourceMappingURL=main.js.map