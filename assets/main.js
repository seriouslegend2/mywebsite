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
// 4. VLOG — timeline
// Only runs on vlog.html (guarded by the presence of #timeline).
// =============================================================================

// -- Local seed data. Shape is the contract the Phase 2 backend must match. ----
// { day: number, date: 'YYYY-MM-DD', title: string, body: string, tags: string[] }
const ENTRIES = [
  {
    day: 1,
    date: '2026-08-10',
    title: 'Rebuilt the site from scratch',
    body: 'Threw out the old portfolio. New black grid system, half the words, twice the signal.',
    tags: ['site', 'design'],
  },
  {
    day: 2,
    date: '2026-08-11',
    title: 'Mapped the agent architecture end to end',
    body: 'Drew every dispatch path in the Watcher on one page. Three redundant hops fell out immediately.',
    tags: ['agents', 'architecture'],
  },
  {
    day: 3,
    date: '2026-08-12',
    title: 'Read the DSPy optimiser internals',
    body: 'Wanted to know what the compiler actually does to a prompt before trusting it in production.',
    tags: ['reading', 'dspy'],
  },
];

// -----------------------------------------------------------------------------
// DATA SOURCE — the single seam between the UI and wherever entries live.
// Phase 1: returns the local array above.
// Phase 2: swap the body for a Supabase REST call. Nothing else changes, as
// long as the resolved array keeps the entry shape documented above.
// -----------------------------------------------------------------------------
async function loadEntries() {
  // PHASE 2: replace the return below with the Supabase REST fetch, e.g.
  //
  //   const res = await fetch(
  //     `${SUPABASE_URL}/rest/v1/vlog_entries?select=day,date,title,body,tags&order=day.desc`,
  //     { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  //   );
  //   if (!res.ok) throw new Error(`Supabase ${res.status}`);
  //   return await res.json();
  //
  // (No URL or key is committed yet — Phase 2 adds them.)
  return ENTRIES;
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
 * Build one timeline entry.
 * @param {{day:number,date:string,title:string,body:string,tags:string[]}} entry
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

  const title = document.createElement('h2');
  title.className = 'entry__title';
  title.textContent = entry.title;

  const body = document.createElement('p');
  body.className = 'entry__body';
  body.textContent = entry.body;

  article.append(day, title, body);

  if (Array.isArray(entry.tags) && entry.tags.length) {
    const tags = document.createElement('ul');
    tags.className = 'entry__tags';
    for (const tag of entry.tags) {
      const li = document.createElement('li');
      li.textContent = tag;
      tags.appendChild(li);
    }
    article.appendChild(tags);
  }

  return article;
}

/**
 * Render the whole timeline, newest day first, plus the running counters.
 * @param {Array} entries
 */
function renderEntries(entries) {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;

  timeline.textContent = '';

  const list = Array.isArray(entries) ? entries.slice() : [];

  // Empty state.
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    const p = document.createElement('p');
    p.textContent = 'No entries yet. Day one goes up soon.';
    empty.appendChild(p);
    timeline.appendChild(empty);
    setCounters(0, null, null);
    return;
  }

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
      console.error('[vlog] failed to load entries', err);
      renderEntries([]);
    });
}
