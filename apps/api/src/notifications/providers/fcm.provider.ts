import { Injectable } from '@nestjs/common';

@Injectable()
export class FcmProvider {
  async send(input: { userId: string; title: string; body: string; metadata?: Record<string, unknown> }): Promise<{ delivered: boolean; provider: string }> {
    void input;
    return { delivered: false, provider: 'fcm-placeholder' };
  }
}
