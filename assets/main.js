// =============================================================================
// Kaushal Edara — portfolio
// Vanilla ES module. No build step, no dependencies, no CDN.
// Shared by index.html and vlog.html; every block no-ops if its hooks are
// absent from the current page.
// =============================================================================

// Signals a successful boot so the file:// classic-script fallback stays a no-op.
window.__portfolioBooted = true;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// -----------------------------------------------------------------------------
// 1. Reveal — staggered block + hairline draw-in
// -----------------------------------------------------------------------------
function observeReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (!els.length) return;

  // Reduced motion or no IO support: show everything immediately.
  if (REDUCED || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
  );

  els.forEach((el) => io.observe(el));
}

observeReveals();

// -----------------------------------------------------------------------------
// 2. Nav — hairline appears once the page has scrolled off the top
// -----------------------------------------------------------------------------
const nav = document.querySelector('.nav');
if (nav) {
  let ticking = false;
  const sync = () => {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
    ticking = false;
  };
  sync();
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true }
  );
}

// -----------------------------------------------------------------------------
// 3. Footer year
// -----------------------------------------------------------------------------
const yearEl = document.getElementById('yr');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// =============================================================================
// 4. DISCLOSURE TREES
// The trees themselves are native <details>/<summary> and need none of this.
// Two enhancements only: a per-section expand/collapse-all, and opening the
// ancestors of a deep-linked node so a URL can address something collapsed.
// =============================================================================

const TREES = document.querySelectorAll('[data-tree]');

function syncTreeCtl(tree) {
  const all = tree.querySelectorAll('details');
  if (!all.length) return;
  let open = 0;
  all.forEach((d) => { if (d.open) open += 1; });
  tree.querySelectorAll('[data-tree-act]').forEach((btn) => {
    const wants = btn.dataset.treeAct === 'open';
    btn.setAttribute('aria-pressed', String(wants ? open === all.length : open === 0));
  });
}

TREES.forEach((tree) => {
  tree.querySelectorAll('[data-tree-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.dataset.treeAct === 'open';
      tree.querySelectorAll('details').forEach((d) => { d.open = open; });
      syncTreeCtl(tree);
    });
  });

  // `toggle` does not bubble, so listen on the way down instead.
  tree.addEventListener('toggle', () => syncTreeCtl(tree), true);
  syncTreeCtl(tree);
});

/** Open every <details> above `el` so it is actually on screen. */
function openAncestors(el) {
  let d = el.closest('details');
  while (d) {
    d.open = true;
    const parent = d.parentElement;
    d = parent ? parent.closest('details') : null;
  }
}

/** Resolve a hash, unfold whatever hides it, and scroll it under the nav. */
function revealHash(hash, smooth) {
  if (!hash || hash.length < 2) return;
  let target;
  try {
    target = document.querySelector(hash);
  } catch (_) {
    return; // not a usable selector
  }
  if (!target) return;

  openAncestors(target);

  requestAnimationFrame(() => {
    const navH = document.querySelector('.nav')?.offsetHeight || 54;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH - 10);
    window.scrollTo({ top, behavior: REDUCED || !smooth ? 'auto' : 'smooth' });
  });
}

if (TREES.length) {
  if (location.hash) revealHash(location.hash, false);
  window.addEventListener('hashchange', () => revealHash(location.hash, true));

  // In-page links to a node should unfold it too, not just jump at it.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash.length < 2) return;
    const target = document.querySelector(hash);
    if (target && target.closest('details')) {
      e.preventDefault();
      revealHash(hash, true);
      history.replaceState(null, '', hash);
    }
  });
}

// =============================================================================
// 5. THE WHEEL — radial jog-navigator
// A fixed dial in the bottom-right corner. Press it and the six destinations
// fan out along a quarter-arc; keep the pointer down and sweep, and the item
// under the pointer's *angle* highlights live; release on one to go there.
// Pointer Events + setPointerCapture give mouse, touch and pen a single code
// path, and keep the drag tracking once it leaves the handle. Plain clicks and
// full keyboard control work for anyone who never discovers the drag.
// =============================================================================

