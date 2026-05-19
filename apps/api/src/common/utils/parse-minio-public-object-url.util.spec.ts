import { parseMinioPublicObjectUrl } from './parse-minio-public-object-url.util';

describe('parseMinioPublicObjectUrl', () => {
  const allowed = new Set(['banners', 'product-images']);

  it('parses path-style URL with nested object key', () => {
    expect(parseMinioPublicObjectUrl('http://localhost:9000/banners/home/desktop/a.png', allowed)).toEqual({
      bucket: 'banners',
      objectKey: 'home/desktop/a.png',
    });
  });

  it('returns null for unknown bucket', () => {
    expect(parseMinioPublicObjectUrl('http://x/other/a.png', allowed)).toBeNull();
  });

  it('returns null for path traversal in key', () => {
    expect(parseMinioPublicObjectUrl('http://x/banners/../../../etc/passwd', allowed)).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(parseMinioPublicObjectUrl('not a url', allowed)).toBeNull();
  });
});
