// Reglas del pedido (puras, sin pantalla ni almacenamiento). Es el único lugar donde viven las reglas de
// cierre y despacho: si cambian, se tocan acá. La pantalla (pedido-ui.js) y el almacenamiento (pedido-store.js)
// solo las consultan.

export const MAX_CANTIDAD = 20;

// Estados de preparación. El aval del mozo es independiente: suma información, nunca frena el pedido.
export const ESTADOS = {
  enviado: { rotulo: 'Enviado a cocina', paso: 1 },
  en_preparacion: { rotulo: 'En preparación', paso: 2 },
  listo: { rotulo: 'Listo', paso: 3 },
  entregado: { rotulo: 'Entregado', paso: 4 },
  cancelacion_solicitada: { rotulo: 'Cancelación solicitada', paso: 0 },
  cancelado: { rotulo: 'Cancelado', paso: 0 },
};
export const PASOS = ['enviado', 'en_preparacion', 'listo', 'entregado'];
export const SIGUIENTE = { enviado: 'en_preparacion', en_preparacion: 'listo', listo: 'entregado' };

export const puedeCancelar = (r) => r.estado === 'enviado' || r.estado === 'en_preparacion';

// Un envío se acepta solo si el carro tiene algo y si quien lo manda revisó la última versión del carro.
// Así, si otro celular agregó o quitó algo, nadie envía a ciegas.
export function validarEnvio(carro, versionRevisada) {
  if (!carro.lineas.length) return { ok: false, motivo: 'vacio' };
  if (carro.version !== versionRevisada) return { ok: false, motivo: 'carro_cambio' };
  return { ok: true };
}

export const total = (lineas) => lineas.reduce((s, l) => s + l.precio * l.cant, 0);
export const cantidad = (lineas) => lineas.reduce((s, l) => s + l.cant, 0);

// Textos de aval y cancelación (castellano rioplatense; el mozo se nombra si se conoce).
export function textoAval(r, mozo) {
  const m = mozo || 'Tu mozo';
  if (r.estado === 'cancelacion_solicitada') return null;
  if (r.aval === 'avalado') return `${m} confirmó tu pedido.`;
  if (r.aval === 'corregido') return `${m} ajustó tu pedido${r.cambios ? ': ' + r.cambios : '.'}`;
  return `${m} se acerca a confirmarlo con vos.`;
}

export function textoCancelacion(r, mozo) {
  const m = mozo || 'tu mozo';
  return r.estadoPrevio === 'en_preparacion' || r.estado === 'en_preparacion'
    ? { aviso: `Tu pedido ya estaba en preparación. Avisamos a ${m} para que se acerque a hablar con vos.`, confirmar: 'Tu pedido ya está en preparación. Si lo cancelás, avisamos a ' + m + ' para que se acerque a la mesa.' }
    : { aviso: `Avisamos a ${m}. Se acerca a tu mesa.`, confirmar: `Avisamos a ${m} y se acerca a tu mesa para tomar el control.` };
}

export const MENSAJES_ERROR = {
  vacio: 'Esa ronda ya se envió.',
  carro_cambio: 'Se actualizó el pedido de la mesa. Revisalo antes de enviar.',
};
