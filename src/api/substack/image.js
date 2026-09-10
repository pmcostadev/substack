import dns from "node:dns";
import fsp from "node:fs/promises";
import nodePath from "node:path";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20000;
const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
const HEIC_MESSAGE = 'image: HEIC is not accepted by Substack. Convert to JPG or PNG first.';

export const defaultLookup = (hostname) => dns.promises.lookup(hostname, {all: true});

export function isPrivateAddress(address, family) {
  if (family === 4) {
    const p = address.split('.').map(Number);
    if (p[0] === 10) return true; if (p[0] === 127) return true; if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    return false;
  }
  const a = address.toLowerCase();
  if (a === '::1' || a === '::') return true;
  if (a.startsWith('fe8') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb')) return true;
  if (a.startsWith('fc') || a.startsWith('fd')) return true;
  const mapped = embeddedIpv4(a);
  if (mapped) return isPrivateAddress(mapped, 4);
  return false;
}

function embeddedIpv4(address) {
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) { const hi = parseInt(hex[1], 16); const lo = parseInt(hex[2], 16); return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`; }
  return null;
}

async function assertPublicUrl(rawUrl, lookup) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`image: only http and https URLs are allowed, got ${url.protocol}`);
  const hostname = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
  const addresses = await lookup(hostname);
  for (const {address, family} of addresses) { if (isPrivateAddress(address, family)) throw new Error(`image: refusing to fetch a private/loopback address (${address})`); }
  return url;
}

async function fetchGuarded(rawUrl, lookup, fetchImpl, maxRedirects = 3) {
  let target = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(target, lookup);
    const response = await fetchImpl(target, {redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)});
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`image: redirect with no Location header from ${target}`);
      target = new URL(location, target).toString();
      continue;
    }
    return response;
  }
  throw new Error(`image: too many redirects (> ${maxRedirects})`);
}

async function readCapped(response, max) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > max) throw new Error(`image: source is ${declared} bytes (Content-Length), over the ${max}-byte limit.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > max) throw new Error(`image: source is ${buffer.byteLength} bytes, over the ${max}-byte limit.`);
  return buffer;
}

export const SUBSTACK_IMAGE_HOSTS = new Set(['substack-post-media.s3.amazonaws.com', 'substackcdn.com']);

export function isSubstackHosted(rawUrl) {
  let hostname; try { hostname = new URL(rawUrl).hostname.toLowerCase(); } catch { return false; }
  return SUBSTACK_IMAGE_HOSTS.has(hostname);
}

const toDataUri = (buffer, contentType) => `data:${contentType};base64,${buffer.toString('base64')}`;

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

function sniffImageType(buffer) {
  const at = (start, end) => buffer.subarray(start, end).toString('latin1');
  if (buffer.length >= 8 && at(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 6 && (at(0, 6) === 'GIF87a' || at(0, 6) === 'GIF89a')) return 'image/gif';
  if (buffer.length >= 12 && at(0, 4) === 'RIFF' && at(8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && at(4, 8) === 'ftyp' && HEIC_BRANDS.has(at(8, 12))) return 'image/heic';
  return null;
}

export async function readImageFileAsDataUri(filePath, {maxBytes = MAX_IMAGE_BYTES} = {}) {
  if (!nodePath.isAbsolute(filePath)) throw new Error(`image: path must be absolute, got ${JSON.stringify(filePath)}`);
  let resolved; try { resolved = await fsp.realpath(filePath); } catch (error) { if (error.code === 'ENOENT') throw new Error(`image: no such file: ${filePath}`); throw error; }
  const stats = await fsp.stat(resolved);
  if (!stats.isFile()) throw new Error(`image: not a regular file: ${filePath}`);
  if (stats.size > maxBytes) throw new Error(`image: file is ${stats.size} bytes, over the ${maxBytes}-byte limit.`);
  const buffer = await fsp.readFile(resolved);
  const contentType = sniffImageType(buffer);
  if (!contentType) { const head = [...buffer.subarray(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join(' '); throw new Error(`image: unrecognised image format (first bytes: ${head}). Supported: PNG, JPEG, GIF, WebP.`); }
  if (HEIC_TYPES.has(contentType)) throw new Error(HEIC_MESSAGE);
  return {image: toDataUri(buffer, contentType), contentType, bytes: buffer.byteLength};
}

export async function fetchImageAsDataUri(url, {lookup = defaultLookup, fetchImpl = fetch, maxBytes = MAX_IMAGE_BYTES} = {}) {
  const response = await fetchGuarded(url, lookup, fetchImpl);
  if (!response.ok) throw new Error(`image: source responded ${response.status} ${response.statusText}`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!contentType.startsWith('image/')) throw new Error(`image: source is not an image (content-type: ${contentType || 'none'})`);
  if (HEIC_TYPES.has(contentType)) throw new Error(HEIC_MESSAGE);
  const buffer = await readCapped(response, maxBytes);
  return {image: toDataUri(buffer, contentType), contentType, bytes: buffer.byteLength};
}
