"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicReadBucketPolicyJson = publicReadBucketPolicyJson;
exports.ensureBucketWithPublicRead = ensureBucketWithPublicRead;
/** S3-compatible policy so browsers can load `<img src>` / video without signing (dev MinIO + public CDN URL in prod). */
function publicReadBucketPolicyJson(bucket) {
    const resource = `arn:aws:s3:::${bucket}/*`;
    return JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [resource],
            },
        ],
    });
}
/** Creates the bucket if missing and applies an anonymous GetObject policy. Safe to call repeatedly. */
async function ensureBucketWithPublicRead(minio, bucket) {
    if (!(await minio.bucketExists(bucket))) {
        await minio.makeBucket(bucket);
    }
    await minio.setBucketPolicy(bucket, publicReadBucketPolicyJson(bucket));
}
//# sourceMappingURL=minio-public-bucket.util.js.map