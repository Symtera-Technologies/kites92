/**
 * Work out why the app cannot reach the database, from inside the app's own
 * environment.
 *
 * Written for a cPanel account with no SSH: run it from
 * Setup Node.js App -> Run JS script -> `diagnose:db`, and read the output in
 * the panel. Everything it reports is observed from this process, which is the
 * thing that actually matters — the database can be reachable from phpMyAdmin
 * and unreachable from here, and that specific mismatch is the most common
 * cause of "Can't reach database server".
 *
 * It never prints the password, and it writes nothing to the database.
 */

import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';

import { buildDatabaseUrl, resolveDatabaseEnv, DATABASE_ENV_NAMES } from '../src/lib/db-url.mjs';
import { loadDotEnv } from './load-dotenv.mjs';

const CONNECT_TIMEOUT_MS = 5000;

/** Socket paths used by the common distributions and control panels. */
const KNOWN_SOCKETS = [
  '/var/lib/mysql/mysql.sock',
  '/var/run/mysqld/mysqld.sock',
  '/run/mysqld/mysqld.sock',
  '/tmp/mysql.sock',
  '/var/run/mysql/mysql.sock',
];

const line = (s = '') => console.log(s);
const head = (s) => { line(); line(s); line('-'.repeat(s.length)); };

loadDotEnv();

/* ── 1. What is configured ──────────────────────────────────────────────── */

head('1. Configuration present in this process');

/** True for anything that looks like it might be a database setting. */
const LOOKS_DATABASEY = /(^|_)(DB|DATABASE|MYSQL|MARIADB)/i;
/** Names whose value must never be printed, only described. */
const SECRET = /PASS|PWD|URL|URI|SECRET|TOKEN/i;

const describe = (n, v) =>
  v === undefined ? 'not set'
  : v === '' ? 'set but EMPTY'
  : SECRET.test(n) ? `set (${v.length} characters, value hidden)`
  : JSON.stringify(v);

line('  Names this app looks for:');
for (const n of DATABASE_ENV_NAMES) {
  if (process.env[n] === undefined) continue;
  line(`    ${n.padEnd(23)} ${describe(n, process.env[n])}`);
}
if (!DATABASE_ENV_NAMES.some((n) => process.env[n] !== undefined)) {
  line('    (none of them are set — this is almost certainly the problem)');
}

// The decisive bit when nothing is configured under a name we expect: list what
// IS in the environment, so a platform-specific name can be spotted and either
// used directly or copied into DB_*.
line();
line('  Every other database-looking variable in this environment:');
const others = Object.keys(process.env)
  .filter((n) => LOOKS_DATABASEY.test(n) && !DATABASE_ENV_NAMES.includes(n))
  .sort();
if (others.length === 0) line('    (none)');
for (const n of others) line(`    ${n.padEnd(23)} ${describe(n, process.env[n])}`);

line();
line('  Which variable each part was taken from:');
for (const [part, from] of Object.entries(resolveDatabaseEnv())) {
  line(`    ${part.padEnd(10)} ${from ?? '(default or unset)'}`);
}

