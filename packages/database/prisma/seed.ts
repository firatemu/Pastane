import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { PrismaClient, RoleType, UserStatus, CourierStatus, ProductStatus, Prisma } from '@prisma/client';
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
  const raw = process.env.DATABASE_URL;
  if (!raw) return;
  try {
    const u = new URL(raw);
    if (u.hostname === 'postgres') {
      u.hostname = '127.0.0.1';
      process.env.DATABASE_URL = u.toString();
    }
  } catch {
    /* keep original */
  }
}
rewriteDatabaseUrlForHostSeed();

const prisma = new PrismaClient();
function istanbulSeedDay(value: Date): Date {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
  return new Date(`${localDate}T00:00:00.000+03:00`);
}
const permissions = [
  'users.view','users.create','users.update','users.delete','users.changeStatus',
  'roles.view','roles.create','roles.update','roles.delete','permissions.view','permissions.manage',
  'products.view','products.create','products.update','products.delete','products.manageImages','products.manageOptions','products.manageAllergens',
  'categories.view','categories.create','categories.update','categories.delete',
  'allergens.view','media.upload','media.delete',
  'stock.view','stock.create','stock.update','stock.adjust','stock.viewMovements',
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
    PRODUCT_MANAGER: 'Ürün ve stok yöneticisi',
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
    ORDER_OPERATOR: ['orders.viewAll','orders.updateStatus','orders.assignCourier','orders.cancel','couriers.view','stock.view','loyalty.scan','loyalty.redeem','reviews.view','notifications.send','reports.sales','banners.view','banners.create','banners.update','banners.delete','banners.reorder'],
    PRODUCT_MANAGER: ['products.view','products.create','products.update','products.manageImages','products.manageOptions','products.manageAllergens','categories.view','categories.create','categories.update','stock.view','stock.create','stock.update','stock.adjust','stock.viewMovements','allergens.view','media.upload','media.delete','reports.products','banners.view','banners.create','banners.update','banners.delete','banners.reorder'],
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
  const categoryDefs = [
    ['Pastalar', null], ['Yaş Pastalar', null], ['Kuru Pastalar', null], ['Ekmekler', null], ['Simit & Poğaça', null], ['Tatlılar', null], ['İçecekler', null],
  ] as const;
  const categoryMap = new Map<string, {id:string}>();
  for (const [name] of categoryDefs) {
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    categoryMap.set(name, await prisma.category.upsert({ where: { slug }, update: { name, deletedAt: null, isActive: true }, create: { name, slug } }));
  }
  const products = [
    ['Çikolatalı Yaş Pasta','yas-pasta','Yaş Pastalar','650.00',60,['Gluten','Süt','Yumurta','Fındık']],
    ['Susamlı Simit','susamli-simit','Simit & Poğaça','15.00',5,['Gluten','Susam']],
    ['Peynirli Poğaça','peynirli-pogaca','Simit & Poğaça','25.00',5,['Gluten','Süt','Yumurta']],
    ['Beyaz Ekmek','beyaz-ekmek','Ekmekler','12.50',5,['Gluten']],
    ['Sütlaç','sutlac','Tatlılar','80.00',10,['Süt']],
  ] as const;
  const productMap = new Map<string,{id:string}>();
  for (const [name,slug,category,price,preparationMinutes,allergens] of products) {
    const product = await prisma.product.upsert({ where: { slug }, update: { name, deletedAt: null, status: ProductStatus.ACTIVE }, create: { name, slug, categoryId: categoryMap.get(category)!.id, price: new Prisma.Decimal(price), preparationMinutes } });
    productMap.set(name, product);
    for (const allergenName of allergens) {
      const allergen = allergenRows.find((a) => a.name === allergenName)!;
      await prisma.productAllergen.upsert({ where: { productId_allergenId: { productId: product.id, allergenId: allergen.id } }, update: {}, create: { productId: product.id, allergenId: allergen.id } });
    }
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
  const day = istanbulSeedDay(new Date());
  /** Full-day windows (null/null → 00:00–24:00 Europe/Istanbul) so demo checkout works at any local time; narrow windows caused "Stok penceresi aktif değil" after seed hours. */
  const stockedDemoProductNames = ['Susamlı Simit', 'Peynirli Poğaça', 'Beyaz Ekmek', 'Çikolatalı Yaş Pasta', 'Sütlaç'] as const;
  const stockedDemoProductIds = stockedDemoProductNames.map((n) => productMap.get(n)!.id);
  await prisma.stockEntry.deleteMany({ where: { productId: { in: stockedDemoProductIds }, date: day } });
  const stocks = [
    ['Susamlı Simit', null, null, 180],
    ['Peynirli Poğaça', null, null, 100],
    ['Beyaz Ekmek', null, null, 270],
    ['Çikolatalı Yaş Pasta', null, null, 10],
    ['Sütlaç', null, null, 30],
  ] as const;
  for (const [productName, availableFrom, availableTo, quantity] of stocks) {
    const productId = productMap.get(productName)!.id;
    await prisma.stockEntry.create({ data: { productId, date: day, availableFrom, availableTo, quantity } });
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
