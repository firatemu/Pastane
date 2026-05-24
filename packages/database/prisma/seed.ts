import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { PrismaClient, RoleType, UserStatus, CourierStatus, ProductStatus, ProductUnitKind, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

/** pnpm --filter runs with cwd = packages/database; Prisma only auto-loads .env next to schema. Walk up to repo root. */
function loadDatabaseEnv(): void {
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
loadDatabaseEnv();

/**
 * Compose `.env` templates use hostname `postgres` (only resolvable inside the Docker network).
 * When seed runs on the host, rewrite to loopback so port-forwarded Postgres works.
 * Opt out: `DATABASE_URL_SEED=preserve` or put `127.0.0.1` in `DATABASE_URL` yourself.
 */
function rewriteDatabaseUrlForHostSeed(): void {
  if (process.env.DATABASE_URL_SEED === 'preserve') return;
  if (existsSync('/.dockerenv')) return;
  for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[key];
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (u.hostname === 'postgres' || u.hostname === 'host.docker.internal') {
        u.hostname = '127.0.0.1';
        process.env[key] = u.toString();
      }
    } catch {
      /* keep original */
    }
  }
}
rewriteDatabaseUrlForHostSeed();

/** Seed uses direct Postgres (migrations-style); pgBouncer transaction pool rejects some Prisma queries. */
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();
const permissions = [
  'users.view','users.create','users.update','users.delete','users.changeStatus',
  'roles.view','roles.create','roles.update','roles.delete','permissions.view','permissions.manage',
  'products.view','products.create','products.update','products.delete','products.manageImages','products.manageOptions','products.manageAllergens',
  'categories.view','categories.create','categories.update','categories.delete',
  'allergens.view','productUnits.view','productUnits.manage','media.upload','media.delete',
  'orders.view','orders.viewOwn','orders.viewAll','orders.create','orders.updateStatus','orders.cancel','orders.assignCourier',
  'payments.view','payments.initiate','payments.refund','payments.viewAll',
  'couriers.view','couriers.create','couriers.update','couriers.performance',
  'deliveries.viewOwn','deliveries.updateOwn','deliveries.viewAll',
  'loyalty.viewOwn','loyalty.scan','loyalty.redeem','loyalty.manageSettings','loyalty.viewReports',
  'reviews.create','reviews.view','reviews.moderate','reviews.delete',
  'notifications.viewOwn','notifications.send','notifications.manage',
  'cart.manageOwn','addresses.manageOwn',
  'campaigns.view','campaigns.create','campaigns.update','campaigns.delete',
  'banners.view','banners.create','banners.update','banners.delete','banners.reorder',
  'settings.view','settings.update',
  'reports.sales','reports.products','reports.couriers','reports.customers','reports.loyalty',
  'audit.view',
];

