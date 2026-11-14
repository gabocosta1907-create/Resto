# Estado — Resto (cartas digitales del ecosistema Marian)

Sitio: resto.marianacaci.com · repo gabocosta1907-create/Resto (main) · deploy: push -> Cloudflare Workers Builds -> Worker `resto-dev`. Sitio noindex.
Última versión: ver `git log`.

## Estructura
- `/` índice de prototipos (`data/comercios.json`). Cada comercio en `/<comercio>/` con su `resto.json` (ver README).
- Comercios de ejemplo: `/cafe-tilo/` (lista, bloque de Marian tras la primera sección) y `/zorzal/` (formato compacto, variantes copa/botella, aviso, bloque de Marian al final).
- `/centeno/` (CENTENO, Las Cañitas): layout «hojas» (`resto.layout:"hojas"`, motor `js/hojas.js` + `css/hojas.css`). Una hoja por categoría, cambio horizontal plano con gesto, scroll vertical propio, índice inferior fijo + índice completo (hamburguesa), rutas `#/categoria` y `#/categoria/plato` con History API, capa de plato (historia, vino sugerido, "Volver a la carta" con posición conservada), analítica (stub en `window.__eventos`/`dataLayer`, origen `?o=`), estados de carga/error, agotado/oculta/orden desde el JSON, teclado y prefers-reduced-motion. Bloque de Marian como hoja propia (`js/marian.js` + `css/marian.css`, compartido con las otras cartas).
- `scripts/check-links.mjs`: valida ids, fotos y modos de cada `resto.json` contra el `products.json` de Marian.

## Reglas
- Identidad de Marian fija (Instrumental Serif, Nunito, Nunito Sans Bold en mayúsculas en botones, texto chocolate #4A2A1C) solo en el bloque de Marian; cada carta tiene su identidad propia.
- HTML/CSS/JS vanilla, mobile first, noindex. Backoffice en Airtable más adelante; pagos al final.
- Correr `check-links` antes de pushear cuando cambie la selección de productos de Marian.

## Pendiente
- CENTENO: textos de historia/maridaje son de ejemplo (`placeholder:true`); fotos (salón, café, burrata) son recortes de baja resolución de los PNG del Drive; la burrata muestra tomates, no remolacha. Hay dos direcciones de identidad en el Drive (Tablero vs presentación editorial): se usó el Tablero. Falta decidir si los postres de Marian conviven con los de CENTENO.
- Hojas: el carrusel de Marian (`.rail`) no dispara el cambio de hoja (limitación conocida); rutas con `#` porque el hosting es estático (en producción serían rutas reales); en iOS el swipe de borde puede disparar Atrás del navegador. Falta probar en celular real.
- Analítica: solo stub, sin destino; video: soportado en datos, sin videos todavía.
- Retiro: que el cliente elija el comercio al comprar implica cambiar el checkout de Marian (más adelante).
- Consignación y mayorista: ¿panel por comercio o manejo propio en Airtable? Por ahora solo etiquetas.
- Falta un comercio real para armar su carta.
- Precios, direcciones y textos son placeholders; las fotos de `img/marian/` son copias, hay que reponerlas si Marian las actualiza.
