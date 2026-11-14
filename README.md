# Resto — carta digital (prototipo)

resto.marianacaci.com · Deploy: Cloudflare Workers Builds (rama `main`) -> Worker `resto-dev`.

## Concepto
Pieza del ecosistema Marian cakes boutique: la carta digital de un comercio gastronómico que ofrece productos de Marian (compra al por mayor, en carta o en consignación) y funciona como punto de retiro de pedidos hechos en la web de Marian. Cada comercio tiene su propia identidad y estructura; todos comparten el bloque "Pastelería de Marian" con enlaces directos a marian.marianacaci.com.

## Cómo está armado
- `public/data/resto.json`: todo lo de un comercio (identidad/tema, datos, secciones propias, selección de productos de Marian con modo `vitrina` o `encargo`).
- `public/index.html` + `css/carta.css` + `js/carta.js`: la carta se dibuja desde ese JSON (mobile first).
- `public/img/marian/`: fotos de los productos de Marian elegidos (600×800).
- Enlaces a producto: `https://marian.marianacaci.com/producto.html?p=<id>`.
- Café Tilo es un comercio de ejemplo (datos y precios ficticios).
