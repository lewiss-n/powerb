# Nairobi Powerbikes: website, API and admin dashboard

- **Website** (`public/`): bikes with prices, financing calculator, test-ride and service booking, gear shop, spare-parts requests, rides and the rider wall.
- **Server** (`server/`): Node.js + Express API, libSQL database (SQLite-compatible), first-party visitor analytics.
- **Admin dashboard** (`/admin`): overview, traffic, bookings, orders, leads board, rider wall moderation, prices and stock.

The same code runs on **Vercel** (for showing people) and **Docker** (for running it for real).

---

## Deploy to Vercel

### Option 1: from GitHub (easiest)

1. Create a new repository on GitHub and upload this folder to it (everything except `node_modules`, `data` and `.env`).
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub and **Import** the repository.
3. On the configure screen:
   - **Framework Preset:** Other
   - **Build Command / Output Directory:** leave empty. `vercel.json` already sets everything.
   - **Environment Variables:** add `ADMIN_PASSWORD` with the password you'll give people for the admin panel.
4. Click **Deploy**. In about a minute you get a link like `https://nairobi-powerbikes.vercel.app`.

- Website: `https://<your-project>.vercel.app`
- Admin panel: `https://<your-project>.vercel.app/admin`

### Option 2: from your computer with the Vercel CLI

```bash
npm install -g vercel
vercel            # first time: log in and answer the setup questions (accept the defaults)
vercel env add ADMIN_PASSWORD
vercel --prod
```

### How data works on Vercel

Vercel doesn't keep files between restarts, so there are two modes.

| | Demo mode (default) | Permanent mode (Turso) |
|---|---|---|
| Setup | Nothing | A free Turso database, 2 environment variables |
| What viewers see | The site plus 90 days of realistic demo activity in the dashboard | Real data that persists |
| New bookings, orders, edits | Show up straight away, but reset when Vercel restarts the server (after a quiet spell or a redeploy) | Kept permanently |
| Best for | Showing the pitch | Running it for real |

**To switch on permanent mode:**

1. Create a free account at [turso.tech](https://turso.tech) and create a database (any name, pick the region closest to Kenya).
2. Copy its **database URL** (starts with `libsql://`) and create an **auth token**.
3. In Vercel: Project → Settings → Environment Variables, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then redeploy.
4. Optional, to load the demo activity into Turso once, run this on your computer:

   ```bash
   npm install
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run seed
   ```

   On Windows PowerShell: `$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run seed`

Visitor locations work automatically on Vercel: it tells the server each visitor's country and city.

---

## Run with Docker

```bash
cp .env.example .env        # then set ADMIN_PASSWORD and SESSION_SECRET
docker compose up -d --build
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin

The database and uploaded photos live in the `powerbikes-data` Docker volume, so they survive restarts and rebuilds.

```bash
docker compose logs -f            # watch the server
docker compose down               # stop (data is kept)
docker compose down -v            # stop AND delete all data
```

Back up the database: `docker cp nairobi-powerbikes:/data/powerbikes.db ./backup.db`

## Run without Docker

Needs Node 20 or newer.

```bash
npm install
npm start          # http://localhost:3000, data stored in ./data/
```

---

## Images

The site serves its own optimised images from `public/img/`: each photo as WebP at 160, 480, 960 and 1600 px wide, and the browser picks the smallest one that looks sharp. Generate them once before deploying:

```bash
npm install
npm run images
```

No Node on your computer? Use Docker instead (run from the project folder):

```bash
docker run --rm -v "${PWD}:/app" -w /app node:22-bookworm-slim sh -c "npm install && npm run images"
```

On Windows Command Prompt, replace `${PWD}` with `%cd%`.

Until the images are generated, the server sends each image request to the original on the old site, so nothing breaks in the meantime. On Vercel, commit `public/img/` with the rest of the project so the images are served from Vercel's CDN.

## Settings (environment variables)

| Variable | What it does |
|---|---|
| `ADMIN_PASSWORD` | Password for /admin. Defaults to `powerbikes`. **Change it before sharing the link.** |
| `SESSION_SECRET` | Signs admin login cookies. Optional; if unset it's derived from the admin password. Use a long random string (`openssl rand -hex 32`). |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Use a hosted Turso database instead of a local file. Needed on Vercel for permanent data. |
| `COOKIE_SECURE` | `true` when served over HTTPS. Automatic on Vercel. |
| `SEED_DEMO` | `false` to start with no demo activity (for a real launch). |
| `PORT` | Port for Docker / local runs. |

To clear demo activity later and start clean (keeps bikes, products and prices): `npm run seed:reset` with `SEED_DEMO=false`.

## What the dashboard tracks

| Metric | Where it comes from |
|---|---|
| Visitors, visits, page views | A tiny beacon on each page (`/api/track`). Bots and headless browsers are ignored. |
| Traffic source | `utm_source` in the link, otherwise the referring site (Google, Instagram, WhatsApp, Facebook, TikTok…). Tag showroom QR codes with `?utm_source=qr`. |
| Location | Country and city from Vercel or Cloudflare headers. Elsewhere, the country comes from the visitor's time zone. |
| Device and browser | User agent and screen width |
| WhatsApp and call taps | Clicks on wa.me and tel: links |
| Quiz, calculator, bike views | Events from those features |
| Bookings, orders, leads | Form submissions, stored in the database |
| Revenue | Paid gear and parts orders, plus bike sales (move a lead to "Won" and enter the sale value) |

## Project layout

```
api/index.js        Vercel entry point (loads server/app.js)
server/app.js       The Express app: API, admin API, file routes
server/index.js     Local / Docker entry point (starts the app on a port)
server/db.js        Database connection (local file, Vercel /tmp, or Turso) and schema
server/seed.js      Catalogue and demo data
public/             The website and admin panel (served by Vercel's CDN)
vercel.json         Vercel routing and caching
```

## Not connected yet

- **M-Pesa**: reservations and orders are recorded, but no payment is taken. Daraja STK push plugs into `reserveModal` / `orderModal` in `public/site.js` and a new server route.
- **SMS / WhatsApp confirmations**: the copy promises them, so wire up Africa's Talking or the WhatsApp Business API before launch, or soften the copy.
- **Prices are indicative estimates**, not Nairobi Powerbikes' real prices. Edit them in Admin → Prices & stock.
