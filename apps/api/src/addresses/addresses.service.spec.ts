import { AddressesService } from './addresses.service'
import type { CreateAddressDto } from './dto/create-address.dto'

describe('AddressesService', () => {
  it('owner-scopes address list queries', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const service = new AddressesService({ address: { findMany } } as never)

    await service.list('user-1')

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', deletedAt: null } }),
    )
  })

  it('clears previous default when setting a new default address', async () => {
    const tx = {
      address: {
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'address-2', isDefault: true }),
      },
    }
    const prisma = {
      address: { findFirst: jest.fn().mockResolvedValue({ id: 'address-2', userId: 'user-1' }) },
      $transaction: jest.fn(async (callback: (arg: typeof tx) => unknown) => callback(tx)),
    } as never
    const service = new AddressesService(prisma)

    await service.setDefault('user-1', 'address-2')

    expect(tx.address.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', deletedAt: null, isDefault: true, id: { not: 'address-2' } },
      }),
    )
    expect(tx.address.update).toHaveBeenCalledWith({
      where: { id: 'address-2' },
      data: { isDefault: true },
    })
  })

  it('rejects mismatched latitude and longitude payloads before transaction', async () => {
    const prisma = { $transaction: jest.fn() }
    const service = new AddressesService(prisma as never)

    await expect(
      service.create('user-1', {
        title: 'Ev',
        city: 'Adana',
        district: 'Seyhan',
        fullAddress: 'Cadde',
        latitude: 37,
      } as unknown as CreateAddressDto),
    ).rejects.toThrow('birlikte gönderilmelidir')

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('allows both coordinates set to null when both latitude and longitude keys are present', async () => {
    const tx = {
      address: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
      },
    }
    const prisma = {
      $transaction: jest.fn(async (callback: (arg: typeof tx) => unknown) => callback(tx)),
    }
    const service = new AddressesService(prisma as never)

    await service.create(
      'user-1',
      {
        title: 'Ev',
        city: 'Adana',
        district: 'Seyhan',
        fullAddress: 'Cadde',
        latitude: null,
        longitude: null,
      } as unknown as CreateAddressDto,
    )

    expect(tx.address.create).toHaveBeenCalled()
  })
})
