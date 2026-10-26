// Nairobi Powerbikes app: the website, the public API, and the admin dashboard + API.
// Exported for Vercel (api/index.js) and started locally / in Docker by server/index.js.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { db, init, DATA_DIR, MODE, ON_VERCEL } = require("./db");
const { seed } = require("./seed");
const { classifySource, classifyDevice, classifyBrowser, locate } = require("./analytics");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "powerbikes";
if (!process.env.ADMIN_PASSWORD) console.warn("ADMIN_PASSWORD not set: using the default 'powerbikes'. Set it before sharing the site.");
// Signs admin login cookies. Must be the same on every server instance, so never random per process.
const SECRET = process.env.SESSION_SECRET || crypto.createHash("sha256").update("np-admin:" + ADMIN_PASSWORD).digest("hex");
const SECURE_COOKIE = process.env.COOKIE_SECURE === "true" || ON_VERCEL;
const PUBLIC = path.join(__dirname, "..", "public");

// Database setup runs once per server start; every request waits for it.
const ready = (async () => {
  await init();
  await seed();
  // One-time fix: rider-wall rows created before images were served locally
  for (const r of await db.all("SELECT id, photo FROM wall WHERE photo LIKE 'https://storage.googleapis.com/msgsndr/%'")) {
    const key = r.photo.replace(/^.*\//, "").replace(/\.\w+$/, "");
    await db.run("UPDATE wall SET photo = ? WHERE id = ?", `/img/${key}-960.webp`, r.id);
  }
  console.log(`Database ready (${MODE})`);
})();

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(async (req, res, next) => { try { await ready; next(); } catch (e) { next(e); } });
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* ---------- helpers ---------- */
const now = () => new Date().toISOString();
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : v == null ? null : String(v).slice(0, max)) || null;
const PHONE = /^(\+?254|0)?[17]\d{8}$/;
const cleanPhone = p => (str(p, 20) || "").replace(/[\s-]/g, "");
const bad = (res, msg) => res.status(400).json({ error: msg });
const parse = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// Very small per-IP rate limit for public writes
const hits = new Map();
function limit(max = 30) {
  return (req, res, next) => {
    const key = req.ip + req.path, t = Date.now();
    const arr = (hits.get(key) || []).filter(x => t - x < 60_000);
    arr.push(t); hits.set(key, arr);
    if (arr.length > max) return res.status(429).json({ error: "Too many requests. Try again in a minute." });
    next();
  };
}
setInterval(() => hits.clear(), 10 * 60_000).unref();

async function logEvent(sessionId, type, meta) {
  if (!sessionId) return;
  const s = (await db.get("SELECT visitor_id FROM sessions WHERE id = ?", sessionId));
  if (s) (await db.run("INSERT INTO events (session_id, visitor_id, type, meta, created_at) VALUES (?,?,?,?,?)", sessionId, s.visitor_id, type, meta ? JSON.stringify(meta) : null, now()));
}

/* ================= PUBLIC API ================= */

app.get("/api/health", async (req, res) => res.json({ ok: true }));

app.get("/api/catalog", async (req, res) => {
  const bikes = (await db.all("SELECT * FROM bikes WHERE active = 1")).map(r => ({ ...parse(r.data), price: r.price, stock: r.stock }));
  const products = (await db.all("SELECT * FROM products WHERE active = 1")).map(r => ({ ...parse(r.data), price: r.price, stock: r.stock }));
  res.set("Cache-Control", "no-store").json({ bikes, products });
});

const SLOT_TIMES = { test: ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"], service: ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"] };
const SLOT_CAP = { test: 2, service: 3 };

