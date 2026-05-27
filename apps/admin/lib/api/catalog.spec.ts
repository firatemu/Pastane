import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminFetch, adminFetchEnvelope } from './catalog';

function mockJsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('catalog fetch helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('unwraps data arrays from paginated success envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockJsonResponse({
          success: true,
          data: ['asset-1'],
          meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
        }),
      ),
    );

    await expect(adminFetch<string[]>('/media/assets?page=1&limit=1')).resolves.toEqual(['asset-1']);
  });

  it('preserves empty pagination metadata when callers need the full envelope', async () => {
    const meta = { page: 1, limit: 24, total: 0, totalPages: 0 };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockJsonResponse({
          success: true,
          data: [],
          meta,
        }),
      ),
    );

    await expect(adminFetchEnvelope<string[], typeof meta>('/media/assets?page=1&limit=24')).resolves.toEqual({
      success: true,
      data: [],
      meta,
    });
  });
});
