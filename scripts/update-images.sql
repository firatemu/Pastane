-- Ürün görsellerini güncelleme SQL scripti
-- Bu script veritabanındaki ürün görsellerini Unsplash'tan kaliteli görsellerle değiştirir

-- 1. Mevcut görselleri soft delete et
UPDATE "product_images" 
SET "deletedAt" = NOW() 
WHERE "deletedAt" IS NULL;

-- 2. Yeni görseller ekle
INSERT INTO "product_images" ("id", "productId", "bucket", "objectKey", "url", "mimeType", "size", "altText", "sortOrder", "isPrimary", "deletedAt", "createdAt")
SELECT 
  gen_random_uuid()::text,
  p.id,
  'product-images',
  NULL,
  CASE p.slug
    WHEN 'sade-pogaca' THEN 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=900&q=80'
    WHEN 'peynirli-pogaca' THEN 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80'
    WHEN 'zeytinli-pogaca' THEN 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1e?auto=format&fit=crop&w=900&q=80'
    WHEN 'susamli-simit' THEN 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=80'
    WHEN 'kasarli-simit' THEN 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80'
    WHEN 'tereyagli-simit' THEN 'https://images.unsplash.com/photo-1558961363-fa8fdf82db84?auto=format&fit=crop&w=900&q=80'
    WHEN 'peynirli-borek' THEN 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80'
    WHEN 'ispanakli-borek' THEN 'https://images.unsplash.com/photo-1623333748855-4f2d8ea1e134?auto=format&fit=crop&w=900&q=80'
    WHEN 'kiymali-borek' THEN 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80'
    WHEN 'hindi-fume-sandvic' THEN 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80'
    WHEN 'kasarli-tost-sandvic' THEN 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?auto=format&fit=crop&w=900&q=80'
    WHEN 'ton-balikli-sandvic' THEN 'https://images.unsplash.com/photo-1519708223044-83f2dd8b38f5?auto=format&fit=crop&w=900&q=80'
    WHEN 'tereyagli-kruvasan' THEN 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80'
    WHEN 'cikolatali-kruvasan' THEN 'https://images.unsplash.com/photo-1559305816-c71c07e92182?auto=format&fit=crop&w=900&q=80'
    WHEN 'bademli-kruvasan' THEN 'https://images.unsplash.com/photo-1586985289947-f3be0ab7a9c1?auto=format&fit=crop&w=900&q=80'
    WHEN 'beyaz-ekmek' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'
    WHEN 'eksi-maya-ekmek' THEN 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80'
    WHEN 'cavdarli-ekmek' THEN 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80'
    WHEN 'vanilyali-dondurma' THEN 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80'
    WHEN 'cikolatali-dondurma' THEN 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'
    WHEN 'antep-fistikli-dondurma' THEN 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=900&q=80'
    WHEN 'tatli-kuru-pasta' THEN 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80'
    WHEN 'tuzlu-kuru-pasta' THEN 'https://images.unsplash.com/photo-1558961363-fa8fdf82db84?auto=format&fit=crop&w=900&q=80'
    WHEN 'kavala-kurabiyesi' THEN 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80'
    WHEN 'cikolatali-yas-pasta' THEN 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'
    WHEN 'cilekli-yas-pasta' THEN 'https://images.unsplash.com/photo-1464349095431-e9b4125c8d18?auto=format&fit=crop&w=900&q=80'
    WHEN 'muzlu-rulo-pasta' THEN 'https://images.unsplash.com/photo-1563729784474-d4db9f876ad5?auto=format&fit=crop&w=900&q=80'
    WHEN 'baklava' THEN 'https://images.unsplash.com/photo-1513236992188-7fc7faa44a2c?auto=format&fit=crop&w=900&q=80'
    WHEN 'sutlac' THEN 'https://images.unsplash.com/photo-1542807907-5249b47782a1?auto=format&fit=crop&w=900&q=80'
    WHEN 'profiterol' THEN 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80'
  END,
  'image/jpeg',
  0,
  p.name,
  0,
  true,
  NULL,
  NOW()
FROM "products" p WHERE p."deletedAt" IS NULL;