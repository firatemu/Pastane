import type { Client } from 'minio';

/** S3-compatible policy so browsers can load `<img src>` / video without signing (dev MinIO + public CDN URL in prod). */
export function publicReadBucketPolicyJson(bucket: string): string {
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
export async function ensureBucketWithPublicRead(minio: Client, bucket: string): Promise<void> {
  if (!(await minio.bucketExists(bucket))) {
    await minio.makeBucket(bucket);
  }
  await minio.setBucketPolicy(bucket, publicReadBucketPolicyJson(bucket));
}
