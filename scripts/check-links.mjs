#!/usr/bin/env node
// Verifica cada comercio (public/<comercio>/resto.json) contra el products.json actual de Marian.
// Uso: node scripts/check-links.mjs [ruta/a/products.json]   (por defecto ../marian/public/data/products.json)
// Errores (exit 1): id que no existe en Marian, foto faltante en public/img/marian/, modo inválido, comercio sin carpeta o sin listar,
// y en las cartas «hojas»: ids de plato repetidos, historias/maridajes que apuntan a platos o vinos inexistentes, fotos propias faltantes.
// Avisos: foto fuente de Marian ausente, ids repetidos en un comercio, fotos sin usar.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..'), pub = join(raiz, 'public');
const ruta = resolve(process.argv[2] || process.env.MARIAN_PRODUCTS || join(raiz, '..', 'marian', 'public', 'data', 'products.json'));
if (!existsSync(ruta)) { console.error(`No encuentro products.json de Marian en ${ruta}\nPasalo como argumento o con MARIAN_PRODUCTS.`); process.exit(2); }
const prods = new Map(JSON.parse(readFileSync(ruta, 'utf8')).productos.map(p => [p.id, p]));
const imgMarian = join(dirname(ruta), '..', 'img');
const listados = JSON.parse(readFileSync(join(pub, 'data', 'comercios.json'), 'utf8'));
const enDisco = readdirSync(pub, { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(join(pub, d.name, 'resto.json'))).map(d => d.name);
let err = 0, warn = 0; const usadas = new Set();
const E = m => { err++; console.log('  ✗ ' + m); }, W = m => { warn++; console.log('  ! ' + m); };
for (const c of enDisco) if (!listados.includes(c)) E(`/${c}/ tiene resto.json pero no figura en data/comercios.json (no sale en el índice)`);
for (const c of listados) {
  console.log(`/${c}/`);
  const f = join(pub, c, 'resto.json');
  if (!existsSync(f)) { E('falta resto.json'); continue; }
  if (!existsSync(join(pub, c, 'index.html'))) E('falta index.html');
  let cfg = JSON.parse(readFileSync(f, 'utf8'));
  if (cfg.extiende) { const b = join(pub, cfg.extiende.replace(/^\//, '')); if (!existsSync(b)) { E(`extiende ${cfg.extiende}: no existe`); continue; } console.log(`  extiende ${cfg.extiende} (se valida allí)`); continue; }
  const items = cfg.marian?.items || [], vistos = new Set();
  // Cartas «hojas»: ids únicos, referencias de historias/maridajes y fotos propias del comercio.
  const ids = new Set(), dup = [];
  for (const sec of cfg.secciones || []) { if (sec.foto && !/^https?:/.test(sec.foto.src) && !existsSync(join(pub, c, sec.foto.src))) E(`${sec.id}: falta ${c}/${sec.foto.src}`); for (const it of sec.items || []) { if (it.foto && !/^https?:/.test(it.foto.src) && !existsSync(join(pub, c, it.foto.src))) E(`${it.id}: falta ${c}/${it.foto.src}`); if (it.id) { if (ids.has(it.id)) dup.push(it.id); ids.add(it.id); } } }
  for (const d of dup) E(`id de plato repetido: ${d}`);
  for (const e of cfg.editorial || []) {
    if (!ids.has(e.plato)) E(`editorial ${e.id}: el plato ${e.plato} no existe`);
    if (e.maridaje && !ids.has(e.maridaje.vino)) E(`editorial ${e.id}: el vino ${e.maridaje.vino} no existe`);
    for (const a of [e.foto?.src, e.video?.src, e.video?.poster].filter(Boolean)) if (!existsSync(join(pub, c, a))) E(`editorial ${e.id}: falta ${c}/${a}`);
  }
  for (const i of items) {
    const p = prods.get(i.id);
    if (vistos.has(i.id)) W(`${i.id}: repetido`); vistos.add(i.id); usadas.add(i.id);
    if (!p) { E(`${i.id}: no existe en el catálogo de Marian (el enlace producto.html?p=${i.id} queda roto)`); continue; }
    if (!existsSync(join(pub, 'img', 'marian', i.id + '.jpg'))) E(`${i.id}: falta public/img/marian/${i.id}.jpg`);
    if (!['vitrina', 'encargo'].includes(i.modo)) E(`${i.id}: modo «${i.modo}» inválido (vitrina | encargo)`);
    if (!existsSync(join(imgMarian, p.img))) W(`${i.id}: la foto fuente ${p.img} ya no está en Marian (puede estar desactualizada)`);
  }
  console.log(`  ${items.length} productos revisados`);
}
for (const a of readdirSync(join(pub, 'img', 'marian'))) if (!usadas.has(a.replace(/\.jpg$/, ''))) W(`img/marian/${a}: no la usa ningún comercio`);
console.log(`\n${err} errores, ${warn} avisos`); process.exit(err ? 1 : 0);
