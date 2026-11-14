import { extname } from 'node:path';

// Keep multipart requests below Cloudflare's common 100 MB proxied-body limit.
// Large videos need multipart/direct storage rather than an unbounded HTTP upload.
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_MEDIA_BYTES = MAX_VIDEO_BYTES;

export type MediaKind = 'image' | 'video' | 'document';
export type MediaFormat = {
  extension: string;
  mime: string;
  kind: MediaKind;
  convert: boolean;
};

const formats: Record<string, Omit<MediaFormat, 'extension'>> = {
  jpg: { mime: 'image/jpeg', kind: 'image', convert: false },
  jpeg: { mime: 'image/jpeg', kind: 'image', convert: false },
  jpe: { mime: 'image/jpeg', kind: 'image', convert: false },
  jfif: { mime: 'image/jpeg', kind: 'image', convert: false },
  png: { mime: 'image/png', kind: 'image', convert: false },
  apng: { mime: 'image/png', kind: 'image', convert: false },
  webp: { mime: 'image/webp', kind: 'image', convert: false },
  avif: { mime: 'image/avif', kind: 'image', convert: false },
  gif: { mime: 'image/gif', kind: 'image', convert: false },
  ico: { mime: 'image/x-icon', kind: 'image', convert: false },
  bmp: { mime: 'image/bmp', kind: 'image', convert: true },
  tif: { mime: 'image/tiff', kind: 'image', convert: true },
  tiff: { mime: 'image/tiff', kind: 'image', convert: true },
  heic: { mime: 'image/heic', kind: 'image', convert: true },
  heif: { mime: 'image/heif', kind: 'image', convert: true },
  mp4: { mime: 'video/mp4', kind: 'video', convert: false },
  m4v: { mime: 'video/mp4', kind: 'video', convert: false },
  webm: { mime: 'video/webm', kind: 'video', convert: false },
  mov: { mime: 'video/quicktime', kind: 'video', convert: true },
  mkv: { mime: 'video/x-matroska', kind: 'video', convert: true },
  avi: { mime: 'video/x-msvideo', kind: 'video', convert: true },
  wmv: { mime: 'video/x-ms-wmv', kind: 'video', convert: true },
  flv: { mime: 'video/x-flv', kind: 'video', convert: true },
  mpeg: { mime: 'video/mpeg', kind: 'video', convert: true },
  mpg: { mime: 'video/mpeg', kind: 'video', convert: true },
  m2v: { mime: 'video/mpeg', kind: 'video', convert: true },
  '3gp': { mime: 'video/3gpp', kind: 'video', convert: true },
  '3g2': { mime: 'video/3gpp2', kind: 'video', convert: true },
  ogv: { mime: 'video/ogg', kind: 'video', convert: true },
  ts: { mime: 'video/mp2t', kind: 'video', convert: true },
  mts: { mime: 'video/mp2t', kind: 'video', convert: true },
  m2ts: { mime: 'video/mp2t', kind: 'video', convert: true },
  pdf: { mime: 'application/pdf', kind: 'document', convert: false },
};

const mimeFallback: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
  'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
  'image/bmp': 'bmp', 'image/x-ms-bmp': 'bmp',
  'image/tiff': 'tiff', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/x-m4v': 'm4v',
  'video/webm': 'webm', 'video/quicktime': 'mov',
  'video/x-matroska': 'mkv', 'video/x-msvideo': 'avi',
  'video/avi': 'avi', 'video/x-ms-wmv': 'wmv',
  'video/x-flv': 'flv', 'video/mpeg': 'mpeg',
  'video/3gpp': '3gp', 'video/3gpp2': '3g2',
  'video/ogg': 'ogv', 'application/ogg': 'ogv',
  'video/mp2t': 'ts', 'application/pdf': 'pdf',
};

export function getMediaFormat(name: string, declaredMime: string): MediaFormat | null {
  const extension = extname(name || '').slice(1).toLowerCase();
  const mime = (declaredMime || '').toLowerCase().split(';')[0].trim();
  // Extension-first supports cameras/phones that send application/octet-stream.
  // Actual file bytes are verified after Multer writes the temporary file.
  const formatKey = formats[extension] ? extension : mimeFallback[mime];
  if (!formatKey) return null;
  const format = formats[formatKey];
  // An explicitly contradictory known MIME type is not allowed.
  const other = mimeFallback[mime] && formats[mimeFallback[mime]];
  if (other && other.kind !== format.kind) return null;
  return { extension: formatKey, ...format };
}

export function hasValidMediaHeader(bytes: Uint8Array, extension: string): boolean {
  const is = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const ftyp = bytes.length >= 12 && text(4, 8) === 'ftyp';
  const brand = text(8, Math.min(bytes.length, 40)).toLowerCase();
  const riff = text(0, 4) === 'RIFF';
  const ebml = is(0x1a, 0x45, 0xdf, 0xa3);

  switch (extension) {
    case 'jpg': case 'jpeg': case 'jpe': case 'jfif': return is(0xff, 0xd8, 0xff);
    case 'png': case 'apng': return is(137, 80, 78, 71, 13, 10, 26, 10);
    case 'webp': return riff && text(8, 12) === 'WEBP';
    case 'gif': return text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a';
    case 'bmp': return text(0, 2) === 'BM';
    case 'tif': case 'tiff':
      return is(73, 73, 42, 0) || is(77, 77, 0, 42) || is(73, 73, 43, 0);
    case 'ico': return is(0, 0, 1, 0);
    case 'avif': return ftyp && /avif|avis/.test(brand);
    case 'heic': case 'heif': return ftyp && /heic|heix|hevc|hevx|heif|mif1|msf1/.test(brand);
    case 'mp4': case 'm4v': case '3gp': case '3g2': return ftyp;
    case 'mov': return ftyp || (bytes.length > 12 && ['moov', 'mdat', 'wide'].includes(text(4, 8)));
    case 'webm': case 'mkv': return ebml;
    case 'avi': return riff && text(8, 12) === 'AVI ';
    case 'wmv': return is(0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11);
    case 'flv': return text(0, 3) === 'FLV';
    case 'mpeg': case 'mpg': case 'm2v':
      return is(0, 0, 1, 0xba) || is(0, 0, 1, 0xb3);
    case 'ogv': return text(0, 4) === 'OggS';
    case 'ts': case 'mts': case 'm2ts':
      return (bytes[0] === 0x47 && bytes[188] === 0x47) ||
        (bytes[4] === 0x47 && bytes[196] === 0x47);
    case 'pdf': return text(0, 5) === '%PDF-';
    default: return false;
  }
}
