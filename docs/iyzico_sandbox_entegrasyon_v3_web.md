# İyzico Sandbox Entegrasyon Rehberi v3
### Pastane & Fırın Platformu — NestJS + Next.js (Web)

> **Kapsam:** Bu rehber yalnızca web ortamını (NestJS backend + Next.js frontend) kapsar.
> Mobil (Flutter) entegrasyonu bu dokümanda yer almamaktadır.

---

## 📋 Proje Bilgileri

| Alan | Değer |
|---|---|
| Ödeme Sayfası | `http://localhost:3000/odeme` |
| Backend | NestJS + TypeScript + Prisma + PostgreSQL + Redis |
| Frontend | Next.js (App Router) + Tailwind CSS + Shadcn/UI |
| Backend Port | `3001` |
| Frontend Port | `3000` |
| Deployment | Docker + Docker Compose |

---

## 🔑 İyzico Sandbox Kimlik Bilgileri

> ⚠️ **GÜVENLİK UYARISI:** Bu bilgileri `.env` dosyasına koy, asla Git'e commit etme.
> `.gitignore` dosyanda `.env` satırı mutlaka bulunmalıdır.
> Takım arkadaşları için `.env.example` şablonu oluştur (değerler boş bırakılır).

| Alan | Değer |
|---|---|
| API Key | `sandbox-tUlcRmrApgH3Hmodsu1gzX92BJsiETJ9` |
| Secret Key | `sandbox-4XaoiXcWSgbIPV8RZcndqSAbfkQY20jd` |
| Üye İşyeri No | `3427278` |
| Sandbox API URL | `https://sandbox-api.iyzipay.com` |
| Sandbox Panel | `https://sandbox-merchant.iyzipay.com` |

---

## 🏗️ Entegrasyon Mimarisi

```
Müşteri (Next.js — /odeme sayfası)
        │
        │ 1. Sipariş bilgisi gönder (kart bilgisi GÖNDERİLMEZ)
        ▼
NestJS Backend  →  POST /payment/initialize
        │
        │ 2. iyzico Checkout Form başlat
        ▼
iyzico Sandbox API
        │
        │ 3. checkoutFormContent (HTML iframe) + token döndür
        ▼
NestJS → Next.js'e token ve HTML döner
        │
        │ 4. iyzico HTML formunu sayfadaki div'e göm (dangerouslySetInnerHTML)
        ▼
Müşteri iyzico güvenli formunu görür ve ödemeyi tamamlar
        │
        │ 5. iyzico callbackUrl'e POST atar (token ile)
        ▼
NestJS Backend  →  POST /payment/callback
        │
        │ 6. Token ile ödeme sonucunu iyzico'dan doğrula
        │ 7. Payment kaydını güncelle (SUCCESS / FAILURE)
        │ 8. Order tablosunu güncelle
        ▼
Next.js'e yönlendirme  →  /odeme/sonuc?status=success veya ?status=failure
```

---

## 🤖 Vibe Coding — AI Agent Prompt

Aşağıdaki prompt'u **olduğu gibi** Cursor / Windsurf / Claude Code'a yapıştır.
Hiçbir satırı değiştirme; tüm adımlar sırayla ve eksiksiz uygulanacak.

---

