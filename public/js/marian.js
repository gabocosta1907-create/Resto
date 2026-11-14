// Bloque «Pastelería de Marian» compartido por todas las cartas.
// marianBlock(M, R, {hoja}) -> HTML. M = cfg.marian, R = cfg.resto. Con {hoja:true} es un <div> (dentro de una hoja de la carta).
window.marianBlock=(M,R,o={})=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const link=id=>`${M.web}/producto.html?p=${encodeURIComponent(id)}`;
const tags={vitrina:'En vitrina',encargo:'Por encargo'};
const t=o.hoja?'div':'section',id=o.hoja?'':' id="marian"';
return `<${t}${id} class="marian"><h2>${esc(M.titulo)}</h2><p class="lead">${esc(M.texto)}</p>
<div class="rail">${M.items.map(i=>`<a class="card" href="${link(i.id)}" target="_blank" rel="noopener"><img loading="lazy" src="/img/marian/${esc(i.id)}.jpg" alt="${esc(i.nombre)}"><div><b>${esc(i.nombre)}</b>${i.precio?`<span>${esc(i.precio)}</span>`:''}<span class="tag">${tags[i.modo]||''}</span></div></a>`).join('')}</div>
<div class="cta"><a class="btn" href="${M.web}" target="_blank" rel="noopener">Ver toda la pastelería</a><a class="btn o" href="${M.web}/tienda.html?cat=tortas" target="_blank" rel="noopener">Encargar una torta</a></div>
${M.retiro?`<p class="retiro"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Punto de retiro: encargá en la web de Marian con anticipación y elegí <b>${esc(R.nombre)}</b> para retirar.</span></p>`:''}</${t}>`;
};
