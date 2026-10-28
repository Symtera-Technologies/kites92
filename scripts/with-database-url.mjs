/**
 * Run a command with `DATABASE_URL` composed from its parts.
 *
 *   node scripts/with-database-url.mjs prisma db push
 *
 * The Prisma CLI reads `env("DATABASE_URL")` straight out of the schema and
 * refuses to do anything at all without it — `prisma validate` fails with
 * P1012, and that includes the `prisma generate` inside `npm run build`. So the
 * variable has to exist in the environment before Prisma starts, which is what
 * this wrapper is for. The app and the seed script compose the same URL through
 * the same builder at runtime instead.
 *
 * Setting an explicit DATABASE_URL still works and takes precedence; this is
 * then a no-op pass-through.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { buildDatabaseUrl, describeDatabaseTarget } from '../src/lib/db-url.mjs';
import { loadDotEnv } from './load-dotenv.mjs';

const require = createRequire(import.meta.url);

/**
 * Find a dependency's real entry script, so it can be run with this same Node
 * binary instead of through a shell.
 *
 * On Windows the shims in `node_modules/.bin` are `.cmd` files, which Node
 * refuses to spawn without `shell: true` — and passing an argument array
 * alongside `shell: true` is deprecated (DEP0190) because the shell, not Node,
 * then does the quoting. Running the entry script directly sidesteps both.
 *
 * @param {string} name
 * @returns {string | null}
 */
function resolveNodeBin(name) {
  try {
    const manifestPath = require.resolve(`${name}/package.json`);
    const { bin } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entry = typeof bin === 'string' ? bin : bin?.[name] ?? Object.values(bin ?? {})[0];
    if (!entry) return null;

    const resolved = path.join(path.dirname(manifestPath), entry);
    return fs.existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

const argv = process.argv.slice(2);

if (argv.length === 0) {
  console.error('Usage: node scripts/with-database-url.mjs <command> [args...]');
  process.exit(64); // EX_USAGE
}

loadDotEnv();

try {
  process.env.DATABASE_URL = buildDatabaseUrl();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(78); // EX_CONFIG
}

if (process.env.DB_URL_VERBOSE === '1') {
  console.error(`→ database: ${describeDatabaseTarget()}`);
}

const [command, ...args] = argv;

/** @type {import('node:child_process').SpawnOptions} */
const options = { stdio: 'inherit' };

let file = command;
let fileArgs = args;

const localBin = command === 'node' ? null : resolveNodeBin(command);

if (command === 'node') {
  // Use the Node that is already running rather than whatever is on PATH.
  file = process.execPath;
} else if (localBin) {
  file = process.execPath;
  fileArgs = [localBin, ...args];
} else {
  // Something that is not a local dependency (npx, a system tool). Fall back to
  // a shell, as a single string so that DEP0190 does not apply.
  file = [command, ...args].join(' ');
  fileArgs = [];
  options.shell = true;
}

const child = spawn(file, fileArgs, options);

child.on('error', (error) => {
  console.error(`Could not run "${command}": ${error.message}`);
  process.exit(127);
});

child.on('exit', (code, signal) => {
  // Report a signal death as a shell does, so CI sees a failure rather than 0.
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
