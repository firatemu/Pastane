import { IsDateString, IsOptional } from 'class-validator';

export class QueryMyOrdersDto {
  /** Sipariş oluşturma tarihi (YYYY-MM-DD), Europe/Istanbul takvim günü. */
  @IsOptional()
  @IsDateString()
  tarih?: string;
}
