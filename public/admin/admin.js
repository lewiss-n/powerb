/* Nairobi Powerbikes admin dashboard. Vanilla JS + hand-built SVG charts. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const S = { s1: "var(--s1)", s2: "var(--s2)", s3: "var(--s3)", s4: "var(--s4)", s5: "var(--s5)" };
const HEAT = ["#0d366b", "#104281", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#86b6ef"];

const state = { view: "overview", days: 30, overview: null, catalog: null, filters: {} };

/* ---------- formatting ---------- */
const num = n => Math.round(n || 0).toLocaleString("en-KE");
const kes = n => "KES " + num(n);
const kesShort = n => n >= 1e6 ? `KES ${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M` : n >= 1e4 ? `KES ${Math.round(n / 1e3)}K` : kes(n);
const pct = (n, d = 1) => (n * 100).toFixed(d) + "%";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dayLabel = iso => new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" });
const ago = iso => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`;
};
const when = iso => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const waHref = p => `https://wa.me/254${String(p).replace(/^\+?254|^0/, "")}`;
const LEAD_LABEL = { finance: "Finance", reservation: "Reservation", contact: "Enquiry", notify: "Notify me", newsletter: "Newsletter", rsvp: "Ride RSVP" };
const STAGES = [["new", "New"], ["contacted", "Contacted"], ["test_ride", "Test ride"], ["negotiating", "Negotiating"], ["won", "Won"], ["lost", "Lost"]];
const STATUS_TONE = { pending: "warning", confirmed: "good", completed: "", no_show: "serious", cancelled: "critical", new: "warning", quoted: "", paid: "good", ready: "good", delivered: "", unpaid: "warning", refunded: "critical" };
const label = s => ({ no_show: "No-show", test_ride: "Test ride" })[s] || (s.charAt(0).toUpperCase() + s.slice(1));

/* ---------- api ---------- */
async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401) { showLogin(); throw new Error("Signed out"); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2200); }

/* ---------- tooltip ---------- */
const tip = $("#tip");
function showTip(e, html) {
  tip.innerHTML = html; tip.classList.add("show");
  const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 10), y = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 10);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
const hideTip = () => tip.classList.remove("show");
document.addEventListener("mouseover", e => { const el = e.target.closest("[data-tip]"); if (el) showTip(e, el.dataset.tip); });
document.addEventListener("mousemove", e => { const el = e.target.closest("[data-tip]"); if (el) showTip(e, el.dataset.tip); });
document.addEventListener("mouseout", e => { if (e.target.closest("[data-tip]")) hideTip(); });
const tipRow = (color, name, val) => `<div class="r"><span>${color ? `<i style="background:${color}"></i>` : ""}${esc(name)}</span><b>${val}</b></div>`;

/* ================= CHARTS ================= */
function niceMax(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }

