// Lista la carpeta pública de Drive (vista incrustada, sin API key) y escribe public/photos.json.
// Uso: node scripts/fetch-photos.mjs [ID_CARPETA]
import { writeFile } from 'node:fs/promises';

const ROOT_ID = process.argv[2] ?? '1--QrybfUIlUZbd_czKIxGHF6l9Hj5f-9';
const OUT = new URL('../public/photos.json', import.meta.url);
const UNCATEGORIZED = 'Uncategorized'; // la web lo traduce según el idioma

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

async function listFolder(id) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`);
  if (!res.ok) throw new Error(`Drive devolvió ${res.status} para la carpeta ${id}`);
  const html = await res.text();
  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? id);
  const entries = [];
  for (const block of html.split('<div class="flip-entry" id="entry-').slice(1)) {
    const entryId = /^([A-Za-z0-9_-]+)"/.exec(block)?.[1];
    const name = /class="flip-entry-title">([^<]*)</.exec(block)?.[1];
    if (!entryId || name === undefined) continue;
    const img = /<img src="(https:\/\/lh3\.googleusercontent\.com\/[^"=]+)=s\d+"/.exec(block)?.[1];
    entries.push({
      id: entryId,
      img,
      name: decode(name).trim(),
      isFolder: block.includes('aria-label="Folder"'),
    });
  }
  return { title, entries };
}

const cleanName = (n) => n.replace(/\.(jpe?g|png|gif|webp|heic)$/i, '');

const categories = new Map();
const add = (cat, photo) => {
  if (!categories.has(cat)) categories.set(cat, []);
  categories.get(cat).push(photo);
};

async function walk(id, path) {
  const { title, entries } = await listFolder(id);
  if (path.length === 0 && title) console.log(`Carpeta raíz: ${title}`);
  for (const e of entries) {
    if (e.isFolder) {
      await walk(e.id, [...path, e.name]);
    } else {
      add(path.length ? path.join(' / ') : UNCATEGORIZED, { id: e.id, name: cleanName(e.name), img: e.img });
    }
  }
}

await walk(ROOT_ID, []);

const sorted = [...categories.entries()]
  .sort(([a], [b]) =>
    a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, 'es'),
  )
  .map(([name, photos]) => ({
    name,
    photos: photos.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })),
  }));

const total = sorted.reduce((n, c) => n + c.photos.length, 0);
if (total === 0) throw new Error('No se ha encontrado ninguna foto; no se sobrescribe photos.json');

await writeFile(
  OUT,
  JSON.stringify({ updated: new Date().toISOString(), rootId: ROOT_ID, categories: sorted }, null, 1),
);
for (const c of sorted) console.log(`${c.name}: ${c.photos.length}`);
console.log(`Total: ${total} fotos`);