let url;
try {
  url = new URL(buildDatabaseUrl());
} catch (error) {
  line();
  line(`  STOP: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(78);
}

const host = url.hostname;
const port = url.port || '3306';
const socket = url.searchParams.get('socket');
const database = decodeURIComponent(url.pathname.replace(/^\//, ''));

line();
line(`  Resolved target: ${decodeURIComponent(url.username)}@${host}:${port}/${database}`);
line(`  Transport:       ${socket ? `unix socket ${socket}` : 'TCP'}`);

/* ── 2. Name resolution ─────────────────────────────────────────────────── */

head('2. Does the host name resolve?');

try {
  const addresses = await dns.lookup(host, { all: true });
  for (const a of addresses) line(`  ${host} -> ${a.address} (IPv${a.family})`);
  if (addresses.every((a) => a.family === 6)) {
    line('  NOTE: resolves only to IPv6. If MySQL listens on 127.0.0.1 only,');
    line('        use 127.0.0.1 as DB_HOST rather than localhost.');
  }
} catch (error) {
  line(`  FAILED: ${error.code ?? error.message}`);
  line('  The host name does not resolve from inside the app. Check DB_HOST.');
}

/* ── 3. Can we open a TCP connection? ───────────────────────────────────── */

head('3. Can this process open a TCP connection to MySQL?');

/** @param {string} h @param {number} p */
function tryTcp(h, p) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const done = (result) => { sock.destroy(); resolve(result); };
    sock.setTimeout(CONNECT_TIMEOUT_MS);
    sock.once('connect', () => done('open'));
    sock.once('timeout', () => done('timed out'));
    sock.once('error', (e) => done(e.code ?? e.message));
    sock.connect(p, h);
  });
}

for (const h of [...new Set([host, '127.0.0.1', 'localhost'])]) {
  const result = await tryTcp(h, Number(port));
  line(`  ${`${h}:${port}`.padEnd(24)} ${result}`);
}

/* ── 4. Is there a socket to use instead? ───────────────────────────────── */

head('4. MySQL unix sockets on this machine');

const found = [];
for (const p of [...new Set([socket, ...KNOWN_SOCKETS].filter(Boolean))]) {
  let state = 'absent';
  try {
    state = fs.statSync(p).isSocket() ? 'EXISTS (socket)' : 'exists but is not a socket';
    if (state.startsWith('EXISTS')) found.push(p);
  } catch (e) {
    state = e.code === 'EACCES' ? 'exists but not readable by this user' : 'absent';
  }
  line(`  ${p.padEnd(34)} ${state}`);
}

/* ── 5. The real thing ─────────────────────────────────────────────────── */

head('5. Actual Prisma connection');

let prismaError = null;
try {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient({ datasourceUrl: url.toString(), log: ['error'] });
  const rows = await db.$queryRawUnsafe('SELECT 1 AS ok');
  // MySQL hands back BigInt for integer columns, which JSON.stringify refuses.
  line(`  Connected. SELECT 1 returned ${JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);
  const [{ tables }] = await db.$queryRawUnsafe(
    'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  line(`  Tables in "${database}": ${tables}`);
  if (Number(tables) === 0) line('  WARNING: the database is empty — the schema has not been created.');
  await db.$disconnect();
} catch (error) {
  prismaError = error;
  line(`  FAILED: ${error?.constructor?.name ?? 'Error'}`);
  const message = String(error?.message ?? error).split('\n').filter(Boolean);
  for (const l of message.slice(0, 6)) line(`    ${l.trim()}`);
}

/* ── 6. Verdict ────────────────────────────────────────────────────────── */

head('6. What to do');

if (!prismaError) {
  line('  The database is reachable from this process with this configuration.');
  line('  If the site is still failing, restart the app in Setup Node.js App so');
  line('  it picks up the current environment variables.');
} else {
  const msg = String(prismaError.message ?? '');
  const unreachable = /reach database server|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg);
  const denied = /Access denied|authentication failed|P1000/i.test(msg);
  const noDatabase = /Unknown database|does not exist|P1003/i.test(msg);

  if (denied) {
    line('  The server answered and REJECTED the credentials, so the network path');
    line('  is fine. In cPanel, both names carry your account prefix — check that');
    line('  DB_NAME and DB_USER look like "youracct_kites92_shop" and');
    line('  "youracct_kites92_app", and that the user is added to the database');
    line('  with ALL PRIVILEGES in MySQL Databases.');
  } else if (noDatabase) {
    line('  Connected, but that database does not exist. Check DB_NAME against the');
    line('  exact name in cPanel -> MySQL Databases, including the account prefix.');
  } else if (unreachable && found.length > 0) {
    line('  Nothing is answering on TCP, but a MySQL socket does exist here.');
    line('  This is the usual cPanel case: phpMyAdmin and the mysql CLI reach the');
    line('  database over that socket while the app tries TCP. Set:');
    line();
    line(`      DB_SOCKET="${found[0]}"`);
    line();
    line('  in Setup Node.js App -> Environment variables, then Restart.');
  } else if (unreachable) {
    line('  Nothing is answering on TCP and no socket was found at the usual paths.');
    line('  Either MySQL is not running on this machine, or it is on a different');
    line('  host. cPanel -> MySQL Databases shows the hostname to use for DB_HOST;');
    line('  if it says localhost and this still fails, ask your host whether the');
    line('  Node application is allowed to reach MySQL, and for the socket path.');
  } else {
    line('  Unrecognised failure — the message above is the useful part.');
  }
}

line();
process.exit(prismaError ? 1 : 0);
