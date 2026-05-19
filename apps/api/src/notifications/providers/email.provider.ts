import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailProvider {
  async send(input: { userId: string; subject: string; body: string }): Promise<{ delivered: boolean; provider: string }> {
    void input;
    return { delivered: false, provider: 'email-placeholder' };
  }
}
