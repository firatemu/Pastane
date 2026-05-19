import { CampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  it('returns only currently active campaigns from active query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new CampaignsService({ campaign: { findMany } } as never, { log: jest.fn() } as never);
    await service.active();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: CampaignStatus.ACTIVE, deletedAt: null }) }));
  });
});
