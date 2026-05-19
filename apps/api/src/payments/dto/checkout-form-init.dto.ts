import { IsUUID } from 'class-validator';

export class CheckoutFormInitDto {
  @IsUUID()
  orderId!: string;
}
