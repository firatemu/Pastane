import { All, Body, Controller, Get, Headers, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { CheckoutFormInitDto } from './dto/checkout-form-init.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly service: PaymentsService) {}

  @RateLimit({ points: 8, durationSeconds: 60 })
  @ApiBody({ type: InitiatePaymentDto })
  @Post('initiate')
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto, @Headers('idempotency-key') key?: string) {
    return this.service.initiate(user.sub, dto, key ?? `${user.sub}:${dto.orderId}`);
  }

  @RateLimit({ points: 8, durationSeconds: 60 })
  @ApiBody({ type: CheckoutFormInitDto })
  @Post('checkout-form-init')
  initCheckoutForm(@CurrentUser() user: AuthUser, @Body() dto: CheckoutFormInitDto, @Headers('idempotency-key') key?: string) {
    return this.service.initiateCheckoutForm(user.sub, dto.orderId, key ?? `${user.sub}:${dto.orderId}:iyzico-cf`);
  }

  @Public()
  @SkipResponseEnvelope()
  @RateLimit({ points: 60, durationSeconds: 60 })
  @All('iyzico/form-return')
  async iyzicoCheckoutFormReturn(@Req() req: Request, @Res() res: Response): Promise<void> {
    let token = typeof req.body?.token === 'string' ? req.body.token : undefined;
    const q = req.query as Record<string, unknown>;
    if (!token && typeof q.token === 'string') token = q.token;
    const url = await this.service.finalizeCheckoutFormReturnRedirectUrl(token);
    res.redirect(302, url);
  }

  @Public()
  @RateLimit({ points: 60, durationSeconds: 60 })
  @ApiBody({ type: PaymentCallbackDto })
  @Post('callback')
  callback(@Body() dto: PaymentCallbackDto) {
    return this.service.callback(dto, dto as unknown as Record<string, unknown>);
  }

  @Get(':orderId')
  get(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.service.findOwn(user.sub, orderId);
  }
}
