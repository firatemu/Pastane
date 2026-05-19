import { ArrayUnique, IsArray, IsUUID } from 'class-validator'; export class UpdateProductAllergensDto { @IsArray() @ArrayUnique() @IsUUID('4',{each:true}) allergenIds!:string[]; }
