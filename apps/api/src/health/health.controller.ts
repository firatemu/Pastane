import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';
@ApiTags('Health')
@Controller('health')
export class HealthController { constructor(@Inject(HealthService) private readonly health: HealthService) {} @Public() @Get() getHealth() { return this.health.getStatus(); } }
