# Lost & Found / Objetos perdidos

Galería web de la carpeta pública de Drive «Lost & Found» del colegio, organizada por categorías (subcarpetas), con búsqueda por nombre y visor a pantalla completa.

## Cómo funciona

- `scripts/fetch-photos.mjs` lee la vista pública incrustada de la carpeta de Drive (sin API key), recorre las subcarpetas y escribe `public/photos.json`.
- La web (Vite + TypeScript) carga ese JSON y pinta las miniaturas directamente desde Google (no se copian las fotos).
- Las fotos sueltas en la raíz salen en la categoría «Uncategorized» («Sin carpeta»).
- Interfaz en inglés y castellano (botones EN/ES; por defecto, el idioma del navegador). Los nombres de las fotos se muestran tal como están en Drive; las categorías conocidas (Clothes, Other items, Toys, Water bottles) se traducen en `src/i18n.ts`.

```bash
npm install
npm run photos   # regenera public/photos.json desde Drive
npm run dev      # desarrollo
npm run build    # genera dist/
```

Para usar otra carpeta: `node scripts/fetch-photos.mjs <ID_CARPETA>`.

## Publicación (GitHub Pages)

`.github/workflows/pages.yml` regenera el catálogo y despliega en cada push a `main` y cada hora. Si Drive falla, se conserva el `photos.json` del repositorio.

## Notas

- Las imágenes llevan `referrerPolicy="no-referrer"`: con un `Referer` de otra web, Google responde 429.
- La vista incrustada de Drive no es una API oficial: si Google cambia su HTML, hay que ajustar el script.
- Las fotos son públicas en Drive; cualquiera con el enlace de la app puede llegar a ellas.