```
Sen bir NestJS + Next.js uzmanısın. Benim projem için iyzico Checkout Form
entegrasyonu yapacaksın. Aşağıdaki tüm bilgileri dikkatlice oku ve
adım adım uygula. Hiçbir adımı atlamadan, eksiksiz implement et.
Bu entegrasyon SADECE web (NestJS + Next.js) için geçerlidir.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJE STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Backend  : NestJS + TypeScript
- ORM      : Prisma
- Veritabanı: PostgreSQL
- Cache    : Redis
- Frontend : Next.js 14+ (App Router)
- UI       : Tailwind CSS + Shadcn/UI
- Ödeme    : iyzico Checkout Form
- Deployment: Docker + Docker Compose

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORTAM DEĞİŞKENLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── backend/.env ──────────────────────────
IYZICO_API_KEY=sandbox-tUlcRmrApgH3Hmodsu1gzX92BJsiETJ9
IYZICO_SECRET_KEY=sandbox-4XaoiXcWSgbIPV8RZcndqSAbfkQY20jd
IYZICO_MERCHANT_ID=3427278
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/pastane
REDIS_URL=redis://localhost:6379

── backend/.env.example ──────────────────
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_MERCHANT_ID=
IYZICO_BASE_URL=
FRONTEND_URL=
NEXT_PUBLIC_API_URL=
DATABASE_URL=
REDIS_URL=

── frontend/.env.local ───────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEVCUT ÖDEME SAYFASI (/odeme) — YAPILACAK DEĞİŞİKLİKLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sayfada şu anda şunlar var:
- Teslimat tipi radio: "Adrese teslim" / "Mağazadan teslim"
- Kayıtlı adres dropdown
- Sipariş notu textarea
- Kart sahibi adı input
- Kart numarası input (16 hane validasyonu)
- Ay / Yıl / CVC inputları
- "Siparişi oluştur ve ödemeyi başlat" butonu
- Sağda "Kesin toplam" kartı (sunucudan alınıyor)

YAPILACAK DEĞİŞİKLİKLER:
1. Kart sahibi adı, kart numarası, ay, yıl, CVC inputlarını KALDIR.
2. Onların yerine şu div'i koy:
   <div id="iyzipay-checkout-form" class="responsive"></div>
3. Buton tıklandığında backend'e istek at, dönen HTML'i bu div'e göm.
4. iyzico script'ini dinamik olarak sayfaya ekle (useEffect ile).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 1: BACKEND — CONFIG MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kurulum:
  npm install @nestjs/config

app.module.ts:

  import { ConfigModule } from '@nestjs/config';

  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      // ... diğer modüller
    ],
  })
  export class AppModule {}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 2: BACKEND — PAKET KURULUMU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend klasöründe çalıştır:

  npm install iyzipay uuid
  npm install --save-dev @types/uuid

NOT: iyzipay için @types/iyzipay paketi güncel değil.
payment.service.ts içinde şu şekilde kullan:
  import * as Iyzipay from 'iyzipay';
  private iyzipay: any;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 3: BACKEND — main.ts CORS + GLOBAL PREFIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { ValidationPipe } from '@nestjs/common';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    app.enableCors({
      origin: ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    await app.listen(3001);
  }
  bootstrap();

NOT: iyzico callback'i server-to-server POST attığı için
CORS origin listesine iyzipay.com eklenmez — bu bir backend
endpoint'idir, tarayıcıdan değil iyzico sunucularından gelir.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 4: BACKEND — PRISMA ŞEMASI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
schema.prisma'ya şu modeli ekle:

  model Payment {
    id              String        @id @default(cuid())
    orderId         String        @unique
    iyzicoToken     String?
    conversationId  String        @unique
    status          PaymentStatus @default(PENDING)
    paidPrice       Decimal?      @db.Decimal(10, 2)
    currency        String        @default("TRY")
    paymentId       String?
    errorCode       String?
    errorMessage    String?
    rawResponse     Json?
    createdAt       DateTime      @default(now())
    updatedAt       DateTime      @updatedAt
    order           Order         @relation(fields: [orderId], references: [id])
  }

  enum PaymentStatus {
    PENDING
    SUCCESS
    FAILURE
  }

Prisma migration çalıştır:
  npx prisma migrate dev --name add_payment_table

Order modeline relation ekle:
  payment Payment?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 5: BACKEND — PAYMENT MODULE OLUŞTUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NestJS CLI ile modül oluştur:

  nest generate module payment
  nest generate controller payment
  nest generate service payment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 6: BACKEND — DTO TANIMLARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: src/payment/dto/initialize-payment.dto.ts

  import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional } from 'class-validator';

  export class BuyerDto {
    @IsString() @IsNotEmpty() id: string;
    @IsString() @IsNotEmpty() name: string;
    @IsString() @IsNotEmpty() surname: string;
    @IsEmail() email: string;
    @IsString() @IsNotEmpty() gsmNumber: string;
    @IsString() @IsNotEmpty() identityNumber: string;
    @IsString() @IsNotEmpty() registrationAddress: string;
    @IsString() @IsNotEmpty() city: string;
    @IsString() @IsNotEmpty() country: string;
    @IsOptional() @IsString() ip?: string;
  }

  export class AddressDto {
    @IsString() @IsNotEmpty() contactName: string;
    @IsString() @IsNotEmpty() city: string;
    @IsString() @IsNotEmpty() country: string;
    @IsString() @IsNotEmpty() address: string;
  }

  export class BasketItemDto {
    @IsString() @IsNotEmpty() id: string;
    @IsString() @IsNotEmpty() name: string;
    @IsString() @IsNotEmpty() category1: string;
    @IsString() @IsNotEmpty() itemType: string; // PHYSICAL veya VIRTUAL
    @IsNumber() price: number;
  }

  export class InitializePaymentDto {
    @IsString() @IsNotEmpty() orderId: string;
    @IsNumber() price: number;
    @IsNumber() paidPrice: number;
    buyer: BuyerDto;
    shippingAddress: AddressDto;
    billingAddress: AddressDto;
    basketItems: BasketItemDto[];
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 7: BACKEND — PAYMENT SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: src/payment/payment.service.ts

  import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { PrismaService } from '../prisma/prisma.service';
  import { InitializePaymentDto } from './dto/initialize-payment.dto';
  import { v4 as uuidv4 } from 'uuid';
  import * as Iyzipay from 'iyzipay';

  @Injectable()
  export class PaymentService {
    private iyzipay: any;

    constructor(
      private configService: ConfigService,
      private prisma: PrismaService,
    ) {
      this.iyzipay = new Iyzipay({
        apiKey: this.configService.get<string>('IYZICO_API_KEY'),
        secretKey: this.configService.get<string>('IYZICO_SECRET_KEY'),
        uri: this.configService.get<string>('IYZICO_BASE_URL'),
      });
    }

    async initializeCheckoutForm(dto: InitializePaymentDto, clientIp: string) {
      const conversationId = uuidv4();
      const callbackUrl = `${this.configService.get('FRONTEND_URL')}/api/payment/callback`;

      const request = {
        locale: 'tr',
        conversationId,
        price: dto.price.toFixed(2),
        paidPrice: dto.paidPrice.toFixed(2),
        currency: 'TRY',
        basketId: dto.orderId,
        paymentGroup: 'PRODUCT',
        callbackUrl,
        enabledInstallments: [1, 2, 3, 6, 9],
        buyer: {
          ...dto.buyer,
          ip: dto.buyer.ip || clientIp || '85.34.78.112',
          lastLoginDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          registrationDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        },
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        basketItems: dto.basketItems.map(item => ({
          ...item,
          price: item.price.toFixed(2),
        })),
      };

      return new Promise<{ token: string; checkoutFormContent: string }>((resolve, reject) => {
        this.iyzipay.checkoutFormInitialize.create(request, async (err: any, result: any) => {
          if (err) {
            reject(new InternalServerErrorException('iyzico bağlantı hatası'));
            return;
          }

          if (result.status !== 'success') {
            reject(new BadRequestException(result.errorMessage || 'Ödeme başlatılamadı'));
            return;
          }

          // Payment kaydını veritabanına yaz
          await this.prisma.payment.create({
            data: {
              orderId: dto.orderId,
              iyzicoToken: result.token,
              conversationId,
              status: 'PENDING',
            },
          });

          resolve({
            token: result.token,
            checkoutFormContent: result.checkoutFormContent,
          });
        });
      });
    }

    async handleCallback(token: string) {
      if (!token) {
        throw new BadRequestException('Token bulunamadı');
      }

      const request = { locale: 'tr', token };

      return new Promise<{ success: boolean; orderId?: string; errorMessage?: string }>(
        (resolve, reject) => {
          this.iyzipay.checkoutForm.retrieve(request, async (err: any, result: any) => {
            if (err) {
              reject(new InternalServerErrorException('iyzico doğrulama hatası'));
              return;
            }

            const payment = await this.prisma.payment.findFirst({
              where: { iyzicoToken: token },
            });

            if (!payment) {
              reject(new BadRequestException('Ödeme kaydı bulunamadı'));
              return;
            }

            const isSuccess =
              result.status === 'success' && result.paymentStatus === 'SUCCESS';

            // Payment tablosunu güncelle
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: isSuccess ? 'SUCCESS' : 'FAILURE',
                paymentId: result.paymentId,
                paidPrice: isSuccess ? parseFloat(result.paidPrice) : null,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage,
                rawResponse: result,
              },
            });

            // Order tablosunu güncelle
            await this.prisma.order.update({
              where: { id: payment.orderId },
              data: {
                status: isSuccess ? 'PAID' : 'PAYMENT_FAILED',
              },
            });

            resolve({
              success: isSuccess,
              orderId: payment.orderId,
              errorMessage: isSuccess ? undefined : result.errorMessage,
            });
          });
        },
      );
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 8: BACKEND — PAYMENT CONTROLLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: src/payment/payment.controller.ts

  import {
    Controller, Post, Body, Req, Res, HttpCode,
    BadRequestException,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  import { PaymentService } from './payment.service';
  import { InitializePaymentDto } from './dto/initialize-payment.dto';

  @Controller('payment')
  export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    // Frontend bu endpoint'i çağırır
    @Post('initialize')
    @HttpCode(200)
    async initialize(@Body() dto: InitializePaymentDto, @Req() req: Request) {
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '85.34.78.112';

      return this.paymentService.initializeCheckoutForm(dto, clientIp);
    }

    // iyzico bu endpoint'e POST atar (server-to-server)
    @Post('callback')
    @HttpCode(200)
    async callback(@Body() body: { token: string }, @Res() res: Response) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      try {
        const result = await this.paymentService.handleCallback(body.token);

        if (result.success) {
          return res.redirect(`${frontendUrl}/odeme/sonuc?status=success&orderId=${result.orderId}`);
        } else {
          return res.redirect(`${frontendUrl}/odeme/sonuc?status=failure&message=${encodeURIComponent(result.errorMessage || 'Ödeme başarısız')}`);
        }
      } catch (error) {
        return res.redirect(`${frontendUrl}/odeme/sonuc?status=failure&message=Bir%20hata%20oluştu`);
      }
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 9: BACKEND — PAYMENT MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: src/payment/payment.module.ts

  import { Module } from '@nestjs/common';
  import { PaymentController } from './payment.controller';
  import { PaymentService } from './payment.service';
  import { PrismaModule } from '../prisma/prisma.module';

  @Module({
    imports: [PrismaModule],
    controllers: [PaymentController],
    providers: [PaymentService],
  })
  export class PaymentModule {}

app.module.ts'e ekle:
  imports: [..., PaymentModule]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 10: FRONTEND — /odeme SAYFASI GÜNCELLEMESİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: app/odeme/page.tsx (mevcut sayfayı güncelle)

  'use client';

  import { useState, useEffect, useRef } from 'react';
  import { useRouter } from 'next/navigation';

  export default function OdemePage() {
    const [loading, setLoading] = useState(false);
    const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const checkoutRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // iyzico HTML enjekte edildiğinde script'leri çalıştır
    useEffect(() => {
      if (!checkoutHtml || !checkoutRef.current) return;

      checkoutRef.current.innerHTML = checkoutHtml;

      // iyzico'nun form script'lerini çalıştır
      const scripts = checkoutRef.current.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value),
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }, [checkoutHtml]);

    const handleSubmit = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payment/initialize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: 'siparis-id-buraya',       // gerçek orderId'yi bağla
              price: 150.00,                       // sepet tutarını bağla
              paidPrice: 150.00,
              buyer: {
                id: 'kullanici-id',
                name: 'Ad',
                surname: 'Soyad',
                email: 'musteri@ornek.com',
                gsmNumber: '+905551234567',
                identityNumber: '11111111111',
                registrationAddress: 'Adres',
                city: 'Adana',
                country: 'Turkey',
              },
              shippingAddress: {
                contactName: 'Ad Soyad',
                city: 'Adana',
                country: 'Turkey',
                address: 'Teslimat adresi',
              },
              billingAddress: {
                contactName: 'Ad Soyad',
                city: 'Adana',
                country: 'Turkey',
                address: 'Fatura adresi',
              },
              basketItems: [
                {
                  id: 'urun-001',
                  name: 'Ürün Adı',
                  category1: 'Pastane',
                  itemType: 'PHYSICAL',
                  price: 150.00,
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Ödeme başlatılamadı');
        }

        const data = await response.json();
        setCheckoutHtml(data.checkoutFormContent);
      } catch (err: any) {
        setError(err.message || 'Beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Ödeme</h1>

        {/* Teslimat, adres, sipariş notu alanları — mevcut kodun değişmediği kısım */}
        {/* ... */}

        {/* iyzico formu burada gösterilecek */}
        {!checkoutHtml ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Yükleniyor...' : 'Siparişi Oluştur ve Ödemeyi Başlat'}
          </button>
        ) : (
          <div
            ref={checkoutRef}
            id="iyzipay-checkout-form"
            className="responsive mt-4"
          />
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            ⚠️ {error}
          </p>
        )}
      </div>
    );
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 11: FRONTEND — ÖDEME SONUÇ SAYFASI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: app/odeme/sonuc/page.tsx  (YENİ DOSYA OLUŞTUR)

  'use client';

  import { useSearchParams } from 'next/navigation';
  import Link from 'next/link';
  import { Suspense } from 'react';

  function SonucIcerik() {
    const params = useSearchParams();
    const status = params.get('status');
    const orderId = params.get('orderId');
    const message = params.get('message');
    const isSuccess = status === 'success';

    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 rounded-2xl shadow-lg">
        <div className={`text-6xl mb-4 ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
          {isSuccess ? '✅' : '❌'}
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isSuccess ? 'Ödeme Başarılı!' : 'Ödeme Başarısız'}
        </h1>
        {isSuccess && orderId && (
          <p className="text-gray-600 mb-4">Sipariş No: <strong>{orderId}</strong></p>
        )}
        {!isSuccess && message && (
          <p className="text-red-500 mb-4 text-sm">{decodeURIComponent(message)}</p>
        )}
        <Link
          href={isSuccess ? `/siparislerim` : `/odeme`}
          className="inline-block mt-4 bg-primary text-white px-6 py-2 rounded-lg"
        >
          {isSuccess ? 'Siparişlerimi Gör' : 'Tekrar Dene'}
        </Link>
      </div>
    );
  }

  export default function OdemeSonucPage() {
    return (
      <Suspense fallback={<div className="text-center mt-20">Yükleniyor...</div>}>
        <SonucIcerik />
      </Suspense>
    );
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 12: SANDBOX TEST KART BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
iyzico sandbox ortamında test için şu kartı kullan:

  Kart No    : 5528790000000008
  Son Kullanma: 12/30
  CVC        : 123
  Kart Sahibi: Test User

3D Secure gerektiren test için:
  Kart No    : 4766620000000001
  Son Kullanma: 12/30
  CVC        : 123
  OTP Kodu   : 123456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADIM 13: DOCKER — ORTAM KONTROLÜ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
docker-compose.yml içinde backend servisine şu env
değerlerinin environment bölümünde tanımlı olduğundan emin ol:

  backend:
    environment:
      - IYZICO_API_KEY=${IYZICO_API_KEY}
      - IYZICO_SECRET_KEY=${IYZICO_SECRET_KEY}
      - IYZICO_MERCHANT_ID=${IYZICO_MERCHANT_ID}
      - IYZICO_BASE_URL=${IYZICO_BASE_URL}
      - FRONTEND_URL=${FRONTEND_URL}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KONTROL LİSTESİ — HER ADIMDAN SONRA DOĞRULA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] .env dosyası oluşturuldu, .gitignore'a eklendi
