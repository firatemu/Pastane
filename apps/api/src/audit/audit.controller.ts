import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}
  @Permissions('audit.view') @Get() list() { return this.audit.list(); }
}
