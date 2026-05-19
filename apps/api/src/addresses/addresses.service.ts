import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../common/constants/error-codes'
import { AppException } from '../common/exceptions/app.exception'
import { PrismaService } from '../database/prisma.service'
import type { CreateAddressDto } from './dto/create-address.dto'
import type { UpdateAddressDto } from './dto/update-address.dto'

@Injectable()
export class AddressesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async create(userId: string, dto: CreateAddressDto) {
    this.assertLatitudeLongitudeConsistency(dto)
    this.normalizeDtoMapAddress(dto)
    return this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.address.count({ where: { userId, deletedAt: null } })
      const isDefault = dto.isDefault ?? activeCount === 0

      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.address.create({ data: { ...dto, userId, isDefault } })
    })
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.getOwn(userId, id)
    this.assertLatitudeLongitudeConsistency(dto)
    this.normalizeDtoMapAddress(dto)
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, deletedAt: null, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }
      return tx.address.update({ where: { id }, data: dto })
    })
  }

  async setDefault(userId: string, id: string) {
    await this.getOwn(userId, id)
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, deletedAt: null, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
      return tx.address.update({ where: { id }, data: { isDefault: true } })
    })
  }

  async remove(userId: string, id: string) {
    const address = await this.getOwn(userId, id)
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.address.update({
        where: { id },
        data: { deletedAt: new Date(), isDefault: false },
      })

      if (address.isDefault) {
        const fallback = await tx.address.findFirst({
          where: { userId, deletedAt: null, id: { not: id } },
          orderBy: { createdAt: 'desc' },
        })
        if (fallback) {
          await tx.address.update({ where: { id: fallback.id }, data: { isDefault: true } })
        }
      }

      return removed
    })
  }

  private async getOwn(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!address) {
      throw new AppException(ERROR_CODES.ADDRESS_NOT_FOUND, 'Address not found', HttpStatus.NOT_FOUND)
    }
    return address
  }

  private dtoHasLatitude(dto: object): boolean {
    return Object.prototype.hasOwnProperty.call(dto, 'latitude')
  }

  private dtoHasLongitude(dto: object): boolean {
    return Object.prototype.hasOwnProperty.call(dto, 'longitude')
  }

  private normalizeDtoMapAddress(dto: Partial<CreateAddressDto | UpdateAddressDto>): void {
    if (!Object.prototype.hasOwnProperty.call(dto, 'mapAddress')) {
      return
    }
    const raw = dto.mapAddress
    if (raw === undefined) {
      return
    }
    if (raw === null) {
      dto.mapAddress = null
      return
    }
    const trimmed = raw.trim()
    dto.mapAddress = trimmed.length ? trimmed : null
  }

  private assertLatitudeLongitudeConsistency(dto: object): void {
    const mentionsLat = this.dtoHasLatitude(dto)
    const mentionsLng = this.dtoHasLongitude(dto)
    if (mentionsLat !== mentionsLng) {
      throw new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        'Enlem ve boylam aynı istek içinde birlikte gönderilmelidir.',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!mentionsLat) {
      return
    }
    const { latitude: latRaw, longitude: lngRaw } = dto as Record<string, unknown>
    const latAbsent = latRaw === undefined || latRaw === null
    const lngAbsent = lngRaw === undefined || lngRaw === null
    if (latAbsent !== lngAbsent) {
      throw new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        'Enlem ve boylam birlikte doldurulmalı veya birlikte boş bırakılmalıdır.',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (latAbsent || lngAbsent) {
      return
    }
    if (
      typeof latRaw === 'number' &&
      typeof lngRaw === 'number' &&
      Number.isFinite(latRaw) &&
      Number.isFinite(lngRaw)
    ) {
      return
    }
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      'Geçerli bir enlem ve boylam göndermelisiniz.',
      HttpStatus.BAD_REQUEST,
    )
  }
}