[ ] npm paketleri kuruldu (iyzipay, uuid, @nestjs/config)
[ ] Prisma Payment modeli eklendi ve migrate çalıştırıldı
[ ] PaymentModule, AppModule'e import edildi
[ ] main.ts'te CORS ve globalPrefix ayarlandı
[ ] POST /api/payment/initialize → 200 dönüyor
[ ] iyzico formu /odeme sayfasında görünüyor
[ ] Sandbox kart ile test ödemesi tamamlanıyor
[ ] Callback sonrası /odeme/sonuc?status=success yönlendirmesi çalışıyor
[ ] Payment tablosunda status SUCCESS olarak güncellendi
[ ] Order tablosunda status PAID olarak güncellendi
```

---

## ⚠️ Sık Yapılan Hatalar

| Hata | Sebebi | Çözüm |
|---|---|---|
| `conversationId already used` | Aynı UUID iki kez kullanıldı | Her istekte `uuidv4()` ile yeni ID üret |
| `paidPrice must be equal to price` | Toplam fiyat uyuşmazlığı | basketItems price toplamı == paidPrice olmalı |
| Form görünmüyor | `dangerouslySetInnerHTML` yerine `innerHTML` + script yeniden oluşturma | Adım 10'daki `useEffect` ile script'leri yeniden çalıştır |
| Callback 404 | `/api` prefix eksik | controller `@Controller('payment')` + global prefix `api` → `/api/payment/callback` |
| iyzico CORS hatası | Callback server-to-server'dır | CORS origin listesine iyzipay.com ekleme; tarayıcıdan gelmiyor |
| `identityNumber` hatası | TC kimlik no `11111111111` kabul edilir sandbox'ta | Test için `11111111111` kullan |

---

## 📁 Oluşturulacak / Değiştirilecek Dosyalar (Özet)

```
backend/
├── src/
│   ├── app.module.ts              ← PaymentModule import ekle
│   ├── main.ts                    ← CORS + globalPrefix
│   └── payment/
│       ├── payment.module.ts      ← YENİ
│       ├── payment.controller.ts  ← YENİ
│       ├── payment.service.ts     ← YENİ
│       └── dto/
│           └── initialize-payment.dto.ts  ← YENİ
├── prisma/
│   └── schema.prisma              ← Payment modeli ekle
├── .env                           ← Güncelle (git'e commit etme!)
└── .env.example                   ← YENİ (git'e commit et)

frontend/
├── app/
│   ├── odeme/
│   │   ├── page.tsx               ← Kart inputları kaldır, iyzico formu ekle
│   │   └── sonuc/
│   │       └── page.tsx           ← YENİ
└── .env.local                     ← Güncelle
```
