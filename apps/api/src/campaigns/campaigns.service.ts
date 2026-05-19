import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';
import type { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(AuditService) private readonly audit: AuditService) {}
  list() { return this.prisma.campaign.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }); }
  active() { const now = new Date(); return this.prisma.campaign.findMany({ where: { deletedAt: null, status: CampaignStatus.ACTIVE, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] }, orderBy: { startDate: 'desc' } }); }
  async create(dto: CreateCampaignDto, actor?: AuthUser) { const item = await this.prisma.campaign.create({ data: { name: dto.name, description: dto.description, type: dto.type, value: new Prisma.Decimal(dto.value), status: dto.status, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined } }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.create', entityType: 'Campaign', entityId: item.id, newValues: item as unknown as Prisma.InputJsonValue }); return item; }
  async update(id: string, dto: UpdateCampaignDto, actor?: AuthUser) { const old = await this.get(id); const item = await this.prisma.campaign.update({ where: { id }, data: this.data(dto) }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.update', entityType: 'Campaign', entityId: id, oldValues: old as unknown as Prisma.InputJsonValue, newValues: item as unknown as Prisma.InputJsonValue }); return item; }
  async remove(id: string, actor?: AuthUser) { const old = await this.get(id); const item = await this.prisma.campaign.update({ where: { id }, data: { deletedAt: new Date(), status: CampaignStatus.INACTIVE } }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.delete', entityType: 'Campaign', entityId: id, oldValues: old as unknown as Prisma.InputJsonValue }); return item; }
  private async get(id: string) { const item = await this.prisma.campaign.findFirst({ where: { id, deletedAt: null } }); if (!item) throw new AppException(ERROR_CODES.CAMPAIGN_NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND); return item; }
  private data(dto: CreateCampaignDto | UpdateCampaignDto) { return { ...dto, ...(dto.value !== undefined ? { value: new Prisma.Decimal(dto.value) } : {}), ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}), ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}) }; }
}
