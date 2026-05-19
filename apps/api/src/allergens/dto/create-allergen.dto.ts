import { IsString } from 'class-validator'; export class CreateAllergenDto { @IsString() name!: string; }
