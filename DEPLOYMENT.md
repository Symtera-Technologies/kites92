# Deploying Kites92 to cPanel

This is written for a shared cPanel host with **Setup Node.js App** (the
Node.js Selector, powered by Passenger). Most Pakistani hosts offer it; if
yours does not, see [If your host has no Node support](#if-your-host-has-no-node-support).

> `kites92.com` currently serves an empty Apache directory listing, so these
> steps assume a clean account.

---

## 0. Check what your host gives you

In cPanel, confirm you have:

- **Setup Node.js App** (Software section) with **Node 20 or newer**
- **MySQL Databases**
- **SSH access** — strongly preferred. Without it you can still deploy, but
  you will be uploading a `node_modules` folder through File Manager, which is
  slow and error-prone.

Next.js 15 needs Node 18.18+; use 20 or 22 if offered.

---

## 1. Create the database

cPanel → **MySQL Databases**

1. Create a database, e.g. `kites92_shop`.
2. Create a user, e.g. `kites92_app`, with a strong password.
3. Add the user to the database with **ALL PRIVILEGES**.

cPanel prefixes both names with your account name. The real names will look
like `youracct_kites92_shop` and `youracct_kites92_app` — use those.

Your connection string:

```
DATABASE_URL="mysql://youracct_kites92_app:PASSWORD@localhost:3306/youracct_kites92_shop?connection_limit=5"
```

**Keep `connection_limit=5`.** Shared hosts cap concurrent MySQL connections
hard, and Prisma's default pool will exhaust it and start throwing
`Too many connections` under even light traffic.

If your password contains `@`, `:`, `/` or `#`, percent-encode it.

---

## 2. Create the Node application

cPanel → **Setup Node.js App** → **Create Application**

| Field | Value |
| --- | --- |
| Node.js version | 20.x or newer |
| Application mode | Production |
| Application root | `kites92` |
| Application URL | your domain |
| Application startup file | `server.js` |

Click **Create**. cPanel makes `~/kites92` and shows a command like
`source /home/youracct/nodevenv/kites92/20/bin/activate && cd ~/kites92` —
copy it; every SSH session needs it so that `node` and `npm` resolve to the
versions cPanel manages.

---

## 3. Build

Next's `standalone` output (already set in `next.config.mjs`) produces a
self-contained server with only the modules it actually needs, which is much
smaller and faster to upload than a full `node_modules`.

### Option A — build locally, upload the result (recommended)

On your machine:

```bash
npm install
npm run build
```

Then assemble the folder to upload:

```
.next/standalone/     →  everything, into the app root
.next/static/         →  to  .next/static/
public/               →  to  public/
prisma/schema.prisma  →  to  prisma/schema.prisma
```

So the server ends up with:

```
~/kites92/
├── server.js              ← from .next/standalone
├── node_modules/          ← from .next/standalone (trimmed)
├── .next/
│   ├── server/            ← from .next/standalone/.next
│   └── static/            ← copied separately, standalone omits it
├── public/
│   ├── images/
│   └── uploads/
├── prisma/schema.prisma
└── .env
```

Upload as a single `.zip` through File Manager and extract on the server —
uploading thousands of files individually will take hours.

> **Important:** `.next/static` and `public` are *not* included in
> `standalone`. Copy them yourself or the site loads with no CSS, no JS and no
> images. This is the single most common standalone-deploy mistake.

### Option B — build on the server (needs SSH and enough RAM)

```bash
source ~/nodevenv/kites92/20/bin/activate && cd ~/kites92
npm ci
npm run build
```

Shared hosts often cap memory around 1 GB, and a Next build can exceed that.
If it is killed, use Option A.

---

## 4. Environment variables

Set these in cPanel → Setup Node.js App → **Environment variables** (preferred;
they survive restarts and stay out of the filesystem), or in `~/kites92/.env`.

```ini
DATABASE_URL="mysql://youracct_user:PASSWORD@localhost:3306/youracct_db?connection_limit=5"
NEXT_PUBLIC_SITE_URL="https://kites92.com"
NEXT_PUBLIC_SITE_NAME="Kites92"
AUTH_SECRET="<32 random bytes, base64url>"
NEXT_PUBLIC_WHATSAPP_NUMBER="923001234567"
NODE_ENV="production"

# Set to 1 if images 404 or the app crashes on an image request — see §7.
NEXT_IMAGE_UNOPTIMIZED="0"

SEED_ADMIN_EMAIL="owner@kites92.com"
SEED_ADMIN_PASSWORD="<a strong password you will change>"
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`NEXT_PUBLIC_*` values are **baked in at build time**, so if you build locally
they must be correct in your local `.env` *before* you run `npm run build`.
Changing them on the server afterwards will not take effect.

---

## 5. Create the tables

**With SSH:**

```bash
source ~/nodevenv/kites92/20/bin/activate && cd ~/kites92
npx prisma db push
npx prisma db seed   # optional: sample catalogue + admin user
```

**Without SSH:** open **phpMyAdmin**, select your database, go to the **SQL**
tab, and paste the contents of `prisma/schema.sql` from this repo. That file is
the complete schema and is generated offline, so it needs no database to
produce. You will then need to create your admin user manually — easiest is to
run the seed once from any machine that can reach the database with Remote
MySQL enabled.

---

## 6. Start it

cPanel → Setup Node.js App → **Restart**.

Visit your domain. Then:

1. Go to `/admin`, sign in with `SEED_ADMIN_EMAIL`.
2. **Change that password immediately.**
3. Settings → fill in real bank details, WhatsApp number and contact details.
4. Products → replace the sample catalogue with your real stock.
5. Settings → clear the sample-data notice.

---

## 7. Images

Next's image optimizer needs a working `sharp` binary. Shared cPanel hosts
sometimes lack a prebuilt one for their glibc version.

If images 404 or the app errors on `/_next/image`:

```ini
NEXT_IMAGE_UNOPTIMIZED="1"
```

Rebuild and redeploy. Images are then served as-is from `public/`, so size
them appropriately before uploading (the hero should be ~1600–2400px wide WebP).

### Uploaded product photographs

Photographs added through the admin product editor are **not** written into
`public/`. `output: 'standalone'` means `public/` is part of the build
artifact, so a redeploy that replaces it wholesale would delete every
photograph the owner had uploaded. They go instead into a directory of their
own and are served by `/api/media/[...path]`, which pins the content type and
sets an immutable cache header.

Default location is `uploads/` beside the app. Point it somewhere already in
your backup set with:

```ini
UPLOAD_DIR="/home/USER/kites92-uploads"
```

The Node process must be able to write there (`0755` owned by the cPanel user
is enough). If it cannot, an upload fails with a message saying so and the
path it tried is in the server log. **Back this directory up** — it is not in
version control and not in the build.

---

## 8. HTTPS

cPanel → **SSL/TLS Status** → run **AutoSSL** for the domain.

`kites92.com` currently presents a self-signed certificate, so this step is
required — browsers will show a full-page warning until a valid certificate is
installed, and the session cookie is `secure` in production and will not be
sent over plain HTTP, which means **login will silently fail without HTTPS**.

Then force HTTPS in cPanel → Domains → *Force HTTPS Redirect*.

---

## If your host has no Node support

Next.js needs a Node process. A static export is **not** a workaround here:
checkout, the admin and order tracking are all server-rendered and would stop
working.

Options, best first:

1. **Ask your host to enable the Node.js Selector.** Most cPanel hosts have it
   and just do not advertise it.
2. **A small VPS** (~$5/month) running Node + MySQL + Nginx. Full control, and
   better latency for Pakistani visitors than most shared hosting.
3. **Vercel for the app + a hosted MySQL** (PlanetScale, Railway). Point the
   `kites92.com` DNS at Vercel. Free tier is sufficient to start.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Unstyled page, no JS | `.next/static` was not copied — see §3 |
| 500 on every page | `DATABASE_URL` wrong, or tables not created |
| `Too many connections` | `connection_limit=5` missing from `DATABASE_URL` |
| Login does nothing | No HTTPS (the `secure` cookie is dropped), or `AUTH_SECRET` unset |
| Images 404 | `sharp` missing — set `NEXT_IMAGE_UNOPTIMIZED=1` |
| Blank page, 503 | App crashed on boot; read the log in Setup Node.js App |
| Changed `NEXT_PUBLIC_*`, nothing happened | Those are build-time; rebuild |
| Admin shows a sample-data banner | Expected until you clear it in Settings |

Application logs: cPanel → Setup Node.js App → your app → **log file** path,
or `~/logs/`.
