import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AuditClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async log(input: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; oldValues?: Prisma.InputJsonValue; newValues?: Prisma.InputJsonValue }, client: AuditClient = this.prisma) {
    return client.auditLog.create({ data: { actorId: input.actorId ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId ?? null, oldValues: input.oldValues, newValues: input.newValues } });
  }

  list() { return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }
}
