import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import type { InitiatePaymentDto } from '../dto/initiate-payment.dto';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any -- iyzipay ships untyped CommonJS */
const IyzipayLib: any = require('iyzipay');

export type CheckoutFormInitSdkResult = {
  status: string;
  errorMessage?: string;
  token?: string;
  checkoutFormContent?: string;
  conversationId?: string;
  [key: string]: unknown;
};

export type CheckoutFormRetrieveSdkResult = {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  conversationId?: string;
  paidPrice?: string;
  price?: string;
  errorCode?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

@Injectable()
export class IyzicoProvider {
  private readonly client: any | null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('IYZICO_API_KEY') ?? process.env.IYZICO_API_KEY;
    const secretKey = this.config.get<string>('IYZICO_SECRET_KEY') ?? process.env.IYZICO_SECRET_KEY;
    const uri = this.config.get<string>('IYZICO_BASE_URL') ?? process.env.IYZICO_BASE_URL;
    if (apiKey && secretKey && uri) {
      this.client = new IyzipayLib({ apiKey, secretKey, uri });
    } else {
      this.client = null;
    }
  }

  isCheckoutConfigured(): boolean {
    return this.client !== null;
  }

  assertCheckoutConfigured(): void {
    if (!this.client) {
      throw new AppException(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'iyzico is not configured (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async initiate(_dto: InitiatePaymentDto, conversationId: string) {
    return {
      providerPaymentId: `sandbox-${randomUUID()}`,
      conversationId,
      redirectUrl: 'https://sandbox.example.test/pay',
    };
  }

  async checkoutFormInitialize(request: Record<string, unknown>): Promise<CheckoutFormInitSdkResult> {
    this.assertCheckoutConfigured();
    return new Promise((resolve, reject) => {
      this.client!.checkoutFormInitialize.create(request, (err: Error | null, result: CheckoutFormInitSdkResult) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async checkoutFormRetrieve(body: { locale: string; token: string; conversationId: string }): Promise<CheckoutFormRetrieveSdkResult> {
    this.assertCheckoutConfigured();
    return new Promise((resolve, reject) => {
      this.client!.checkoutForm.retrieve(body, (err: Error | null, result: CheckoutFormRetrieveSdkResult) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  verifyCallback(payload: Record<string, unknown>): boolean {
    void payload;
    return true;
  }

  sanitize(payload: Record<string, unknown>) {
    const { cardNumber, cvc, cvv, ...safe } = payload;
    void cardNumber;
    void cvc;
    void cvv;
    return safe;
  }
}