// Order mirrors the page: masthead → experience → publication → built →
// record → signatures. Section anchors only — the vlog is reached from the
// button under the sign-off, not from here.
const WHEEL_ITEMS = [
  { id: 'about', label: 'About', hash: '#about' },
  { id: 'work', label: 'Experience', hash: '#work' },
  { id: 'research', label: 'Paper', hash: '#research' },
  { id: 'built', label: 'Projects', hash: '#built' },
  { id: 'record', label: 'Education', hash: '#record' },
  { id: 'signatures', label: 'Signatures', hash: '#signatures' },
];

// Arc geometry, in degrees on a screen-space circle (y grows downward):
// 180 is due left of the pivot, 270 is due north. Item 0 sits nearest the
// thumb and the sweep runs upward.
const ARC_START = 178;
const ARC_END = 268;

const DEG = Math.PI / 180;

function buildWheel() {
  if (document.querySelector('.wheel')) return;

  const onVlog =
    /vlog\.html$/i.test(location.pathname) || !!document.getElementById('timeline');
  const count = WHEEL_ITEMS.length;
  const step = (ARC_END - ARC_START) / (count - 1);

  // -- DOM ---------------------------------------------------------------
  const wheel = document.createElement('nav');
  wheel.className = 'wheel';
  wheel.setAttribute('aria-label', 'Section wheel');

  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arc.setAttribute('class', 'wheel__arc');
  arc.setAttribute('aria-hidden', 'true');
  const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.appendChild(arcPath);

  const menu = document.createElement('div');
  menu.className = 'wheel__menu';
  menu.id = 'wheel-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Jump to section');

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'wheel__handle';
  handle.setAttribute('aria-expanded', 'false');
  handle.setAttribute('aria-haspopup', 'true');
  handle.setAttribute('aria-controls', 'wheel-menu');
  handle.setAttribute('aria-label', 'Open the section wheel — press and drag to select');
  handle.innerHTML =
    '<svg class="wheel__dial" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.5"/>' +
    '<line x1="12" y1="1.5" x2="12" y2="5"/>' +
    '<line x1="22.5" y1="12" x2="19" y2="12"/>' +
    '<line x1="12" y1="22.5" x2="12" y2="19"/>' +
    '<line x1="1.5" y1="12" x2="5" y2="12"/>' +
    '<circle cx="12" cy="12" r="2.5"/>' +
    '</svg>';

  const hint = document.createElement('span');
  hint.className = 'wheel__hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'Hold + sweep';

  const live = document.createElement('span');
  live.className = 'wheel__live';
  live.setAttribute('aria-live', 'polite');

  const els = WHEEL_ITEMS.map((item, i) => {
    const a = document.createElement('a');
    a.className = 'wheel__item';
    a.id = `wheel-i-${item.id}`;
    a.setAttribute('role', 'menuitem');
    a.tabIndex = -1;
    a.style.setProperty('--i', String(i));
    a.textContent = item.label;
    a.href = item.hash
      ? (onVlog ? `index.html${item.hash}` : item.hash)
      : (onVlog ? '#main' : 'vlog.html');
    menu.appendChild(a);
    return a;
  });

  wheel.append(arc, menu, handle, hint, live);
  document.body.appendChild(wheel);

  // -- State -------------------------------------------------------------
  let open = false;
  let active = 0;      // index highlighted by pointer / keyboard
  let current = 0;     // index reflecting the section actually in view
  let radius = 210;
  let dragging = false;
  let moved = false;
  let openedByThisPress = false;

  const angleOf = (i) => ARC_START + i * step;

  // -- Layout: place every chip's outer edge on its arc point -------------
  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    radius = Math.max(150, Math.min(215, Math.min(vw * 0.52, vh * 0.34)));
    wheel.style.setProperty('--wheel-r', `${radius}px`);

    els.forEach((el, i) => {
      const t = angleOf(i) * DEG;
      el.style.setProperty('--x', `${(Math.cos(t) * radius).toFixed(2)}px`);
      el.style.setProperty('--y', `${(Math.sin(t) * radius).toFixed(2)}px`);
    });

    // arc track, drawn a touch beyond the first and last item
    const d = 2 * radius;
    const pt = (deg) => {
      const t = deg * DEG;
      return [
        (radius + Math.cos(t) * radius).toFixed(2),
        (radius + Math.sin(t) * radius).toFixed(2),
      ];
    };
    const [x1, y1] = pt(ARC_START - 7);
    const [x2, y2] = pt(ARC_END + 7);
    arc.setAttribute('viewBox', `0 0 ${d} ${d}`);
    arcPath.setAttribute('d', `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`);
  }

  // -- Selection ---------------------------------------------------------
  function setActive(i, announce) {
    if (i == null) return;
    const changed = i !== active;
    active = i;
    els.forEach((el, n) => {
      el.classList.toggle('is-active', n === i);
      el.tabIndex = n === i ? 0 : -1;
    });
    menu.setAttribute('aria-activedescendant', els[i].id);
    // the dial face turns with the selection
    wheel.style.setProperty('--wheel-rot', `${(i / (count - 1)) * 90 - 45}deg`);
    if (announce && changed) live.textContent = WHEEL_ITEMS[i].label;
  }

  function setCurrent(i) {
    current = i;
    els.forEach((el, n) => {
      if (n === i) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  }

  function openWheel() {
    if (open) return;
    open = true;
    wheel.classList.add('is-open');
    handle.setAttribute('aria-expanded', 'true');
    setActive(current, false);
  }

  function closeWheel(focusHandle) {
    if (!open) return;
    open = false;
    wheel.classList.remove('is-open');
    handle.setAttribute('aria-expanded', 'false');
    els.forEach((el) => el.classList.remove('is-active'));
    live.textContent = '';
    if (focusHandle) handle.focus({ preventScroll: true });
  }

  // -- Navigation --------------------------------------------------------
  function go(i) {
    const item = WHEEL_ITEMS[i];
    closeWheel(false);

    // Cross-page destinations just follow the href.
    if (item.hash && onVlog) {
      location.href = `index.html${item.hash}`;
      return;
    }
    if (!item.hash && !onVlog) {
      location.href = 'vlog.html';
      return;
    }

    const target = item.hash
      ? document.querySelector(item.hash)
      : document.getElementById('main');
    if (!target) return;

    const navH = document.querySelector('.nav')?.offsetHeight || 54;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH - 10);
    window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
    if (item.hash) history.replaceState(null, '', item.hash);
  }

  // -- Pointer: press, sweep, release -------------------------------------
  // The angle from the pivot to the pointer picks the item, so the finger
  // never has to land on a chip — exactly the old jog-wheel behaviour.
  function pivot() {
    const r = handle.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function indexFromPointer(clientX, clientY) {
    const p = pivot();
    const vx = clientX - p.x;
    const vy = clientY - p.y;
    const dist = Math.hypot(vx, vy);
    if (dist < radius * 0.3) return null; // inside the dead zone: no selection
    let deg = (Math.atan2(vy, vx) / DEG + 360) % 360;
    // keep the sweep on our quadrant even when the pointer wanders past it
    if (deg < 90) deg += 360;
    const clamped = Math.min(Math.max(deg, ARC_START), ARC_END);
    return Math.min(count - 1, Math.max(0, Math.round((clamped - ARC_START) / step)));
  }

  handle.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    moved = false;
    openedByThisPress = !open;
    try { handle.setPointerCapture(e.pointerId); } catch (_) { /* older pens */ }
    openWheel();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = pivot();
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > handle.offsetWidth * 0.6) moved = true;
    const i = indexFromPointer(e.clientX, e.clientY);
    if (i != null) setActive(i, true);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }

    const i = indexFromPointer(e.clientX, e.clientY);
    if (moved && i != null) {
      go(i);                        // released on an item: ship there
    } else if (!moved && !openedByThisPress) {
      closeWheel(false);            // tapped an already-open wheel: shut it
    }
    // otherwise the wheel simply stays open for a second look or a click
  }

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', () => { dragging = false; });
  handle.addEventListener('contextmenu', (e) => { if (dragging) e.preventDefault(); });

  // -- Plain clicks and hovers on the chips themselves ---------------------
  els.forEach((el, i) => {
    // Hover follows the pointer — but never steals the selection back from a
    // keyboard user whose cursor happens to be resting on a chip.
    el.addEventListener('pointerenter', () => {
      if (open && !menu.contains(document.activeElement)) setActive(i, false);
    });
    el.addEventListener('focus', () => setActive(i, false));
    el.addEventListener('click', (e) => {
      // same-page targets are scrolled, not jumped
      const item = WHEEL_ITEMS[i];
      if ((item.hash && !onVlog) || (!item.hash && onVlog)) e.preventDefault();
      go(i);
    });
  });

  // -- Keyboard ------------------------------------------------------------
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp') {
      e.preventDefault();
      openWheel();
      els[active].focus({ preventScroll: true });
    } else if (e.key === 'Escape') {
      closeWheel(false);
    }
  });

  menu.addEventListener('keydown', (e) => {
    const move = (delta) => {
      e.preventDefault();
      const next = Math.min(count - 1, Math.max(0, active + delta));
      setActive(next, true);
      els[next].focus({ preventScroll: true });
    };
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight': move(1); break;      // up the arc
      case 'ArrowDown':
      case 'ArrowLeft': move(-1); break;      // back down it
      case 'Home': e.preventDefault(); setActive(0, true); els[0].focus({ preventScroll: true }); break;
      case 'End': e.preventDefault(); setActive(count - 1, true); els[count - 1].focus({ preventScroll: true }); break;
      case 'Enter':
      case ' ':
      case 'Spacebar': e.preventDefault(); go(active); handle.focus({ preventScroll: true }); break;
      case 'Escape': e.preventDefault(); closeWheel(true); break;
      case 'Tab': closeWheel(false); break;
      default: break;
    }
  });

  // -- Dismissal -----------------------------------------------------------
  document.addEventListener('pointerdown', (e) => {
    if (open && !wheel.contains(e.target)) closeWheel(false);
  });

  // -- Position indicator: reflect the section actually in view ------------
  function trackSections() {
    if (onVlog) { setCurrent(count - 1); setActive(count - 1, false); return; }
    if (!('IntersectionObserver' in window)) return;

    const map = new Map();
    WHEEL_ITEMS.forEach((item, i) => {
      if (!item.hash) return;
      const el = document.querySelector(item.hash);
      if (el) map.set(el, i);
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = map.get(entry.target);
          if (i == null) continue;
          setCurrent(i);
          if (!open) setActive(i, false);
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    map.forEach((_i, el) => io.observe(el));
  }

  // -- Boot ----------------------------------------------------------------
  layout();
  setCurrent(0);
  setActive(0, false);
  trackSections();

  let resizeTick = false;
  window.addEventListener('resize', () => {
    if (resizeTick) return;
    resizeTick = true;
    requestAnimationFrame(() => { layout(); resizeTick = false; });
  });
}

buildWheel();

// =============================================================================
// 6. VLOG — timeline
// Only runs on vlog.html (guarded by the presence of #timeline).
// =============================================================================

// -----------------------------------------------------------------------------
// CONFIG — injected at deploy time, not stored here.
//
// These two lines stay empty in the repository. The Pages workflow substitutes
// the real values from the repo secrets SUPABASE_URL and SUPABASE_ANON_KEY
// before it uploads the site, so the key lives in GitHub's secret store and
// never enters git history.
//
// Be clear about what that does and does not buy: this is a static site, so
// whatever the browser needs to reach Supabase, a visitor can read out of the
// network tab. The injection keeps the key out of the repo and makes rotation
// a one-click change — it does not make the key private, and it was never
// meant to be. The publishable key is a public identifier by design.
//
// What actually protects the data is Row Level Security: select granted to
// anon, and no insert/update/delete policy at all. The service_role key must
// never appear here or anywhere client-side — it bypasses RLS entirely.
//
// Table shape, deliberately minimal — a date and the text, nothing else.
// See supabase.sql for the script that creates it with the right policy.
// Day numbers are derived from date order, so there is no day column to keep
// in sync — add a row and it becomes the next day automatically.
//
// Empty values are a supported state: the page falls through to its empty
// timeline, which is what you get running the site locally.
// -----------------------------------------------------------------------------
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const VLOG_TABLE = 'vlog_entries';

// -----------------------------------------------------------------------------
// DATA SOURCE — the single seam between the UI and wherever entries live.
// Returns [] when unconfigured or unreachable, so the page degrades to its
// empty state instead of breaking.
// -----------------------------------------------------------------------------
/** Thrown when the deploy-time config never landed, so the UI can say so. */
function ConfigError(message) {
  const e = new Error(message);
  e.name = 'ConfigError';
  return e;
}

async function loadEntries() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Empty config and an empty table used to render identically, which made
    // a broken deploy look exactly like a log with nothing in it. Say which.
    throw ConfigError('Supabase config is empty — the deploy-time injection did not run.');
  }

  // id breaks ties so several points logged on the same date keep the order
  // they were written in.
  const url =
    `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${VLOG_TABLE}` +
    `?select=id,date,content&order=date.asc,id.asc`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Supabase ${res.status} ${res.statusText}`);

  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  // One row per point, one entry per DAY. Grouping happens here so the day
  // number tracks distinct dates — ten points logged on 11 Aug are all D01,
  // not D01 through D10.
  const byDate = new Map();
  for (const r of rows) {
    if (!r || !r.date || !r.content) continue;
    const date = String(r.date).slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(String(r.content));
  }

  // Map preserves insertion order and the query came back date-ascending,
  // so the first date seen is day 1.
  return [...byDate.entries()].map(([date, items], i) => ({
    day: i + 1,
    date,
    items,
  }));
}

// -- Rendering ----------------------------------------------------------------
const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d).toUpperCase();
}

/**
 * Turn one entry's plain text into block elements.
 *
 * The log is written as bullet lists more often than prose, so a line that
 * opens with •, -, * or – becomes a list item and consecutive ones group into
 * a single <ul>. Everything else is a paragraph, and a blank line always
 * starts a new block. Text goes in via textContent throughout, so a row
 * written in the database can never inject markup into the page.
 *
 * @param {string} text
 * @returns {DocumentFragment}
 */
function renderContent(text) {
  const frag = document.createDocumentFragment();
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');

  let para = [];   // buffered prose lines
  let list = null; // open <ul>, if any

  const flushPara = () => {
    if (!para.length) return;
    const p = document.createElement('p');
    p.textContent = para.join(' ');
    frag.appendChild(p);
    para = [];
  };
  const closeList = () => { list = null; };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {          // blank line ends whatever block is open
      flushPara();
      closeList();
      continue;
    }

    const bullet = line.match(/^[•\-*–]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!list) {
        list = document.createElement('ul');
        list.className = 'entry__list';
        frag.appendChild(list);
      }
      const li = document.createElement('li');
      li.textContent = bullet[1].trim();
      list.appendChild(li);
      continue;
    }

    // A plain line while a list is open is a continuation of the last item —
    // wrapped bullets are common when the text is pasted from a document.
    if (list && list.lastElementChild) {
      list.lastElementChild.textContent += ` ${line}`;
      continue;
    }

    para.push(line);
  }

  flushPara();
  return frag;
}

/** Normalise one stored point: drop a leading bullet glyph, unwrap linebreaks. */
function normalisePoint(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*[•\-*–]\s+/, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Render a day's points.
 *
 * One row per point is the normal shape, so each row becomes a list item.
 * A day holding a single row is rendered through renderContent instead, which
 * keeps working for an entry written as one block of prose or as one row
 * containing its own bullet list.
 *
 * @param {string[]} items
 * @returns {DocumentFragment}
 */
function renderPoints(items) {
  if (items.length === 1) return renderContent(items[0]);

  const frag = document.createDocumentFragment();
  const ul = document.createElement('ul');
  ul.className = 'entry__list';
  for (const item of items) {
    const text = normalisePoint(item);
    if (!text) continue;
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  }
  frag.appendChild(ul);
  return frag;
}

/**
 * Build one timeline entry — a date and that day's points.
 * @param {{day:number,date:string,items:string[]}} entry
 * @returns {HTMLElement}
 */
function buildEntry(entry, index) {
  const article = document.createElement('article');
  article.className = 'entry';
  article.setAttribute('data-reveal', '');
  article.style.setProperty('--i', String(index));

  const day = document.createElement('p');
  day.className = 'entry__day';
  const dayNum = document.createElement('b');
  dayNum.textContent = `D${String(entry.day).padStart(2, '0')}`;
  const dayDate = document.createElement('span');
  dayDate.textContent = formatDate(entry.date);
  day.append(dayNum, dayDate);

  const body = document.createElement('div');
  body.className = 'entry__body';
  body.appendChild(renderPoints(entry.items));

  article.append(day, body);
  return article;
}

/**
 * Render the whole timeline, newest day first, plus the running counters.
 * @param {Array} entries
 * @param {Error} [failure] present when the load failed rather than returned nothing
 */
function renderEntries(entries, failure) {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;

  timeline.textContent = '';

  const list = Array.isArray(entries) ? entries.slice() : [];

  // Empty state — and, importantly, three DIFFERENT empty states. A failed
  // load must never be mistaken for a log with nothing in it.
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';

    const p = document.createElement('p');
    if (failure && failure.name === 'ConfigError') {
      p.textContent = 'The log is not connected to its database on this build.';
    } else if (failure) {
      p.textContent = 'Could not reach the log right now. Try again in a moment.';
    } else {
      p.textContent = 'No entries yet. Day one goes up soon.';
    }
    empty.appendChild(p);

    if (failure) {
      const detail = document.createElement('p');
      detail.className = 'empty__detail';
      detail.textContent = failure.message;
      empty.appendChild(detail);
    }

    timeline.appendChild(empty);
    setCounters(0, null, null);
    return;
  }

  // Newest first on screen; day numbers were assigned oldest-first upstream.
  list.sort((a, b) => b.day - a.day);

  const frag = document.createDocumentFragment();
  list.forEach((entry, i) => frag.appendChild(buildEntry(entry, i)));
  timeline.appendChild(frag);

  setCounters(list.length, list[0], list[list.length - 1]);
  observeReveals(timeline);
}

function setCounters(count, newest, oldest) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('c-day', newest ? `D${String(newest.day).padStart(2, '0')}` : '—');
  set('c-count', count ? String(count).padStart(2, '0') : '00');
  set('c-since', oldest ? formatDate(oldest.date) : '—');
}

// -- Boot ---------------------------------------------------------------------
if (document.getElementById('timeline')) {
  loadEntries()
    .then(renderEntries)
    .catch((err) => {
      console.error('[vlog] failed to load entries:', err);
      renderEntries([], err);
    });
}
