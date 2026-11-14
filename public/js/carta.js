(async()=>{
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Cada comercio vive en su carpeta (/<comercio>/) con su propio resto.json.
let cfg;
try{cfg=await (await fetch(location.pathname.replace(/[^/]*$/,'')+'resto.json')).json()}
catch(e){$('#carta').innerHTML='<p class="wrap">No se pudo cargar la carta.</p>';return}
const R=cfg.resto,M=cfg.marian,T=R.tema;
const root=document.documentElement.style;
root.setProperty('--bg',T.fondo);root.setProperty('--tx',T.texto);root.setProperty('--ac',T.acento);root.setProperty('--cab',T.cabecera);root.setProperty('--cabtx',T.cabeceraTexto);
root.setProperty('--ft',`'${T.titulos}',serif`);root.setProperty('--fb',`'${T.cuerpo}',sans-serif`);root.setProperty('--wt',T.pesoTitulos||500);
const fam=(n,w)=>`family=${n.replace(/ /g,'+')}:wght@${w}`;
// El bloque de Marian usa siempre la identidad de Marian (Instrumental Serif, Nunito, Nunito Sans).
$('#gf').href=`https://fonts.googleapis.com/css2?${[fam(T.titulos,T.pesoTitulos||500),fam(T.cuerpo,'400;600'),fam('Instrumental Serif','400'),fam('Nunito','400;600'),fam('Nunito Sans','700')].join('&')}&display=swap`;
document.title=R.nombre+' · Carta';
$('#nombre').textContent=R.nombre;$('#bajada').textContent=R.bajada;$('#meta').textContent=[R.direccion,R.horario].filter(Boolean).join('  ·  ');
if(R.aviso)$('#meta').insertAdjacentHTML('afterend',`<p class="aviso">${esc(R.aviso)}</p>`);
$('#pie').textContent=R.nombre+(R.direccion?' · '+R.direccion:'');
const marian=marianBlock(M,R);
// Estructura propia de cada carta: formato de sección (lista | compacto), variantes por ítem (copa/botella…),
// y dónde va el bloque de Marian (marian.despuesDe = id de sección, o "final"; por defecto tras la primera).
const item=i=>`<div class="it"><div class="r"><b>${esc(i.nombre)}</b>${i.precio?`<span class="p">${esc(i.precio)}</span>`:''}</div>${i.desc?`<small>${esc(i.desc)}</small>`:''}${(i.variantes||[]).length?`<ul class="vr">${i.variantes.map(v=>`<li><span>${esc(v.n)}</span><span>${esc(v.p)}</span></li>`).join('')}</ul>`:''}</div>`;
const sec=s=>`<section id="${esc(s.id)}" class="f-${esc(s.formato||'lista')}"><h2>${esc(s.titulo)}</h2>${s.sub?`<p class="sub">${esc(s.sub)}</p>`:''}<div class="its">${s.items.map(item).join('')}</div></section>`;
const after=M.despuesDe||cfg.secciones[0]?.id,parts=[],nav=[];let put=false;
const addM=()=>{parts.push(marian);nav.push(['marian',M.titulo]);put=true};
cfg.secciones.forEach(s=>{parts.push(sec(s));nav.push([s.id,s.titulo]);if(s.id===after)addM()});
if(!put)addM();
$('#carta').innerHTML=parts.join('');
$('#chips').innerHTML=nav.map(([id,t])=>`<a href="#${id}">${esc(t)}</a>`).join('');
const links=[...document.querySelectorAll('.chips a')];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-20% 0px -70% 0px'});
document.querySelectorAll('main section').forEach(s=>io.observe(s));
})();
