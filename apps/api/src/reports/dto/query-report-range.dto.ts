import { IsDateString, IsOptional } from 'class-validator'; export class QueryReportRangeDto { @IsOptional() @IsDateString() startDate?:string; @IsOptional() @IsDateString() endDate?:string; }
