// Pantallas del pedido (cliente). Se carga solo si la carta tiene `resto.pedido` y la mesa está identificada.
// Reglas en pedido-reglas.js; almacenamiento en pedido-store.js (hoy local, luego servidor).
import { crearStore } from './pedido-store.js';
import { ESTADOS, PASOS, SIGUIENTE, puedeCancelar, total, cantidad, textoAval, textoCancelacion, MENSAJES_ERROR } from './pedido-reglas.js';

const PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const MINUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
const X = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function crear(ctx) {
  const { esc, fmt, track, ITEMS, mozo, demo } = ctx;
  const toast = (t) => ctx.toast && ctx.toast(t);
  const store = crearStore({ comercio: ctx.comercio, mesa: ctx.mesa });
  const mesaTxt = `Mesa ${ctx.mesa}`;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/css/pedido.css'; document.head.appendChild(css);

  const precioDe = (it) => (typeof it.precio === 'number' ? it.precio : null);
  const pedible = (it, v) => !it.agotado && (v ? typeof v.p === 'number' : typeof it.precio === 'number');
  const en = (it, v) => store.estado().lineas.filter((l) => l.plato === it.id && (l.variante || '') === (v ? v.n : '')).reduce((s, l) => s + l.cant, 0);

  // ── piezas que usa el motor al armar la lista y la ficha ──
  const btn = (it, v) => pedible(it, v)
    ? `<button class="add" data-add="${esc(it.id)}"${v ? ` data-v="${esc(v.n)}"` : ''} aria-label="Agregar ${esc(it.nombre)}${v ? ' (' + esc(v.n) + ')' : ''} al pedido">${PLUS}<b class="bd" hidden></b></button>`
    : '<span class="add-vacio"></span>';
  const fichaBtn = (it) => pedible(it)
    ? `<button class="addf" data-add="${esc(it.id)}" data-f="1"><span class="addf-t">Agregar al pedido</span><span class="addf-p">${esc(fmt(it.precio))}</span></button>`
    : '';

  // ── estructura fija: barra inferior + panel ──
  let yo = false; const propio = (fn) => { yo = true; try { return fn(); } finally { yo = false; revisada = store.estado().version; } };
  let barra, panel, revisada = 0, abierto = false, cambioAjeno = false, confirmCancel = null, ultimaVersion = store.estado().version;
  function montar() {
    const stage = ctx.stage;
    stage.classList.add('has-ped');
    barra = document.createElement('button'); barra.className = 'pbar'; barra.id = 'pbar'; barra.hidden = true;
    barra.setAttribute('aria-haspopup', 'dialog');
    stage.appendChild(barra);
    panel = document.createElement('div'); panel.className = 'ped'; panel.id = 'ped'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Tu pedido'); panel.tabIndex = -1;
    stage.appendChild(panel);
    barra.addEventListener('click', abrir);
    panel.addEventListener('click', clickPanel);
    panel.addEventListener('change', cambioPanel);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      e.preventDefault(); e.stopPropagation(); agregar(b);
    }, true);
    document.addEventListener('keydown', (e) => { if (abierto && e.key === 'Escape') { e.stopPropagation(); cerrar(); } }, true);
    store.suscribir(alCambiar);
    refrescar();
  }

  function agregar(b) {
    const x = ITEMS.get(b.dataset.add); if (!x) return;
    const it = x.it, v = b.dataset.v ? (it.variantes || []).find((q) => q.n === b.dataset.v) : null;
    propio(() => store.agregar({ plato: it.id, variante: v ? v.n : '', nombre: it.nombre + (v ? ` (${v.n})` : ''), precio: v ? v.p : it.precio }, 1));
    if (navigator.vibrate) navigator.vibrate(8);
    toast(`Agregado: ${it.nombre}${v ? ' (' + v.n + ')' : ''}`);
    track('pedido_agregar', { item: it.id, variante: v ? v.n : '' });
  }

  // cambios del carro: propios o de otro celular
  function alCambiar() {
    const e = store.estado();
    if (abierto && !yo && e.version !== ultimaVersion) cambioAjeno = true;
    ultimaVersion = e.version;
    refrescar(); if (abierto) pintar();
  }

  function refrescar() {
    const e = store.estado(), n = cantidad(e.lineas), t = total(e.lineas);
    // insignias en filas y ficha
    document.querySelectorAll('[data-add]').forEach((b) => {
      const x = ITEMS.get(b.dataset.add); if (!x) return;
      const v = b.dataset.v ? (x.it.variantes || []).find((q) => q.n === b.dataset.v) : null;
      const k = en(x.it, v), bd = b.querySelector('.bd');
      if (bd) { bd.hidden = !k; bd.textContent = k; }
      b.classList.toggle('on', k > 0);
      if (b.dataset.f) { const tt = b.querySelector('.addf-t'); if (tt) tt.textContent = k ? `Agregar otro (${k} en tu pedido)` : 'Agregar al pedido'; }
    });
    // barra inferior
    const hay = n > 0, rondas = e.rondas.length > 0;
    barra.hidden = !(hay || rondas) || abierto;
    barra.classList.toggle('seg', !hay);
    barra.innerHTML = hay
      ? `<span class="pb-n">${n}</span><span class="pb-t">Mi pedido</span><span class="pb-p">${esc(fmt(t))}</span>`
      : `<span class="pb-t">Ver mi pedido</span>`;
    ctx.stage.classList.toggle('con-barra', !barra.hidden);
  }

  // ── panel ──
  function abrir() {
    const e = store.estado(); revisada = e.version; ultimaVersion = e.version; cambioAjeno = false; confirmCancel = null;
    abierto = true; panel.classList.add('on'); barra.hidden = true; pintar(); panel.scrollTop = 0; panel.focus({ preventScroll: true });
    track('pedido_abierto');
  }
  function cerrar() { abierto = false; panel.classList.remove('on'); refrescar(); }

  const lineaHTML = (l) => `<li class="ln" data-l="${esc(l.id)}"><div class="ln-a"><span class="ln-n">${esc(l.nombre)}</span><span class="ln-p">${esc(fmt(l.precio * l.cant))}</span></div>
    <div class="ln-b"><button class="lnk-nota" data-nota="${esc(l.id)}">${l.nota ? esc(l.nota) : 'Agregar nota'}</button>
    <div class="st" role="group" aria-label="Cantidad de ${esc(l.nombre)}"><button data-menos="${esc(l.id)}" aria-label="Quitar uno">${MINUS}</button><output>${l.cant}</output><button data-mas="${esc(l.id)}" aria-label="Agregar uno">${PLUS}</button></div></div></li>`;

  function rondaHTML(r) {
    const est = ESTADOS[r.estado], cancel = r.estado === 'cancelacion_solicitada' || r.estado === 'cancelado';
    const pasos = cancel ? '' : `<ol class="pasos" aria-label="Estado del pedido">${PASOS.map((p) => `<li class="${ESTADOS[p].paso <= est.paso ? 'ok' : ''}${p === r.estado ? ' ya' : ''}"><i></i><span>${ESTADOS[p].rotulo}</span></li>`).join('')}</ol>`;
    const aval = cancel ? `<p class="av cx">${esc(textoCancelacion(r, mozo).aviso)}</p>` : `<p class="av ${r.aval}">${esc(textoAval(r, mozo))}</p>`;
    const items = r.items.map((l) => `<li><span>${l.cant} × ${esc(l.nombre)}${l.nota ? ` <em>${esc(l.nota)}</em>` : ''}</span><b>${esc(fmt(l.precio * l.cant))}</b></li>`).join('');
    const conf = confirmCancel === r.id
      ? `<div class="cf"><p>${esc(textoCancelacion(r, mozo).confirmar)}</p><div class="cf-b"><button class="rbtn" data-cx-si="${esc(r.id)}">Sí, cancelar</button><button class="lnk" data-cx-no>No, dejar el pedido</button></div></div>`
      : (puedeCancelar(r) ? `<button class="lnk" data-cx="${esc(r.id)}">Cancelar este pedido</button>` : '');
    const sim = demo && !cancel ? `<div class="sim"><span>Maqueta:</span>${SIGUIENTE[r.estado] ? `<button data-sim="${esc(r.id)}" data-a="avanzar">Avanzar estado</button>` : ''}<button data-sim="${esc(r.id)}" data-a="avalar">Avalar</button><button data-sim="${esc(r.id)}" data-a="corregir">Corregir</button></div>` : '';
    return `<section class="ronda ${r.estado}"><div class="rh"><h3>Ronda ${r.n}</h3><span class="re">${esc(est.rotulo)}</span></div>${pasos}${aval}<ul class="ri">${items}</ul><p class="rt"><span>Total</span><b>${esc(fmt(total(r.items)))}</b></p>${conf}${sim}</section>`;
  }

  function pintar() {
    const e = store.estado(), hay = e.lineas.length > 0;
    const aviso = cambioAjeno && hay ? `<div class="aviso" role="status">${esc(MENSAJES_ERROR.carro_cambio)}</div>` : '';
    const cuerpo = hay
      ? `${aviso}<ul class="lns">${e.lineas.map(lineaHTML).join('')}</ul><p class="rt gt"><span>Total</span><b>${esc(fmt(total(e.lineas)))}</b></p>
         <p class="nt">Tu pedido va directo a cocina.${mozo ? ' ' + esc(mozo) : ' Tu mozo'} se acerca a confirmarlo con vos.</p>
         <button class="env" data-enviar>${cambioAjeno ? 'Ya lo revisé' : 'Enviar pedido'}</button>`
      : `<p class="vacio">${e.rondas.length ? 'No hay nada nuevo para enviar.' : 'Todavía no agregaron nada. Tocá el + de cada plato.'}</p><button class="lnk" data-cerrar>Seguir mirando la carta</button>`;
    const rondas = e.rondas.slice().reverse().map(rondaHTML).join('');
    panel.innerHTML = `<div class="top"><button class="back" data-cerrar>← Volver a la carta</button><span class="mesa">${esc(mesaTxt)}</span><button class="ib" data-cerrar aria-label="Cerrar">${X}</button></div>
      <div class="pad"><h2 class="tit">Lo pedido por la mesa</h2><p class="sub">Lo ven todos los celulares de la mesa.</p>${cuerpo}${rondas ? `<h2 class="tit r2">Ya enviado</h2>${rondas}` : ''}</div>`;
  }

  function clickPanel(ev) {
    const t = ev.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if ('cerrar' in d) return cerrar();
    if (d.mas) return propio(() => store.cambiar(d.mas, 1));
    if (d.menos) return propio(() => store.cambiar(d.menos, -1));
    if (d.nota) {
      const li = t.closest('.ln'), l = store.estado().lineas.find((x) => x.id === d.nota); if (!l) return;
      const i = document.createElement('input'); i.className = 'nota-in'; i.maxLength = 120; i.value = l.nota; i.placeholder = 'Ej.: sin cebolla'; i.setAttribute('aria-label', 'Nota para ' + l.nombre); i.dataset.nid = d.nota;
      t.replaceWith(i); i.focus(); return;
    }
    if ('enviar' in d) return enviar();
    if (d.cx) { confirmCancel = d.cx; return pintar(); }
    if ('cxNo' in d) { confirmCancel = null; return pintar(); }
    if (d.cxSi) { let r; propio(() => { r = store.cancelar(d.cxSi); }); confirmCancel = null; track('pedido_cancelacion', { estado: r && r.estadoPrevio }); return pintar(); }
    if (d.sim) {
      const r = store.estado().rondas.find((x) => x.id === d.sim); if (!r) return;
      const par = d.a === 'avanzar' ? { estado: SIGUIENTE[r.estado] } : d.a === 'avalar' ? { aval: 'avalado' } : { aval: 'corregido', cambios: 'sin cebolla en el segundo plato' };
      const v0 = store.estado().version; yo = true; store.demo(r.id, par); yo = false; revisada = revisada === v0 ? store.estado().version : revisada;
    }
  }
  function cambioPanel(ev) {
    const i = ev.target.closest('.nota-in'); if (!i) return;
    propio(() => store.nota(i.dataset.nid, i.value));
  }

  function enviar() {
    const e = store.estado();
    if (cambioAjeno) { cambioAjeno = false; revisada = e.version; pintar(); return; }
    yo = true; const r = store.enviarRonda(revisada); yo = false; if (r.ok) revisada = store.estado().version;
    if (r.ok) { track('pedido_enviado', { ronda: r.ronda.n }); toast('Pedido enviado a cocina'); pintar(); panel.scrollTop = 0; return; }
    toast(MENSAJES_ERROR[r.motivo] || 'No se pudo enviar');
    if (r.motivo === 'carro_cambio') cambioAjeno = true;
    pintar();
  }

  return { btn, fichaBtn, montar, store, abrir, cerrar, ctx };
}
