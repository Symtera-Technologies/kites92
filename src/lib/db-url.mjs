/**
 * Compose the database connection string from whatever parts the environment
 * provides.
 *
 * WHY THIS EXISTS: a MySQL connection string is a URI, so punctuation in the
 * password has to be percent-encoded by hand, and cPanel's password generator
 * emits it freely. Three characters end the authority component outright —
 * `/`, `#` and `?` — making the string unparseable or, worse, pointing it at a
 * host that is not yours. `%` is nastier still: the URL parses and looks
 * correct, but the password is percent-decoded before it reaches the server, so
 * `%cd` becomes an escape sequence and the credential that arrives is not the
 * one that was typed. (`@` and `:` happen to survive, since the last `@` wins;
 * they are encoded here anyway rather than relying on that.)
 *
 * Every one of these fails at the end of a deploy, as an authentication error
 * or a connection timeout that names the wrong place. Splitting the parts out
 * and encoding them here makes the whole class of bug impossible: you paste the
 * password your host gave you, verbatim, and never think about it again.
 *
 * It also lets `connection_limit` default to a sane value instead of being a
 * query parameter you have to remember. Shared hosts cap concurrent MySQL
 * connections hard and Prisma's default pool will exhaust it.
 *
 * WHAT IT READS: `DB_*` first, then the names other platforms set themselves,
 * so a managed MySQL add-on that injects `MYSQLHOST`/`MYSQLUSER`/`MYSQLDATABASE`
 * works with nothing configured by hand. `ALIASES` below is the full list, and
 * `resolveDatabaseEnv()` reports which name each value actually came from.
 *
 * PRECEDENCE: a whole connection URL, if one is set, always wins and is passed
 * through untouched. Hosted providers hand you one opaque URL with their own
 * required parameters, and taking it apart to put it back together would only
 * lose information.
 *
 * NOTE ON THE PRISMA SCHEMA: `schema.prisma` still says
 * `url = env("DATABASE_URL")`, because Prisma's datasource accepts exactly one
 * environment variable and cannot build a value from parts. That line is for
 * the Prisma CLI, which `scripts/with-database-url.mjs` runs after composing
 * the URL and putting it in the environment. The application never relies on
 * it: `src/lib/db.ts` and `prisma/seed.mjs` pass the composed URL straight to
 * `PrismaClient`, so DATABASE_URL need not exist at runtime at all.
 *
 * This file is plain `.mjs` on purpose: it is imported by the Next app, by
 * `prisma/seed.mjs`, and by the scripts in `scripts/`, and only one of those
 * goes through a TypeScript build.
 */

/** @typedef {Record<string, string | undefined>} Env */

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = '3306';

/**
 * Shared hosts cap connections aggressively; Prisma's own default pool
 * (num_cpus * 2 + 1) is well over a typical cPanel allowance.
 */
const DEFAULT_CONNECTION_LIMIT = '5';

/**
 * Accepted names for each part, in order of preference. The `DB_*` names are
 * this project's own and are what `.env.example` documents; the rest are names
 * that hosting platforms and MySQL add-ons set on their own, included so that a
 * deployment works without renaming anything by hand.
 */
const ALIASES = {
  url: ['DATABASE_URL', 'MYSQL_URL', 'DB_URL'],
  host: ['DB_HOST', 'MYSQL_HOST', 'MYSQLHOST', 'DATABASE_HOST'],
  port: ['DB_PORT', 'MYSQL_PORT', 'MYSQLPORT', 'DATABASE_PORT'],
  name: ['DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE', 'MYSQLDATABASE', 'DATABASE_NAME'],
  user: ['DB_USER', 'DB_USERNAME', 'MYSQL_USER', 'MYSQLUSER', 'DATABASE_USER'],
  password: ['DB_PASSWORD', 'DB_PASS', 'MYSQL_PASSWORD', 'MYSQLPASSWORD', 'DATABASE_PASSWORD'],
  socket: ['DB_SOCKET', 'MYSQL_SOCKET', 'MYSQL_UNIX_PORT'],
  limit: ['DB_CONNECTION_LIMIT', 'DB_POOL_SIZE'],
};

/** Every name this module will look at — used by the diagnostic. */
export const DATABASE_ENV_NAMES = Object.freeze(Object.values(ALIASES).flat());

/**
 * First non-empty value among a part's accepted names.
 *
 * @param {Env} env
 * @param {readonly string[]} names
 * @returns {{ value: string, from: string | null, definedAt: string | null }}
 */
function pick(env, names) {
  let definedAt = null;

  for (const name of names) {
    const raw = env[name];
    if (typeof raw !== 'string') continue;

    // cPanel's environment-variable UI is a web form, and pasted values arrive
    // with stray whitespace more often than not.
    const value = raw.trim();

    // Remember that the name existed even if blank: an explicitly empty value
    // is meaningful for the connection limit.
    if (definedAt === null) definedAt = name;
    if (value !== '') return { value, from: name, definedAt };
  }

  return { value: '', from: null, definedAt };
}

