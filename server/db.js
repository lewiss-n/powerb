// Database: libSQL (SQLite-compatible), one async API for three places it can run.
//   1. TURSO_DATABASE_URL set   -> hosted Turso database (persistent, works on Vercel)
//   2. Running on Vercel        -> demo database in /tmp (resets when the server cold-starts)
//   3. Anywhere else (Docker)   -> local file in DATA_DIR (a Docker volume in production)
const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");

const ON_VERCEL = !!process.env.VERCEL;
const DATA_DIR = process.env.DATA_DIR || (ON_VERCEL ? "/tmp" : path.join(__dirname, "..", "data"));
const REMOTE = !!process.env.TURSO_DATABASE_URL;
if (!REMOTE) fs.mkdirSync(DATA_DIR, { recursive: true });

const MODE = REMOTE ? "turso" : ON_VERCEL ? "vercel-demo" : "local";
const client = createClient(REMOTE
  ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
  : { url: "file:" + path.join(DATA_DIR, "powerbikes.db") });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  price INTEGER,
  stock INTEGER NOT NULL DEFAULT 3,
  active INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,             -- full JSON record (specs, images, copy)
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('test','service')),
  bike_id TEXT,
  service_type TEXT,
  date TEXT NOT NULL,             -- YYYY-MM-DD (Nairobi)
  slot TEXT NOT NULL,             -- HH:MM
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  licence TEXT,
  mileage INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('gear','parts')),
  items TEXT NOT NULL,            -- JSON array
  total INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  fulfilment TEXT NOT NULL DEFAULT 'collect',  -- collect | delivery
  county TEXT,
  bike TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,             -- finance | reservation | contact | notify | newsletter | rsvp
  bike_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  message TEXT,
  meta TEXT,                      -- JSON
  stage TEXT NOT NULL DEFAULT 'new',
  value INTEGER,                  -- sale value when won
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS wall (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bike TEXT,
  photo TEXT,                     -- path under /uploads, or full URL
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  source TEXT NOT NULL,           -- google | instagram | whatsapp | facebook | tiktok | x | direct | other
  referrer TEXT,
  campaign TEXT,
  landing TEXT,
  device TEXT,                    -- mobile | desktop | tablet
  browser TEXT,
  country TEXT,
  city TEXT,
  pageviews INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  type TEXT NOT NULL,             -- pageview | bike_view | quiz_complete | calc_use | whatsapp_click | call_click | booking | order | lead
  path TEXT,
  meta TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, type);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, slot);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

// Plain objects, numbers for ids
const toRows = rs => rs.rows.map(r => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
const stmt = (sql, args) => ({ sql, args: args.length === 1 && Array.isArray(args[0]) ? args[0] : args });

const db = {
  mode: MODE,
  async all(sql, ...args) { return toRows(await client.execute(stmt(sql, args))); },
  async get(sql, ...args) { return (await db.all(sql, ...args))[0]; },
  async run(sql, ...args) {
    const r = await client.execute(stmt(sql, args));
    return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid) };
  },
  // Many writes in one transaction. Big lists are chunked so a remote database isn't sent one huge request.
  async batch(statements, chunk = REMOTE ? 300 : 20000) {
    for (let i = 0; i < statements.length; i += chunk) await client.batch(statements.slice(i, i + chunk), "write");
  },
  exec: sql => client.executeMultiple(sql)
};

let readyPromise;
function init() {
  if (!readyPromise) readyPromise = (async () => {
    if (!REMOTE) await client.execute("PRAGMA journal_mode = WAL").catch(() => {});
    await client.executeMultiple(SCHEMA);
  })();
  return readyPromise;
}

module.exports = { db, init, DATA_DIR, MODE, ON_VERCEL };
