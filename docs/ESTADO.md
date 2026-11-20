# Estado — Resto (cartas digitales del ecosistema Marian)

Sitio: resto.marianacaci.com · repo gabocosta1907-create/Resto (main) · deploy: push -> Cloudflare Workers Builds -> Worker `resto-dev`. Sitio noindex.
Última versión: ver `git log`.

## Estructura
- `/` índice de prototipos (`data/comercios.json`). Cada comercio en `/<comercio>/` con su `resto.json` (ver README).
- Comercios de ejemplo: `/cafe-tilo/` (lista, bloque de Marian tras la primera sección) y `/zorzal/` (formato compacto, variantes copa/botella, aviso, bloque de Marian al final).
- `/centeno/` (CENTENO, Las Cañitas): layout «hojas» (`resto.layout:"hojas"`, motor `js/hojas.js` + `css/hojas.css`). Una hoja por categoría, cambio horizontal plano con gesto, scroll vertical propio, índice inferior fijo + índice completo (hamburguesa), rutas `#/categoria` y `#/categoria/plato` con History API, capa de plato (historia, vino sugerido, "Volver a la carta" con posición conservada), analítica (stub en `window.__eventos`/`dataLayer`, origen `?o=`), estados de carga/error, agotado/oculta/orden desde el JSON, teclado y prefers-reduced-motion. Bloque de Marian como hoja propia (`js/marian.js` + `css/marian.css`, compartido con las otras cartas).
- Versiones de CENTENO sobre un solo contenido (`centeno/resto.json`): `/centeno/` = lista concisa (nombre y precio) y ficha del plato con foto y texto; `/centeno-visual/` = lista con miniaturas y descripción (`extiende` + `resto.listado`). Café, vinos y bebidas no abren ficha (`ficha:false`). Idea pendiente: un subdominio por versión (centeno.marianacaci.com).
- `scripts/check-links.mjs`: valida ids, fotos y modos de cada `resto.json` contra el `products.json` de Marian.

- Carta CENTENO v1.6: Bagel de pollo y palta agregado; textos para los 31 platos de comida; fotos de referencia (Unsplash/otros, enlazadas, con etiqueta "Foto de referencia"): miniatura 3:4 en la lista, ficha del plato con foto, heros 4:3 en Brunch y Ensaladas. Pendientes del doc: Tostón verde, Bagel y hero de Platos principales (sin URL directa). Benedictinos muestra salmón en la referencia (el plato lleva panceta).

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

## Historial reciente
- v1.6 textos y fotos de referencia; dos modelos (`extiende`); v1.7 ajustes; cabecera con estrella de reseña y Google Maps (solo visual); QR generados para `/centeno/`, `/centeno-visual/` y marian2.marianacaci.com (no versionados).

## Ajustes de v1.7 (zoom, heros, íconos, textos)
- Heros de sección: todos 5/3 (altura de Entradas), en ambas versiones.
- `/centeno/` (conciso): foto de la ficha 4:3 a todo el ancho; ícono (chevron) en vez de "Ver el plato"; toda la fila es tocable.
- `/centeno-visual/`: lista con `resumen` corto; ficha con "Cómo se elabora" y "Cómo se presenta" (`elaboracion`, `presentacion` en el JSON).
- Zoom con dos dedos: permitido en textos e imágenes (`touch-action: pan-y pinch-zoom`); bloqueado en cabecera, índice, heros y barra de la ficha (`pan-x pan-y`; en iOS además `gesturestart`). Con zoom activo se desactiva el swipe entre categorías.
- Pendiente de prueba en celular real: pellizco en iOS/Android (el emulador no aplica touch-action).

- Reseña: la estrella de la cabecera (solo `/centeno-visual/`) despliega "Dejanos tu opinión" con botón a Google Maps; el enlace es el del local correcto (confirmado por Gabo).
- Decidido: un subdominio por versión (p. ej. uno para la conciso y otro para la visual). Falta darlos de alta como dominio personalizado del Worker y un enrutador por host; los QR impresos se hacen recién cuando estén.
- «Cerveza tirada»: se quitó el texto del documento fuente (queda precio «A definir»).
- Contador de categorías oculto en pantallas ≤400 px por falta de espacio en la cabecera.
- Tests versionados en `tests/centeno_playwright.py` (dependen de mocks en `/tmp`).

## Pedido del cliente (maqueta, ambas versiones)
- Activo con `resto.pedido: true` y mesa identificada (`?m=N`; `?demo` = mesa 3 y botones de simulación). Sin mesa no aparece nada.
- Módulos: `pedido-reglas.js` (reglas puras de cierre/despacho/cancelación: único lugar a tocar si cambian), `pedido-store.js` (estado; hoy localStorage, contrato intercambiable por servidor), `pedido-ui.js` + `pedido.css` (botón `+`, barra "Mi pedido", panel, rondas).
- Concurrencia (decisión provisoria): carro común por mesa; cantidades como deltas (dos celulares suman); cada cambio sube `version`; el envío es atómico y se valida contra la versión que el cliente revisó (primero que envía gana; el otro ve aviso y "Ya lo revisé"). Cada envío = ronda numerada.
- Estados: enviado → en preparación → listo → entregado. Cancelar solo en enviado/en preparación; el aviso cambia si ya empezó. Aval del mozo independiente y nunca frena. El cliente nunca ve tiempo estimado.
- Tests: `tests/pedido_playwright.py` (22, modo local), `tests/centeno_playwright.py` (67).
- Conexión a Gratto: `resto.servidor` (hoy `https://gratto.marianacaci.com`) + mesa de 1–2 dígitos → `pedido-store-remoto.js` (WebSocket al Worker, carro compartido real entre celulares). Si se cae la conexión, la carta sigue con el carro local y «Enviar» avisa «Sin conexión: no se envió» (nunca dice enviado); al reconectar sube lo armado. `?local` fuerza modo local; `?srv=http://localhost:PUERTO` solo para pruebas locales. Test: `tests/pedido_servidor_playwright.py` (13, levanta el Worker de Gratto con wrangler dev).
- Límites: el servidor de producción solo acepta el origen `https://resto.marianacaci.com` (falta sumar los subdominios por versión); sin QR firmado; "Lucía" es nombre de ejemplo; botón Atrás de Android no cierra el panel; la ficha tapa el botón del mozo; iOS sin probar en real.
- `destino` (cocina | cafeteria | mozo) en secciones y productos de `centeno/resto.json`: la carta no lo usa; lo lee Gratto (`worker/scripts/destinos_desde_resto.mjs`). Cafetería → cafeteria; Vinos y Bebidas → mozo, salvo limonadas y jugo → cocina; el resto → cocina.
