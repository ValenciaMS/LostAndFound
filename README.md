# Lost & Found / Objetos perdidos

Galería web de la carpeta pública de Drive «Lost & Found» de Valencia Montessori School, organizada por categorías (subcarpetas), con búsqueda por nombre y visor a pantalla completa.

- Web: https://valenciams.github.io/LostAndFound/
- Repositorio: https://github.com/ValenciaMS/LostAndFound

## Cómo funciona

- `scripts/fetch-photos.mjs` lee la vista pública incrustada de la carpeta de Drive (sin API key), recorre las subcarpetas y escribe `public/photos.json`.
- La web (Vite + TypeScript) carga ese JSON y pinta las miniaturas directamente desde Google (no se copian las fotos).
- Las fotos sueltas en la raíz salen en la categoría «Uncategorized» («Sin carpeta»).
- Interfaz en inglés y castellano (botones EN/ES; por defecto, el idioma del navegador). Los nombres de las fotos se muestran tal como están en Drive; las categorías conocidas (Clothes, Other items, Toys, Water bottles) se traducen en `src/i18n.ts`.
- Arriba se muestra cuándo se actualizó el inventario por última vez y un botón «Comprobar actualizaciones» que vuelve a pedir el catálogo sin caché.
- El logo del colegio está en `public/logo.png`.

```bash
npm install
npm run photos   # regenera public/photos.json desde Drive
npm run dev      # desarrollo
npm run build    # genera dist/
```

Para usar otra carpeta: `node scripts/fetch-photos.mjs <ID_CARPETA>`.

## Publicación y actualización automática

El workflow `.github/workflows/pages.yml` («Desplegar en GitHub Pages») hace dos jobs:

1. `build`: instala dependencias, ejecuta `npm run photos` (lee Drive; si falla, se conserva el `photos.json` del repositorio), compila y empaqueta la web.
2. `deploy`: publica el paquete en GitHub Pages.

Se ejecuta en cada push a `main`, a mano (`workflow_dispatch`) y cada hora.

### Disparador horario: cron-job.org

El `schedule` de GitHub Actions (`cron: '25 * * * *'`) **no se dispara de forma fiable en este repositorio**: en pruebas no salió ninguna ejecución programada en varias horas, ni en el workflow principal ni en uno de prueba. Por eso la actualización horaria la lanza un servicio externo:

- **Servicio:** [cron-job.org](https://cron-job.org)
- **Cuenta:** `nestor@fluit.es`
- **Trabajo:** `LostAndFound sync`, cada hora (minuto 25).
- **Qué hace:** una petición `POST` a la API de GitHub que lanza el workflow:

  ```
  POST https://api.github.com/repos/ValenciaMS/LostAndFound/actions/workflows/pages.yml/dispatches
  Accept: application/vnd.github+json
  Authorization: Bearer <TOKEN>
  X-GitHub-Api-Version: 2022-11-28
  Content-Type: application/json

  {"ref":"main"}
  ```

  La respuesta correcta es `204`. Cada llamada aparece en Actions como una ejecución con evento `workflow_dispatch`.
- **Token:** fine-grained personal access token de GitHub, propietario `ValenciaMS`, acceso solo al repositorio `LostAndFound` y un único permiso: *Actions → Read and write*. Está guardado únicamente en cron-job.org; **no debe guardarse en el repositorio ni compartirse**.

El `schedule` del workflow se mantiene como respaldo; si alguna vez GitHub lo dispara, habrá ejecuciones duplicadas, que son inofensivas.

### Mantenimiento del disparador

- **El token caduca** (como máximo al año). Cuando caduque, la actualización automática se para sin avisar en la web. Para renovarlo: generar otro token con los mismos permisos y sustituirlo en la cabecera `Authorization` del trabajo en cron-job.org.
- Cron-job.org está configurado para avisar por correo si una ejecución falla.
- Códigos de error habituales: `401` (token mal copiado o caducado), `403`/`404` (el token no tiene el permiso de Actions sobre el repositorio, o la organización no lo ha aprobado), `422` (cuerpo distinto de `{"ref":"main"}` o nombre de workflow incorrecto).
- Si hay que probarlo: en cron-job.org, *Test run*, y comprobar en Actions que aparece una ejecución nueva.

### Fecha de actualización

La fecha que muestra la web (`updated` en `photos.json`) se escribe cada vez que corre el workflow, haya cambiado Drive o no. Indica la última vez que se **comprobó** Drive, no la última vez que cambió el contenido. GitHub Pages cachea los ficheros hasta 10 minutos, por lo que un cambio recién desplegado puede tardar unos minutos en verse (el botón de la web salta esa caché).

## Notas

- Las imágenes llevan `referrerPolicy="no-referrer"`: con un `Referer` de otra web, Google responde 429.
- La vista incrustada de Drive no es una API oficial: si Google cambia su HTML, hay que ajustar el script.
- Las fotos son públicas en Drive y el repositorio es público; cualquiera con el enlace de la app puede llegar a ellas.
