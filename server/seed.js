// Seeds the catalogue (always, if empty) and, unless SEED_DEMO=false, 90 days of demo activity.
// Run `npm run seed:reset` to wipe activity tables and re-seed demo data.
const { db, init, MODE } = require("./db");

// Collects inserts so they can be written in large batches (fast locally, fewer round trips to Turso)
let queue = [];
const prep = sql => {
  const named = sql.match(/@\w+/g);
  const text = named ? sql.replace(/@\w+/g, "?") : sql;
  return { run: (...a) => queue.push({ sql: text, args: named && a.length === 1 && a[0] && typeof a[0] === "object" ? named.map(k => a[0][k.slice(1)] ?? null) : a }) };
};
const { BIKES, PRODUCTS } = require("../public/catalog.js");

async function seedCatalog() {
  const hasBikes = (await db.get("SELECT COUNT(*) n FROM bikes")).n;
  if (!hasBikes) await db.batch(BIKES.map((b, i) => ({ sql: "INSERT INTO bikes (id, brand, name, style, price, stock, data) VALUES (?,?,?,?,?,?,?)", args: [b.id, b.brand, b.name, b.style, b.price, b.featured ? 4 : 1 + (i % 4), JSON.stringify(b)] })));
  const hasProducts = (await db.get("SELECT COUNT(*) n FROM products")).n;
  if (!hasProducts) await db.batch(PRODUCTS.map(p => ({ sql: "INSERT INTO products (id, name, category, price, stock, data) VALUES (?,?,?,?,?,?)", args: [p.id, p.name, p.category, p.price, p.stock, JSON.stringify(p)] })));
}

