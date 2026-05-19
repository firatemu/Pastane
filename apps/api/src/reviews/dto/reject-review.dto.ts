import { IsString, MinLength } from 'class-validator'; export class RejectReviewDto { @IsString() @MinLength(3) reason!:string; }
