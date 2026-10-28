/**
 * Load `.env` into `process.env` for scripts that run outside Next.
 *
 * Next loads `.env` itself, and so does the Prisma CLI, but our own scripts
 * run before either — they are what *computes* the variable Prisma reads. This
 * is the smallest loader that does the job correctly.
 *
 * Two rules that matter:
 *
 *  - A real environment variable always wins. On cPanel the values come from
 *    the Node.js Selector UI and there may be no `.env` file at all; if there
 *    is a stale one, it must not override what the host provides.
 *  - A missing `.env` is not an error. `node --env-file=.env` fails hard when
 *    the file is absent, which is wrong for production.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} [file] path to the env file, relative to the working directory
 * @returns {string[]} the names of the variables that were applied
 */
export function loadDotEnv(file = '.env') {
  const resolved = path.resolve(process.cwd(), file);

  let text;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch {
    return [];
  }

  const applied = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    // The host's own environment is authoritative.
    if (process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      // Only double quotes carry escapes, matching dotenv and `--env-file`.
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    process.env[key] = value;
    applied.push(key);
  }

  return applied;
}