/* ---------- demo data ---------- */
let rngState = 20261024;
const rnd = () => ((rngState = (rngState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
function weighted(pairs) {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[pairs.length - 1][0];
}
const id = () => Math.floor(rnd() * 1e12).toString(36) + Math.floor(rnd() * 1e12).toString(36);

const FIRST = ["Brian", "Kevin", "Mercy", "Wanjiru", "Otieno", "Achieng", "Kiprop", "Faith", "Dennis", "Njeri", "Collins", "Wambui", "Ian", "Mwangi", "Sharon", "Kamau", "Aisha", "Hassan", "Joy", "Victor", "Moses", "Grace", "Tony", "Lilian", "Peter", "Akinyi", "Eric", "Nafula", "Samuel", "Cheruiyot", "Lewis", "Wairimu", "Abdi", "Zawadi", "Felix", "Muthoni"];
const LAST = ["Ochieng", "Kariuki", "Mutua", "Wanjala", "Kiptoo", "Njoroge", "Omondi", "Kimani", "Mwangi", "Odhiambo", "Chebet", "Kamau", "Muriuki", "Barasa", "Onyango", "Gitau", "Kilonzo", "Rotich", "Maina", "Ndegwa"];
const name = () => `${pick(FIRST)} ${pick(LAST)}`;
const phone = () => "07" + String(Math.floor(rnd() * 1e8)).padStart(8, "0");

const SOURCE_W = [["google", 34], ["instagram", 24], ["whatsapp", 13], ["direct", 13], ["facebook", 8], ["tiktok", 4], ["youtube", 2], ["x", 1.5], ["showroom QR", 1.5]];
const REFERRERS = { google: "https://www.google.com/", instagram: "https://l.instagram.com/", facebook: "https://m.facebook.com/", tiktok: "https://www.tiktok.com/", youtube: "https://www.youtube.com/", x: "https://t.co/" };
const PLACES = [[["Kenya", "Nairobi"], 56], [["Kenya", "Mombasa"], 7], [["Kenya", "Kisumu"], 5], [["Kenya", "Nakuru"], 5], [["Kenya", "Eldoret"], 4], [["Kenya", "Thika"], 4], [["Kenya", "Kitengela"], 3], [["Kenya", "Machakos"], 3], [["Kenya", "Nyeri"], 2.5], [["Kenya", "Nanyuki"], 2], [["Kenya", "Kiambu"], 3], [["Uganda", "Kampala"], 2], [["Tanzania", "Arusha"], 1.2], [["Tanzania", "Dar es Salaam"], 1], [["United States", null], 0.8], [["United Kingdom", null], 0.6], [["UAE", "Dubai"], 0.6], [["Rwanda", "Kigali"], 0.5]];
const DEVICE_W = [["mobile", 78], ["desktop", 19], ["tablet", 3]];
const BROWSER_W = { mobile: [["Chrome", 70], ["Safari", 14], ["Samsung Internet", 8], ["Opera", 6], ["Firefox", 2]], desktop: [["Chrome", 66], ["Edge", 16], ["Safari", 10], ["Firefox", 8]], tablet: [["Chrome", 60], ["Safari", 40]] };
// Nairobi local hour weights: lunchtime and evening peaks
const HOUR_W = [0.3, 0.2, 0.1, 0.1, 0.2, 0.6, 1.5, 3, 4, 4.5, 5, 5.5, 7, 7, 5.5, 5, 5, 6, 7.5, 8.5, 8, 6.5, 4, 1.5].map((w, h) => [h, w]);
const BIKE_W = [["tekken-250-evo", 16], ["voge-300gy-rally", 11], ["voge-ds525x", 9], ["voge-300rr", 9], ["voge-300r", 8], ["voge-ds900x", 9], ["taro-gp1-400r", 7], ["taro-gp2-200r", 7], ["zonsen-carrera-200", 6], ["zonsen-batllo-250r", 5], ["tekken-250x-adv", 5], ["taro-gp1-250r", 4], ["voge-300ds", 4], ["taro-c5-400sr", 3]];
const PAGE_W = [["/", 22], ["/bikes.html", 18], ["@bike", 26], ["/financing.html", 7], ["/book.html", 6], ["/service.html", 5], ["/shop.html", 7], ["/community.html", 6], ["/about.html", 3]];

const bikePath = b => b === "tekken-250-evo" ? "/tekken-250-evo.html" : `/model.html?m=${b}`;
const bikePrice = Object.fromEntries(BIKES.map(b => [b.id, b.price]));
const iso = d => d.toISOString();
const localDate = d => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10);

async function seedDemo(days = 90) {
  queue = [];
  const now = new Date();
  const insSession = prep(`INSERT INTO sessions (id, visitor_id, started_at, last_seen, source, referrer, campaign, landing, device, browser, country, city, pageviews) VALUES (@id,@visitor_id,@started_at,@last_seen,@source,@referrer,@campaign,@landing,@device,@browser,@country,@city,@pageviews)`);
  const insEvent = prep(`INSERT INTO events (session_id, visitor_id, type, path, meta, created_at) VALUES (?,?,?,?,?,?)`);
  const insBooking = prep(`INSERT INTO bookings (type, bike_id, service_type, date, slot, name, phone, licence, mileage, notes, status, session_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insOrder = prep(`INSERT INTO orders (kind, items, total, name, phone, fulfilment, county, bike, status, payment_status, session_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insLead = prep(`INSERT INTO leads (type, bike_id, name, phone, email, message, meta, stage, value, session_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

  const visitors = [];
  {
    for (let d = days; d >= 0; d--) {
      const dayStart = new Date(now); dayStart.setUTCHours(-3, 0, 0, 0); dayStart.setUTCDate(dayStart.getUTCDate() - d); // Nairobi midnight
      const dow = new Date(dayStart.getTime() + 3 * 3600e3).getUTCDay();
      const growth = 1 + (days - d) / days * 0.7;                // traffic grows ~70% over the period
      const weekend = dow === 6 ? 1.3 : dow === 0 ? 1.15 : 1;
      const campaignBoost = d < 12 && d > 8 ? 1.6 : 1;            // a recent Instagram push
      let n = Math.round((95 + rnd() * 30) * growth * weekend * campaignBoost);
      for (let s = 0; s < n; s++) {
        const hour = weighted(HOUR_W);
        const start = new Date(dayStart.getTime() + hour * 3600e3 + rnd() * 3600e3);
        if (start > now) continue;
        const returning = visitors.length > 50 && rnd() < 0.28;
        const visitor_id = returning ? pick(visitors) : id();
        if (!returning) visitors.push(visitor_id);
        let source = weighted(SOURCE_W);
        if (campaignBoost > 1 && rnd() < 0.35) source = "instagram";
        const device = weighted(DEVICE_W);
        const [country, city] = weighted(PLACES);
        const sid = id();
        const pages = 1 + Math.floor(-Math.log(1 - rnd() * 0.97) * 1.8);
        let t = start.getTime();
        let landing = null, viewedBikes = [];
        for (let p = 0; p < pages; p++) {
          let path = weighted(PAGE_W);
          if (p === 0 && source === "instagram" && rnd() < 0.5) path = "@bike";
          if (path === "@bike") { const b = weighted(BIKE_W); viewedBikes.push(b); path = bikePath(b); insEvent.run(sid, visitor_id, "bike_view", path, JSON.stringify({ bike: b }), iso(new Date(t))); }
          landing = landing || path;
          insEvent.run(sid, visitor_id, "pageview", path, null, iso(new Date(t)));
          t += (15 + rnd() * 150) * 1000;
        }
        const end = new Date(t);
        insSession.run({ id: sid, visitor_id, started_at: iso(start), last_seen: iso(end), source, referrer: REFERRERS[source] || null, campaign: campaignBoost > 1 && source === "instagram" ? "dec-ride" : null, landing, device, browser: weighted(BROWSER_W[device]), country, city, pageviews: pages });

        const ev = (type, meta) => insEvent.run(sid, visitor_id, type, null, meta ? JSON.stringify(meta) : null, iso(new Date(t - rnd() * 60000)));
        const engaged = pages >= 3 || viewedBikes.length > 0;
        if (rnd() < (engaged ? 0.11 : 0.03)) ev("quiz_complete", { result: weighted(BIKE_W) });
        if (rnd() < (engaged ? 0.14 : 0.03)) ev("calc_use", { bike: viewedBikes[0] || "tekken-250-evo" });
        if (rnd() < (engaged ? 0.13 : 0.05)) ev("whatsapp_click", { bike: viewedBikes[0] || null });
        if (rnd() < 0.025) ev("call_click");

        const bike = viewedBikes[0] || weighted(BIKE_W);
        const age = (now - end) / 864e5;
        // Bookings
        if (rnd() < (engaged ? 0.045 : 0.008)) {
          const type = rnd() < 0.68 ? "test" : "service";
          const bookDate = new Date(end.getTime() + (1 + Math.floor(rnd() * 7)) * 864e5);
          if (new Date(bookDate.getTime() + 3 * 3600e3).getUTCDay() === 0) bookDate.setTime(bookDate.getTime() + 864e5); // closed Sundays
          const past = bookDate < now;
          const status = past ? weighted([["completed", 78], ["no_show", 12], ["cancelled", 10]]) : weighted([["pending", 55], ["confirmed", 45]]);
          const slot = pick(type === "test" ? ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"] : ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"]);
          insBooking.run(type, type === "test" ? bike : weighted(BIKE_W), type === "service" ? weighted([["Routine service", 50], ["First service (1,000 km)", 20], ["Diagnostics", 14], ["Repair", 10], ["Warranty claim", 6]]) : null,
            localDate(bookDate), slot, name(), phone(), type === "test" ? weighted([["I have a full licence", 80], ["I'm a learner", 20]]) : null,
            type === "service" ? Math.floor(1000 + rnd() * 25000) : null, null, status, sid, iso(end));
          ev("booking", { type });
        }
        // Orders
        if (rnd() < (engaged ? 0.022 : 0.006)) {
          const nItems = rnd() < 0.7 ? 1 : 2;
          const items = [];
          for (let k = 0; k < nItems; k++) {
            const p = weighted(PRODUCTS.map(p => [p, p.id === "gift-card" ? 4 : p.price < 6000 ? 10 : 7]));
            items.push({ id: p.id, name: p.name, price: p.price, qty: 1, size: p.sizes[0] ? pick(p.sizes) : null });
          }
          const total = items.reduce((a, i) => a + i.price * i.qty, 0);
          const delivery = rnd() < 0.45;
          const status = age > 4 ? weighted([["delivered", 80], ["cancelled", 8], ["ready", 12]]) : weighted([["new", 40], ["paid", 35], ["ready", 25]]);
          insOrder.run("gear", JSON.stringify(items), total, name(), phone(), delivery ? "delivery" : "collect", delivery ? pick(["Nairobi", "Kiambu", "Mombasa", "Nakuru", "Kajiado", "Machakos", "Kisumu"]) : null, null,
            status, ["paid", "ready", "delivered"].includes(status) ? "paid" : "unpaid", sid, iso(end));
          ev("order", { total });
        }
        if (rnd() < 0.006) {
          const part = pick(["Brake pads (front)", "Chain and sprocket kit", "Ignition lock", "Air filter", "Clutch lever", "Headlight assembly", "Oil filter x3", "Rear shock"]);
          const quoted = age > 1;
          const price = quoted ? pick([2800, 4500, 6500, 9500, 12000, 18000]) : 0;
          insOrder.run("parts", JSON.stringify([{ name: part, price, qty: 1 }]), price, name(), phone(), "delivery", pick(["Nairobi", "Nakuru", "Eldoret", "Mombasa", "Nyeri", "Kisumu"]), (b => `${b.brand} ${b.name}`)(BIKES.find(b => b.id === bike)),
            age > 5 ? weighted([["delivered", 85], ["cancelled", 15]]) : quoted ? weighted([["quoted", 50], ["paid", 50]]) : "new", age > 5 || rnd() < 0.4 ? "paid" : "unpaid", sid, iso(end));
          ev("order", { kind: "parts" });
        }
        // Leads
        if (rnd() < (engaged ? 0.06 : 0.015)) {
          const type = weighted([["finance", 34], ["reservation", 9], ["contact", 18], ["newsletter", 20], ["notify", 6], ["rsvp", 13]]);
          let stage = "new", value = null;
          if (["finance", "reservation", "contact"].includes(type)) {
            if (age > 2) stage = weighted([["contacted", 40], ["test_ride", 20], ["negotiating", 12], ["won", type === "contact" ? 3 : 9], ["lost", 12]]);
            if (stage === "won") value = bikePrice[bike];
          } else stage = age > 1 ? "contacted" : "new";
          const meta = type === "finance" ? { deposit_pct: pick([20, 25, 30, 40, 50]), term: pick([6, 12, 18, 24]) } : type === "rsvp" ? { event: pick(["Jamhuri Day ride to Magadi", "New rider skills morning", "Last sunset of 2026"]) } : type === "notify" ? { bike: "Cyclone RX401" } : null;
          insLead.run(type, ["finance", "reservation", "contact"].includes(type) ? bike : null, type === "newsletter" ? null : name(), phone(), null,
            type === "contact" ? pick(["Do you have the 300GY Rally in white?", "Can I trade in my Boxer?", "What's the best bike for Mombasa road commute?", "Do you deliver to Eldoret?", "Is the DS525X available on financing?"]) : null,
            meta ? JSON.stringify(meta) : null, stage, value, sid, iso(end), stage !== "new" ? iso(new Date(end.getTime() + 864e5)) : null);
          ev("lead", { type });
        }
      }
    }

    // Rider wall
    const localImg = f => `/img/${f.replace(/\.\w+$/, "")}-960.webp`;
    const insWall = prep("INSERT INTO wall (name, bike, photo, approved, created_at) VALUES (?,?,?,?,?)");
    [["Kevin O.", "Tekken 250", "65df6f93b6f0838294fbaec1.jpeg", 1], ["Wanjiru M.", "Voge DS900X", "65df70acdcc9fbb964305cfd.jpeg", 1], ["Dennis K.", "Zonsen Batllo 250R", "67bb952e0f0b267c2b059cc9.jpeg", 1],
     ["Achieng O.", "Tekken 250X ADV", "65da2e3fde43c993cb1cbd12.jpeg", 1], ["Ian M.", "Zonsen Batllo 250R", "67c757644c68ff7d5e0d2b42.jpeg", 1], ["Tony G.", "Voge DS900X", "65df70ac9e0a75379483f011.jpeg", 1],
     ["Faith W.", "Voge 300GY Rally", "65df70acdcc9fbebaf305cfc.jpeg", 0], ["Moses K.", "Tekken 250 Evo", "65df6f93fc239a93f6a8a716.jpeg", 0]]
      .forEach(([n, b, p, a], i) => insWall.run(n, b, localImg(p), a, iso(new Date(now - (30 - i * 3) * 864e5))));
  }
  const n = queue.length;
  await db.batch(queue);
  queue = [];
  return n;
}

async function resetActivity() {
  await db.exec("DELETE FROM events; DELETE FROM sessions; DELETE FROM bookings; DELETE FROM orders; DELETE FROM leads; DELETE FROM wall;");
}

// demo: "auto" seeds demo activity only where it's quick (local file or Vercel /tmp), true forces it (CLI)
async function seed({ demo = "auto" } = {}) {
  await init();
  await seedCatalog();
  const want = process.env.SEED_DEMO !== "false" && (demo === true || (demo === "auto" && MODE !== "turso"));
  if (!want) return;
  const empty = (await db.get("SELECT COUNT(*) n FROM sessions")).n === 0;
  if (empty) {
    const t = Date.now();
    const rows = await seedDemo();
    console.log(`Seeded ${rows.toLocaleString()} demo rows in ${Date.now() - t} ms (${MODE})`);
  }
}

if (require.main === module) {
  (async () => {
    await init();
    if (process.argv.includes("--reset")) { await resetActivity(); console.log("Activity tables cleared"); }
    await seed({ demo: true });
  })().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seed };