/**
 * Which environment variable each part was taken from, with no values. For the
 * diagnostic and for log lines.
 *
 * @param {Env} [env]
 * @returns {Record<string, string | null>}
 */
export function resolveDatabaseEnv(env = process.env) {
  /** @type {Record<string, string | null>} */
  const out = {};
  for (const [part, names] of Object.entries(ALIASES)) out[part] = pick(env, names).from;
  return out;
}

/**
 * Build the connection string, or throw with a message naming exactly what is
 * missing. Never includes the password in an error.
 *
 * @param {Env} [env]
 * @returns {string}
 */
export function buildDatabaseUrl(env = process.env) {
  const explicit = pick(env, ALIASES.url);
  if (explicit.value) return explicit.value;

  const name = pick(env, ALIASES.name).value;
  const user = pick(env, ALIASES.user).value;

  const missing = [];
  if (!name) missing.push('DB_NAME');
  if (!user) missing.push('DB_USER');
  if (missing.length > 0) {
    throw new Error(
      `Database not configured: ${missing.join(' and ')} ${
        missing.length === 1 ? 'is' : 'are'
      } empty.\n` +
        'Set DB_NAME, DB_USER and DB_PASSWORD (plus DB_HOST and DB_PORT if the\n' +
        'database is not on localhost:3306), or set DATABASE_URL to a complete\n' +
        'connection string if your host gave you one.\n' +
        `Equivalents are also accepted: ${ALIASES.name.join(', ')} for the database\n` +
        `name and ${ALIASES.user.join(', ')} for the user.\n` +
        'See .env.example.',
    );
  }

  const host = pick(env, ALIASES.host).value || DEFAULT_HOST;
  const portPick = pick(env, ALIASES.port);
  const port = portPick.value || DEFAULT_PORT;

  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(
      `${portPick.from ?? 'DB_PORT'} must be a port number between 1 and 65535, not "${port}".`,
    );
  }

  // The password is the whole reason this file exists. encodeURIComponent
  // escapes every character that is not legal unescaped in a URI userinfo
  // field — including @ : / ? # & = + $ , and ; — and leaves the handful that
  // are legal there alone. An empty password is valid and stays empty.
  const password = pick(env, ALIASES.password).value;
  const credentials = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);

  const url = new URL(`mysql://${credentials}@${host}:${port}`);
  // Not template interpolation: a database name is a single path segment and
  // cPanel prefixes it with the account name, which can contain characters
  // that need escaping.
  url.pathname = `/${encodeURIComponent(name)}`;

  // An explicitly empty connection limit means "do not set one" — for a
  // dedicated server where Prisma's default pool is the right answer.
  const limitPick = pick(env, ALIASES.limit);
  const limit = limitPick.definedAt === null ? DEFAULT_CONNECTION_LIMIT : limitPick.value;

  if (limit) {
    if (!/^\d+$/.test(limit) || Number(limit) < 1) {
      throw new Error(
        `${limitPick.from ?? 'DB_CONNECTION_LIMIT'} must be a positive whole number ` +
          `(or empty to use Prisma's default), not "${limit}".`,
      );
    }
    url.searchParams.set('connection_limit', limit);
  }

  // A Unix socket, where the host has MySQL listening on one instead of (or as
  // well as) TCP. This is the difference that bites on shared Linux hosting:
  // the `mysql` CLI and phpMyAdmin reach `localhost` over the socket, while
  // Prisma opens a TCP connection, so the database can look perfectly healthy
  // in the control panel and still be unreachable from the app. The symptom is
  // "Can't reach database server at `localhost:3306`".
  //
  // Prisma still wants a host in the URL when a socket is given; it is ignored
  // in favour of the socket path.
  //
  // Appended to the query by hand, and LAST: `searchParams` percent-encodes
  // every "/" in the path, and any later `searchParams.set` would re-encode the
  // whole query and undo this. A slash is legal unencoded in a query string,
  // and Prisma's documentation shows the path plain, so this keeps the value
  // byte-for-byte what the host told you to use.
  const socket = pick(env, ALIASES.socket).value;
  if (socket) {
    url.search = url.search ? `${url.search}&socket=${socket}` : `socket=${socket}`;
  }

  return url.toString();
}

/**
 * The same target, safe to put in a log line or an error page: no password,
 * ever. Used when a connection fails and the question is "which database did
 * it even try?".
 *
 * @param {Env} [env]
 * @returns {string}
 */
export function describeDatabaseTarget(env = process.env) {
  try {
    const url = new URL(buildDatabaseUrl(env));
    const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || '(none)';
    const user = decodeURIComponent(url.username) || '(none)';
    return `${user}@${url.hostname}:${url.port || DEFAULT_PORT}/${database}`;
  } catch {
    return '(not configured)';
  }
}
