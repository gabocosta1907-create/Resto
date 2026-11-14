# Estado — Resto (cartas digitales del ecosistema Marian)

Sitio: resto.marianacaci.com · repo gabocosta1907-create/Resto (main) · deploy: push -> Cloudflare Workers Builds -> Worker `resto-dev`. Sitio noindex.
Última versión: ver `git log`.

## Estructura
- `/` índice de prototipos (`data/comercios.json`). Cada comercio en `/<comercio>/` con su `resto.json` (ver README).
- Comercios de ejemplo: `/cafe-tilo/` (lista, bloque de Marian tras la primera sección) y `/zorzal/` (formato compacto, variantes copa/botella, aviso, bloque de Marian al final).
- `scripts/check-links.mjs`: valida ids, fotos y modos de cada `resto.json` contra el `products.json` de Marian.

## Reglas
- Identidad de Marian fija (Instrumental Serif, Nunito, Nunito Sans Bold en mayúsculas en botones, texto chocolate #4A2A1C) solo en el bloque de Marian; cada carta tiene su identidad propia.
- HTML/CSS/JS vanilla, mobile first, noindex. Backoffice en Airtable más adelante; pagos al final.
- Correr `check-links` antes de pushear cuando cambie la selección de productos de Marian.

## Pendiente
- Retiro: que el cliente elija el comercio al comprar implica cambiar el checkout de Marian (más adelante).
- Consignación y mayorista: ¿panel por comercio o manejo propio en Airtable? Por ahora solo etiquetas.
- Falta un comercio real para armar su carta.
- Precios, direcciones y textos son placeholders; las fotos de `img/marian/` son copias, hay que reponerlas si Marian las actualiza.
