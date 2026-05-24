import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
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

export type IyzicoCheckoutChannel = 'web' | 'mobile';

@Injectable()
export class IyzicoProvider {
  private readonly logger = new Logger(IyzicoProvider.name);
  private readonly webClient: any | null;
  private readonly mobileClient: any | null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const webKey = this.env('IYZICO_API_KEY');
    const webSecret = this.env('IYZICO_SECRET_KEY');
    const webUri = this.env('IYZICO_BASE_URL');
    this.webClient = this.createClient(webKey, webSecret, webUri);

    const { apiKey: mobileKey, secretKey: mobileSecret, baseUrl: mobileUri } = this.resolveMobileCredentials();
    this.mobileClient = this.createClient(mobileKey, mobileSecret, mobileUri) ?? this.webClient;
  }

  /** Mobil checkout her zaman sandbox; IYZICO_MOBILE_* boşsa yerel/prod .env içindeki IYZICO_* kullanılır. */
  private resolveMobileCredentials(): { apiKey?: string; secretKey?: string; baseUrl: string } {
    const apiKey = this.env('IYZICO_MOBILE_API_KEY') ?? this.env('IYZICO_API_KEY');
    const secretKey = this.env('IYZICO_MOBILE_SECRET_KEY') ?? this.env('IYZICO_SECRET_KEY');
    const baseUrl =
      this.env('IYZICO_MOBILE_BASE_URL') ??
      this.env('IYZICO_BASE_URL') ??
      'https://sandbox-api.iyzipay.com';
    return { apiKey, secretKey, baseUrl };
  }

  private env(name: string): string | undefined {
    const v = this.config.get<string>(name) ?? process.env[name];
    const trimmed = typeof v === 'string' ? v.trim() : '';
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private createClient(apiKey?: string, secretKey?: string, uri?: string): any | null {
    if (apiKey && secretKey && uri) {
      return new IyzipayLib({ apiKey, secretKey, uri });
    }
    return null;
  }

  private resolveClient(channel: IyzicoCheckoutChannel): any | null {
    return channel === 'mobile' ? this.mobileClient : this.webClient;
  }

  isCheckoutConfigured(channel: IyzicoCheckoutChannel = 'web'): boolean {
    return this.resolveClient(channel) !== null;
  }

  assertCheckoutConfigured(channel: IyzicoCheckoutChannel = 'web'): void {
    if (!this.isCheckoutConfigured(channel)) {
      const hint =
        channel === 'mobile'
          ? 'iyzico mobile sandbox is not configured (IYZICO_MOBILE_API_KEY, IYZICO_MOBILE_SECRET_KEY, IYZICO_MOBILE_BASE_URL or IYZICO_*)'
          : 'iyzico is not configured (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL)';
      throw new AppException(ERROR_CODES.INTERNAL_SERVER_ERROR, hint, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async initiate(_dto: InitiatePaymentDto, conversationId: string) {
    return {
      providerPaymentId: `sandbox-${randomUUID()}`,
      conversationId,
      redirectUrl: 'https://sandbox.example.test/pay',
    };
  }

  private normalizeSdkResult(result: unknown): CheckoutFormInitSdkResult {
    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as CheckoutFormInitSdkResult;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'invalid json';
        this.logger.error(`Failed to parse iyzico SDK result string: "${result.slice(0, 1000)}"`);
        throw new Error(msg);
      }
    }
    if (result && typeof result === 'object') return result as CheckoutFormInitSdkResult;
    throw new Error('iyzico returned empty response');
  }

  async checkoutFormInitialize(
    request: Record<string, unknown>,
    channel: IyzicoCheckoutChannel = 'web',
  ): Promise<CheckoutFormInitSdkResult> {
    this.assertCheckoutConfigured(channel);
    const client = this.resolveClient(channel)!;

    const attempt = (): Promise<CheckoutFormInitSdkResult> => {
      return new Promise((resolve, reject) => {
        // Clone request object to avoid side effects across retries
        const reqCopy = JSON.parse(JSON.stringify(request));
        client.checkoutFormInitialize.create(reqCopy, (err: Error | null, result: unknown) => {
          if (err) {
            this.logger.warn(`iyzico checkout init failed (${channel}): ${err.message}`);
            reject(err);
            return;
          }
          try {
            const normalized = this.normalizeSdkResult(result);
            if (normalized.status !== 'success') {
              this.logger.warn(
                `iyzico checkout init rejected (${channel}): ${normalized.errorCode ?? ''} ${normalized.errorMessage ?? ''}`.trim(),
              );
            }
            resolve(normalized);
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : 'parse failed';
            this.logger.warn(`iyzico checkout init parse error (${channel}): ${msg}`);
            reject(parseErr instanceof Error ? parseErr : new Error(msg));
          }
        });
      });
    };

    try {
      return await attempt();
    } catch (err) {
      this.logger.warn(`iyzico checkout init failed, retrying once in 1s... error: ${err instanceof Error ? err.message : String(err)}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await attempt();
    }
  }

  async checkoutFormRetrieve(
    body: { locale: string; token: string; conversationId: string },
    channel: IyzicoCheckoutChannel = 'web',
  ): Promise<CheckoutFormRetrieveSdkResult> {
    this.assertCheckoutConfigured(channel);
    const client = this.resolveClient(channel)!;
    return new Promise((resolve, reject) => {
      client.checkoutForm.retrieve(body, (err: Error | null, result: CheckoutFormRetrieveSdkResult) => {
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
