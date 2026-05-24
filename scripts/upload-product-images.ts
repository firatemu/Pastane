/**
 * Ürün görsellerini MinIO'ya upload eder ve veritabanını günceller.
 * Çalıştırma: node scripts/upload-product-images.js
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';

// Env yükle
function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const tryEnv = path.join(dir, '.env');
    if (existsSync(tryEnv)) {
      config({ path: tryEnv, override: false });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
loadEnv();

// Postgres hostname düzeltmesi (host makinede çalışırken)
if (!existsSync('/.dockerenv')) {
  const raw = process.env.DATABASE_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.hostname === 'postgres') {
        u.hostname = '127.0.0.1';
        process.env.DATABASE_URL = u.toString();
      }
    } catch {}
  }
}

const prisma = new PrismaClient();

// MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = process.env.MINIO_BUCKET_PRODUCTS || 'product-images';
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

// Ürün slug -> görsel dosya adı eşlemesi
const productImageMap = {
  'sade-pogaca': 'sade-pogaca.jpg',
  'peynirli-pogaca': 'peynirli-pogaca.jpg',
  'zeytinli-pogaca': 'zeytinli-pogaca.jpg',
  'susamli-simit': 'susamli-simit.jpg',
  'kasarli-simit': 'kasarli-simit.jpg',
  'tereyagli-simit': 'tereyagli-simit.jpg',
  'peynirli-borek': 'peynirli-borek.jpg',
  'ispanakli-borek': 'ispanakli-borek.jpg',
  'kiymali-borek': 'kiymali-borek.jpg',
  'hindi-fume-sandvic': 'hindi-fume-sandvic.jpg',
  'kasarli-tost-sandvic': 'kasarli-tost-sandvic.jpg',
  'ton-balikli-sandvic': 'ton-balikli-sandvic.jpg',
  'tereyagli-kruvasan': 'tereyagli-kruvasan.jpg',
  'cikolatali-kruvasan': 'cikolatali-kruvasan.jpg',
  'bademli-kruvasan': 'bademli-kruvasan.jpg',
  'beyaz-ekmek': 'beyaz-ekmek.jpg',
  'eksi-maya-ekmek': 'eksi-maya-ekmek.jpg',
  'cavdarli-ekmek': 'cavdarli-ekmek.jpg',
  'vanilyali-dondurma': 'vanilyali-dondurma.jpg',
  'cikolatali-dondurma': 'cikolatali-dondurma.jpg',
  'antep-fistikli-dondurma': 'antep-fistikli-dondurma.jpg',
  'tatli-kuru-pasta': 'tatli-kuru-pasta.jpg',
  'tuzlu-kuru-pasta': 'tuzlu-kuru-pasta.jpg',
  'kavala-kurabiyesi': 'kavala-kurabiyesi.jpg',
  'cikolatali-yas-pasta': 'cikolatali-yas-pasta.jpg',
  'cilekli-yas-pasta': 'cilekli-yas-pasta.jpg',
  'muzlu-rulo-pasta': 'muzlu-rulo-pasta.jpg',
  'baklava': 'baklava.jpg',
  'sutlac': 'sutlac.jpg',
  'profiterol': 'profiterol.jpg',
};

async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log(`Bucket ${BUCKET} created`);
    }
    // Public read policy
    try {
      await minioClient.setBucketPolicy(BUCKET, JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET}/*`],
        }],
      }));
      console.log('Bucket policy set');
    } catch (policyErr) {
      console.warn('Policy set warning:', policyErr);
    }
  } catch (err) {
    console.warn('Bucket setup warning:', err);
  }
}

async function uploadImage(slug, fileName) {
  const localPath = path.join(process.cwd(), 'images', 'products', fileName);
  if (!existsSync(localPath)) {
    console.warn(`  File not found: ${localPath}`);
    return null;
  }

  const fileBuffer = readFileSync(localPath);
  const extension = path.extname(fileName);
  const objectKey = `products/${slug}${extension}`;

  try {
    await minioClient.putObject(BUCKET, objectKey, fileBuffer, {
      'Content-Type': extension === '.png' ? 'image/png' : 'image/jpeg',
    });
    const url = `${PUBLIC_URL}/${BUCKET}/${objectKey}`;
    console.log(`  Uploaded: ${objectKey}`);
    return url;
  } catch (err) {
    console.error(`  Upload failed for ${slug}:`, err);
    return null;
  }
}

async function main() {
  console.log('Starting product image upload...');
  
  // MinIO bucket hazırla
  await ensureBucket();

  // Tüm ürünleri al
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
  });

  console.log(`Found ${products.length} products`);

  const now = new Date();

  for (const product of products) {
    const fileName = productImageMap[product.slug];
    if (!fileName) {
      console.log(`No image mapping for: ${product.slug} (${product.name})`);
      continue;
    }

    console.log(`Processing: ${product.name} (${product.slug})`);

    const url = await uploadImage(product.slug, fileName);
    if (!url) {
      console.log(`  Skipping database update for ${product.slug}`);
      continue;
    }

    // Eski görselleri soft delete
    await prisma.productImage.updateMany({
      where: { productId: product.id, deletedAt: null },
      data: { deletedAt: now, isPrimary: false },
    });

    // Yeni görsel ekle
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        altText: product.name,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    console.log(`  Updated: ${product.name}`);
  }

  console.log('\nDone! Product images uploaded.');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });