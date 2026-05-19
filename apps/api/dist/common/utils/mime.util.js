"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectImageMime = detectImageMime;
exports.detectVideoMime = detectVideoMime;
exports.detectBannerMedia = detectBannerMedia;
const signatures = [
    { mime: 'image/png', match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mime: 'image/jpeg', match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    {
        mime: 'image/gif',
        match: (b) => {
            if (b.length < 6)
                return false;
            const sig = b.subarray(0, 6).toString('ascii');
            return sig === 'GIF87a' || sig === 'GIF89a';
        },
    },
    { mime: 'image/webp', match: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
];
function detectImageMime(buffer) { return signatures.find((s) => s.match(buffer))?.mime ?? null; }
/** ISO BMFF MP4 / MOV family: `....ftyp` at offset 4. */
function detectVideoMime(buffer) {
    if (buffer.length >= 12) {
        const ftyp = buffer.subarray(4, 8).toString('ascii');
        if (ftyp === 'ftyp')
            return 'video/mp4';
    }
    if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)
        return 'video/webm';
    return null;
}
function detectBannerMedia(buffer) {
    const imageMime = detectImageMime(buffer);
    if (imageMime)
        return { kind: 'IMAGE', mime: imageMime };
    const videoMime = detectVideoMime(buffer);
    if (videoMime)
        return { kind: 'VIDEO', mime: videoMime };
    return null;
}
//# sourceMappingURL=mime.util.js.map