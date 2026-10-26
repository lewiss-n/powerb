// Downloads every remote image the site uses, once, and writes responsive WebP versions to public/img/.
//   npm install && npm run images
// Re-running only processes images that are missing. Output is committed with the site,
// so the production server never fetches remote images.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const OUT = process.env.IMAGES_OUT || path.join(ROOT, "public", "img");
const WIDTHS = [160, 480, 960, 1600];
const QUALITY = 78;
fs.mkdirSync(OUT, { recursive: true });

const GCS = "https://storage.googleapis.com/msgsndr/jopKPRVI0mmhrcAMgKi9/media/";
const FILESAFE = "https://assets.cdn.filesafe.space/jopKPRVI0mmhrcAMgKi9/media/";

/* ---------- collect sources ---------- */
// scripts/image-sources.json maps each image id to its original address on the old site.
const SOURCES = JSON.parse(fs.readFileSync(process.env.IMAGES_SOURCES || path.join(ROOT, "scripts", "image-sources.json"), "utf8"));
const sources = new Map();
for (const [key, url] of Object.entries(SOURCES)) {
  const m = url.match(/media\/([0-9a-f]{24}\.(?:png|jpe?g))$/);
  // Prefer the full-quality original; fall back to the old site's image proxy at high quality
  sources.set(key, m ? [GCS + m[1], FILESAFE + m[1], `https://images.leadconnectorhq.com/image/f_webp/q_95/r_2000/u_${FILESAFE}${m[1]}`, url] : [url]);
}

/* ---------- process ---------- */
const manifestPath = path.join(OUT, "manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
let before = 0, after = 0, done = 0, skipped = 0, failed = [];

async function fetchFirst(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (image optimiser)" } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {}
  }
  return null;
}

async function processOne(key, urls) {
  const outs = WIDTHS.map(w => path.join(OUT, `${key}-${w}.webp`));
  if (manifest[key] && outs.every(o => fs.existsSync(o))) { skipped++; return; }
  const buf = await fetchFirst(urls);
  if (!buf) { failed.push(key); return; }
  before += buf.length;
  const img = sharp(buf, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  for (const w of WIDTHS) {
    const out = path.join(OUT, `${key}-${w}.webp`);
    const data = await img.clone()
      .resize({ width: Math.min(w, meta.width || w), withoutEnlargement: true })
      .webp({ quality: QUALITY, alphaQuality: 90, effort: 5, smartSubsample: true })
      .toBuffer();
    fs.writeFileSync(out, data);
    if (w === 960) after += data.length;
  }
  if (key === "logo") {
    // Small PNG fallback for places that need it (emails, old browsers)
    await sharp(buf).resize({ height: 120, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, "logo.png"));
  }
  manifest[key] = { w: meta.width, h: meta.height, alpha: !!meta.hasAlpha };
  done++;
}

// Favicon (SVG, kept as-is)
const favPath = path.join(ROOT, "public", "favicon.svg");
if (!process.env.IMAGES_OUT && !fs.existsSync(favPath)) {
  const fav = await fetchFirst(["https://storage.googleapis.com/msgsndr/jopKPRVI0mmhrcAMgKi9/media/65e166c7dcc9fbc9313c6337.svg+xml"]);
  if (fav) fs.writeFileSync(favPath, fav);
}

const entries = [...sources.entries()];
console.log(`Found ${entries.length} images. Processing…`);
const POOL = 6;
for (let i = 0; i < entries.length; i += POOL) {
  await Promise.all(entries.slice(i, i + POOL).map(([k, u]) => processOne(k, u)));
  process.stdout.write(`\r${Math.min(i + POOL, entries.length)}/${entries.length}`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
const mb = n => (n / 1048576).toFixed(1) + " MB";
console.log(`\nDone: ${done} processed, ${skipped} already up to date, ${failed.length} failed.`);
if (done) console.log(`Originals downloaded: ${mb(before)}. Same images at 960 px WebP: ${mb(after)} (${Math.round((1 - after / before) * 100)}% smaller).`);
if (failed.length) { console.log("Could not download:", failed.join(", ")); process.exitCode = 1; }
