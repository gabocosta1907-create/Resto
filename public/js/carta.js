(async()=>{
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cfg=await (await fetch('/data/resto.json')).json();const R=cfg.resto,M=cfg.marian,T=R.tema;
const root=document.documentElement.style;
root.setProperty('--bg',T.fondo);root.setProperty('--tx',T.texto);root.setProperty('--ac',T.acento);root.setProperty('--cab',T.cabecera);root.setProperty('--cabtx',T.cabeceraTexto);
root.setProperty('--ft',`'${T.titulos}',serif`);root.setProperty('--fb',`'${T.cuerpo}',sans-serif`);
$('#gf').href=`https://fonts.googleapis.com/css2?family=${T.titulos.replace(/ /g,'+')}:wght@500&family=${T.cuerpo.replace(/ /g,'+')}:wght@400;600&family=Nunito+Sans:wght@700&display=swap`;
document.title=R.nombre+' · Carta';
$('#nombre').textContent=R.nombre;$('#bajada').textContent=R.bajada;$('#meta').textContent=[R.direccion,R.horario].filter(Boolean).join('  ·  ');
$('#pie').textContent=R.nombre+(R.direccion?' · '+R.direccion:'');
const link=id=>`${M.web}/producto.html?p=${encodeURIComponent(id)}`;
const tags={vitrina:'En vitrina',encargo:'Por encargo'};
const marian=`<section id="marian" class="marian"><h2>${esc(M.titulo)}</h2><p class="lead">${esc(M.texto)}</p>
<div class="rail">${M.items.map(i=>`<a class="card" href="${link(i.id)}" target="_blank" rel="noopener"><img loading="lazy" src="/img/marian/${esc(i.id)}.jpg" alt="${esc(i.nombre)}"><div><b>${esc(i.nombre)}</b>${i.precio?`<span>${esc(i.precio)}</span>`:''}<span class="tag">${tags[i.modo]||''}</span></div></a>`).join('')}</div>
<div class="cta"><a class="btn" href="${M.web}" target="_blank" rel="noopener">Ver toda la pastelería</a><a class="btn o" href="${M.web}/tienda.html?cat=tortas" target="_blank" rel="noopener">Encargar una torta</a></div>
${M.retiro?`<p class="retiro"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Punto de retiro: encargá en la web de Marian con anticipación y elegí <b>${esc(R.nombre)}</b> para retirar.</span></p>`:''}</section>`;
const sec=cfg.secciones.map(s=>`<section id="${esc(s.id)}"><h2>${esc(s.titulo)}</h2>${s.items.map(i=>`<div class="it"><div class="r"><b>${esc(i.nombre)}</b><span class="p">${esc(i.precio)}</span></div>${i.desc?`<small>${esc(i.desc)}</small>`:''}</div>`).join('')}</section>`);
const parts=[...sec.slice(0,1),marian,...sec.slice(1)];
$('#carta').innerHTML=parts.join('');
const nav=[...cfg.secciones.slice(0,1).map(s=>[s.id,s.titulo]),['marian',M.titulo],...cfg.secciones.slice(1).map(s=>[s.id,s.titulo])];
$('#chips').innerHTML=nav.map(([id,t])=>`<a href="#${id}">${esc(t)}</a>`).join('');
const links=[...document.querySelectorAll('.chips a')];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-20% 0px -70% 0px'});
document.querySelectorAll('main section').forEach(s=>io.observe(s));
})();
