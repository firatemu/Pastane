import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** PostgreSQL `String` (`TEXT`); çok satırlı açık adresler için storefront ile uyumlu üst sınırlar. */
const ADDRESS_FULL_TEXT_MAX_LEN = 2000;
const ADDRESS_DIRECTIONS_MAX_LEN = 2000;
const ADDRESS_MAP_SUMMARY_MAX_LEN = 1000;

/** Harita seçimi yapılmış adresler için `latitude` ile `longitude` birlikte gönderilmeli; API eski kullanıcılar için ikisini de hiç göndermeye izin verir. */
export class CreateAddressDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsString()
  @MaxLength(120)
  district!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @IsString()
  @MaxLength(ADDRESS_FULL_TEXT_MAX_LEN)
  fullAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  building?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  apartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(ADDRESS_DIRECTIONS_MAX_LEN)
  directions?: string;

  /** Harita veya seçim adresi özeti */
  @IsOptional()
  @IsString()
  @MaxLength(ADDRESS_MAP_SUMMARY_MAX_LEN)
  mapAddress?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
