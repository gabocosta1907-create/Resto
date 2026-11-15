# Resto — carta digital (prototipo)

resto.marianacaci.com · Deploy: Cloudflare Workers Builds (rama `main`) -> Worker `resto-dev`.

## Concepto
Pieza del ecosistema Marian cakes boutique: la carta digital de un comercio gastronómico que ofrece productos de Marian (compra al por mayor, en carta o en consignación) y funciona como punto de retiro de pedidos hechos en la web de Marian. Cada comercio tiene su propia identidad y estructura; todos comparten el bloque "Pastelería de Marian" con enlaces directos a marian.marianacaci.com.

## Cómo está armado
- `/` es el índice de prototipos (`public/index.html`, lee `public/data/comercios.json`).
- Cada comercio vive en su ruta: `public/<comercio>/index.html` + `public/<comercio>/resto.json` (identidad/tema, datos, secciones propias, selección de productos de Marian con modo `vitrina` o `encargo`). Hoy: `/cafe-tilo/` y `/zorzal/`.
- `public/js/carta.js` + `public/css/carta.css` dibujan cualquier carta desde su `resto.json` (mobile first). Opciones por comercio: `tema.pesoTitulos`, `resto.aviso`, sección `formato` (`lista` | `compacto`), ítems con `variantes` (copa/botella…), `marian.despuesDe` (id de sección o `final`).
- El bloque «Pastelería de Marian» siempre usa la identidad de Marian (Instrumental Serif, Nunito, rosa).
- `public/img/marian/<id>.jpg`: fotos de los productos de Marian elegidos (600×800), compartidas entre comercios.
- Enlaces a producto: `https://marian.marianacaci.com/producto.html?p=<id>`.
- Café Tilo y Vermutería Zorzal son comercios de ejemplo (datos y precios ficticios).

## Agregar un comercio
1. Copiar `public/zorzal/` a `public/<nuevo>/` y editar su `resto.json`.
2. Sumar `"<nuevo>"` a `public/data/comercios.json`.
3. Traer las fotos que falten a `public/img/marian/<id>.jpg` (600×800).
4. Correr `node scripts/check-links.mjs` (por defecto lee `../marian/public/data/products.json`; o pasarle la ruta).

## Layout «hojas» (CENTENO)
Un comercio con `"resto":{"layout":"hojas"}` usa `js/hojas.js` en vez de `carta.js`; su `index.html` es un cascarón (ver `centeno/index.html`). Campos propios en `resto.json`: `secciones[].{id,titulo,corto,sub,foto,oculta}`, `items[].{id,agotado,variantes}`, `marian.despuesDe` (id de sección o `final`), y `editorial[]` = `{plato,titulo,texto[],maridaje:{vino,nota},foto,video,placeholder}` (la historia se abre desde el plato; `check-links` valida que plato y vino existan). Probar con `?debug` para ver los eventos en consola.

**Versiones del mismo contenido:** un `resto.json` puede traer `"extiende":"/otra/resto.json"` y sobrescribir solo `resto` (p. ej. `listado: "conciso" | "visual"`). Así hay un único contenido y varios modelos de presentación.
