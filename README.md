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

### Campos de CENTENO (modelo de datos)
- `resto.listado`: `conciso` (lista nombre+precio; el plato abre ficha con foto 4:3, "Cómo se elabora/presenta") o `visual` (miniatura 3:4 + `resumen` corto; ficha con foto 3:4).
- Sección: `foto` `{src,alt,ratio,ref}` (hero, siempre 5/3), `ficha:false` (la sección no abre fichas: café, vinos, bebidas).
- Plato: `resumen` (lista visual), `elaboracion`, `presentacion` (ficha), `desc` (respaldo), `foto` `{src,alt,ratio:'3/4',ref:true}`. Con `ref:true` se muestra "Foto de referencia".
- `resto.mapa` + `resto.resena` `{titulo,texto,boton}`: la cabecera muestra una estrella que despliega el cuadro "Dejanos tu opinión" con botón al enlace de reseñas de Google Maps. Hoy solo en `/centeno-visual/`.
- Fotos externas se enlazan (hotlink); antes del lanzamiento hay que reemplazarlas por fotos propias en `public/<comercio>/`.

## Pautas de desarrollo
- Vanilla HTML/CSS/JS, mobile first, sin build. Probar con `?debug`. Ejecutar `node scripts/check-links.mjs` antes de pushear.
- Un solo contenido por comercio; los modelos de presentación se derivan con `extiende` (no duplicar datos).
- Tipografías CENTENO: Newsreader (titulares, frases, destacados) y DM Sans (navegación, platos, descripciones, precios). Marian conserva la suya.
- Lista de platos: grilla de tres columnas (nombre / precio alineado a la derecha / ícono); mantener el espacio del ícono y de la miniatura para que los precios queden en columna.
- Gestos: swipe horizontal propio (`touch-action: pan-y pinch-zoom` en la hoja); cabecera, índice, heros y barra de la ficha sin pellizco. Con zoom activo no hay swipe.
- Tests: `tests/centeno_playwright.py` (Playwright, iPhone 13, 64 comprobaciones). Espera un servidor en `localhost:8767` sobre `public/` y fuentes/imágenes externas simuladas en `/tmp` (ver cabecera del archivo). Limitación: el emulador no aplica `touch-action` a toques sintéticos; el pellizco se prueba en celular real.
- Deploy: push a `main` → Cloudflare Workers Builds. Verificar el build antes de dar por publicado.
