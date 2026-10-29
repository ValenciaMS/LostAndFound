import './style.css';
import { categoryLabel, initialLang, saveLang, t, type Key, type Lang } from './i18n';

interface Photo { id: string; name: string; img?: string }
interface Category { name: string; photos: Photo[] }
interface Catalog { updated: string; rootId: string; categories: Category[] }
interface Item extends Photo { category: string }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const driveThumb = (id: string, w: number) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const thumb = (p: Photo, w: number) => (p.img ? `${p.img}=s${w}` : driveThumb(p.id, w));

/** If the direct thumbnail fails, retry once with the Drive one. */
function withFallback(img: HTMLImageElement, p: Photo, w: number): void {
  img.referrerPolicy = 'no-referrer'; // with a foreign Referer Google answers 429
  img.addEventListener(
    'error',
    () => {
      if (p.img && !img.src.startsWith('https://drive.google.com/')) img.src = driveThumb(p.id, w);
    },
    { once: true },
  );
  img.src = thumb(p, w);
}
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

let lang: Lang = initialLang();
const tr = (key: Key) => t(lang, key);
const catName = (name: string) => categoryLabel(lang, name);
let catalog: Catalog;
let all: Item[] = [];
let selected = ''; // '' = todas
let query = '';
let visible: Item[] = [];
let current = -1;

function readHash(): void {
  const cat = new URLSearchParams(location.hash.slice(1)).get('cat') ?? '';
  selected = catalog.categories.some((c) => c.name === cat) ? cat : '';
}

function writeHash(): void {
  history.replaceState(null, '', selected ? `#cat=${encodeURIComponent(selected)}` : location.pathname + location.search);
}

function renderCats(): void {
  const nav = $('cats');
  nav.replaceChildren();
  const make = (label: string, value: string, n: number) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.setAttribute('aria-pressed', String(value === selected));
    b.append(label);
    const small = document.createElement('small');
    small.textContent = String(n);
    b.append(small);
    b.onclick = () => {
      selected = value;
      writeHash();
      renderCats();
      renderGrid();
    };
    nav.append(b);
  };
  make(tr('all'), '', all.length);
  for (const c of catalog.categories) make(catName(c.name), c.name, c.photos.length);
}

function renderGrid(): void {
  const q = normalize(query.trim());
  visible = all.filter((p) => (!selected || p.category === selected) && (!q || normalize(p.name).includes(q)));
  const grid = $('grid');
  grid.replaceChildren();
  if (!visible.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = tr('none');
    grid.append(p);
  }
  visible.forEach((item, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = item.name;
    withFallback(img, item, 400);
    const label = document.createElement('span');
    label.textContent = item.name;
    card.append(img, label);
    card.onclick = () => openLightbox(i);
    grid.append(card);
  });
  $('count').textContent = `${visible.length} ${tr(visible.length === 1 ? 'one' : 'many')}`;
}

function showLightbox(): void {
  const item = visible[current];
  if (!item) return;
  const img = $<HTMLImageElement>('lbImg');
  img.alt = item.name;
  withFallback(img, item, 1600);
  $('lbCap').textContent = `${item.name} · ${catName(item.category)}`;
  $<HTMLAnchorElement>('lbOpen').href = `https://drive.google.com/file/d/${item.id}/view`;
}

function renderStatic(): void {
  document.documentElement.lang = lang;
  document.title = tr('title');
  document.querySelector('meta[name=description]')?.setAttribute('content', tr('pageDescription'));
  $('title').textContent = tr('title');
  const search = $<HTMLInputElement>('search');
  search.placeholder = tr('search');
  search.setAttribute('aria-label', tr('searchLabel'));
  $('cats').setAttribute('aria-label', tr('cats'));
  $('lightbox').setAttribute('aria-label', tr('zoomed'));
  $('lbClose').setAttribute('aria-label', tr('close'));
  $('lbPrev').setAttribute('aria-label', tr('prev'));
  $('lbNext').setAttribute('aria-label', tr('next'));
  $('lbOpen').textContent = tr('open');
  $('langEn').setAttribute('aria-pressed', String(lang === 'en'));
  $('langEs').setAttribute('aria-pressed', String(lang === 'es'));
  $('btnCheck').textContent = tr('check');
  renderUpdated();
}

const locale = () => (lang === 'es' ? 'es-ES' : 'en-GB');

function renderUpdated(): void {
  if (!catalog) return;
  const when = new Date(catalog.updated);
  const abs = when.toLocaleString(locale(), { dateStyle: 'long', timeStyle: 'short' });
  const mins = Math.max(0, Math.round((Date.now() - when.getTime()) / 60000));
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const ago = mins < 60 ? rtf.format(-mins, 'minute') : mins < 1440 ? rtf.format(-Math.round(mins / 60), 'hour') : rtf.format(-Math.round(mins / 1440), 'day');
  $('updated').textContent = `${tr('updated')}: ${abs} (${ago})`;
}

async function loadCatalog(): Promise<Catalog> {
  const res = await fetch(`./photos.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Catalog;
}

async function checkUpdates(): Promise<void> {
  const btn = $<HTMLButtonElement>('btnCheck');
  btn.disabled = true;
  $('checkMsg').textContent = tr('checking');
  try {
    const fresh = await loadCatalog();
    if (fresh.updated !== catalog.updated) {
      catalog = fresh;
      all = flatten(fresh);
      readHash();
      renderCats();
      renderGrid();
      renderUpdated();
      $('checkMsg').textContent = tr('refreshed');
    } else {
      $('checkMsg').textContent = tr('upToDate');
    }
  } catch {
    $('checkMsg').textContent = tr('checkError');
  } finally {
    btn.disabled = false;
  }
}

const flatten = (c: Catalog): Item[] => c.categories.flatMap((cat) => cat.photos.map((p) => ({ ...p, category: cat.name })));

function setLang(next: Lang): void {
  lang = next;
  saveLang(lang);
  renderStatic();
  if (catalog) {
    renderCats();
    renderGrid();
    if (!$('lightbox').hidden) showLightbox();
  }
}

function openLightbox(i: number): void {
  current = i;
  $('lightbox').hidden = false;
  document.body.style.overflow = 'hidden';
  showLightbox();
}

function closeLightbox(): void {
  $('lightbox').hidden = true;
  document.body.style.overflow = '';
}

function step(d: number): void {
  if (!visible.length) return;
  current = (current + d + visible.length) % visible.length;
  showLightbox();
}

function wireEvents(): void {
  $('search').addEventListener('input', (e) => {
    query = (e.target as HTMLInputElement).value;
    renderGrid();
  });
  $('btnCheck').onclick = () => void checkUpdates();
  $('langEn').onclick = () => setLang('en');
  $('langEs').onclick = () => setLang('es');
  $('lbClose').onclick = closeLightbox;
  $('lbPrev').onclick = () => step(-1);
  $('lbNext').onclick = () => step(1);
  $('lightbox').addEventListener('click', (e) => {
    if (e.target === $('lightbox')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if ($('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
  let x0 = 0;
  $('lightbox').addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  $('lightbox').addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });
  window.addEventListener('hashchange', () => {
    readHash();
    renderCats();
    renderGrid();
  });
}

async function init(): Promise<void> {
  renderStatic();
  wireEvents();
  try {
    catalog = await loadCatalog();
  } catch {
    $('count').textContent = tr('loadError');
    return;
  }
  all = flatten(catalog);
  setInterval(renderUpdated, 60_000);
  readHash();
  renderCats();
  renderGrid();
  renderStatic();
}

void init();