async function main(): Promise<void> {
  const roleDescriptions: Record<RoleType, string> = {
    ADMIN: 'Sistem yöneticisi',
    ORDER_OPERATOR: 'Sipariş operasyon kullanıcısı',
    PRODUCT_MANAGER: 'Ürün yöneticisi',
    COURIER: 'Kurye',
    CUSTOMER: 'Müşteri',
  };
  const roles = await Promise.all(
    Object.values(RoleType).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: { description: roleDescriptions[name] },
        create: { name, description: roleDescriptions[name] },
      }),
    ),
  );
  const permissionRows = await Promise.all(permissions.map((code) => prisma.permission.upsert({ where: { code }, update: {}, create: { code } })));
  const permissionByCode = new Map(permissionRows.map((permission) => [permission.code, permission]));
  const rolePermissions: Record<RoleType, string[]> = {
    ADMIN: permissions,
    ORDER_OPERATOR: ['orders.viewAll','orders.updateStatus','orders.assignCourier','orders.cancel','couriers.view','loyalty.scan','loyalty.redeem','reviews.view','notifications.send','reports.sales','banners.view','banners.create','banners.update','banners.delete','banners.reorder'],
    PRODUCT_MANAGER: ['products.view','products.create','products.update','products.manageImages','products.manageOptions','products.manageAllergens','categories.view','categories.create','categories.update','allergens.view','productUnits.view','productUnits.manage','media.upload','media.delete','reports.products','banners.view','banners.create','banners.update','banners.delete','banners.reorder'],
    COURIER: ['deliveries.viewOwn','deliveries.updateOwn','orders.viewOwn','notifications.viewOwn'],
    CUSTOMER: ['products.view','categories.view','cart.manageOwn','orders.create','orders.viewOwn','orders.cancel','payments.initiate','payments.view','addresses.manageOwn','loyalty.viewOwn','reviews.create','reviews.view','notifications.viewOwn'],
  };
  for (const role of roles) {
    for (const code of rolePermissions[role.name]) {
      const permission = permissionByCode.get(code)!;
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
  }

  const users = [
    ['Sistem','Admin','905550000001','admin@pastane.com','Admin123!',RoleType.ADMIN,true],
    ['Sipariş', 'Operatörü', '905550000002', 'operator@pastane.com', 'Operator123!', RoleType.ORDER_OPERATOR, false],
    ['Ürün','Yöneticisi','905550000003','product@pastane.com','Product123!',RoleType.PRODUCT_MANAGER,false],
    ['Kurye','Bir','905550000004','kurye1@pastane.com','Courier123!',RoleType.COURIER,false],
    ['Kurye','İki','905550000005','kurye2@pastane.com','Courier123!',RoleType.COURIER,false],
    ['Demo','Müşteri','905550000010','musteri@pastane.com','Customer123!',RoleType.CUSTOMER,false],
  ] as const;
  for (const [firstName,lastName,phone,email,password,roleName,isPhoneVerified] of users) {
    const role = roles.find((r) => r.name === roleName)!;
    const user = await prisma.user.upsert({
      where: { phone },
      update: { firstName, lastName, email },
      create: {
        firstName,
        lastName,
        phone,
        email,
        passwordHash: await hash(password, 12),
        roleId: role.id,
        status: UserStatus.ACTIVE,
        isPhoneVerified,
      },
    });
    if (roleName === RoleType.COURIER) await prisma.courier.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, status: CourierStatus.ACTIVE } });
  }


  await prisma.loyaltySetting.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: { earnRate: new Prisma.Decimal('0.01'), pointValue: new Prisma.Decimal('1.00'), minimumRedeem: 0, isActive: true },
    create: { id: '00000000-0000-4000-8000-000000000201', earnRate: new Prisma.Decimal('0.01'), pointValue: new Prisma.Decimal('1.00'), minimumRedeem: 0, isActive: true },
  });
  for (const customer of await prisma.user.findMany({ where: { role: { name: RoleType.CUSTOMER } } })) {
    await prisma.loyaltyAccount.upsert({ where: { userId: customer.id }, update: {}, create: { userId: customer.id, qrCode: `LOY-${customer.id.replace(/-/g, '').slice(0, 24).toUpperCase()}` } });
  }
  const settingDefaults = [
    ['otpActive', false], ['deliveryActive', true], ['pickupActive', true], ['loyaltyActive', true], ['paymentActive', true], ['minimumOrderValue', 0],
  ] as const;
  for (const [key, value] of settingDefaults) await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });

  const store = await prisma.store.upsert({ where: { id: '00000000-0000-4000-8000-000000000101' }, update: {}, create: { id: '00000000-0000-4000-8000-000000000101', name: 'Merkez Pastane', phone: '0324 000 00 00', city: 'Mersin', district: 'Yenişehir', address: 'Demo Mahallesi, Demo Caddesi No:1', workingHours: { daily: '08:00-22:00' } } });
  void store;
  const allergenNames = ['Gluten','Süt','Yumurta','Fındık','Fıstık','Ceviz','Susam'];
  const allergenRows = await Promise.all(allergenNames.map((name) => prisma.allergen.upsert({ where: { name }, update: { deletedAt: null }, create: { name } })));
  const unitDefs = [
    ['00000000-0000-4000-8000-000000000301', 'Adet', 'adet', ProductUnitKind.COUNT, 1],
    ['00000000-0000-4000-8000-000000000302', 'Tane', 'tane', ProductUnitKind.COUNT, 2],
    ['00000000-0000-4000-8000-000000000303', 'Gram', 'gr', ProductUnitKind.WEIGHT, 3],
    ['00000000-0000-4000-8000-000000000304', 'Kilogram', 'kg', ProductUnitKind.WEIGHT, 4],
  ] as const;
  const unitMap = new Map<string, { id: string }>();
  for (const [id, name, symbol, kind, sortOrder] of unitDefs) {
    const unit = await prisma.productUnit.upsert({
      where: { id },
      update: { name, symbol, kind, sortOrder, deletedAt: null, isActive: true },
      create: { id, name, symbol, kind, sortOrder, isActive: true },
    });
    unitMap.set(symbol, unit);
  }
  const defaultUnitId = unitMap.get('adet')!.id;
  const now = new Date();
  await prisma.productImage.updateMany({ where: { deletedAt: null }, data: { deletedAt: now, isPrimary: false } });
  await prisma.product.updateMany({ where: { deletedAt: null }, data: { deletedAt: now, status: ProductStatus.INACTIVE, isPublished: false } });
  await prisma.category.updateMany({ where: { deletedAt: null }, data: { deletedAt: now, isActive: false } });

  const categoryDefs = [
    ['Poğaçalar', 'pogacalar', 'Sıcak, yumuşak ve günlük poğaça çeşitleri.', 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=900&q=80'],
    ['Simitler', 'simitler', 'Bol susamlı klasik ve özel simitler.', 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=80'],
    ['Börekler', 'borekler', 'Tepsi ve porsiyon börek seçenekleri.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80'],
    ['Sandviçler', 'sandvicler', 'Taze ekmekle hazırlanan doyurucu sandviçler.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80'],
    ['Kruvasanlar', 'kruvasanlar', 'Tereyağlı, kat kat kruvasan lezzetleri.', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80'],
    ['Ekmekler', 'ekmekler', 'Günlük çıkan somun, ekşi maya ve tahıllı ekmekler.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'],
    ['Dondurmalar', 'dondurmalar', 'Külah, kase ve paket dondurma çeşitleri.', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80'],
    ['Kuru Pastalar', 'kuru-pastalar', 'Tatlı ve tuzlu kuru pasta çeşitleri.', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80'],
    ['Yaş Pastalar', 'yas-pastalar', 'Kutlama ve günlük yaş pasta seçenekleri.', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'],
    ['Tatlılar', 'tatlilar', 'Şerbetli ve sütlü tatlılardan oluşan vitrin.', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'],
  ] as const;
  const categoryMap = new Map<string, {id:string}>();
  for (const [name, slug, description, imageUrl] of categoryDefs) {
    categoryMap.set(name, await prisma.category.upsert({
      where: { slug },
      update: { name, description, imageUrl, parentId: null, deletedAt: null, isActive: true, sortOrder: categoryMap.size },
      create: { name, slug, description, imageUrl, sortOrder: categoryMap.size },
    }));
  }
  // Ürün görsel URL'leri - Unsplash'tan kaliteli görseller
  const productImages: Record<string, string> = {
    'Anne poğaçası.jpg': '1608198093002-ad4e005484ec', // Poğaça
    'Peynirli poğaça.jpg': '1558618666-fcd25c85cd64', // Peynirli poğaça
    'Achma-Pogaca.jpg': '1500462918059-b1a0cb512f1e', // Zeytinli poğaça
    'Simit, salah satu roti khas Turki.jpg': '1586444248902-2f64eddc13df', // Simit
    'Turkish tea and simit.jpg': '1514432324607-a09d9b4aefdd', // Kaşarlı simit
    'İzmir gevreği.jpg': '1558961363-fa8fdf82db84', // Tereyağlı simit
    'Börek mit Käse.jpg': '1626082927389-6cd097cdc6ec', // Peynirli börek
    'Ispanaklı tepsi böreği.jpg': '1623333748855-4f2d8ea1e134', // Ispanaklı börek
    '20170402 Runder Fleischburek, Bielitz-Biala.jpg': '1601050690597-df0568f70950', // Kıymalı börek
    'Turkey sandwich.jpg': '1528735602780-2552fd46c7af', // Hindi füme sandviç
    'Grilled cheese sandwich.jpg': '1529059997568-3d847b1154f0', // Kaşarlı tost
    'Tuna sandwich.jpg': '1519708223044-83f2dd8b38f5', // Ton balıklı sandviç
    'Butter Croissant (54408180656).jpg': '1555507036-ab1f4038808a', // Kruvasan
    'Chocolate croissant Pret a Manger Bankside London England.jpg': '1559305816-c71c07e92182', // Çikolatalı kruvasan
    'A Chocolate Milk and Almond Croissant.jpg': '1586985289947-f3be0ab7a9c1', // Bademli kruvasan
    'White bread.jpg': '1509440159596-0249088772ff', // Beyaz ekmek
    'Sourdough bread.jpg': '1549931319-a545dcf3bc73', // Ekşi maya ekmek
    'Rye bread.jpg': '1608198093002-ad4e005484ec', // Çavdarlı ekmek
    'Vanilla ice cream.jpg': '1563805042-7684c019e1cb', // Vanilyalı dondurma
    'Chocolate ice cream.jpg': '1488477181946-6428a0291777', // Çikolatalı dondurma
    'Pistachio ice cream.jpg': '1570197788417-0e82375c9371', // Antepfıstıklı dondurma
    'Cookies.jpg': '1499636136210-6f4ee915583e', // Tatlı kuru pasta
    'Crackers.jpg': '1558961363-fa8fdf82db84', // Tuzlu kuru pasta
    'Kavala kurabiyesi.jpg': '1555507036-ab1f4038808a', // Kavala kurabiyesi
    'Chocolate cake.jpg': '1578985545062-69928b1d9587', // Çikolatalı pasta
    'Strawberry cake.jpg': '1464349095431-e9b4125c8d18', // Çilekli pasta
    'Swiss roll.jpg': '1563729784474-d4db9f876ad5', // Muzlu rulo pasta
    'Baklava.jpg': '1513236992188-7fc7faa44a2c', // Baklava
    'Fırın sütlaç.jpg': '1542807907-5249b47782a1', // Sütlaç
    'Chocolate-topped profiteroles, September 2006.jpg': '1551024601-bec78aea704b5', // Profiterol
  };

  const getProductImage = (fileName: string): string => {
    const photoId = productImages[fileName];
    return photoId ? `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=80` : '';
  };

  const products = [
    ['Sade Poğaça','sade-pogaca','Poğaçalar','28.00',5,'Klasik yumuşak poğaça.',getProductImage('Anne poğaçası.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Peynirli Poğaça','peynirli-pogaca','Poğaçalar','32.00',5,'Beyaz peynirli günlük poğaça.',getProductImage('Peynirli poğaça.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Zeytinli Poğaça','zeytinli-pogaca','Poğaçalar','34.00',5,'Siyah zeytin ezmeli poğaça.',getProductImage('Achma-Pogaca.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Susamlı Simit','susamli-simit','Simitler','18.00',5,'Bol susamlı çıtır simit.',getProductImage('Simit, salah satu roti khas Turki.jpg'),['Gluten','Susam'],'adet',null],
    ['Kaşarlı Simit','kasarli-simit','Simitler','38.00',8,'Eritilmiş kaşarlı sıcak simit.',getProductImage('Turkish tea and simit.jpg'),['Gluten','Süt','Susam'],'adet',null],
    ['Tereyağlı Simit','tereyagli-simit','Simitler','30.00',5,'Tereyağ aromalı gevrek simit.',getProductImage('İzmir gevreği.jpg'),['Gluten','Süt','Susam'],'adet',null],
    ['Peynirli Börek','peynirli-borek','Börekler','55.00',10,'İnce yufkadan peynirli börek.',getProductImage('Börek mit Käse.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Ispanaklı Börek','ispanakli-borek','Börekler','58.00',10,'Ispanaklı ve baharatlı börek.',getProductImage('Ispanaklı tepsi böreği.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Kıymalı Börek','kiymali-borek','Börekler','68.00',12,'Kıymalı sıcak tepsi böreği.',getProductImage('20170402 Runder Fleischburek, Bielitz-Biala.jpg'),['Gluten','Yumurta'],'adet',null],
    ['Hindi Füme Sandviç','hindi-fume-sandvic','Sandviçler','95.00',8,'Hindi füme ve mevsim yeşillikleri.',getProductImage('Turkey sandwich.jpg'),['Gluten','Süt'],'adet',null],
    ['Kaşarlı Tost Sandviç','kasarli-tost-sandvic','Sandviçler','75.00',8,'Kaşar peynirli sıcak sandviç.',getProductImage('Grilled cheese sandwich.jpg'),['Gluten','Süt'],'adet',null],
    ['Ton Balıklı Sandviç','ton-balikli-sandvic','Sandviçler','110.00',8,'Ton balığı, turşu ve yeşillik.',getProductImage('Tuna sandwich.jpg'),['Gluten','Yumurta'],'adet',null],
    ['Tereyağlı Kruvasan','tereyagli-kruvasan','Kruvasanlar','60.00',8,'Klasik Fransız kruvasanı.',getProductImage('Butter Croissant (54408180656).jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Çikolatalı Kruvasan','cikolatali-kruvasan','Kruvasanlar','72.00',8,'Belçika çikolatalı kruvasan.',getProductImage('Chocolate croissant Pret a Manger Bankside London England.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Bademli Kruvasan','bademli-kruvasan','Kruvasanlar','78.00',8,'Badem kremalı çıtır kruvasan.',getProductImage('A Chocolate Milk and Almond Croissant.jpg'),['Gluten','Süt','Yumurta','Fındık'],'adet',null],
    ['Beyaz Ekmek','beyaz-ekmek','Ekmekler','18.00',5,'Günlük klasik somun ekmek.',getProductImage('White bread.jpg'),['Gluten'],'adet',null],
    ['Ekşi Maya Ekmek','eksi-maya-ekmek','Ekmekler','70.00',5,'Uzun fermantasyonlu ekşi maya.',getProductImage('Sourdough bread.jpg'),['Gluten'],'adet',null],
    ['Çavdarlı Ekmek','cavdarli-ekmek','Ekmekler','48.00',5,'Çavdar unlu tok dokulu ekmek.',getProductImage('Rye bread.jpg'),['Gluten'],'adet',null],
    ['Vanilyalı Dondurma','vanilyali-dondurma','Dondurmalar','65.00',3,'Madagaskar vanilyalı dondurma.',getProductImage('Vanilla ice cream.jpg'),['Süt'],'gr',250],
    ['Çikolatalı Dondurma','cikolatali-dondurma','Dondurmalar','68.00',3,'Yoğun kakaolu dondurma.',getProductImage('Chocolate ice cream.jpg'),['Süt'],'gr',250],
    ['Antep Fıstıklı Dondurma','antep-fistikli-dondurma','Dondurmalar','78.00',3,'Fıstıklı kaymak dondurma.',getProductImage('Pistachio ice cream.jpg'),['Süt','Fıstık'],'gr',250],
    ['Tatlı Kuru Pasta','tatli-kuru-pasta','Kuru Pastalar','140.00',5,'Karışık tatlı kuru pasta.',getProductImage('Cookies.jpg'),['Gluten','Süt','Yumurta'],'gr',500],
    ['Tuzlu Kuru Pasta','tuzlu-kuru-pasta','Kuru Pastalar','130.00',5,'Susamlı ve çörek otlu tuzlu kuru pasta.',getProductImage('Crackers.jpg'),['Gluten','Süt','Susam'],'gr',500],
    ['Kavala Kurabiyesi','kavala-kurabiyesi','Kuru Pastalar','155.00',5,'Bademli pudra şekerli kurabiye.',getProductImage('Kavala kurabiyesi.jpg'),['Gluten','Süt','Fındık'],'gr',500],
    ['Çikolatalı Yaş Pasta','cikolatali-yas-pasta','Yaş Pastalar','720.00',45,'Çikolatalı krema ve pandispanya.',getProductImage('Chocolate cake.jpg'),['Gluten','Süt','Yumurta','Fındık'],'kg',1],
    ['Çilekli Yaş Pasta','cilekli-yas-pasta','Yaş Pastalar','760.00',45,'Taze çilekli krema pasta.',getProductImage('Strawberry cake.jpg'),['Gluten','Süt','Yumurta'],'kg',1],
    ['Muzlu Rulo Pasta','muzlu-rulo-pasta','Yaş Pastalar','520.00',35,'Muzlu rulo yaş pasta.',getProductImage('Swiss roll.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
    ['Baklava','baklava','Tatlılar','180.00',5,'Fıstıklı şerbetli baklava.',getProductImage('Baklava.jpg'),['Gluten','Süt','Fıstık'],'gr',500],
    ['Sütlaç','sutlac','Tatlılar','90.00',5,'Fırınlanmış sütlaç.',getProductImage('Fırın sütlaç.jpg'),['Süt'],'gr',500],
    ['Profiterol','profiterol','Tatlılar','125.00',5,'Çikolata soslu profiterol.',getProductImage('Chocolate-topped profiteroles, September 2006.jpg'),['Gluten','Süt','Yumurta'],'adet',null],
  ] as const;
  const productMap = new Map<string,{id:string}>();
  for (const [name,slug,category,price,preparationMinutes,shortDescription,imageUrl,allergens,unitSymbol,unitQuantity] of products) {
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        categoryId: categoryMap.get(category)!.id,
        shortDescription,
        description: shortDescription,
        price: new Prisma.Decimal(price),
        discountedPrice: null,
        preparationMinutes,
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        isPublished: true,
        saleWindowStart: null,
        saleWindowEnd: null,
        unitId: unitMap.get(unitSymbol)?.id ?? defaultUnitId,
        unitQuantity: unitQuantity == null ? null : new Prisma.Decimal(unitQuantity),
      },
      create: {
        name,
        slug,
        categoryId: categoryMap.get(category)!.id,
        shortDescription,
        description: shortDescription,
        price: new Prisma.Decimal(price),
        preparationMinutes,
        isPublished: true,
        unitId: unitMap.get(unitSymbol)?.id ?? defaultUnitId,
        unitQuantity: unitQuantity == null ? null : new Prisma.Decimal(unitQuantity),
      },
    });
    productMap.set(name, product);
    await prisma.productAllergen.deleteMany({ where: { productId: product.id } });
    for (const allergenName of allergens) {
      const allergen = allergenRows.find((a) => a.name === allergenName)!;
      await prisma.productAllergen.create({ data: { productId: product.id, allergenId: allergen.id } });
    }
    await prisma.productImage.updateMany({ where: { productId: product.id }, data: { deletedAt: now, isPrimary: false } });
    await prisma.productImage.create({ data: { productId: product.id, url: imageUrl, altText: name, sortOrder: 0, isPrimary: true } });
  }
  const cake = productMap.get('Çikolatalı Yaş Pasta')!;
  const groups = [
    ['Kişi Sayısı', true, false, ['4-6 kişilik','8-10 kişilik','12-15 kişilik']],
    ['Aroma', true, false, ['Çikolatalı','Çilekli','Muzlu']],
    ['Ekstra', false, true, ['Mum','Yazı']],
  ] as const;
  for (const [name, isRequired, isMultiple, options] of groups) {
    let group = await prisma.productOptionGroup.findFirst({ where: { productId: cake.id, name } });
    group = group
      ? await prisma.productOptionGroup.update({ where: { id: group.id }, data: { deletedAt: null, isRequired, isMultiple } })
      : await prisma.productOptionGroup.create({ data: { productId: cake.id, name, isRequired, isMultiple } });
    for (const optionName of options) {
      const existing = await prisma.productOption.findFirst({ where: { optionGroupId: group.id, name: optionName } });
      if (!existing) await prisma.productOption.create({ data: { optionGroupId: group.id, name: optionName } });
    }
  }
  const zones = [['Yenişehir','150.00','30.00',30],['Mezitli','200.00','40.00',40],['Akdeniz','200.00','45.00',45]] as const;
  for (const [name,minimumOrderPrice,deliveryFee,estimatedMinutes] of zones) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name } });
    if (existing) await prisma.deliveryZone.update({ where: { id: existing.id }, data: { deletedAt: null, isActive: true, minimumOrderPrice: new Prisma.Decimal(minimumOrderPrice), deliveryFee: new Prisma.Decimal(deliveryFee), estimatedMinutes } });
    else await prisma.deliveryZone.create({ data: { name, minimumOrderPrice: new Prisma.Decimal(minimumOrderPrice), deliveryFee: new Prisma.Decimal(deliveryFee), estimatedMinutes } });
  }

  /** Drop orphan root categories whose names look mojibake-corrupted (empty + common bad bytes). */
  const badCategories = await prisma.category.findMany({
    where: {
      parentId: null,
      products: { none: {} },
      OR: [
        { name: { contains: 'Ã' } },
        { name: { contains: 'Å' } },
        { name: { contains: 'Ý' } },
        { name: { contains: 'ý' } },
        { name: { contains: 'ð' } },
        { name: { contains: '\uFFFD' } },
      ],
    },
    select: { id: true },
  });
  if (badCategories.length > 0) {
    await prisma.category.deleteMany({ where: { id: { in: badCategories.map((c) => c.id) } } });
  }
}
main().finally(async()=>prisma.$disconnect());