app.get("/api/slots", async (req, res) => {
  const type = req.query.type === "service" ? "service" : "test";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || "") ? req.query.date : null;
  if (!date) return bad(res, "Pick a date");
  const dow = new Date(date + "T12:00:00Z").getUTCDay();
  if (dow === 0) return res.json({ date, closed: true, slots: [] });
  const taken = Object.fromEntries((await db.all("SELECT slot, COUNT(*) n FROM bookings WHERE date = ? AND type = ? AND status NOT IN ('cancelled') GROUP BY slot", date, type)).map(r => [r.slot, r.n]));
  const times = dow === 6 ? SLOT_TIMES[type].filter(t => t < "16:00") : SLOT_TIMES[type];
  res.json({ date, slots: times.map(t => ({ time: t, available: (taken[t] || 0) < SLOT_CAP[type] })) });
});

app.post("/api/bookings", limit(10), async (req, res) => {
  const b = req.body || {};
  const type = b.type === "service" ? "service" : "test";
  const name = str(b.name, 80), phone = cleanPhone(b.phone);
  if (!name) return bad(res, "Add your name");
  if (!PHONE.test(phone)) return bad(res, "Add a Kenyan phone number, like 0712 345 678");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || "")) return bad(res, "Pick a day");
  if (!SLOT_TIMES[type].includes(b.slot)) return bad(res, "Pick a time");
  const taken = (await db.get("SELECT COUNT(*) n FROM bookings WHERE date = ? AND slot = ? AND type = ? AND status != 'cancelled'", b.date, b.slot, type)).n;
  if (taken >= SLOT_CAP[type]) return res.status(409).json({ error: "That slot was just taken. Pick another time." });
  const r = (await db.run(`INSERT INTO bookings (type, bike_id, service_type, date, slot, name, phone, licence, mileage, notes, session_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, type, str(b.bike_id, 60), type === "service" ? str(b.service_type, 60) : null, b.date, b.slot, name, phone, str(b.licence, 60), Number.isFinite(+b.mileage) && b.mileage !== "" ? +b.mileage : null, str(b.notes, 1000), str(b.session_id, 40)));
  await logEvent(b.session_id, "booking", { type });
  res.status(201).json({ id: r.lastInsertRowid, ref: `BK-${String(r.lastInsertRowid).padStart(5, "0")}` });
});

app.post("/api/orders", limit(10), async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80), phone = cleanPhone(b.phone);
  if (!name) return bad(res, "Add your name");
  if (!PHONE.test(phone)) return bad(res, "Add a Kenyan phone number, like 0712 345 678");
  const fulfilment = b.fulfilment === "delivery" ? "delivery" : "collect";
  if (fulfilment === "delivery" && !str(b.county)) return bad(res, "Tell us where to deliver");
  let kind, items, total = 0;
  if (b.kind === "parts") {
    kind = "parts";
    const part = str(b.part, 120);
    if (!part) return bad(res, "Tell us which part you need");
    items = [{ name: part, price: 0, qty: 1 }];
  } else {
    kind = "gear";
    if (!Array.isArray(b.items) || !b.items.length) return bad(res, "Your order is empty");
    items = [];
    for (const it of b.items.slice(0, 20)) {
      const p = (await db.get("SELECT * FROM products WHERE id = ? AND active = 1", String(it.id)));
      if (!p) return bad(res, "One of those items is no longer available");
      const qty = Math.min(10, Math.max(1, parseInt(it.qty, 10) || 1));
      items.push({ id: p.id, name: p.name, price: p.price, qty, size: str(it.size, 20) });
      total += p.price * qty;
    }
  }
  const r = (await db.run(`INSERT INTO orders (kind, items, total, name, phone, fulfilment, county, bike, status, session_id) VALUES (?,?,?,?,?,?,?,?,?,?)`, kind, JSON.stringify(items), total, name, phone, fulfilment, str(b.county, 60), str(b.bike, 80), "new", str(b.session_id, 40)));
  await logEvent(b.session_id, "order", { kind, total });
  res.status(201).json({ id: r.lastInsertRowid, ref: `OR-${String(r.lastInsertRowid).padStart(5, "0")}`, total });
});

const LEAD_TYPES = ["finance", "reservation", "contact", "notify", "newsletter", "rsvp"];
app.post("/api/leads", limit(10), async (req, res) => {
  const b = req.body || {};
  if (!LEAD_TYPES.includes(b.type)) return bad(res, "Unknown request type");
  const phone = cleanPhone(b.phone);
  if (!PHONE.test(phone)) return bad(res, "Add a Kenyan phone number, like 0712 345 678");
  if (b.type !== "newsletter" && !str(b.name, 80)) return bad(res, "Add your name");
  const meta = b.meta && typeof b.meta === "object" ? JSON.stringify(b.meta).slice(0, 2000) : null;
  const r = (await db.run(`INSERT INTO leads (type, bike_id, name, phone, email, message, meta, session_id) VALUES (?,?,?,?,?,?,?,?)`, b.type, str(b.bike_id, 60), str(b.name, 80), phone, str(b.email, 120), str(b.message, 2000), meta, str(b.session_id, 40)));
  await logEvent(b.session_id, "lead", { type: b.type });
  res.status(201).json({ id: r.lastInsertRowid });
});

app.get("/api/wall", async (req, res) => {
  res.json((await db.all("SELECT id, name, bike, photo, created_at FROM wall WHERE approved = 1 ORDER BY created_at DESC LIMIT 40")));
});

// Photos are stored in the database, so uploads work on Vercel (no persistent disk) and in Docker alike.
const MAX_MB = 4; // Vercel caps request bodies at 4.5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
});
const imageType = buf => (buf[0] === 0xff && buf[1] === 0xd8) ? "image/jpeg"
  : buf.subarray(0, 4).toString("hex") === "89504e47" ? "image/png"
  : (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") ? "image/webp" : null;

app.post("/api/wall", limit(5), upload.single("photo"), async (req, res) => {
  const name = str(req.body?.name, 60);
  if (!name) return bad(res, "Add your name or handle");
  const mime = req.file && imageType(req.file.buffer);   // real file signature, not the declared type
  if (!mime) return bad(res, `Add a JPG, PNG or WebP photo under ${MAX_MB} MB`);
  const id = crypto.randomBytes(12).toString("hex");
  await db.run("INSERT INTO uploads (id, mime, data) VALUES (?,?,?)", id, mime, req.file.buffer);
  await db.run("INSERT INTO wall (name, bike, photo) VALUES (?,?,?)", name, str(req.body.bike, 60), `/uploads/${id}`);
  res.status(201).json({ ok: true });
});

// Page-view and interaction beacon
const EVENT_TYPES = ["pageview", "bike_view", "quiz_complete", "calc_use", "whatsapp_click", "call_click"];
app.post("/api/track", limit(120), express.text({ type: "*/*", limit: "8kb" }), async (req, res) => {
  const b = typeof req.body === "string" ? parse(req.body) || {} : req.body || {};
  const sid = str(b.sid, 40), vid = str(b.vid, 40);
  if (!sid || !vid || !EVENT_TYPES.includes(b.type)) return res.status(204).end();
  if (/bot|crawl|spider|headless|lighthouse/i.test(req.get("user-agent") || "")) return res.status(204).end();
  const t = now();
  const existing = (await db.get("SELECT id FROM sessions WHERE id = ?", sid));
  if (!existing) {
    const ua = req.get("user-agent") || "";
    const { country, city } = locate(req, str(b.tz, 60));
    (await db.run(`INSERT INTO sessions (id, visitor_id, started_at, last_seen, source, referrer, campaign, landing, device, browser, country, city, pageviews) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`, sid, vid, t, t, classifySource({ utm_source: b.utm_source, referrer: b.referrer, host: req.get("host") }), str(b.referrer, 300), str(b.utm_campaign, 60), str(b.path, 200), classifyDevice(ua, +b.w || 0), classifyBrowser(ua), country, city));
  }
  (await db.run(`UPDATE sessions SET last_seen = ?, pageviews = pageviews + ? WHERE id = ?`, t, b.type === "pageview" ? 1 : 0, sid));
  (await db.run("INSERT INTO events (session_id, visitor_id, type, path, meta, created_at) VALUES (?,?,?,?,?,?)", sid, vid, b.type, str(b.path, 200), b.meta ? JSON.stringify(b.meta).slice(0, 500) : null, t));
  res.status(204).end();
});

/* ================= ADMIN AUTH ================= */
const sign = v => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
function cookieOf(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function isAdmin(req) {
  const c = cookieOf(req, "np_admin");
  if (!c) return false;
  const [exp, sig] = c.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: "Sign in again" });

app.post("/api/admin/login", limit(8), async (req, res) => {
  const pw = String((req.body || {}).password || "");
  const a = crypto.createHash("sha256").update(pw).digest(), b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: "Wrong password" });
  const exp = String(Date.now() + 7 * 864e5);
  const secure = SECURE_COOKIE ? "; Secure" : "";
  res.set("Set-Cookie", `np_admin=${exp}.${sign(exp)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${secure}`).json({ ok: true });
});
app.post("/api/admin/logout", async (req, res) => res.set("Set-Cookie", "np_admin=; Path=/; Max-Age=0").json({ ok: true }));
app.get("/api/admin/me", async (req, res) => res.json({ admin: isAdmin(req) }));
app.use("/api/admin", requireAdmin);

/* ================= ADMIN API ================= */
const LOCAL = "'+3 hours'"; // Africa/Nairobi, no DST

function range(days) {
  const d = Math.min(365, Math.max(1, parseInt(days, 10) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - d * 864e5);
  const prevFrom = new Date(from.getTime() - d * 864e5);
  return { d, from: from.toISOString(), to: to.toISOString(), prevFrom: prevFrom.toISOString() };
}

async function kpis(from, to) {
  const q = (sql) => db.get(sql, from, to);
  const [s, leads, bookings, orders, bikes, wa, converted] = await Promise.all([
    q("SELECT COUNT(*) sessions, COUNT(DISTINCT visitor_id) visitors, COALESCE(SUM(pageviews),0) pageviews FROM sessions WHERE started_at >= ? AND started_at < ?"),
    q("SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND created_at < ?"),
    q("SELECT COUNT(*) n, SUM(type='test') tests FROM bookings WHERE created_at >= ? AND created_at < ?"),
    q("SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN payment_status='paid' THEN total END),0) revenue FROM orders WHERE created_at >= ? AND created_at < ?"),
    q("SELECT COUNT(*) n, COALESCE(SUM(value),0) revenue FROM leads WHERE stage='won' AND created_at >= ? AND created_at < ?"),
    q("SELECT COUNT(*) n FROM events WHERE type='whatsapp_click' AND created_at >= ? AND created_at < ?"),
    q("SELECT COUNT(DISTINCT session_id) n FROM events WHERE type IN ('booking','lead','order') AND created_at >= ? AND created_at < ?")
  ]);
  return {
    visitors: s.visitors, sessions: s.sessions, pageviews: s.pageviews,
    leads: leads.n, bookings: bookings.n, test_rides: bookings.tests || 0, orders: orders.n,
    gear_revenue: orders.revenue, bikes_sold: bikes.n, bike_revenue: bikes.revenue, revenue: orders.revenue + bikes.revenue,
    whatsapp_clicks: wa.n, conversion: s.sessions ? converted.n / s.sessions : 0
  };
}

app.get("/api/admin/overview", async (req, res) => {
  const { d, from, to, prevFrom } = range(req.query.days);
  const all = (sql, ...p) => db.all(sql, ...(p.length ? p : [from]));
  const one = async (sql, ...p) => (await all(sql, ...p))[0];

  const days = [];
  for (let i = d - 1; i >= 0; i--) days.push(new Date(Date.now() + 3 * 3600e3 - i * 864e5).toISOString().slice(0, 10));
  const byDay = (rows, key = "n") => { const m = Object.fromEntries(rows.map(r => [r.day, r[key]])); return days.map(x => m[x] || 0); };
  const evTypes = types => one(`SELECT COUNT(DISTINCT session_id) n FROM events WHERE created_at >= ? AND type IN (${types.map(() => "?").join(",")})`, from, ...types);

  const Q = {
    visitors: all(`SELECT date(datetime(started_at, ${LOCAL})) day, COUNT(DISTINCT visitor_id) n FROM sessions WHERE started_at >= ? GROUP BY day`),
    sessionsDaily: all(`SELECT date(datetime(started_at, ${LOCAL})) day, COUNT(*) n FROM sessions WHERE started_at >= ? GROUP BY day`),
    leadsDaily: all(`SELECT date(datetime(created_at, ${LOCAL})) day, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY day`),
    bookingsDaily: all(`SELECT date(datetime(created_at, ${LOCAL})) day, COUNT(*) n FROM bookings WHERE created_at >= ? GROUP BY day`),
    gearDaily: all(`SELECT date(datetime(created_at, ${LOCAL})) day, SUM(total) n FROM orders WHERE payment_status='paid' AND created_at >= ? GROUP BY day`),
    bikeDaily: all(`SELECT date(datetime(created_at, ${LOCAL})) day, SUM(value) n FROM leads WHERE stage='won' AND created_at >= ? GROUP BY day`),
    sources: all(`
      SELECT s.source, COUNT(*) sessions,
        SUM(EXISTS (SELECT 1 FROM events e WHERE e.session_id = s.id AND e.type IN ('booking','lead','order'))) conversions
      FROM sessions s WHERE s.started_at >= ? GROUP BY s.source ORDER BY sessions DESC`),
    cities: all(`SELECT COALESCE(city, country || ' (city unknown)') city, country, COUNT(*) sessions FROM sessions WHERE started_at >= ? GROUP BY city, country ORDER BY sessions DESC LIMIT 12`),
    countries: all(`SELECT country, COUNT(*) sessions FROM sessions WHERE started_at >= ? GROUP BY country ORDER BY sessions DESC LIMIT 8`),
    devices: all(`SELECT device, COUNT(*) sessions FROM sessions WHERE started_at >= ? GROUP BY device ORDER BY sessions DESC`),
    browsers: all(`SELECT browser, COUNT(*) sessions FROM sessions WHERE started_at >= ? GROUP BY browser ORDER BY sessions DESC LIMIT 6`),
    heat: all(`SELECT CAST(strftime('%w', datetime(started_at, ${LOCAL})) AS INT) dow, CAST(strftime('%H', datetime(started_at, ${LOCAL})) AS INT) hour, COUNT(*) n FROM sessions WHERE started_at >= ? GROUP BY dow, hour`),
    sess: one("SELECT COUNT(*) n FROM sessions WHERE started_at >= ?"),
    viewed: evTypes(["bike_view"]),
    engaged: evTypes(["quiz_complete", "calc_use", "whatsapp_click", "call_click"]),
    enquired: one(`SELECT COUNT(DISTINCT session_id) n FROM events WHERE created_at >= ? AND (type = 'lead' OR (type = 'booking' AND meta LIKE '%test%'))`),
    bought: one("SELECT COUNT(*) n FROM leads WHERE stage = 'won' AND created_at >= ?"),
    topPages: all(`SELECT path, COUNT(*) views FROM events WHERE type='pageview' AND created_at >= ? GROUP BY path ORDER BY views DESC LIMIT 8`),
    bikeRows: db.all("SELECT id, brand, name, price FROM bikes"),
    views: all(`SELECT json_extract(meta,'$.bike') bike, COUNT(*) n FROM events WHERE type='bike_view' AND created_at >= ? GROUP BY bike`),
    tests: all(`SELECT bike_id, COUNT(*) n FROM bookings WHERE type='test' AND created_at >= ? GROUP BY bike_id`),
    enq: all(`SELECT bike_id, COUNT(*) n FROM leads WHERE bike_id IS NOT NULL AND created_at >= ? GROUP BY bike_id`),
    sold: all(`SELECT bike_id, COUNT(*) n FROM leads WHERE stage='won' AND created_at >= ? GROUP BY bike_id`),
    leadTypes: all(`SELECT type, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY type ORDER BY n DESC`),
    pipeline: all(`SELECT stage, COUNT(*) n FROM leads WHERE type IN ('finance','reservation','contact') AND created_at >= ? GROUP BY stage`),
    productSales: all(`SELECT json_extract(j.value,'$.name') product, SUM(json_extract(j.value,'$.qty')) qty, SUM(json_extract(j.value,'$.price') * json_extract(j.value,'$.qty')) revenue
      FROM orders o, json_each(o.items) j WHERE o.kind='gear' AND o.payment_status='paid' AND o.created_at >= ? GROUP BY product ORDER BY revenue DESC LIMIT 8`),
    kpis: kpis(from, to),
    prev: kpis(prevFrom, from)
  };
  const keys = Object.keys(Q);
  const vals = await Promise.all(keys.map(k => Q[k]));
  const r = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));

  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  r.heat.forEach(x => { heatmap[x.dow][x.hour] = x.n; });
  const map = rows => Object.fromEntries(rows.map(x => [x.bike ?? x.bike_id, x.n]));
  const views = map(r.views), tests = map(r.tests), enq = map(r.enq), sold = map(r.sold);
  const topBikes = r.bikeRows.map(b => ({ id: b.id, name: `${b.brand} ${b.name}`, price: b.price, views: views[b.id] || 0, enquiries: enq[b.id] || 0, test_rides: tests[b.id] || 0, sold: sold[b.id] || 0 }))
    .sort((a, b) => b.views - a.views);

  res.json({
    range: { days: d, from, to },
    kpis: r.kpis, prev: r.prev,
    daily: { days, visitors: byDay(r.visitors), sessions: byDay(r.sessionsDaily), leads: byDay(r.leadsDaily), bookings: byDay(r.bookingsDaily), gear_revenue: byDay(r.gearDaily), bike_revenue: byDay(r.bikeDaily) },
    sources: r.sources, cities: r.cities, countries: r.countries, devices: r.devices, browsers: r.browsers, heatmap,
    funnel: [
      { step: "Visited the site", n: r.sess.n },
      { step: "Viewed a bike", n: r.viewed.n },
      { step: "Used quiz, calculator or WhatsApp", n: r.engaged.n },
      { step: "Booked or enquired", n: r.enquired.n },
      { step: "Bought a bike", n: r.bought.n }
    ],
    topPages: r.topPages, topBikes, leadTypes: r.leadTypes, pipeline: r.pipeline, productSales: r.productSales
  });
});

app.get("/api/admin/live", async (req, res) => {
  const since = new Date(Date.now() - 5 * 60e3).toISOString();
  const sessions = (await db.all(`SELECT s.id, s.source, s.device, s.city, s.country, s.last_seen,
      (SELECT path FROM events e WHERE e.session_id = s.id AND e.type='pageview' ORDER BY e.id DESC LIMIT 1) page
    FROM sessions s WHERE s.last_seen >= ? ORDER BY s.last_seen DESC LIMIT 30`, since));
  const bikes = Object.fromEntries((await db.all("SELECT id, brand || ' ' || name n FROM bikes")).map(r => [r.id, r.n]));
  const feed = (await db.all(`
    SELECT * FROM (
      SELECT 'booking' kind, id, created_at, name, CASE type WHEN 'test' THEN 'Test ride' ELSE 'Service' END AS what, bike_id ref, NULL amount, status FROM bookings
      UNION ALL SELECT 'order', id, created_at, name, CASE kind WHEN 'gear' THEN 'Gear order' ELSE 'Parts request' END, NULL, total, status FROM orders
      UNION ALL SELECT 'lead', id, created_at, name, type, bike_id, value, stage FROM leads
    ) ORDER BY created_at DESC LIMIT 14`)).map(r => ({ ...r, bike: bikes[r.ref] || null }));
  res.json({ active: sessions.length, sessions, feed });
});

// Generic list endpoint with filters
function listRoute(table, { search = [], filters = [], order = "created_at DESC" }) {
  return async (req, res) => {
    const where = [], params = [];
    filters.forEach(f => { if (req.query[f]) { where.push(`${f} = ?`); params.push(req.query[f]); } });
    if (req.query.q && search.length) { where.push(`(${search.map(c => `${c} LIKE ?`).join(" OR ")})`); search.forEach(() => params.push(`%${req.query.q}%`)); }
    if (req.query.days) { where.push("created_at >= ?"); params.push(range(req.query.days).from); }
    const lim = Math.min(500, parseInt(req.query.limit, 10) || 200);
    const rows = (await db.all(`SELECT * FROM ${table} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT ${lim}`, ...params));
    const counts = Object.fromEntries((await db.all(`SELECT ${filters[0]} k, COUNT(*) n FROM ${table} GROUP BY k`)).map(r => [r.k, r.n]));
    res.json({ rows: rows.map(r => ({ ...r, items: r.items ? parse(r.items) : undefined, meta: r.meta ? parse(r.meta) : undefined })), counts });
  };
}
app.get("/api/admin/bookings", listRoute("bookings", { search: ["name", "phone", "bike_id"], filters: ["status", "type"], order: "date DESC, slot DESC" }));
app.get("/api/admin/orders", listRoute("orders", { search: ["name", "phone", "items", "county"], filters: ["status", "kind", "payment_status"] }));
app.get("/api/admin/leads", listRoute("leads", { search: ["name", "phone", "message", "bike_id"], filters: ["stage", "type"] }));
app.get("/api/admin/wall", async (req, res) => res.json({ rows: (await db.all("SELECT * FROM wall ORDER BY approved ASC, created_at DESC")) }));

function patchRoute(table, allowed) {
  return async (req, res) => {
    const sets = [], params = [];
    for (const [k, check] of Object.entries(allowed)) {
      if (k in (req.body || {})) {
        const v = req.body[k];
        if (!check(v)) return bad(res, `Invalid ${k}`);
        sets.push(`${k} = ?`); params.push(v);
      }
    }
    if (!sets.length) return bad(res, "Nothing to update");
    if (table === "leads") sets.push(`updated_at = '${now()}'`);
    if (["bikes", "products"].includes(table)) sets.push(`updated_at = '${now()}'`);
    const r = (await db.run(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`, ...params, req.params.id));
    if (!r.changes) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  };
}
const oneOf = list => v => list.includes(v);
const intOrNull = v => v === null || (Number.isInteger(v) && v >= 0 && v < 1e9);
app.patch("/api/admin/bookings/:id", patchRoute("bookings", { status: oneOf(["pending", "confirmed", "completed", "no_show", "cancelled"]) }));
app.patch("/api/admin/orders/:id", patchRoute("orders", { status: oneOf(["new", "quoted", "paid", "ready", "delivered", "cancelled"]), payment_status: oneOf(["unpaid", "paid", "refunded"]), total: intOrNull }));
app.patch("/api/admin/leads/:id", patchRoute("leads", { stage: oneOf(["new", "contacted", "test_ride", "negotiating", "won", "lost"]), value: intOrNull }));
app.patch("/api/admin/wall/:id", patchRoute("wall", { approved: oneOf([0, 1]) }));
app.delete("/api/admin/wall/:id", async (req, res) => {
  const row = (await db.get("SELECT photo FROM wall WHERE id = ?", req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.photo?.startsWith("/uploads/")) {
    await db.run("DELETE FROM uploads WHERE id = ?", row.photo.slice(9));
    fs.rm(path.join(DATA_DIR, row.photo), () => {});   // older installs kept photos on disk
  }
  (await db.run("DELETE FROM wall WHERE id = ?", req.params.id));
  res.json({ ok: true });
});

app.get("/api/admin/catalog", async (req, res) => {
  res.json({
    bikes: (await db.all("SELECT id, brand, name, style, price, stock, active, updated_at FROM bikes ORDER BY brand, name")),
    products: (await db.all("SELECT id, name, category, price, stock, active, updated_at FROM products ORDER BY category, name"))
  });
});
app.patch("/api/admin/bikes/:id", patchRoute("bikes", { price: intOrNull, stock: intOrNull, active: oneOf([0, 1]) }));
app.patch("/api/admin/products/:id", patchRoute("products", { price: v => Number.isInteger(v) && v >= 0, stock: intOrNull, active: oneOf([0, 1]) }));

// CSV export
app.get("/api/admin/export/:table", async (req, res) => {
  const table = req.params.table.replace(/\.csv$/, "");
  if (!["bookings", "orders", "leads", "sessions"].includes(table)) return res.status(404).end();
  const rows = (await db.all(`SELECT * FROM ${table} ORDER BY ${table === "sessions" ? "started_at" : "created_at"} DESC LIMIT 50000`));
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const esc = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  res.set("Content-Type", "text/csv; charset=utf-8").set("Content-Disposition", `attachment; filename="${table}-${new Date().toISOString().slice(0, 10)}.csv"`)
    .send([cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n"));
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

/* ================= FILES ================= */
// On Vercel, everything in public/ is served by the CDN; only these paths reach the app (see vercel.json).
app.get("/uploads/:id", async (req, res, next) => {
  const row = await db.get("SELECT mime, data FROM uploads WHERE id = ?", req.params.id);
  if (!row) return next();
  res.set("Content-Type", row.mime).set("Cache-Control", "public, max-age=31536000, immutable").send(Buffer.from(row.data));
});
app.use("/uploads", express.static(path.join(DATA_DIR, "uploads"), { maxAge: "30d" }));   // older installs
// Optimised images never change in place (new image = new file name), so cache them for a year
app.use("/img", express.static(path.join(PUBLIC, "img"), { maxAge: "365d", immutable: true }));
// Until `npm run images` has generated a file, send the browser to the original image instead of a broken link
const IMAGE_SOURCES = (() => { try { return require("../scripts/image-sources.json"); } catch { return {}; } })();
app.get("/img/:file", (req, res) => {
  const key = req.params.file.replace(/-\d+\.webp$/, "");
  return IMAGE_SOURCES[key] ? res.redirect(302, IMAGE_SOURCES[key]) : res.status(404).end();
});
app.get("/favicon.svg", (req, res) => res.redirect(302, "https://storage.googleapis.com/msgsndr/jopKPRVI0mmhrcAMgKi9/media/65e166c7dcc9fbc9313c6337.svg+xml"));
app.get(["/admin", "/admin/"], (req, res) => res.sendFile(path.join(PUBLIC, "admin", "index.html")));
app.use(express.static(PUBLIC, { extensions: ["html"], maxAge: "1h" }));
app.use((req, res) => fs.existsSync(path.join(PUBLIC, "index.html")) ? res.status(404).sendFile(path.join(PUBLIC, "index.html")) : res.redirect(302, "/"));

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return bad(res, err.code === "LIMIT_FILE_SIZE" ? `That photo is over ${MAX_MB} MB` : "Upload failed");
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
});

module.exports = app;
