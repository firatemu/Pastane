import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsProvider {
  async send(input: { userId: string; body: string }): Promise<{ delivered: boolean; provider: string }> {
    void input;
    return { delivered: false, provider: 'sms-placeholder' };
  }
}
