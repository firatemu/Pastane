import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class PermissionsService { constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {} list() { return this.prisma.permission.findMany({ where: { deletedAt: null }, orderBy: { code: 'asc' } }); } }
