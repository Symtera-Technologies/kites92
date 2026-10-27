import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Uploaded media on disk.
 *
 * Files live in a directory of their own and are served by
 * `/api/media/[...path]`. Writing them into `public/` would be one line
 * shorter and wrong: `next.config.mjs` sets `output: 'standalone'`, which
 * copies `public/` next to the server at build time, so the next deploy would
 * silently drop every photograph the owner had uploaded. A separate directory
 * survives rebuilds and can be pointed at a cPanel path that is already in
 * the backup set.
 *
 * Nothing here trusts the browser. The stored filename is generated, the
 * extension comes from the file's own magic bytes rather than its name, and
 * every path is checked to be inside the media root before the filesystem is
 * touched.
 */

/** Big enough for a phone photograph, small enough to survive shared hosting. */
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

/** The only extensions this app will write or serve. */
export const MEDIA_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

/** Every stored URL starts with this, which is how we know a URL is ours. */
export const MEDIA_URL_PREFIX = '/api/media/';

/** Where uploads are written. Override with UPLOAD_DIR in deployment. */
export function mediaRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), 'uploads');
}

function ascii(bytes: Buffer, start: number, length: number): string {
  return bytes.subarray(start, start + length).toString('latin1');
}

/**
 * Identify an image from its leading bytes.
 *
 * The browser-supplied MIME type and filename are both attacker-controlled, so
 * neither decides what we store. SVG is deliberately absent: an SVG served
 * from this domain can execute script in the visitor's browser.
 */
function sniff(bytes: Buffer): { ext: string } | null {
  if (bytes.length < 16) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg' };

  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return { ext: 'png' };

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return { ext: 'webp' };

  // ISO-BMFF: the brand at offset 8 distinguishes AVIF from MP4 and friends.
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') return { ext: 'avif' };
  }

  return null;
}

export type UploadFailure = 'empty' | 'too-large' | 'not-image' | 'write-failed';
export type SaveResult = { ok: true; url: string } | { ok: false; code: UploadFailure };

/**
 * Write an uploaded image and return the URL to store on the ProductImage row.
 *
 * Failures come back as codes rather than sentences: the caller passes them
 * through a URL, and reflecting a server-built string into a page is a habit
 * worth not having.
 */
export async function saveImage(file: File | null): Promise<SaveResult> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return { ok: false, code: 'empty' };
  }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, code: 'too-large' };

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return { ok: false, code: 'not-image' };

  // Date folders so the directory stays navigable, and a random name because
  // the uploaded one is an injection surface (traversal, double extensions)
  // that tells us nothing the sniffed bytes have not already told us.
  const now = new Date();
  const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const filename = `${randomBytes(12).toString('hex')}.${type.ext}`;

  try {
    await mkdir(path.join(mediaRoot(), folder), { recursive: true });
    await writeFile(path.join(mediaRoot(), folder, filename), bytes);
  } catch (error) {
    // Almost always a permissions problem on a fresh deploy.
    console.error(`[media] cannot write to ${mediaRoot()}.`, error);
    return { ok: false, code: 'write-failed' };
  }

  return { ok: true, url: `${MEDIA_URL_PREFIX}${folder}/${filename}` };
}

/**
 * Turn URL segments into an absolute path inside the media root, or null.
 *
 * Returning null for anything suspicious — rather than throwing or sanitising
 * — lets the route handler answer 404 and reveal nothing about the layout of
 * the disk.
 */
export function resolveMediaPath(segments: string[]): string | null {
  if (segments.length === 0 || segments.length > 4) return null;

  for (const segment of segments) {
    // Rules out `/`, `\`, `..`, leading dots and anything non-portable.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)) return null;
  }

  const extension = path.extname(segments[segments.length - 1]).slice(1).toLowerCase();
  if (!MEDIA_MIME[extension]) return null;

  const root = mediaRoot();
  const full = path.resolve(root, ...segments);

  // Defence in depth: the character rules above already forbid traversal, but
  // confirm the resolved path really is under the root.
  const relative = path.relative(root, full);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;

  return full;
}

/** Delete a file this app stored. URLs it did not store are left alone. */
export async function deleteStoredImage(url: string): Promise<void> {
  if (!url.startsWith(MEDIA_URL_PREFIX)) return;

  const full = resolveMediaPath(url.slice(MEDIA_URL_PREFIX.length).split('/'));
  if (!full) return;

  try {
    await unlink(full);
  } catch {
    // Already gone, or never written. Either way the row is what mattered.
  }
}
