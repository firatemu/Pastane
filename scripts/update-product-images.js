/**
 * Ürün görsellerini doğrudan veritabanında günceller.
 * Çalıştırma: node scripts/update-product-images.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Unsplash görsel URL'leri - ürün isimleriyle eşleşen kaliteli görseller
const productImages = {
  'sade-pogaca': 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=900&q=80',
  'peynirli-pogaca': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
  'zeytinli-pogaca': 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1e?auto=format&fit=crop&w=900&q=80',
  'susamli-simit': 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=80',
  'kasarli-simit': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
  'tereyagli-simit': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db84?auto=format&fit=crop&w=900&q=80',
  'peynirli-borek': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80',
  'ispanakli-borek': 'https://images.unsplash.com/photo-1623333748855-4f2d8ea1e134?auto=format&fit=crop&w=900&q=80',
  'kiymali-borek': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  'hindi-fume-sandvic': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  'kasarli-tost-sandvic': 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?auto=format&fit=crop&w=900&q=80',
  'ton-balikli-sandvic': 'https://images.unsplash.com/photo-1519708223044-83f2dd8b38f5?auto=format&fit=crop&w=900&q=80',
  'tereyagli-kruvasan': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',
  'cikolatali-kruvasan': 'https://images.unsplash.com/photo-1559305816-c71c07e92182?auto=format&fit=crop&w=900&q=80',
  'bademli-kruvasan': 'https://images.unsplash.com/photo-1586985289947-f3be0ab7a9c1?auto=format&fit=crop&w=900&q=80',
  'beyaz-ekmek': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  'eksi-maya-ekmek': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80',
  'cavdarli-ekmek': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80',
  'vanilyali-dondurma': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',
  'cikolatali-dondurma': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
  'antep-fistikli-dondurma': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=900&q=80',
  'tatli-kuru-pasta': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80',
  'tuzlu-kuru-pasta': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db84?auto=format&fit=crop&w=900&q=80',
  'kavala-kurabiyesi': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',
  'cikolatali-yas-pasta': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
  'cilekli-yas-pasta': 'https://images.unsplash.com/photo-1464349095431-e9b4125c8d18?auto=format&fit=crop&w=900&q=80',
  'muzlu-rulo-pasta': 'https://images.unsplash.com/photo-1563729784474-d4db9f876ad5?auto=format&fit=crop&w=900&q=80',
  'baklava': 'https://images.unsplash.com/photo-1513236992188-7fc7faa44a2c?auto=format&fit=crop&w=900&q=80',
  'sutlac': 'https://images.unsplash.com/photo-1542807907-5249b47782a1?auto=format&fit=crop&w=900&q=80',
  'profiterol': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
};

async function main() {
  console.log('Ürün görselleri güncelleniyor...');
  
  const now = new Date();
  let updated = 0;

  for (const [slug, imageUrl] of Object.entries(productImages)) {
    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: { images: { where: { deletedAt: null } } }
    });

    if (!product) {
      console.log(`Ürün bulunamadı: ${slug}`);
      continue;
    }

    // Eski görselleri soft delete et
    if (product.images.length > 0) {
      await prisma.productImage.updateMany({
        where: { productId: product.id, deletedAt: null },
        data: { deletedAt: now, isPrimary: false },
      });
    }

    // Yeni görsel ekle
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        altText: product.name,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    console.log(`✓ ${product.name} - görsel güncellendi`);
    updated++;
  }

  console.log(`\nToplam ${updated} ürünün görseli güncellendi.`);
}

main()
  .catch((err) => {
    console.error('Hata:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });