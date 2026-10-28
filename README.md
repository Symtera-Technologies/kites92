# Kites92

An online kite store for Basant in Punjab — traditional guddas sized in *tawa*,
plain cotton *dor*, *charkhi* spools and festival bundles — with a photographic
hero, an interactive 3D kite scene, and a complete order pipeline backed by
MySQL.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) | Server components keep the catalogue queries off the client |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v3 | Design tokens in `tailwind.config.ts` |
| 3D | three.js + React Three Fiber + drei | Real-time, no asset downloads |
| Scroll | Lenis + rAF-driven transforms | Scroll-linked motion without React re-renders |
| Database | **MySQL** via Prisma | Matches cPanel hosting |
| Auth | `jose` JWT in an httpOnly cookie | Runs on Node and Edge; no session table |
| Validation | Zod | Same schemas guard every API route |

---

## Quick start

```bash
npm install
cp .env.example .env          # then fill in the DB_* values and AUTH_SECRET
npm run db:push               # create the tables
npm run db:seed               # sample catalogue + admin user
npm run dev
```

Open <http://localhost:3000>. The admin is at `/admin`.

Generate an `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### You need a MySQL database

There is no local database in this repo. Either install MySQL/MariaDB locally,
or point `DB_HOST` at your cPanel database and enable **Remote MySQL** for your
IP while developing.

The connection string is built from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD` and `DB_CONNECTION_LIMIT` by `src/lib/db-url.mjs`, which
percent-encodes the credentials for you — paste the password exactly as your
host gave it, punctuation and all. Setting `DATABASE_URL` directly still works
and overrides all of them, for hosts that hand you one opaque URL.

Names other platforms set themselves — `MYSQLHOST`, `MYSQL_DATABASE`,
`MYSQLUSER`, `MYSQLPASSWORD`, `MYSQL_UNIX_PORT` and friends — are read as
fallbacks, so a managed MySQL add-on works without renaming anything. `DB_*`
wins where both are present, and `npm run diagnose:db` reports which variable
each part came from.

`DATABASE_URL` is not needed to run the app. `src/lib/db.ts` and
`prisma/seed.mjs` pass the composed URL to `PrismaClient` directly, so nothing
at runtime reads it. The Prisma *CLI* is different: it reads
`env("DATABASE_URL")` out of `schema.prisma` and refuses to run without it,
because a Prisma datasource accepts exactly one environment variable and cannot
assemble one from parts. So `npm run db:push`, `db:seed`, `db:studio` and the
`prisma generate` inside `npm run build` go through
`scripts/with-database-url.mjs`, which composes the value and injects it. Call
`prisma` by hand and it will say the variable is missing; use the npm scripts.

When the database is unreachable or unconfigured, `npm run diagnose:db` reports
what this process can see — which variables are set, whether the host resolves,
whether TCP connects, which MySQL sockets exist — and names the fix. On a host
with no shell it can be run from cPanel's Setup Node.js App → Run JS script.

`prisma/schema.sql` is a ready-made dump of the full schema (14 tables,
`utf8mb4` so Urdu works) if you would rather create the tables with
phpMyAdmin than run `db:push`. Regenerate it with `npm run db:sql`.

#### The portable MySQL on this machine

This machine runs a **portable MySQL 8.4.13** at `D:\mysql-portable`, set up
without the installer: it is not a Windows service, nothing starts at boot, and
uninstalling it is deleting that one folder. Config is `D:\mysql-portable\my.ini`
(loopback only, X protocol off, `utf8mb4`), data is `D:\mysql-portable\data`.

It does **not** start with Windows. Start it before `npm run dev`:

```bash
D:/mysql-portable/mysql-8.4.13-winx64/bin/mysqld.exe \
  --defaults-file=D:/mysql-portable/my.ini &
```

Stop it with `mysqladmin -u root -p shutdown` from the same `bin` directory.
Credentials are the ones already in `.env`, and this database is reachable only
from this machine - it is a development convenience, not a deployment target.

Two Windows-specific traps worth knowing:

- **`prisma generate` fails with `EPERM ... query_engine-windows.dll.node`**
  when `next dev` is running, because the dev server holds that DLL open. Stop
  the dev server, generate, then start it again. `db:push` runs `generate` at
  the end, so this bites on a plain `npm run db:push` too.
- **A dev server left running for days degrades.** Symptom is `Jest worker
  encountered N child process exceptions` on dynamic routes (`/product/[slug]`,
  `/collections/[slug]`) while static ones still serve. It is the compiler
  workers dying, not your code. Stop the `next dev` process chain, delete
  `.next`, and restart.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Physics + IK acceptance checks (below) |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:sql` | Regenerate `prisma/schema.sql` offline |
| `npm run db:seed` | Seed the sample catalogue |
| `npm run db:studio` | Prisma Studio, a quick DB browser |

---

## What is real, and what you must replace

This matters more than anything else in this README.

### Replace before taking orders

1. **The catalogue is sample data.** The products, prices and stock in
   `prisma/seed.mjs` use correct trade vocabulary and realistic price bands,
   but they are not your inventory. A banner shows across the admin until you
   clear the `catalogue.sampleData` setting.
2. **The bank details are placeholders.** `payment.bankName`,
   `payment.accountTitle` and `payment.accountNumber` literally say
   `REPLACE WITH YOUR…`. They are shown to every bank-transfer customer.
   Admin → Settings → Payment.
3. **The WhatsApp number is a placeholder** (`923001234567`).
4. **The delivery zones are a guess.** Cities, charges, free-delivery
   thresholds and COD availability are editable; a city that is not in
   `DeliveryZone` cannot be selected at checkout, which is how delivery
   restrictions are enforced.

### Deliberately empty

- **Reviews.** Nothing in this codebase ever creates a review. Writing
  testimonials for customers who do not exist would be fabrication, so the
  table starts empty, the homepage testimonials section hides itself until
  there is at least one approved review, and reviews only appear after you
  approve them in Admin → Reviews.
- **Product photography.** There are no photographs of your kites, so none are
  invented. Until you upload real ones, product cards draw an SVG kite motif
  in that variant's actual colour, and the product page shows a rotating 3D
  model labelled *"3D illustration showing shape and colour — not a
  photograph of the item."* Upload one at Admin → Products → a product →
  Photographs and the real picture replaces the illustration everywhere,
  including the card, the basket line and the link preview.
- **The Basant gallery.** Hidden until you put real photographs in the
  `gallery.images` setting.

### The hero image

`public/images/hero-basant-lahore.webp` is the image you supplied — Basant over
Lahore with the Badshahi Mosque behind. It is 1672×941 and 271 KB, converted
from the 2.6 MB PNG original (a ~90% saving; a multi-megabyte hero is the
fastest way to wreck Largest Contentful Paint).

The untouched original is in `assets/`, which sits **outside** `public/` and is
therefore never served or deployed. To re-export after editing:

```bash
ffmpeg -y -i assets/hero-basant-lahore-source.png \
  -c:v libwebp -quality 82 -compression_level 6 -preset photo \
  public/images/hero-basant-lahore.webp
