import { detectBannerMedia, detectImageMime, detectVideoMime } from './mime.util';
describe('detectImageMime',()=>{ it('detects actual png signature',()=>expect(detectImageMime(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toBe('image/png')); it('rejects fake extension content',()=>expect(detectImageMime(Buffer.from('not-an-image'))).toBeNull());});
describe('detectVideoMime', () => {
  it('detects mp4 ftyp', () => {
    const buf = Buffer.alloc(20);
    buf.writeUInt32BE(0, 0);
    buf.write('ftyp', 4);
    expect(detectVideoMime(buf)).toBe('video/mp4');
  });
  it('detects webm ebml', () => {
    const buf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
    expect(detectVideoMime(buf)).toBe('video/webm');
  });
});
describe('detectBannerMedia', () => {
  it('classifies jpeg as image', () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectBannerMedia(jpg)?.kind).toBe('IMAGE');
  });
  it('classifies gif89a as image', () => {
    const gif = Buffer.from('GIF89a\x01', 'ascii');
    expect(detectBannerMedia(gif)).toEqual({ kind: 'IMAGE', mime: 'image/gif' });
  });
});
