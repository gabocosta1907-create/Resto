// Almacenamiento del pedido con el servidor de Gratto (WebSocket). Mismo contrato que pedido-store.js, pero
// las operaciones son asíncronas: el servidor es la autoridad y empuja el estado a todos los celulares de la mesa.
// Sin conexión: el carro se arma en el celular (store local), «Enviar» responde 'sin_conexion' (nunca dice enviado
// sin confirmación del servidor) y, al volver la conexión, lo armado se suma al carro de la mesa.
export function crearStoreRemoto({ comercio, mesa, servidor, local }) {
  const oyentes = new Set();
  let cache = { version: 0, seq: 0, lineas: [], rondas: [] };
  let conectado = false, ws = null, intento = 0, reloj = null, seq = 0, pendientes = 0, sincronizando = false;
  const esperando = new Map();
  const url = servidor.replace(/^http/, 'ws') + `/api/${encodeURIComponent(comercio)}/mesa/${encodeURIComponent(mesa)}/ws`;
  const avisar = (propio) => oyentes.forEach((f) => f({ propio: !!propio }));

  function conectar() {
    clearTimeout(reloj);
    try { ws = new WebSocket(url); } catch (_) { return reintentar(); }
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.tipo === 'estado') {
        const primera = !conectado; cache = m.estado; conectado = true; intento = 0;
        avisar(pendientes > 0 && !primera);
        if (primera) subirLocal();
      } else if (m.tipo === 'respuesta') {
        const r = esperando.get(m.id); if (r) { esperando.delete(m.id); pendientes = Math.max(0, pendientes - 1); r(m); }
      }
    };
    ws.onclose = () => { const estaba = conectado; conectado = false; esperando.forEach((r) => r({ ok: false, motivo: 'sin_conexion' })); esperando.clear(); pendientes = 0; if (estaba) avisar(false); reintentar(); };
    ws.onerror = () => { try { ws.close(); } catch (_) {} };
  }
  function reintentar() { clearTimeout(reloj); reloj = setTimeout(conectar, Math.min(15000, 1000 * 2 ** intento++)); }
  addEventListener('online', () => { if (!conectado) { intento = 0; conectar(); } });

  function op(o) {
    if (!conectado || !ws || ws.readyState !== 1) return Promise.resolve({ ok: false, motivo: 'sin_conexion' });
    const id = ++seq; pendientes++;
    return new Promise((res) => {
      esperando.set(id, res);
      setTimeout(() => { if (esperando.delete(id)) { pendientes = Math.max(0, pendientes - 1); res({ ok: false, motivo: 'sin_conexion' }); } }, 8000);
      try { ws.send(JSON.stringify({ id, op: o })); } catch (_) { esperando.delete(id); pendientes = Math.max(0, pendientes - 1); res({ ok: false, motivo: 'sin_conexion' }); }
    });
  }

  // Lo armado sin conexión se suma al carro de la mesa al conectar (y se vacía el carro local).
  async function subirLocal() {
    const l = local.estado().lineas; if (!l.length || sincronizando) return;
    sincronizando = true;
    for (const x of l) await op({ op: 'agregar', item: { plato: x.plato, variante: x.variante, nombre: x.nombre, precio: x.precio }, delta: x.cant });
    for (const x of l) if (x.nota) { const s = cache.lineas.find((y) => y.plato === x.plato && (y.variante || '') === (x.variante || '')); if (s) await op({ op: 'nota', lineaId: s.id, texto: x.nota }); }
    local.vaciar(); sincronizando = false; avisar(false);
  }
  local.suscribir(() => { if (!conectado) avisar(false); });
  conectar();

  return {
    mesa, comercio,
    conectado: () => conectado,
    estado() { return conectado ? cache : { ...local.estado(), rondas: cache.rondas }; },
    agregar(item, delta = 1) { return conectado ? op({ op: 'agregar', item, delta }) : Promise.resolve(local.agregar(item, delta)); },
    cambiar(lineaId, delta) { return conectado ? op({ op: 'cambiar', lineaId, delta }) : Promise.resolve(local.cambiar(lineaId, delta)); },
    nota(lineaId, texto) { return conectado ? op({ op: 'nota', lineaId, texto }) : Promise.resolve(local.nota(lineaId, texto)); },
    vaciar() { return conectado ? op({ op: 'vaciar' }) : Promise.resolve(local.vaciar()); },
    async enviarRonda(versionRevisada) {
      const r = await op({ op: 'enviar', version: versionRevisada });
      return r.ok ? { ok: true, ronda: r.resultado } : { ok: false, motivo: r.motivo };
    },
    async cancelar(rondaId) { const r = await op({ op: 'cancelar', rondaId }); return r.ok ? r.resultado : null; },
    demo() {},
    suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
  };
}
