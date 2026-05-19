"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMinioPublicObjectUrl = parseMinioPublicObjectUrl;
/**
 * Parses path-style MinIO public object URLs: `{origin}/{bucket}/{objectKey}` where
 * `objectKey` may contain slashes (e.g. `home/desktop/uuid.png`).
 */
function parseMinioPublicObjectUrl(storedUrl, allowedBuckets) {
    if (!storedUrl)
        return null;
    try {
        const u = new URL(storedUrl);
        const segments = u.pathname
            .replace(/^\/+/, '')
            .split('/')
            .filter(Boolean);
        if (segments.length < 2)
            return null;
        const bucket = segments[0];
        if (!allowedBuckets.has(bucket))
            return null;
        const objectKey = segments.slice(1).join('/');
        if (!objectKey || objectKey.includes('..'))
            return null;
        return { bucket, objectKey };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=parse-minio-public-object-url.util.js.map