```

Swapping the file in place is all that is needed; it is the only photograph
the site uses.

The closing "The Sky Is Calling!" band used to reuse this same image at a
tighter crop. It no longer does — the wash required to keep that copy legible
left the photograph as a murky haze, and it put the same picture on screen
twice. It is now a painted dusk gradient built from `skyStops.sunset`, the
same stops the 3D sky uses. If you want a photograph there, add a *second*
one to `public/images/` and render it behind the gradient layers in
`FinalCta.tsx`.

> If you replace it and still see the old picture, clear Next's optimizer
> cache: `rm -rf .next/cache/images`. It is keyed by filename, so reusing a
> name serves the previous image.

---

## The 3D systems

Real-time three.js. No models are downloaded — the kites, the flyer and the
rooftops are all generated in code, so the 3D costs no asset payload.

| Module | Role |
| --- | --- |
| `src/lib/three/kiteFlight.ts` | Flight simulation |
| `src/lib/three/kiteGeometry.ts` | Sail, spars and animated tail geometry |
| `src/lib/three/ik.ts` | Two-bone inverse kinematics for the flyer's arms |
| `src/lib/three/quality.ts` | Device tier detection |
| `src/components/three/` | The React layer |

### Two kite models, on purpose

`TetheredKite` is the hero kite: a real force integrator with an
**inextensible-string position constraint**, so the line goes taut, the kite
arcs around the flyer's hand, and the cursor genuinely steers it. One per scene.

`DriftingKite` is background scenery: a closed-form path evaluated at time *t*,
with no state. Dozens cost almost nothing and they render as a single instanced
draw call. Simulating all of them properly would buy detail nobody can see and
spend the frame budget that makes the hero kite feel good.

### The tests exist for a reason

```bash
npm run test
```

Two things here fail *silently and plausibly*: a left-handed basis matrix and
an energy-injecting lift term both look like perfectly reasonable vector maths
in review. Both shipped during this build and were caught only by these
assertions — the kite was accelerating to 73 m/s and the orientation
quaternions were not unit length. The checks pin the properties that actually
matter on screen:

- the string never stretches, the kite never sinks through the roof
- velocity stays bounded; nothing produces NaN, including on a 2-second frame
  stall or a negative delta
- quaternions stay unit length
- arm bones never change length, and the elbow never flips inside-out

### Performance

Quality resolves once per page (`QualityProvider`) from core count, device
memory, pointer type and viewport, into `high` / `medium` / `low`. That tier
sets background-kite count (36/18/8), shadows, device pixel ratio, geometry
subdivision and the number of animated flyers.

Every scene is wrapped in `SceneCanvas`, which:

- renders a **static fallback** when WebGL is unavailable, so the store still
  works;
- sets `frameloop="never"` while the scene is offscreen, so a long page costs
  one scene's GPU time rather than three;
- renders a single frame under `prefers-reduced-motion` instead of animating.

three.js is code-split, so it only ships on routes that actually render a
scene — `/shop` and `/checkout` carry none of it (~122 kB of JS).

**The Basant Experience section is currently off the homepage.** It is 320vh of
sticky canvas, and because every catalogue section above it hides itself when
the database is empty, it ended up as three screens of near-empty sky directly
under the hero. `src/components/sections/BasantExperience.tsx` and everything
in `src/components/three/` are untouched; re-import the section in
`src/app/page.tsx` to put it back, which also adds three.js to the homepage
bundle. The product page still renders a rotating 3D model, so the 3D code is
live either way.

Its slot under the hero is now `TawaGuide` — a kite-sizing explainer that
depends on no data at all, so the hero is never followed by nothing.

---

## Commerce

### Money

Every monetary column is an **integer of whole Pakistani Rupees**. PKR has no
circulating sub-unit, so rupee integers are exact and avoid both float drift
and `Decimal` marshalling. `src/lib/commerce/money.ts` is the only module
allowed to turn a fraction into a rupee figure.

### The client is never trusted

The cart lives in the browser's localStorage and its prices are **display
only**. `POST /api/checkout` reads only variant IDs and quantities from the
request, then recomputes everything — prices, stock, coupon, delivery — from
the database. Stock is decremented inside a transaction with the quantity in
the `WHERE` clause, so two simultaneous checkouts cannot both claim the last
kite.

### When the database is unreachable

A storefront that cannot reach MySQL has three honest answers, and the wrong
one is a lie about the business rather than a cosmetic glitch. So reads in
`src/lib/commerce/queries.ts` come in two flavours and pages pick deliberately:

- **`optional(...)`** returns a fallback and logs loudly. For bands a page can
  do without — homepage sections, the shop's filter rail, a WhatsApp number
  for a help link. A section with nothing in it simply does not render.
- **`attempt(...)`** returns `ReadResult<T>`: `{ ok: true, data }` or
  `{ ok: false }`. For anything a page then makes a **claim** about.

The distinction exists because an empty array cannot tell `/shop` whether the
catalogue is empty or unreadable, and the two call for opposite copy. Rendering
"0 products", "no matches for your search", "no delivery areas are configured"
or a `notFound()` on an outage tells the customer the shelves are bare, their
spelling was wrong, or that Kites92 has stopped delivering — none of which is
true. `src/components/ui/Unavailable.tsx` is the counterpart to `EmptyState`:
it says the fault is ours, and offers only paths that do not need the database
(a static page, and a real WhatsApp conversation).

Two rules follow from this and are worth keeping:

- **Never 404 on a failed read.** A 404 is the one answer that cannot be taken
  back — it tells crawlers to drop a page that is perfectly fine. `/product`
  and `/collections` check `ok` *before* `notFound()`, and mark the outage
  `noindex` so it is never cached as the page's content.
- **Checkout withholds itself.** With no delivery zones it cannot price
  delivery or tell COD from bank transfer, so it renders no form at all rather
  than collect an address against a promise it cannot keep. `/delivery` may
  degrade, because nothing there is charged; `/checkout` may not. That is why
  `requireDeliveryZones` has both a graceful and a strict wrapper.

### Order lifecycle

`PENDING_PAYMENT → CONFIRMED → PACKED → DISPATCHED → DELIVERED`
(plus `CANCELLED` / `REFUNDED`).

Guests can check out. Each order gets a 128-bit `trackingToken`; the customer's
order page is `/order/<token>`, and `/track` looks it up from an order number
**plus** the phone number it was placed with — an order number alone is short
enough to guess, and would otherwise expose a stranger's address.

### Admin — `/admin`

Dashboard (open orders, fulfilled revenue, low stock), Orders (search by
number, name or phone; update status; record payments), Products, Reviews
(approve/unpublish/delete) and Settings.

Products is two screens. The list at `/admin/products` is the season view:
price and stock inline, one form per variant, publish/unpublish, and a
thumbnail so it is obvious at a glance which products still have no
photograph. The editor at `/admin/products/[id]` is everything else — name,
Urdu name, slug, tagline, description, category, prices, tawa size, material,
homepage and bundle-builder flags, SEO fields, photographs and variants.

Every admin server action calls `requireAdmin()` itself. A layout guard
protects the rendering of a page, not the endpoints it posts to.

#### What the editor refuses to do

Four rules are enforced in `catalogue-actions.ts`, not in the browser, because
each of them is the storefront telling a customer something untrue:

- **Publishing a product with no active variant.** There would be nothing to
  put in a basket, so the page would show a price and no way to buy at it.
  Deleting *or hiding* the last variant of a published product is refused for
  the same reason — set it back to Draft first.
- **A "was" price at or below the asking price.** A struck-through figure that
  is not a reduction is a fake discount.
- **An image with no description.** `ProductImage.alt` is required by the
  schema; the editor requires at least four characters of it, and uploads one
  file at a time so each photograph gets its own line rather than sharing one.
- **Deleting without typing the slug.** The confirmation is checked on the
  server, not by a dialog the owner can click past. Past orders survive a
  deletion either way: `OrderItem` keeps its own copy of the name and price.

The editor also warns, without blocking, when `basePriceRs` no longer matches
the cheapest active variant — cards would advertise a "from" price that no
variant charges.

Forms are plain HTML posting to server actions, with no client components, so
the whole admin works on a bad connection and with JavaScript switched off.
Results come back as a `?notice=` code from a closed set in
`src/components/admin/Notice.tsx`, which is why a URL can never put its own
text on the page.

#### Uploaded photographs

Uploads go to `UPLOAD_DIR` (default `./uploads`) and are served by
`/api/media/[...path]`. They are deliberately **not** in `public/`:
`output: 'standalone'` makes `public/` part of the build artifact, so a
redeploy would delete every photograph the owner had added. Back that
directory up — it is in neither git nor the build.

`src/lib/media.ts` holds the rules. The stored filename is random and its
extension comes from the file's own magic bytes, never from the upload: a
`.png` containing anything else is refused, and SVG is refused outright
because an SVG served from this domain can run scripts in a visitor's
browser. The limit is 6 MB, and `next.config.mjs` raises the server-action
body cap to 8 MB to leave room for it — the Next default is 1 MB, smaller
than a single phone photo. Deleting an image or its product unlinks the file
as well as the row.

---

## Content you can edit without code

Anything the site *claims* about the business lives in the `Setting` table and
is editable at Admin → Settings: contact details, WhatsApp number, bank
details, advance percentage, the Basant sales/legal notice, the safety notice,
delivery and refund copy, the homepage "Why Kites92" reasons (JSON) and the
gallery images (JSON).

The site should never assert something the owner cannot correct.

---

## Accessibility & SEO

- Skip link, visible focus rings, labelled form controls, `aria-current` on nav.
- The 3D canvas is `aria-hidden` — it is scenery; the surrounding markup
  carries the meaning.
- `prefers-reduced-motion` is honoured in CSS *and* in JS (Lenis is disabled,
  scenes render one frame).
- The horizontal gallery is a focusable, labelled region using native
  scroll-snap, so it works with keyboard, trackpad and touch.
- Product pages emit `Product` structured data. `aggregateRating` is omitted
  entirely when there are no approved reviews rather than sent as zero.
- `sitemap.xml` and `robots.txt` are generated. Cart, checkout, account, admin,
  search and `/order/` are excluded from both.

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the cPanel walkthrough.

---

## Known limitations

- **No online card gateway.** COD and bank transfer are implemented end to
  end. A gateway (JazzCash, Easypaisa, Safepay) needs your merchant
  credentials and is a scoped addition — the `PaymentMethod` enum already has
  a `GATEWAY` member to grow into.
- **No transactional email.** Order confirmation is by WhatsApp and the
  tracking link. Wiring SMTP would be the natural next step.
- **Categories, coupons and delivery zones are not in the admin.** All three
  are live models the storefront reads, and all three are still edited by hand
  in Prisma Studio or SQL. Coupons are the sharp one: checkout validates and
  applies them, so the feature works but has no screen to create one. Products
  themselves are fully editable in the admin.
- **No automated browser tests.** The physics, IK and order maths have
  acceptance checks (69 assertions, `npm run test`). The UI was verified
  manually in Chrome at desktop width; **mobile layout has not been checked in
  a real browser** — the responsive CSS is standard Tailwind breakpoints, but
  give it a pass on a phone before launch.
- **No order has been placed end to end.** The pricing and coupon logic is
  covered by unit tests, and every page has been rendered against a live
  seeded database, but nothing has yet been through `POST /api/checkout`.
  Place one test order and confirm stock decrements.
- **The character is stylised, not photoreal.** It is generated from
  primitives with a real skeleton and IK. Swapping in a rigged GLB later means
  replacing `Character.tsx` while keeping the same `sim` interface.
