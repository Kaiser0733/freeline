const IST = "Asia/Kolkata";
const CLOSING_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * CLOSING_MS;
const SHOWN_ROUTES = 2;

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
  "frontier-grade": { cls: "tier--frontier", label: "Frontier-grade" },
  promising: { cls: "tier--promising", label: "Promising" },
};

const STATUS = { live: "Live", expiring: "Expiring", dead: "Dead" };

const pad2 = (n) => String(n).padStart(2, "0");

function disputedBadge() {
  return `<span class="disputed">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
      <path d="M12 3.5 22 20.5H2z"/><path d="M12 10v4.5"/><path d="M12 17.6v.1"/>
    </svg>Disputed</span>`;
}

function routeHTML(route, lastVerified) {
  const status = STATUS[route.status] || "Dead";
  return `<div class="route">
    <div class="route__who">
      <span class="route__provider">${esc(route.provider)}</span>
      <span class="route__sep" aria-hidden="true">·</span>
      <span class="route__slug" title="${esc(route.label)}">${esc(route.label)}</span>
    </div>
    <span class="pill pill--${esc(route.status)}">${status}</span>
    <p class="route__note">${esc(route.note)}</p>
    <span class="route__verify">verified ${esc(hmIST(lastVerified))} IST</span>
  </div>`;
}

function routesHTML(routes, lastVerified) {
  return `<div class="routes">${routes.map((r) => routeHTML(r, lastVerified)).join("")}</div>`;
}

function cardHTML(m, index) {
  const tier = TIER[m.tier] || TIER.promising;
  const disputed = Array.isArray(m.flags) && m.flags.includes("disputed");
  const bench = Object.entries(m.benchmarks || {});
  const total = m.routes.length;
  const liveRoutes = m.routes.filter((r) => r.status === "live").length;
  const head = m.routes.slice(0, SHOWN_ROUTES);
  const rest = m.routes.slice(SHOWN_ROUTES);

  return `<article class="model"${disputed ? ' data-flags="disputed"' : ""}>
    <div class="model__num" aria-hidden="true">${pad2(index + 1)}</div>
    <div class="model__body">
      <div class="plinth">
        <h3 class="plinth__name">${esc(m.name)}</h3>
        <span class="plinth__ruler" aria-hidden="true"></span>
        <span class="tier ${tier.cls}">${tier.label}</span>
      </div>
      <div class="under-name">
        <span>context <b>${esc(m.context)}</b></span>
        <span aria-hidden="true">·</span>
        <span class="tally">${total} route${total === 1 ? "" : "s"} <b>${liveRoutes}/${total}</b> live</span>
        ${disputed ? disputedBadge() : ""}
      </div>
      <p class="headline">${esc(m.headline)}</p>
      ${bench.length ? `<div class="bench">${bench
        .map(([k, v]) => `<span class="bench__chip"><span class="bench__k">${esc(k)}</span><span class="bench__v">${esc(v)}</span></span>`)
        .join("")}</div>` : ""}
      ${routesHTML(head, m.lastVerified)}
      ${rest.length ? `<details class="more">
        <summary><span class="more__rule" aria-hidden="true"></span><span>+${rest.length} more route${rest.length === 1 ? "" : "s"}</span><span class="more__rule" aria-hidden="true"></span></summary>
        <div class="more__list"><div>${routesHTML(rest, m.lastVerified)}</div></div>
      </details>` : ""}
    </div>
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

  $("stats").querySelectorAll("dd").forEach((dd, i) => {
    dd.textContent = pad2([live, routes, closing, died][i]);
  });

  $("snapTime").textContent = `${dateIST(data.generatedAt)} · ${hmIST(data.generatedAt)}`;
  if (data.probeNote) $("probe-note").textContent = data.probeNote;
  document.title = `FREELINE — ${live} models free, ${closing} closing`;
}

function renderFilters(data) {
  Object.keys(FILTERS).forEach((key) => {
    const el = document.querySelector(`[data-count="${key}"]`);
    if (el) el.textContent = pad2(data.models.filter(FILTERS[key]).length);
  });
}

function renderGrave(graveyard) {
  const list = $("grave-list");
  if (!graveyard || !graveyard.length) {
    list.innerHTML = `<li><span class="grave__date">—</span><span class="grave__name">Nothing has died yet.</span><span class="grave__cause">Every free route on the board is still holding its window.</span></li>`;
    return;
  }
  list.innerHTML = graveyard
    .slice()
    .sort((a, b) => b.died.localeCompare(a.died))
    .map((g) => `<li>
      <span class="grave__date">${esc(dateIST(g.died + "T00:00:00+05:30"))}</span>
      <span class="grave__name">${esc(g.name)}</span>
      <span class="grave__cause">${esc(g.cause)}</span>
    </li>`)
    .join("");
}

function filterLabel(filter) {
  const btn = document.querySelector(`button[data-filter="${filter}"]`);
  return btn ? btn.textContent.replace(/\s*\d+\s*$/, "").trim().toLowerCase() : filter;
}

function renderEmpty(n, filter) {
  const el = $("empty");
  el.hidden = n > 0;
  $("models").hidden = n === 0;
  if (n > 0) return;
  el.innerHTML = filter === "all"
    ? `<b>The register came back empty.</b>data.json loaded but carried no models. Re-run the probe, or check the file is the snapshot you meant to publish.`
    : `<b>Nothing on the register is ${esc(filterLabel(filter))} right now.</b>Try <a href="#board" data-reset>the full register</a> — the rest is still verified.`;
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
  el.innerHTML = `<b>The register could not load.</b>data.json did not come back (${esc(
    err && err.message ? err.message : "unknown error"
  )}). If you opened this file directly, serve the folder over http — a file:// page is blocked from reading data.json.`;
}

function start(data) {
  $("models").setAttribute("aria-busy", "false");
  renderStats(data);
  renderFilters(data);
  renderGrave(data.graveyard);
  applyFilter(data, "all");

  const routes = data.models.reduce((n, m) => n + m.routes.length, 0);
  $("foot").insertAdjacentHTML(
    "beforeend",
    `<p class="foot__meta">${data.models.length} models · ${routes} routes · ${data.graveyard.length} dead · snapshot ${esc(
      hmIST(data.generatedAt)
    )} IST</p>`
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