function sparkline(values) {
  const w = 120, h = 30, max = Math.max(...values, 1), n = values.length;
  const pts = values.map((v, i) => `${(i / Math.max(1, n - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${S.s1}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* Line/area chart with crosshair tooltip. Single y-axis only. */
function lineChart(el, { labels, series, height = 240, fmt = num }) {
  const W = el.clientWidth || 600, H = height, m = { t: 10, r: 12, b: 26, l: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, n = labels.length;
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
  const x = i => m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), y = v => m.t + ih - (v / max) * ih;
  const ticks = [0, .25, .5, .75, 1].map(f => f * max);
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 70)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(series.map(s => s.name).join(", "))} per day">`;
  ticks.forEach(t => { svg += `<line class="${t ? "gridline" : "baseline"}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" class="tnum">${t >= 1000 ? (t / 1000) + "k" : t}</text>`; });
  labels.forEach((l, i) => { if (i % every === 0 && n - 1 - i >= every * 0.6 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === n - 1 ? "end" : "middle"}">${dayLabel(l)}</text>`; });
  series.forEach((s, k) => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
    if (k === 0 && series.length === 1) svg += `<path d="M${x(0)},${y(0)} L${pts.join(" L")} L${x(n - 1)},${y(0)} Z" fill="${s.color}" opacity=".12"/>`;
    svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  svg += `<line class="xhair" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/><g class="dots"></g><rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></svg>`;
  el.innerHTML = `<div class="chart">${svg}</div>`;
  const svgEl = $("svg", el), hit = $(".hit", el), xh = $(".xhair", el), dots = $(".dots", el);
  hit.addEventListener("mousemove", e => {
    const r = svgEl.getBoundingClientRect(), px = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
    xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.style.display = "";
    dots.innerHTML = series.map(s => `<circle cx="${x(i)}" cy="${y(s.values[i])}" r="4.5" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`).join("");
    showTip(e, `<div class="t">${new Date(labels[i] + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}</div>` + series.map(s => tipRow(s.color, s.name, fmt(s.values[i]))).join(""));
  });
  hit.addEventListener("mouseleave", () => { xh.style.display = "none"; dots.innerHTML = ""; hideTip(); });
}

/* Stacked vertical bars (2px gaps, rounded top data-end) */
function stackedBars(el, { labels, series, height = 240, fmt = kesShort }) {
  const W = el.clientWidth || 600, H = height, m = { t: 10, r: 8, b: 26, l: 56 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, n = labels.length;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const max = niceMax(Math.max(1, ...totals));
  const bw = Math.min(46, (iw / n) * 0.62), step = iw / n;
  const y = v => m.t + ih - (v / max) * ih;
  let svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Revenue per week">`;
  [0, .25, .5, .75, 1].forEach(f => { const t = f * max; svg += `<line class="${t ? "gridline" : "baseline"}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" class="tnum">${kesShort(t).replace("KES ", "")}</text>`; });
  labels.forEach((l, i) => {
    const cx = m.l + step * i + step / 2;
    let acc = 0;
    const tipHtml = `<div class="t">Week of ${dayLabel(l)}</div>` + series.map(s => tipRow(s.color, s.name, kes(s.values[i]))).join("") + tipRow("", "Total", kes(totals[i]));
    series.forEach((s, k) => {
      const v = s.values[i]; if (!v) return;
      const y1 = y(acc + v), y0 = y(acc), hgt = Math.max(1, y0 - y1 - (acc > 0 ? 2 : 0));
      const top = k === series.length - 1 || series.slice(k + 1).every(t => !t.values[i]);
      const r = top ? Math.min(4, hgt) : 0;
      svg += `<path d="M${cx - bw / 2},${y1 + hgt} V${y1 + r} Q${cx - bw / 2},${y1} ${cx - bw / 2 + r},${y1} H${cx + bw / 2 - r} Q${cx + bw / 2},${y1} ${cx + bw / 2},${y1 + r} V${y1 + hgt} Z" fill="${s.color}"/>`;
      acc += v;
    });
    svg += `<rect class="hit" x="${m.l + step * i}" y="${m.t}" width="${step}" height="${ih}" data-tip="${esc(tipHtml)}"/>`;
    if (n <= 14 || i % 2 === 0) svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${dayLabel(l)}</text>`;
  });
  el.innerHTML = `<div class="chart">${svg}</div>`;
}

/* Horizontal bar list (HTML) — one series, one colour */
function barList(rows, { fmt = num, extra, color = S.s1 } = {}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div class="bars">${rows.map(r => `
    <div class="bar-row" data-tip="${esc(`<div class="t">${esc(r.name)}</div>` + tipRow("", "Value", fmt(r.value)) + (r.tip || ""))}">
      <span class="name">${esc(r.name)}</span>
      <span class="track"><span class="fill" style="width:${(r.value / max) * 100}%;background:${color}"></span></span>
      <span class="val">${fmt(r.value)}${extra ? `<small>${extra(r)}</small>` : ""}</span>
    </div>`).join("")}</div>`;
}

/* ================= VIEWS ================= */
const views = {};

function kpiTile(label, value, cur, prev, spark, { invert = false, fmtDelta } = {}) {
  let cls = "flat", txt = "No change";
  if (prev > 0) {
    const ch = (cur - prev) / prev;
    if (Math.abs(ch) >= 0.005) { const good = invert ? ch < 0 : ch > 0; cls = good ? "up" : "down"; txt = `${ch > 0 ? "▲" : "▼"} ${fmtDelta ? fmtDelta(cur, prev) : pct(Math.abs(ch), 0)}`; }
  } else if (cur > 0) { cls = "up"; txt = "▲ New"; }
  return `<div class="kpi"><span class="label">${label}</span><span class="value tnum" title="${esc(value)}">${value}</span><span class="delta ${cls}">${txt}</span><span class="vs">vs previous ${state.days} days</span>${spark ? sparkline(spark) : ""}</div>`;
}

function weekly(days, arr) {
  const labels = [], vals = [];
  for (let end = days.length; end > 0; end -= 7) { const st = Math.max(0, end - 7); labels.unshift(days[st]); vals.unshift(arr.slice(st, end).reduce((a, b) => a + b, 0)); }
  return { labels, vals };
}

views.overview = async (c) => {
  const o = state.overview = await api(`/api/admin/overview?days=${state.days}`);
  const k = o.kpis, p = o.prev, d = o.daily;
  const rev = d.days.map((_, i) => d.gear_revenue[i] + d.bike_revenue[i]);
  const wkB = weekly(d.days, d.bike_revenue), wkG = weekly(d.days, d.gear_revenue);
  c.innerHTML = `
    <section class="kpis">
      ${kpiTile("Revenue", kesShort(k.revenue), k.revenue, p.revenue, rev)}
      ${kpiTile("Visitors", num(k.visitors), k.visitors, p.visitors, d.visitors)}
      ${kpiTile("Leads", num(k.leads), k.leads, p.leads, d.leads)}
      ${kpiTile("Test rides booked", num(k.test_rides), k.test_rides, p.test_rides, d.bookings)}
      ${kpiTile("Bikes sold", num(k.bikes_sold), k.bikes_sold, p.bikes_sold, d.bike_revenue.map(v => v ? 1 : 0))}
      ${kpiTile("Conversion rate", pct(k.conversion), k.conversion, p.conversion, null, { fmtDelta: (a, b) => `${((a - b) * 100).toFixed(1)} pts` })}
    </section>

    <section class="grid g-2">
      <div class="panel">
        <div class="panel-head"><div><h2>Visitors per day</h2><p class="sub">${num(k.visitors)} people, ${num(k.sessions)} visits, ${num(k.pageviews)} page views</p></div>
          <div class="legend"><span>WhatsApp taps: <b class="tnum">&nbsp;${num(k.whatsapp_clicks)}</b></span></div></div>
        <div id="ch-visitors"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Live now</h2><p class="sub">Active in the last 5 minutes</p></div></div>
        <div class="live-big tnum" id="live-n">0</div>
        <ul class="feed" id="live-feed" style="margin-top:12px"></ul>
      </div>
    </section>

    <section class="grid g-2">
      <div class="panel">
        <div class="panel-head"><div><h2>Revenue per week</h2><p class="sub">${kes(k.bike_revenue)} from ${num(k.bikes_sold)} bikes, ${kes(k.gear_revenue)} from gear and parts</p></div>
          <div class="legend"><span><i style="background:var(--s1)"></i>Bike sales</span><span><i style="background:var(--s2)"></i>Gear & parts</span></div></div>
        <div id="ch-revenue"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Visitor to buyer</h2><p class="sub">Sessions reaching each step</p></div></div>
        <div class="funnel">${o.funnel.map((f, i) => `
          ${i ? `<div class="f-drop">${pct(f.n / Math.max(1, o.funnel[i - 1].n))} continued</div>` : ""}
          <div class="f-step" data-tip="${esc(`<div class='t'>${f.step}</div>` + tipRow("", "Sessions", num(f.n)) + tipRow("", "Of all visits", pct(f.n / Math.max(1, o.funnel[0].n), 2)))}">
            <span class="lbl">${f.step}</span><span class="num">${num(f.n)}</span>
            <div class="track"><div class="fill" style="width:${Math.max(0.6, (f.n / Math.max(1, o.funnel[0].n)) * 100)}%"></div></div>
          </div>`).join("")}</div>
      </div>
    </section>

    <section class="grid g-11">
      <div class="panel">
        <div class="panel-head"><div><h2>Where visitors come from</h2><p class="sub">Visits by source, with the share that booked, enquired or ordered</p></div></div>
        ${barList(o.sources.slice(0, 8).map(s => ({ name: srcName(s.source), value: s.sessions, conv: s.conversions / s.sessions, tip: tipRow("", "Converted", `${num(s.conversions)} (${pct(s.conversions / s.sessions)})`) })), { extra: r => pct(r.conv) + " conv." })}
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Most wanted bikes</h2><p class="sub">Page views, enquiries, test rides and sales</p></div></div>
        ${bikeTable(o.topBikes.slice(0, 7))}
      </div>
    </section>`;
  lineChart($("#ch-visitors"), { labels: d.days, series: [{ name: "Visitors", color: S.s1, values: d.visitors }], height: 330 });
  stackedBars($("#ch-revenue"), { labels: wkB.labels, series: [{ name: "Bike sales", color: S.s1, values: wkB.vals }, { name: "Gear & parts", color: S.s2, values: wkG.vals }], height: 330 });
  refreshLive();
};

const srcName = s => ({ google: "Google", instagram: "Instagram", whatsapp: "WhatsApp", direct: "Direct / typed in", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", x: "X (Twitter)", bing: "Bing" })[s] || s;

function bikeTable(rows) {
  const maxV = Math.max(1, ...rows.map(r => r.views));
  return `<div class="table-wrap"><table><thead><tr><th>Bike</th><th class="num">Views</th><th class="num">Enquiries</th><th class="num">Test rides</th><th class="num">Sold</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td><div>${esc(r.name)}</div><div style="height:4px;background:var(--s1);border-radius:0 2px 2px 0;margin-top:5px;width:${(r.views / maxV) * 100}%"></div></td>
      <td class="num">${num(r.views)}</td><td class="num">${num(r.enquiries)}</td><td class="num">${num(r.test_rides)}</td><td class="num"><b>${num(r.sold)}</b></td></tr>`).join("")}
  </tbody></table></div>`;
}

const FEED_ICON = {
  booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/></svg>',
  lead: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/></svg>',
  visit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/></svg>'
};

async function refreshLive() {
  try {
    const l = await api("/api/admin/live");
    $("#live-pill").textContent = `${l.active} on site now`;
    const n = $("#live-n"), feed = $("#live-feed");
    if (!n) return;
    n.textContent = l.active;
    const visits = l.sessions.slice(0, 4).map(s => ({ kind: "visit", html: `<b>${esc(s.city || s.country || "Visitor")}</b> on ${esc(prettyPath(s.page))}<div class="sm muted">${srcName(s.source)}, ${esc(s.device)}</div>`, t: s.last_seen }));
    const events = l.feed.map(f => ({ kind: f.kind, t: f.created_at, html:
      f.kind === "booking" ? `<b>${esc(f.name)}</b> booked a ${f.what.toLowerCase()}${f.bike ? ` on the ${esc(f.bike)}` : ""}` :
      f.kind === "order" ? `<b>${esc(f.name)}</b>: ${esc(f.what.toLowerCase())}${f.amount ? `, ${kes(f.amount)}` : ""}` :
      `<b>${esc(f.name || "Someone")}</b>: ${LEAD_LABEL[f.what] || f.what}${f.bike ? `, ${esc(f.bike)}` : ""}` }));
    feed.innerHTML = [...visits, ...events].map(i => `<li><span class="ico">${FEED_ICON[i.kind]}</span><span>${i.html}</span><span class="when">${ago(i.t)}</span></li>`).join("") || `<li><span></span><span class="muted">Quiet right now.</span><span></span></li>`;
  } catch {}
}
function prettyPath(p) {
  if (!p) return "the site";
  if (p === "/" || p === "/index.html") return "Home";
  const m = p.match(/m=([\w-]+)/); if (m) return bikeName(m[1]);
  return p.replace(/^\//, "").replace(".html", "").replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
}
function bikeName(id) { const b = state.catalog?.bikes.find(b => b.id === id); return b ? `${b.brand} ${b.name}` : (id || "—").replace(/-/g, " "); }

views.traffic = async (c) => {
  const o = state.overview && state.overview.range.days === state.days ? state.overview : (state.overview = await api(`/api/admin/overview?days=${state.days}`));
  const tot = o.devices.reduce((a, d) => a + d.sessions, 0) || 1;
  const devColor = { mobile: S.s1, desktop: S.s2, tablet: S.s3 };
  const heatMax = Math.max(1, ...o.heatmap.flat());
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  c.innerHTML = `
    <section class="grid g-11">
      <div class="panel">
        <div class="panel-head"><div><h2>Traffic sources</h2><p class="sub">Visits, and the share of each source that converted</p></div></div>
        ${barList(o.sources.map(s => ({ name: srcName(s.source), value: s.sessions, conv: s.conversions / s.sessions, tip: tipRow("", "Converted", pct(s.conversions / s.sessions)) })), { extra: r => pct(r.conv) + " conv." })}
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Visitor locations</h2><p class="sub">Towns and cities</p></div></div>
        ${barList(o.cities.map(r => ({ name: r.city, value: r.sessions, tip: tipRow("", "Country", esc(r.country)) })))}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h2>When people browse</h2><p class="sub">Visits by day and hour, Nairobi time. Plan posts and WhatsApp replies around the busy hours.</p></div></div>
      <div class="heat" role="img" aria-label="Heatmap of visits by weekday and hour">
        <span></span>${Array.from({ length: 24 }, (_, h) => `<span class="hl">${h % 3 === 0 ? h : ""}</span>`).join("")}
        ${order.map(dw => `<span class="dl">${DAYS[dw]}</span>` + o.heatmap[dw].map((v, h) => {
          const idx = v ? Math.min(HEAT.length - 1, Math.floor((v / heatMax) * (HEAT.length - 1))) : -1;
          return `<span class="cell" style="${idx >= 0 ? `background:${HEAT[idx]}` : ""}" data-tip="${esc(`<div class='t'>${DAYS[dw]} ${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00</div>` + tipRow("", "Visits", num(v)))}"></span>`;
        }).join("")).join("")}
      </div>
      <div class="heat-legend"><span>Fewer</span><span class="ramp">${HEAT.map(c => `<i style="background:${c}"></i>`).join("")}</span><span>More visits</span></div>
    </section>

    <section class="grid g-3">
      <div class="panel">
        <div class="panel-head"><div><h2>Devices</h2><p class="sub">Share of visits</p></div></div>
        <div class="stack100">${o.devices.map(d => `<div style="width:${(d.sessions / tot) * 100}%;background:${devColor[d.device] || S.s4}" data-tip="${esc(tipRow(devColor[d.device], d.device, `${num(d.sessions)} (${pct(d.sessions / tot)})`))}"></div>`).join("")}</div>
        <div class="legend">${o.devices.map(d => `<span><i style="background:${devColor[d.device] || S.s4}"></i>${d.device} <b class="tnum">${pct(d.sessions / tot, 0)}</b></span>`).join("")}</div>
        <h2 style="margin-top:22px;margin-bottom:12px">Browsers</h2>
        ${barList(o.browsers.map(b => ({ name: b.browser, value: b.sessions })))}
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Countries</h2><p class="sub">Visits from outside Kenya often mean importers and diaspora buyers</p></div></div>
        ${barList(o.countries.map(r => ({ name: r.country, value: r.sessions })))}
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Top pages</h2><p class="sub">Page views</p></div></div>
        ${barList(o.topPages.map(p => ({ name: prettyPath(p.path), value: p.views })))}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h2>Interest by bike</h2><p class="sub">Which models people look at, ask about, ride and buy</p></div></div>
      ${bikeTable(o.topBikes)}
    </section>`;
};

/* ---------- Bookings ---------- */
views.bookings = async (c) => {
  const f = state.filters.bookings ||= { status: "", type: "", q: "", date: "" };
  const all = await api(`/api/admin/bookings?limit=500`);
  const today = new Date(Date.now() + 3 * 3600e3);
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 864e5).toISOString().slice(0, 10));
  const active = all.rows.filter(r => !["cancelled"].includes(r.status));
  let rows = all.rows.filter(r => (!f.status || r.status === f.status) && (!f.type || r.type === f.type) && (!f.date || r.date === f.date) &&
    (!f.q || `${r.name} ${r.phone} ${r.bike_id || ""} ${r.service_type || ""}`.toLowerCase().includes(f.q.toLowerCase())));
  const todayIso = week[0];
  rows.sort((a, b) => {
    const fa = a.date >= todayIso, fb = b.date >= todayIso;
    if (fa !== fb) return fa ? -1 : 1;                      // upcoming first
    const k = (a.date + a.slot).localeCompare(b.date + b.slot);
    return fa ? k : -k;                                     // soonest upcoming, then most recent past
  });
  const shown = f.limit || 50;
  const statuses = ["pending", "confirmed", "completed", "no_show", "cancelled"];
  c.innerHTML = `
    <section class="panel">
      <div class="panel-head"><div><h2>Next 7 days</h2><p class="sub">Tap a day to see its schedule</p></div>${f.date ? `<button class="btn" data-clear-date>Show all days</button>` : ""}</div>
      <div class="week">${week.map((d, i) => {
        const day = active.filter(r => r.date === d);
        const tests = day.filter(r => r.type === "test").length;
        return `<button class="day" data-date="${d}" aria-pressed="${f.date === d}"><div class="d">${i === 0 ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric" })}</div><div class="n tnum">${day.length}</div><div class="split">${plural(tests, "test ride")}, ${plural(day.length - tests, "service")}</div></button>`;
      }).join("")}</div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="chips">${["", ...statuses].map(s => `<button class="chip-btn" data-status="${s}" aria-pressed="${f.status === s}">${s ? label(s) : "All"}<span class="n">${s ? all.counts[s] || 0 : all.rows.length}</span></button>`).join("")}</div>
        <select data-type aria-label="Booking type"><option value="">Test rides and services</option><option value="test" ${f.type === "test" ? "selected" : ""}>Test rides</option><option value="service" ${f.type === "service" ? "selected" : ""}>Services</option></select>
        <input type="search" placeholder="Search name, phone, bike" value="${esc(f.q)}" data-q>
        <span class="spacer" style="flex:1"></span>
        <a class="btn" href="/api/admin/export/bookings.csv">Export CSV</a>
      </div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Ref</th><th>When</th><th>Type</th><th>Bike / service</th><th>Customer</th><th>Status</th><th>Booked</th></tr></thead><tbody>
        ${rows.slice(0, shown).map(r => `<tr>
          <td class="tnum">BK-${String(r.id).padStart(5, "0")}</td>
          <td><b>${new Date(r.date + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}</b> <span class="tnum">${r.slot}</span></td>
          <td>${r.type === "test" ? "Test ride" : "Service"}${r.licence === "I'm a learner" ? '<div class="sm">Learner</div>' : ""}</td>
          <td>${esc(r.type === "test" ? bikeName(r.bike_id) : r.service_type)}${r.type === "service" ? `<div class="sm">${esc(bikeName(r.bike_id))}${r.mileage ? `, ${num(r.mileage)} km` : ""}</div>` : ""}${r.notes ? `<div class="sm">${esc(r.notes)}</div>` : ""}</td>
          <td>${esc(r.name)}<div class="sm"><a href="${waHref(r.phone)}" target="_blank" rel="noopener">${esc(r.phone)}</a></div></td>
          <td>${statusSelect("bookings", r.id, r.status, statuses)}</td>
          <td class="sm">${ago(r.created_at)}</td></tr>`).join("")}
      </tbody></table></div>${moreBtn(rows.length, shown)}` : `<div class="empty">No bookings match these filters.</div>`}
    </section>`;
  bindFilters(c, "bookings");
  $$("[data-date]", c).forEach(b => b.addEventListener("click", () => { f.date = f.date === b.dataset.date ? "" : b.dataset.date; render(); }));
  $("[data-clear-date]", c)?.addEventListener("click", () => { f.date = ""; render(); });
};

function statusSelect(table, id, current, options, field = "status") {
  return `<span class="status ${STATUS_TONE[current] || ""}" style="gap:0"><select class="status-select" data-patch="${table}" data-id="${id}" data-field="${field}" aria-label="${field}">${options.map(o => `<option value="${o}" ${o === current ? "selected" : ""}>${label(o)}</option>`).join("")}</select></span>`;
}

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const moreBtn = (total, shown) => total > shown ? `<div style="display:flex;justify-content:center;gap:12px;align-items:center;margin-top:14px"><span class="muted">Showing ${shown} of ${num(total)}</span><button class="btn" data-more>Show 50 more</button></div>` : "";

function bindFilters(c, key) {
  const f = state.filters[key];
  $("[data-more]", c)?.addEventListener("click", () => { f.limit = (f.limit || 50) + 50; render(); });
  $$("[data-status]", c).forEach(b => b.addEventListener("click", () => { f.status = b.dataset.status; f.limit = 50; render(); }));
  $$("[data-stage-filter]", c).forEach(b => b.addEventListener("click", () => { f.type = b.dataset.stageFilter; render(); }));
  $("[data-type]", c)?.addEventListener("change", e => { f.type = e.target.value; render(); });
  $("[data-kind]", c)?.addEventListener("change", e => { f.kind = e.target.value; render(); });
  const q = $("[data-q]", c);
  if (q) q.addEventListener("input", () => { clearTimeout(q._t); q._t = setTimeout(() => { f.q = q.value; render().then(() => { const n = $("[data-q]"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }, 250); });
}

document.addEventListener("change", async e => {
  const s = e.target.closest("[data-patch]");
  if (!s) return;
  const body = { [s.dataset.field]: s.dataset.field === "total" ? parseInt(s.value, 10) || 0 : s.value };
  try {
    await api(`/api/admin/${s.dataset.patch}/${s.dataset.id}`, { method: "PATCH", body });
    const wrap = s.closest(".status"); if (wrap) wrap.className = "status " + (STATUS_TONE[s.value] || "");
    toast("Saved"); updateCounts();
  } catch (err) { toast(err.message); }
});

/* ---------- Orders ---------- */
views.orders = async (c) => {
  const f = state.filters.orders ||= { status: "", kind: "", q: "" };
  const qs = new URLSearchParams({ limit: 500, ...(f.status && { status: f.status }), ...(f.kind && { kind: f.kind }), ...(f.q && { q: f.q }) });
  const [data, ov] = await Promise.all([api(`/api/admin/orders?${qs}`), state.overview?.range.days === state.days ? state.overview : api(`/api/admin/overview?days=${state.days}`)]);
  state.overview = ov;
  const statuses = ["new", "quoted", "paid", "ready", "delivered", "cancelled"];
  const shown = f.limit || 50;
  const unpaid = data.rows.filter(r => r.payment_status === "unpaid" && r.status !== "cancelled").reduce((a, r) => a + r.total, 0);
  c.innerHTML = `
    <section class="grid g-2">
      <div class="panel">
        <div class="panel-head"><div><h2>Best-selling gear</h2><p class="sub">Paid revenue in the last ${state.days} days</p></div></div>
        ${ov.productSales.length ? barList(ov.productSales.map(p => ({ name: p.product, value: p.revenue, tip: tipRow("", "Units", num(p.qty)) })), { fmt: kesShort, extra: r => "" }) : `<div class="empty">No paid gear orders yet.</div>`}
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Money to collect</h2><p class="sub">Open orders not yet paid</p></div></div>
        <div class="live-big tnum">${kesShort(unpaid)}</div>
        <p class="muted">${data.rows.filter(r => r.status === "new").length} new orders, ${data.rows.filter(r => r.kind === "parts" && ["new", "quoted"].includes(r.status)).length} parts requests waiting for a quote.</p>
      </div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="chips">${["", ...statuses].map(s => `<button class="chip-btn" data-status="${s}" aria-pressed="${f.status === s}">${s ? label(s) : "All"}<span class="n">${s ? data.counts[s] || 0 : Object.values(data.counts).reduce((a, b) => a + b, 0)}</span></button>`).join("")}</div>
        <select data-kind aria-label="Order type"><option value="">Gear and parts</option><option value="gear" ${f.kind === "gear" ? "selected" : ""}>Gear</option><option value="parts" ${f.kind === "parts" ? "selected" : ""}>Spare parts</option></select>
        <input type="search" placeholder="Search name, phone, item" value="${esc(f.q)}" data-q>
        <span style="flex:1"></span>
        <a class="btn" href="/api/admin/export/orders.csv">Export CSV</a>
      </div>
      ${data.rows.length ? `<div class="table-wrap"><table><thead><tr><th>Ref</th><th>Items</th><th class="num">Total</th><th>Customer</th><th>Delivery</th><th>Payment</th><th>Status</th><th>Placed</th></tr></thead><tbody>
        ${data.rows.slice(0, shown).map(r => `<tr>
          <td class="tnum">OR-${String(r.id).padStart(5, "0")}<div class="sm">${r.kind === "parts" ? "Spare part" : "Gear"}</div></td>
          <td>${(r.items || []).map(i => `${esc(i.name)}${i.size ? ` <span class="sm">(${esc(i.size)})</span>` : ""}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join("<br>")}${r.bike ? `<div class="sm">For ${esc(r.bike)}</div>` : ""}</td>
          <td class="num">${r.kind === "parts" ? `<input class="inp price-inp" type="number" min="0" step="100" value="${r.total || ""}" placeholder="Quote" data-patch="orders" data-id="${r.id}" data-field="total" aria-label="Quote amount">` : kes(r.total)}</td>
          <td>${esc(r.name)}<div class="sm"><a href="${waHref(r.phone)}" target="_blank" rel="noopener">${esc(r.phone)}</a></div></td>
          <td>${r.fulfilment === "delivery" ? `Deliver to ${esc(r.county || "?")}` : "Collect"}</td>
          <td>${statusSelect("orders", r.id, r.payment_status, ["unpaid", "paid", "refunded"], "payment_status")}</td>
          <td>${statusSelect("orders", r.id, r.status, statuses)}</td>
          <td class="sm">${ago(r.created_at)}</td></tr>`).join("")}
      </tbody></table></div>${moreBtn(data.rows.length, shown)}` : `<div class="empty">No orders match these filters.</div>`}
    </section>`;
  bindFilters(c, "orders");
};

/* ---------- Leads (kanban) ---------- */
views.leads = async (c) => {
  const f = state.filters.leads ||= { type: "sales", q: "" };
  const data = await api(`/api/admin/leads?limit=500${state.days ? `&days=${state.days}` : ""}`);
  const salesTypes = ["finance", "reservation", "contact"];
  let rows = data.rows.filter(r => f.type === "sales" ? salesTypes.includes(r.type) : f.type === "all" ? true : r.type === f.type);
  if (f.q) rows = rows.filter(r => `${r.name} ${r.phone} ${r.message || ""} ${r.bike_id || ""}`.toLowerCase().includes(f.q.toLowerCase()));
  const typeCounts = data.rows.reduce((a, r) => (a[r.type] = (a[r.type] || 0) + 1, a), {});
  const pipeVal = rows.filter(r => !["won", "lost"].includes(r.stage) && r.bike_id).reduce((a, r) => a + (state.catalog?.bikes.find(b => b.id === r.bike_id)?.price || 0), 0);
  const wonVal = rows.filter(r => r.stage === "won").reduce((a, r) => a + (r.value || 0), 0);
  c.innerHTML = `
    <section class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><span class="label">Open pipeline</span><span class="value tnum">${kesShort(pipeVal)}</span><span class="delta flat">Bike value of open sales leads</span></div>
      <div class="kpi"><span class="label">Won</span><span class="value tnum">${kesShort(wonVal)}</span><span class="delta flat">${rows.filter(r => r.stage === "won").length} bikes in the last ${state.days} days</span></div>
      <div class="kpi"><span class="label">Waiting for a call</span><span class="value tnum">${rows.filter(r => r.stage === "new").length}</span><span class="delta ${rows.filter(r => r.stage === "new").length ? "down" : "flat"}">New leads not yet contacted</span></div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="chips">
          <button class="chip-btn" data-stage-filter="sales" aria-pressed="${f.type === "sales"}">Sales leads<span class="n">${salesTypes.reduce((a, t) => a + (typeCounts[t] || 0), 0)}</span></button>
          ${Object.keys(LEAD_LABEL).map(t => `<button class="chip-btn" data-stage-filter="${t}" aria-pressed="${f.type === t}">${LEAD_LABEL[t]}<span class="n">${typeCounts[t] || 0}</span></button>`).join("")}
          <button class="chip-btn" data-stage-filter="all" aria-pressed="${f.type === "all"}">All</button>
        </div>
        <input type="search" placeholder="Search name, phone, message" value="${esc(f.q)}" data-q>
        <span style="flex:1"></span>
        <a class="btn" href="/api/admin/export/leads.csv">Export CSV</a>
      </div>
      <p class="sub" style="margin:0 0 12px">Drag a card to move it along the pipeline.</p>
      <div class="kanban">${STAGES.map(([s, name]) => {
        const col = rows.filter(r => r.stage === s);
        const tot = s === "won" ? col.reduce((a, r) => a + (r.value || 0), 0) : 0;
        return `<div class="col" data-stage="${s}"><h3>${name} <span class="tot tnum">${col.length}${tot ? ` · ${kesShort(tot)}` : ""}</span></h3>
          ${col.slice(0, 40).map(leadCard).join("")}${col.length > 40 ? `<div class="more">+${col.length - 40} more</div>` : ""}</div>`;
      }).join("")}</div>
    </section>`;
  bindFilters(c, "leads");
  bindKanban(c, rows);
};

function leadCard(r) {
  const m = r.meta || {};
  const detail = r.type === "finance" ? `${m.deposit_pct ?? "?"}% down, ${m.term ?? "?"} months${m.monthly ? `, ~${kes(m.monthly)}/mo` : ""}` :
    r.type === "rsvp" ? esc(m.event || "") : r.type === "notify" ? `Wants: ${esc(m.bike || "")}` : r.message ? esc(r.message).slice(0, 90) : "";
  return `<div class="card" draggable="true" data-id="${r.id}">
    <div class="top"><b>${esc(r.name || "Subscriber")}</b><span class="type">${LEAD_LABEL[r.type] || r.type}</span></div>
    ${r.bike_id ? `<div>${esc(bikeName(r.bike_id))}</div>` : ""}
    ${detail ? `<div class="sm muted">${detail}</div>` : ""}
    <div class="top sm muted"><a href="${waHref(r.phone)}" target="_blank" rel="noopener">${esc(r.phone || "")}</a><span>${ago(r.created_at)}</span></div>
    ${r.value ? `<div class="val tnum">${kes(r.value)}</div>` : ""}
  </div>`;
}

function bindKanban(c, rows) {
  let dragId = null;
  $$(".card", c).forEach(card => card.addEventListener("dragstart", e => { dragId = card.dataset.id; e.dataTransfer.effectAllowed = "move"; }));
  $$(".col", c).forEach(col => {
    col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", async e => {
      e.preventDefault(); col.classList.remove("over");
      const lead = rows.find(r => String(r.id) === dragId);
      if (!lead || lead.stage === col.dataset.stage) return;
      const body = { stage: col.dataset.stage };
      if (body.stage === "won") {
        const def = lead.value || state.catalog?.bikes.find(b => b.id === lead.bike_id)?.price || "";
        const v = prompt("Sale value in KES", def);
        if (v === null) return;
        body.value = parseInt(String(v).replace(/\D/g, ""), 10) || null;
      }
      try { await api(`/api/admin/leads/${lead.id}`, { method: "PATCH", body }); toast(`Moved to ${label(body.stage)}`); render(); updateCounts(); }
      catch (err) { toast(err.message); }
    });
  });
}

/* ---------- Rider wall ---------- */
views.wall = async (c) => {
  const { rows } = await api("/api/admin/wall");
  c.innerHTML = `<section class="panel">
    <div class="panel-head"><div><h2>Rider wall submissions</h2><p class="sub">Approved photos show on the Rides page. ${rows.filter(r => !r.approved).length} waiting for review.</p></div></div>
    <div class="wall-admin">${rows.map(r => `<div class="wall-item">
      <img src="${esc(r.photo)}" alt="${esc(r.name)}" loading="lazy">
      <div class="b"><div><b>${esc(r.name)}</b> <span class="sm muted">${esc(r.bike || "")}</span></div>
        <span class="status ${r.approved ? "good" : "warning"}">${r.approved ? "Live on site" : "Waiting for review"}</span>
        <div class="acts">${r.approved ? `<button class="btn" data-wall="${r.id}" data-approve="0">Hide</button>` : `<button class="btn btn-red" data-wall="${r.id}" data-approve="1">Approve</button>`}
          <button class="btn" data-wall-del="${r.id}">Delete</button></div></div></div>`).join("") || `<div class="empty">No submissions yet.</div>`}</div></section>`;
  $$("[data-wall]", c).forEach(b => b.addEventListener("click", async () => { await api(`/api/admin/wall/${b.dataset.wall}`, { method: "PATCH", body: { approved: +b.dataset.approve } }); toast(+b.dataset.approve ? "Approved" : "Hidden"); render(); updateCounts(); }));
  $$("[data-wall-del]", c).forEach(b => b.addEventListener("click", async () => { if (!confirm("Delete this photo permanently?")) return; await api(`/api/admin/wall/${b.dataset.wallDel}`, { method: "DELETE" }); toast("Deleted"); render(); updateCounts(); }));
};

/* ---------- Catalogue (prices & stock) ---------- */
views.catalog = async (c) => {
  const cat = state.catalog = await api("/api/admin/catalog");
  const row = (kind, r, title, sub) => `<tr>
    <td><b>${esc(title)}</b><div class="sm" style="text-transform:capitalize">${esc(sub)}</div></td>
    <td class="num"><input class="inp price-inp" type="number" min="0" step="1000" value="${r.price ?? ""}" data-cat="${kind}" data-id="${r.id}" data-field="price" aria-label="Price for ${esc(title)}"></td>
    <td class="num"><input class="inp stock-inp" type="number" min="0" value="${r.stock}" data-cat="${kind}" data-id="${r.id}" data-field="stock" aria-label="Stock for ${esc(title)}"></td>
    <td><label class="switch" title="Show on website"><input type="checkbox" ${r.active ? "checked" : ""} data-cat="${kind}" data-id="${r.id}" data-field="active"><span></span></label></td>
    <td class="sm"><span class="saved" data-saved="${kind}-${r.id}">Saved</span> ${ago(r.updated_at)}</td></tr>`;
  c.innerHTML = `
    <section class="panel">
      <div class="panel-head"><div><h2>Bikes</h2><p class="sub">Changes go live on the website straight away</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Model</th><th class="num">Price (KES)</th><th class="num">In stock</th><th>On site</th><th>Updated</th></tr></thead>
      <tbody>${cat.bikes.map(b => row("bikes", b, `${b.brand} ${b.name}`, b.style)).join("")}</tbody></table></div>
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Gear & accessories</h2><p class="sub">Out-of-stock items show as unavailable in the shop</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Price (KES)</th><th class="num">In stock</th><th>On site</th><th>Updated</th></tr></thead>
      <tbody>${cat.products.map(p => row("products", p, p.name, p.category)).join("")}</tbody></table></div>
    </section>`;
  $$("[data-cat]", c).forEach(inp => inp.addEventListener("change", async () => {
    const v = inp.type === "checkbox" ? (inp.checked ? 1 : 0) : (inp.value === "" ? null : parseInt(inp.value, 10));
    try {
      await api(`/api/admin/${inp.dataset.cat}/${inp.dataset.id}`, { method: "PATCH", body: { [inp.dataset.field]: v } });
      const s = $(`[data-saved="${inp.dataset.cat}-${inp.dataset.id}"]`); s.classList.add("show"); setTimeout(() => s.classList.remove("show"), 1500);
    } catch (err) { toast(err.message); }
  }));
};

/* ================= SHELL ================= */
const TITLES = { overview: "Overview", traffic: "Traffic", bookings: "Bookings", orders: "Orders", leads: "Leads", wall: "Rider wall", catalog: "Prices & stock" };

async function render() {
  const c = $("#content");
  $$(".nav-btn").forEach(b => b.setAttribute("aria-current", b.dataset.view === state.view ? "page" : "false"));
  $("#view-title").textContent = TITLES[state.view];
  $("#range").style.visibility = ["overview", "traffic", "orders", "leads"].includes(state.view) ? "visible" : "hidden";
  try { await views[state.view](c); }
  catch (err) { if (err.message !== "Signed out") c.innerHTML = `<div class="panel empty">Couldn't load this view: ${esc(err.message)}. <button class="btn" onclick="render()">Try again</button></div>`; }
}

async function updateCounts() {
  try {
    const [b, o, l, w] = await Promise.all([api("/api/admin/bookings?status=pending&limit=1"), api("/api/admin/orders?status=new&limit=1"), api("/api/admin/leads?stage=new&limit=1"), api("/api/admin/wall")]);
    const set = (id, n) => { const el = $(id); el.textContent = n; el.classList.toggle("hidden", !n); };
    set("#c-bookings", b.counts.pending || 0); set("#c-orders", o.counts.new || 0); set("#c-leads", l.counts.new || 0); set("#c-wall", w.rows.filter(r => !r.approved).length);
  } catch {}
}

function showLogin() { $("#app").classList.add("hidden"); $("#login").classList.remove("hidden"); $("#pw").focus(); }
async function showApp() {
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  state.catalog = await api("/api/admin/catalog").catch(() => null);
  state.view = TITLES[location.hash.slice(1)] ? location.hash.slice(1) : "overview";
  render(); updateCounts(); refreshLive();
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  try { await api("/api/admin/login", { method: "POST", body: { password: $("#pw").value } }); $("#login-err").textContent = ""; showApp(); }
  catch (err) { $("#login-err").textContent = err.message; }
});
$("#logout").addEventListener("click", async () => { await fetch("/api/admin/logout", { method: "POST" }); showLogin(); });
$$(".nav-btn").forEach(b => b.addEventListener("click", () => { state.view = b.dataset.view; history.replaceState(null, "", "#" + state.view); render(); }));
$$("#range button").forEach(b => b.addEventListener("click", () => {
  state.days = +b.dataset.days; state.overview = null;
  $$("#range button").forEach(x => x.setAttribute("aria-pressed", x === b));
  render();
}));
let resizeT; addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (["overview"].includes(state.view)) render(); }, 250); });
setInterval(() => { if (!$("#app").classList.contains("hidden")) { refreshLive(); updateCounts(); } }, 15000);

fetch("/api/admin/me").then(r => r.json()).then(d => d.admin ? showApp() : showLogin()).catch(showLogin);
