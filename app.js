const IST = "Asia/Kolkata";
const CLOSING_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * CLOSING_MS;

const $ = (id) => document.getElementById(id);

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST, day: "2-digit", month: "short", year: "numeric",
});
const clockFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

const dateIST = (iso) => dateFmt.format(new Date(iso));

const part = (parts, type) => parts.find((p) => p.type === type).value;
const hmIST = (iso) => {
  const p = clockFmt.formatToParts(new Date(iso));
  return `${part(p, "hour")}:${part(p, "minute")}`;
};

function tick() {
  const el = $("clock");
  if (el) el.textContent = clockFmt.format(new Date());
}

const isLive = (m) => m.routes.some((r) => r.status === "live");
const isExpiring = (m) => m.routes.some((r) => r.status === "expiring");

const FILTERS = {
  all: () => true,
  live: isLive,
  closing: isExpiring,
  frontier: (m) => m.tier === "frontier-grade",
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const TIER = {
  "frontier-grade": { cls: "badge--frontier", label: "FRONTIER-GRADE" },
  promising: { cls: "badge--promising", label: "PROMISING" },
};

const STATUS = { live: "LIVE", expiring: "EXPIRING", dead: "DEAD" };

function disputedBadge() {
  return `<span class="badge badge--disputed">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
      <path d="M12 3.5 22 20.5H2z"/><path d="M12 10v4.5"/><path d="M12 17.6v.1"/>
    </svg>DISPUTED</span>`;
}

function routeHTML(route, lastVerified) {
  const status = STATUS[route.status] || "DEAD";
  return `<div class="route">
    <div class="route__head">
      <span class="route__provider">${esc(route.provider)}</span>
      <span class="route__label">${esc(route.label)}</span>
    </div>
    <span class="pill pill--${esc(route.status)}">${status}</span>
    <p class="route__note">${esc(route.note)}</p>
    <span class="route__verify">verified ${esc(hmIST(lastVerified))} IST</span>
  </div>`;
}

function cardHTML(m) {
  const tier = TIER[m.tier] || TIER.promising;
  const disputed = Array.isArray(m.flags) && m.flags.includes("disputed");
  const bench = Object.entries(m.benchmarks || {});
  const routes = m.routes.length;

  return `<article class="card"${disputed ? ' data-flags="disputed"' : ""}>
    <div class="card__top">
      <h3 class="card__name">${esc(m.name)}</h3>
      <div class="card__badges">
        ${disputed ? disputedBadge() : ""}
        <span class="badge ${tier.cls}">${tier.label}</span>
      </div>
    </div>
    <p class="card__headline">${esc(m.headline)}</p>
    <div class="card__meta">
      <span class="card__ctx">CONTEXT <b>${esc(m.context)}</b></span>
      <span class="sep" aria-hidden="true"></span>
      <span>${routes} route${routes === 1 ? "" : "s"}</span>
      <span class="sep" aria-hidden="true"></span>
      <span>verified ${esc(dateIST(m.lastVerified))}</span>
    </div>
    ${bench.length ? `<div class="bench">${bench
      .map(([k, v]) => `<span class="bench__chip">${esc(k)} <b>${esc(v)}</b></span>`)
      .join("")}</div>` : ""}
    <div class="routes">${m.routes.map((r) => routeHTML(r, m.lastVerified)).join("")}</div>
  </article>`;
}

function renderStats(data) {
  const models = data.models;
  const live = models.filter(isLive).length;
  const routes = models.reduce((n, m) => n + m.routes.filter((r) => r.status === "live").length, 0);
  const closing = models.filter(isExpiring).length;

  const now = new Date(data.generatedAt).getTime();
  const died = (data.graveyard || []).filter((g) => {
    const t = new Date(g.died + "T00:00:00+05:30").getTime();
    return t <= now + CLOSING_MS && t > now - WEEK_MS;
  }).length;

  const cells = $("stats").querySelectorAll(".stat");
  const values = [
    [live, "live"],
    [routes, "verified"],
    [closing, "closing"],
    [died, "dead"],
  ];
  cells.forEach((cell, i) => {
    const [n] = values[i];
    if (i === 2) cell.classList.add("stat--alert");
    if (i === 3) cell.classList.add("stat--dead");
    cell.querySelector("dd").innerHTML = String(n).padStart(2, "0");
  });

  $("snapTime").textContent = `${dateIST(data.generatedAt)} · ${hmIST(data.generatedAt)}`;
  document.title = `FREELINE — ${live} models free, ${closing} closing`;

  // tape: one tick per route, live routes tall — a heartbeat strip of the board
  const ticks = models.flatMap((m) => m.routes).map((r) => `<i data-s="${r.status}"></i>`).join("");
  $("tape").innerHTML = ticks;
}

function renderFilters(data) {
  Object.keys(FILTERS).forEach((key) => {
    const n = data.models.filter(FILTERS[key]).length;
    const el = document.querySelector(`[data-count="${key}"]`);
    if (el) el.textContent = String(n).padStart(2, "0");
  });
}

function renderGrave(graveyard) {
  const list = $("grave-list");
  if (!graveyard || !graveyard.length) {
    list.innerHTML = `<li><span class="grave__name">Nothing has died yet.</span><span class="grave__cause">Every free route on the board is still holding its window.</span></li>`;
    return;
  }
  list.innerHTML = graveyard
    .slice()
    .sort((a, b) => b.died.localeCompare(a.died))
    .map((g) => `<li>
      <span class="grave__date">${esc(dateIST(g.died + "T00:00:00+05:30"))}<span>died</span></span>
      <span class="grave__name">${esc(g.name)}</span>
      <span class="grave__cause">${esc(g.cause)}</span>
    </li>`)
    .join("");
}

function renderEmpty(n, filter) {
  const el = $("empty");
  el.hidden = n > 0;
  $("models").hidden = n === 0;
  if (n > 0) return;
  const label = document.querySelector(`[data-filter="${filter}"]`);
  el.innerHTML = filter === "all"
    ? `<b>The board came back empty.</b>${esc("data.json")} loaded but carried no models. Re-run the probe, or check the file is the snapshot you meant to publish.`
    : `<b>Nothing matches “${esc((label ? label.textContent : filter).replace(/\s*\d+$/, ""))}” right now.</b>Try <a href="#board" data-reset>All</a> — the rest of the board is still verified.`;
}

function applyFilter(data, filter) {
  const keep = FILTERS[filter] || FILTERS.all;
  const shown = data.models.filter(keep);
  $("models").innerHTML = shown.map(cardHTML).join("");
  $("models").setAttribute("aria-busy", "false");
  document.querySelectorAll("button[data-filter]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.filter === filter));
  });
  renderEmpty(shown.length, filter);
}

function fail(err) {
  $("models").hidden = true;
  const el = $("empty");
  el.hidden = false;
  el.innerHTML = `<b>The board could not load.</b>data.json did not come back (${esc(
    err && err.message ? err.message : "unknown error"
  )}). If you opened this file directly, serve the folder over http — a file:// page is blocked from reading data.json.`;
}

function start(data) {
  $("models").setAttribute("aria-busy", "false");
  renderStats(data);
  renderFilters(data);
  renderGrave(data.graveyard);
  applyFilter(data, "all");
  $("foot").insertAdjacentHTML(
    "beforeend",
    `<p class="foot__meta">${data.models.length} models · ${data.models.reduce(
      (n, m) => n + m.routes.length,
      0
    )} routes · ${data.graveyard.length} dead · snapshot ${esc(hmIST(data.generatedAt))} IST</p>`
  );

  $("filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (btn) applyFilter(data, btn.dataset.filter);
  });
  $("empty").addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) {
      e.preventDefault();
      applyFilter(data, "all");
    }
  });
}

tick();
setInterval(tick, 1000);

fetch("data.json", { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(start)
  .catch(fail);
