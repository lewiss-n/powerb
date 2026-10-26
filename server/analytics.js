// Classifies where a visit came from and what it was on.
// No third-party trackers: everything is derived from the request and a tiny client beacon.

const SOURCES = [
  ["google", /google\.|googleads|gclid/i],
  ["instagram", /instagram\.|l\.instagram|ig\b/i],
  ["facebook", /facebook\.|fb\.|m\.facebook|lm\.facebook|fbclid/i],
  ["whatsapp", /whatsapp|wa\.me/i],
  ["tiktok", /tiktok/i],
  ["x", /(^|\.)t\.co|twitter\.|(^|\/\/)x\.com/i],
  ["youtube", /youtube\.|youtu\.be/i],
  ["bing", /bing\./i]
];

function classifySource({ utm_source, referrer, host }) {
  const utm = (utm_source || "").toLowerCase().trim();
  if (utm) {
    for (const [name, re] of SOURCES) if (re.test(utm) || utm === name) return name;
    if (utm === "qr" || utm === "showroom") return "showroom QR";
    return utm.slice(0, 30);
  }
  if (!referrer) return "direct";
  try {
    const r = new URL(referrer);
    if (host && r.host === host) return "direct";
    for (const [name, re] of SOURCES) if (re.test(r.hostname)) return name;
    return r.hostname.replace(/^www\./, "").slice(0, 40);
  } catch { return "direct"; }
}

function classifyDevice(ua = "", width = 0) {
  if (/ipad|tablet|playbook|silk/i.test(ua) || (width >= 600 && width < 1024 && /android/i.test(ua))) return "tablet";
  if (/mobi|iphone|android|opera mini|kaios/i.test(ua) || (width && width < 600)) return "mobile";
  return "desktop";
}

function classifyBrowser(ua = "") {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

// Location: prefer headers set by a CDN / reverse proxy (Cloudflare, Vercel, Fly).
// Fallback: the browser's time zone gives the country (and a city for multi-zone countries).
const TZ_COUNTRY = {
  "Africa/Nairobi": "Kenya", "Africa/Kampala": "Uganda", "Africa/Dar_es_Salaam": "Tanzania", "Africa/Kigali": "Rwanda",
  "Africa/Addis_Ababa": "Ethiopia", "Africa/Mogadishu": "Somalia", "Africa/Juba": "South Sudan", "Africa/Lagos": "Nigeria",
  "Africa/Johannesburg": "South Africa", "Africa/Cairo": "Egypt", "Asia/Dubai": "UAE", "Europe/London": "United Kingdom",
  "America/New_York": "United States", "America/Chicago": "United States", "America/Los_Angeles": "United States",
  "Asia/Kolkata": "India", "Asia/Shanghai": "China", "Europe/Berlin": "Germany", "Australia/Sydney": "Australia"
};
const COUNTRY_CODES = { KE: "Kenya", UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", ET: "Ethiopia", NG: "Nigeria", ZA: "South Africa", AE: "UAE", GB: "United Kingdom", US: "United States", IN: "India", CN: "China", DE: "Germany", AU: "Australia" };

function locate(req, tz) {
  const h = req.headers;
  const cc = (h["cf-ipcountry"] || h["x-vercel-ip-country"] || h["fly-client-country"] || "").toUpperCase();
  const city = h["cf-ipcity"] || h["x-vercel-ip-city"] || h["x-geo-city"] || null;
  const country = (cc && (COUNTRY_CODES[cc] || cc)) || TZ_COUNTRY[tz] || (tz ? tz.split("/")[0] : "Unknown");
  return { country, city: city ? decodeURIComponent(city) : null };
}

module.exports = { classifySource, classifyDevice, classifyBrowser, locate };
