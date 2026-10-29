export type Lang = 'en' | 'es';

const texts = {
  en: {
    title: 'Lost & Found',
    search: 'Search (e.g. jumper)',
    searchLabel: 'Search by name',
    cats: 'Categories',
    all: 'All',
    one: 'photo',
    many: 'photos',
    none: 'No photos match your search.',
    loadError: 'The photo catalogue could not be loaded.',
    updated: 'Catalogue updated on',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    open: 'Open in Drive',
    zoomed: 'Enlarged photo',
    pageDescription: 'Lost property gallery of the school, organised by category.',
  },
  es: {
    title: 'Objetos perdidos',
    search: 'Buscar (por ejemplo, jumper)',
    searchLabel: 'Buscar por nombre',
    cats: 'Categorías',
    all: 'Todas',
    one: 'foto',
    many: 'fotos',
    none: 'No hay fotos que coincidan con la búsqueda.',
    loadError: 'No se ha podido cargar el catálogo de fotos.',
    updated: 'Catálogo actualizado el',
    close: 'Cerrar',
    prev: 'Anterior',
    next: 'Siguiente',
    open: 'Abrir en Drive',
    zoomed: 'Foto ampliada',
    pageDescription: 'Galería de objetos perdidos del colegio, organizada por categorías.',
  },
} as const;

export type Key = keyof (typeof texts)['en'];

/** Las categorías vienen de los nombres de carpeta de Drive (en inglés). */
const categoryNames: Record<Lang, Record<string, string>> = {
  en: { Uncategorized: 'Uncategorized' },
  es: {
    Clothes: 'Ropa',
    'Other items': 'Otros objetos',
    Toys: 'Juguetes',
    'Water bottles': 'Botellas de agua',
    Uncategorized: 'Sin carpeta',
  },
};

const STORAGE_KEY = 'lostfound-lang';

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // almacenamiento no disponible
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // almacenamiento no disponible
  }
}

export const t = (lang: Lang, key: Key): string => texts[lang][key];
export const categoryLabel = (lang: Lang, name: string): string => categoryNames[lang][name] ?? name;
