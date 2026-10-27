import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_MIME, resolveMediaPath } from '@/lib/media';

/**
 * Serve an uploaded image.
 *
 * Uploads are stored outside `public/` (see src/lib/media.ts), so they need a
 * handler. Every URL names a file whose contents can never change — the name
 * is random and a re-upload gets a new one — which is what makes the
 * immutable cache header honest.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  const file = resolveMediaPath(segments);
  // 404 rather than 403: a traversal attempt learns nothing it did not know.
  if (!file) return new Response('Not found', { status: 404 });

  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    size = info.size;
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const extension = path.extname(file).slice(1).toLowerCase();
  const body = await readFile(file);

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': MEDIA_MIME[extension],
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      // The type is decided here from a closed list; stop the browser
      // second-guessing it from the bytes.
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
