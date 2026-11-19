// Almacenamiento del pedido de una mesa. CONTRATO que debe cumplir también la versión con servidor (Gratto):
//   estado()                     → { version, lineas[], rondas[] }
//   agregar(item, delta)         → cambia la cantidad (delta ±n) de un plato/variante. Las cantidades se SUMAN: dos
//                                   celulares que agregan lo mismo dan 2, nada se pisa.
//   cambiar(lineaId, delta) · nota(lineaId, texto) · vaciar()
//   enviarRonda(versionRevisada) → { ok:true, ronda } | { ok:false, motivo }   (atómico: el primero gana)
//   cancelar(rondaId)            → ronda | null
//   suscribir(fn)                → fn() ante cualquier cambio, propio o de otro celular. Devuelve la baja.
//   demo(rondaId, parche)        → solo maqueta: simula lo que harían cocina y mozo.
// Esta versión guarda en localStorage del navegador: sirve para probar con dos pestañas como si fueran dos celulares.
import { validarEnvio, puedeCancelar, MAX_CANTIDAD } from './pedido-reglas.js';

export function crearStore({ comercio, mesa }) {
  const clave = `gratto:${comercio}:mesa:${mesa}`;
  const oyentes = new Set();
  const leer = () => { try { return JSON.parse(localStorage.getItem(clave)) || vacio(); } catch (_) { return vacio(); } };
  const vacio = () => ({ version: 0, seq: 0, lineas: [], rondas: [] });
  const escribir = (e) => { localStorage.setItem(clave, JSON.stringify(e)); avisar(); };
  const avisar = () => oyentes.forEach((f) => f());
  addEventListener('storage', (ev) => { if (ev.key === clave) avisar(); });
  const mutar = (fn) => { const e = leer(); const r = fn(e); if (r !== false) { e.version++; escribir(e); } return r; };
  const id = (e, p) => `${p}${++e.seq}`;

  return {
    mesa, comercio,
    estado: leer,
    agregar(item, delta = 1) {
      return mutar((e) => {
        const l = e.lineas.find((x) => x.plato === item.plato && (x.variante || '') === (item.variante || ''));
        if (l) l.cant = Math.min(MAX_CANTIDAD, l.cant + delta);
        else if (delta > 0) e.lineas.push({ id: id(e, 'l'), plato: item.plato, variante: item.variante || '', nombre: item.nombre, precio: item.precio, cant: Math.min(MAX_CANTIDAD, delta), nota: '' });
        e.lineas = e.lineas.filter((x) => x.cant > 0);
      });
    },
    cambiar(lineaId, delta) {
      return mutar((e) => {
        const l = e.lineas.find((x) => x.id === lineaId); if (!l) return false;
        l.cant = Math.min(MAX_CANTIDAD, l.cant + delta);
        e.lineas = e.lineas.filter((x) => x.cant > 0);
      });
    },
    nota(lineaId, texto) {
      return mutar((e) => { const l = e.lineas.find((x) => x.id === lineaId); if (!l) return false; l.nota = String(texto || '').slice(0, 120); });
    },
    vaciar() { return mutar((e) => { e.lineas = []; }); },
    enviarRonda(versionRevisada) {
      let res = { ok: false, motivo: 'vacio' };
      mutar((x) => {
        const v = validarEnvio(x, versionRevisada);
        if (!v.ok) { res = v; return false; }
        const ronda = { id: id(x, 'r'), n: x.rondas.length + 1, items: x.lineas.map((l) => ({ ...l })), estado: 'enviado', aval: 'sin_avalar', creada: Date.now() };
        x.rondas.push(ronda); x.lineas = []; res = { ok: true, ronda };
      });
      return res;
    },
    cancelar(rondaId) {
      let res = null;
      mutar((e) => {
        const r = e.rondas.find((x) => x.id === rondaId);
        if (!r || !puedeCancelar(r)) return false;
        r.estadoPrevio = r.estado; r.estado = 'cancelacion_solicitada'; res = { ...r };
      });
      return res;
    },
    demo(rondaId, parche) { return mutar((e) => { const r = e.rondas.find((x) => x.id === rondaId); if (!r) return false; Object.assign(r, parche); }); },
    suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
  };
}
