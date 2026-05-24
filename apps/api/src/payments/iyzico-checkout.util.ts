import type { Order, Prisma } from '@prisma/client';
import { money } from '../common/utils/money.util';
import { formatIyzicoMoney, sanitizeIyzicoText } from './iyzico-text.util';

export type IyzicoCheckoutBuyer = {
  id: string;
  name: string;
  surname: string;
  gsmNumber: string;
  email: string;
  identityNumber: string;
  lastLoginDate: string;
  registrationDate: string;
  registrationAddress: string;
  city: string;
  country: string;
  zipCode: string;
  ip: string;
};

export type IyzicoCheckoutAddress = {
  contactName: string;
  city: string;
  country: string;
  address: string;
  zipCode: string;
};

export type IyzicoBasketItem = {
  id: string;
  name: string;
  category1: string;
  itemType: string;
  price: string;
};

export type IyzicoCheckoutSdkRequest = {
  locale: string;
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  basketId: string;
  paymentGroup: string;
  callbackUrl: string;
  enabledInstallments: number[];
  buyer: IyzicoCheckoutBuyer;
  shippingAddress: IyzicoCheckoutAddress;
  billingAddress: IyzicoCheckoutAddress;
  basketItems: IyzicoBasketItem[];
};

type OrderWithCheckoutRelations = Order & {
  user: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
  pickupStore: { name: string; city: string; district: string; address: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceSnapshot: Prisma.Decimal;
    productNameSnapshot: string;
    product: { category: { name: string } | null } | null;
  }>;
};

export function sanitizeIyzicoAddressFields(addr: IyzicoCheckoutAddress): IyzicoCheckoutAddress {
  return {
    contactName: sanitizeIyzicoText(addr.contactName, 64),
    city: sanitizeIyzicoText(addr.city, 64),
    country: sanitizeIyzicoText(addr.country, 32),
    address: sanitizeIyzicoText(addr.address, 256),
    zipCode: sanitizeIyzicoText(addr.zipCode, 16),
  };
}

export function sanitizeIyzicoBuyerFields(buyer: IyzicoCheckoutBuyer): IyzicoCheckoutBuyer {
  return {
    ...buyer,
    name: sanitizeIyzicoText(buyer.name, 64),
    surname: sanitizeIyzicoText(buyer.surname, 64),
    email: sanitizeIyzicoText(buyer.email, 128),
    registrationAddress: sanitizeIyzicoText(buyer.registrationAddress, 256),
    city: sanitizeIyzicoText(buyer.city, 64),
    country: sanitizeIyzicoText(buyer.country, 32),
    zipCode: sanitizeIyzicoText(buyer.zipCode, 16),
  };
}

/** iyzipay basket item id alanı kısa ve ASCII olmalı; UUID ve kontrol karakterleri sorun çıkarabiliyor. */
export function toIyzicoBasketItemId(orderItemId: string, index: number): string {
  const compact = orderItemId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  if (compact.length >= 4) return `bi${index + 1}-${compact.slice(0, 28)}`;
  return `bi${index + 1}`;
}

export function buildIyzicoBasketItems(
  order: OrderWithCheckoutRelations,
): IyzicoBasketItem[] {
  const grandStr = formatIyzicoMoney(order.grandTotal);

  const basketItems: IyzicoBasketItem[] =
    order.items.length > 0
      ? order.items.map((item, index) => {
          const line = money.multiply(item.unitPriceSnapshot, item.quantity);
          const cat = item.product?.category?.name ?? 'Pastane';
          return {
            id: toIyzicoBasketItemId(item.id, index),
            name: sanitizeIyzicoText(item.productNameSnapshot),
            category1: sanitizeIyzicoText(cat, 64),
            itemType: 'PHYSICAL',
            price: formatIyzicoMoney(line),
          };
        })
      : [
          {
            id: toIyzicoBasketItemId(order.id, 0),
            name: sanitizeIyzicoText(`Siparis ${order.orderNumber}`),
            category1: 'Pastane',
            itemType: 'PHYSICAL',
            price: grandStr,
          },
        ];

  let sum = money.of(0);
  for (const b of basketItems) {
    sum = money.add(sum, b.price);
  }
  if (money.compare(money.round(sum), money.round(order.grandTotal)) !== 0) {
    return [
      {
        id: toIyzicoBasketItemId(order.id, 0),
        name: sanitizeIyzicoText(`Siparis ${order.orderNumber}`),
        category1: 'Pastane',
        itemType: 'PHYSICAL',
        price: grandStr,
      },
    ];
  }

  return basketItems;
}

export function buildIyzicoCheckoutSdkRequest(args: {
  order: OrderWithCheckoutRelations;
  conversationId: string;
  callbackUrl: string;
  buyer: Omit<IyzicoCheckoutBuyer, 'ip'> & { ip?: string };
  shippingAddress: IyzicoCheckoutAddress;
  billingAddress: IyzicoCheckoutAddress;
}): IyzicoCheckoutSdkRequest {
  const grandStr = formatIyzicoMoney(args.order.grandTotal);
  const buyer = sanitizeIyzicoBuyerFields({
    ...args.buyer,
    ip: args.buyer.ip ?? '85.34.78.112',
  });
  const shippingAddress = sanitizeIyzicoAddressFields(args.shippingAddress);
  const billingAddress = sanitizeIyzicoAddressFields(args.billingAddress);

  return {
    locale: 'tr',
    conversationId: args.conversationId,
    price: grandStr,
    paidPrice: grandStr,
    currency: 'TRY',
    basketId: args.order.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || args.order.id,
    paymentGroup: 'PRODUCT',
    callbackUrl: args.callbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer,
    shippingAddress,
    billingAddress,
    basketItems: buildIyzicoBasketItems(args.order),
  };
}

export function extractCheckoutFormContent(responsePayload: unknown): string | null {
  if (!responsePayload || typeof responsePayload !== 'object') return null;
  const content = (responsePayload as { checkoutFormContent?: unknown }).checkoutFormContent;
  return typeof content === 'string' && content.length > 0 ? content : null;
}
