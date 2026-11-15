// Layout «hojas»: carta digital con una hoja por categoría (cambio horizontal plano, scroll vertical propio),
// índice inferior fijo, rutas compartibles (#/categoria y #/categoria/plato) con History API,
// capa de plato (historia, maridaje, vuelta a la carta) y eventos de analítica.
// Todo el contenido sale de resto.json (junto a la página): nada de precios ni textos en el código.
(async()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const base=location.pathname.replace(/[^/]*$/,'');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const qs=new URLSearchParams(location.search),origen=qs.get('o')||'directo',dbg=qs.has('debug');
if('scrollRestoration' in history)history.scrollRestoration='manual';

// ── analítica (stub: sin backend; deja los eventos en window.dataLayer y window.__eventos) ──
const eventos=window.__eventos=[];window.dataLayer=window.dataLayer||[];
const track=(ev,p={})=>{const e={ev,origen,...p};eventos.push(e);window.dataLayer.push({event:'carta_'+ev,...e});if(dbg)console.debug('[carta]',e)};

// ── datos ──
const app=$('#app');
let cfg=null,dir=base;
// Una versión puede extender el contenido de otra (`extiende`) y solo cambiar `resto` (listado, nombre, tema…): un solo contenido, varios modelos.
try{const r=await fetch(base+'resto.json');if(!r.ok)throw 0;cfg=await r.json();
 if(cfg.extiende){const b=await (await fetch(cfg.extiende)).json();dir=cfg.extiende.replace(/[^/]*$/,'');b.resto={...b.resto,...cfg.resto,tema:{...b.resto.tema,...(cfg.resto||{}).tema}};cfg=b}}catch(e){cfg=null}
if(!cfg||!cfg.secciones){app.innerHTML='<div class="carga"><p>No pudimos cargar la carta.</p><button class="btn-v" id="reintentar" style="width:auto;padding:0 28px">Reintentar</button></div>';$('#reintentar').onclick=()=>location.reload();return}
const R=cfg.resto,M=cfg.marian,T=R.tema,root=document.documentElement.style;
[['bg',T.fondo],['tx',T.texto],['ac',T.acento],['cab',T.cabecera],['cabtx',T.cabeceraTexto],['pi',T.piedra||T.cabecera]].forEach(([k,v])=>root.setProperty('--'+k,v));
root.setProperty('--ft',`'${T.titulos}',serif`);root.setProperty('--fb',`'${T.cuerpo}',sans-serif`);root.setProperty('--wt',T.pesoTitulos||500);
const fam=(n,w)=>`family=${n.replace(/ /g,'+')}:wght@${w}`;
// El bloque de Marian usa siempre la identidad de Marian.
$('#gf').href=`https://fonts.googleapis.com/css2?${[fam(T.titulos,T.pesoTitulos||500),fam(T.cuerpo,'400;500;600'),fam('Instrumental Serif','400'),fam('Nunito','400;600'),fam('Nunito Sans','700')].join('&')}&display=swap`;
const ext=u=>/^https?:/.test(u);
const imgSrc=(u,w)=>ext(u)?(/images\.unsplash\.com|plus\.unsplash\.com/.test(u)?u.replace(/([?&])w=\d+/,'$1w='+w).replace(/&h=\d+/,''):u):dir+u;
const imgAttr=u=>ext(u)?' referrerpolicy="no-referrer"':'';
const fmt=p=>p==null||p===''?'':typeof p==='number'?'$'+String(p).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):String(p);
const num=i=>String(i+1).padStart(2,'0');

const CON=R.listado==='conciso';
const SECS=cfg.secciones.filter(s=>!s.oculta);
const H=SECS.map(s=>({id:s.id,titulo:s.titulo,corto:s.corto||s.titulo,s}));
if(M){const j=M.despuesDe&&M.despuesDe!=='final'?H.findIndex(h=>h.id===M.despuesDe):-1,m={id:'marian',titulo:M.titulo,corto:M.corto||M.titulo,marian:true};j>=0?H.splice(j+1,0,m):H.push(m)}
const N=H.length;
const ITEMS=new Map(),ED=new Map();
SECS.forEach(s=>s.items.forEach(it=>ITEMS.set(it.id,{it,sec:s})));
(cfg.editorial||[]).forEach(e=>{if(ITEMS.has(e.plato))ED.set(e.plato,e)});
const DET=id=>{const x=ITEMS.get(id);return ED.has(id)||!!(x&&(x.it.foto||(CON&&x.it.desc&&x.sec.ficha!==false)))};

// ── marcado ──
const LEAF='<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M16 29V16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/><path d="M16 18C9 18 5.5 12.5 6 5c6.500.5 10 4.500 10 13Z" fill="currentColor"/><path d="M16 16c0-7 3.500-11 9.500-11.500C26 10.500 23 16 16 16Z" fill="currentColor" opacity=".8"/></svg>';
const ARR='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const chev=d=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const vr=it=>(it.variantes||[]).filter(v=>v.p!=null&&v.p!=='').map(v=>`<li><span>${esc(v.n)}</span><b>${esc(fmt(v.p))}</b></li>`).join('');
const itemHTML=(it,s)=>{const e=DET(it.id),v=vr(it),h=`#/${esc(s.id)}/${esc(it.id)}`,th=it.foto&&!CON?`<img class="th" src="${esc(imgSrc(it.foto.src,320))}"${imgAttr(it.foto.src)} alt="" loading="lazy" decoding="async" onerror="this.remove()">`:'';
return `<article class="it${e?' ed':''}${th?' cf':''}${it.agotado?' agotado':''}" id="it-${esc(it.id)}"><div class="r"><h3>${e?`<a class="pl" href="${h}">${esc(it.nombre)}</a>`:esc(it.nombre)}</h3>${it.agotado?'<span class="ag">Agotado</span>':(it.variantes?'':`<span class="p">${esc(fmt(it.precio))}</span>`)}</div>${it.desc&&(!CON||!e)?`<p class="d">${esc(it.desc)}</p>`:''}${v?`<ul class="vr">${v}</ul>`:''}${e?`<a class="mas" href="${h}" tabindex="-1" aria-hidden="true">${ED.has(it.id)?'Historia y maridaje':'Ver el plato'} ${ARR}</a>`:''}${th}</article>`};
const foto=(f,w=900)=>f?`<figure class="foto" style="--r:${esc(f.ratio||'4/3')}"><img src="${esc(imgSrc(f.src,w))}"${imgAttr(f.src)} alt="${esc(f.alt||'')}" loading="lazy" decoding="async" onerror="this.closest('figure').remove()">${f.ref?'<figcaption>Foto de referencia</figcaption>':''}</figure>`:'';
const sig=i=>`<div class="sig">${H[i-1]?`<button class="sg" data-go="-1">← ${esc(H[i-1].corto)}</button>`:'<span></span>'}${H[i+1]?`<button class="sg" data-go="1">${esc(H[i+1].corto)} →</button>`:'<span></span>'}</div>`;
const sheetHTML=(h,i)=>h.marian
 ?`<section class="hoja marian-h" id="h-${esc(h.id)}" role="region" aria-label="${esc(h.titulo)}" tabindex="-1">${marianBlock(M,R,{hoja:true})}<div class="pad">${sig(i)}</div></section>`
 :`<section class="hoja" id="h-${esc(h.id)}" role="region" aria-label="${esc(h.titulo)}" tabindex="-1"><div class="pad"><p class="eyebrow">${num(i)} / ${String(N).padStart(2,'0')}</p><h2 class="tit">${esc(h.titulo)}</h2>${h.s.sub?`<p class="sub">${esc(h.s.sub)}</p>`:''}${foto(h.s.foto,1200)}<div class="its">${h.s.items.map(it=>itemHTML(it,h.s)).join('')}</div>${sig(i)}</div></section>`;
app.innerHTML=`<header class="cab"><a class="marca" href="#/${esc(H[0].id)}" aria-label="${esc(R.nombre)}: ir al comienzo de la carta">${LEAF}<span class="wm"><b>${esc(R.nombre)}</b><i>${esc(R.subtitulo||'')}</i></span></a><span class="cnt" id="cnt" aria-hidden="true"></span><button class="ib" id="bprev" data-go="-1" aria-label="Categoría anterior">${chev('M15 5l-7 7 7 7')}</button><button class="ib" id="bnext" data-go="1" aria-label="Categoría siguiente">${chev('M9 5l7 7-7 7')}</button><button class="ib" id="bmenu" aria-label="Abrir el índice completo" aria-haspopup="dialog">${chev('M4 7h16M4 12h16M4 17h16')}</button></header>
<main class="stage" id="stage"><div class="pila" id="pila">${H.map(sheetHTML).join('')}</div>
<div class="capa" id="capa" role="dialog" aria-labelledby="capa-t" tabindex="-1"></div>
<div class="full" id="full" role="dialog" aria-label="Índice de la carta" tabindex="-1"><div class="top"><span class="mini">Todas las categorías</span><button class="ib" data-closefull aria-label="Cerrar el índice">${chev('M6 6l12 12M18 6L6 18')}</button></div><ol class="lista">${H.map((h,i)=>`<li><a href="#/${esc(h.id)}"><span class="n">${num(i)}</span><span class="t">${esc(h.titulo)}</span></a></li>`).join('')}</ol><a class="vsitio" href="/">← Todos los prototipos</a></div>
${N>1?'<p class="hint" id="hint" aria-hidden="true">Deslizá para pasar de categoría</p>':''}<div class="toast" id="toast" role="status"></div></main>
<nav class="indice" aria-label="Categorías de la carta"><div class="tira" id="tira">${H.map(h=>`<a href="#/${esc(h.id)}">${esc(h.corto)}</a>`).join('')}</div></nav><div class="sr" id="live" aria-live="polite"></div>`;
H.forEach(h=>h.el=$('#h-'+h.id));
const stage=$('#stage'),pila=$('#pila'),capa=$('#capa'),full=$('#full'),tira=$('#tira'),cnt=$('#cnt'),bprev=$('#bprev'),bnext=$('#bnext'),bmenu=$('#bmenu'),live=$('#live'),hint=$('#hint'),toastEl=$('#toast');

// ── estado y disposición de las hojas ──
let cur=-1,endFn=null,tm=null,pendingReveal=null,focusAfter=false,overlayItem=null,fullOpen=false,opener=null,deepItem=null,supp=false;
const W=()=>stage.clientWidth;
function layout(){H.forEach((h,i)=>{const e=h.el;e.classList.remove('mov');e.style.transition='none';e.style.willChange='';
 if(i===cur){e.style.transform='none';e.style.visibility='visible';e.style.zIndex=N+1}
 else{e.style.transform=i<cur?'translateX(-100%)':'none';e.style.visibility='hidden';e.style.zIndex=i<cur?i:N-i}
 e.inert=i!==cur;e.setAttribute('aria-hidden',i===cur?'false':'true')})}
function settleNow(){if(endFn){const f=endFn;endFn=null;clearTimeout(tm);f()}}
function after(prev){const h=H[cur];
 $$('a',tira).forEach((a,i)=>i===cur?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current'));
 $$('a',full).forEach((a,i)=>i===cur?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current'));
 const a=tira.children[cur];if(a)tira.scrollTo({left:a.offsetLeft-(tira.clientWidth-a.offsetWidth)/2,behavior:reduce.matches?'auto':'smooth'});
 cnt.textContent=`${num(cur)} / ${String(N).padStart(2,'0')}`;bprev.disabled=cur===0;bnext.disabled=cur===N-1;
 document.title=`${h.titulo} · ${R.nombre}`;live.textContent=`${h.titulo}, ${cur+1} de ${N}`;
 if(prev>=0&&hint)hint.classList.add('off');
 track('categoria',{cat:h.id});
 if(focusAfter){h.el.focus({preventScroll:true});focusAfter=false}}
// Cambio de hoja animado: hacia adelante la hoja actual se corre y descubre la siguiente; hacia atrás la anterior vuelve a cubrirla.
function slide(target,fromDrag){settleNow();const prev=cur,fwd=target>cur,c=H[cur].el,t=H[target].el,dur=reduce.matches?0:280;
 H.forEach((h,i)=>{if(i!==cur&&i!==target)h.el.style.visibility='hidden'});
 const fin=()=>{endFn=null;clearTimeout(tm);cur=target;layout();after(prev);const r=pendingReveal;pendingReveal=null;if(r)r()};
 if(fwd){t.style.transition='none';t.style.transform='none';t.style.visibility='visible';t.style.zIndex=N;c.style.zIndex=N+1;if(!fromDrag)c.style.transform='none'}
 else{t.style.visibility='visible';t.style.zIndex=N+2;c.style.zIndex=N+1;c.style.transform='none';if(!fromDrag){t.style.transition='none';t.style.transform='translateX(-100%)'}}
 if(!dur){fin();return}
 const mv=fwd?c:t;mv.getBoundingClientRect();mv.style.transition=`transform ${dur}ms var(--ease)`;mv.style.transform=fwd?'translateX(-100%)':'none';
 endFn=fin;tm=setTimeout(fin,dur+120)}
function spring(){settleNow();const c=H[cur].el,p=H[cur-1]&&H[cur-1].el,dur=reduce.matches?0:220;
 const done=()=>{endFn=null;clearTimeout(tm);layout()};if(!dur){done();return}
 c.style.transition=`transform ${dur}ms var(--ease)`;c.style.transform='none';
 if(p&&p.style.visibility==='visible'){p.style.transition=`transform ${dur}ms var(--ease)`;p.style.transform='translateX(-100%)'}
 endFn=done;tm=setTimeout(done,dur+100)}
function showCat(i,{animate=true,drag=false,focus=false}={}){if(i===cur)return;focusAfter=focus;const prev=cur;
 if(cur<0||!animate||reduce.matches){settleNow();cur=i;layout();after(prev);return}
 slide(i,drag)}

// ── gesto horizontal (el vertical lo resuelve el navegador: touch-action: pan-y) ──
let dg=null;
function dragTo(dx){const c=H[cur].el,n=H[cur+1]&&H[cur+1].el,p=H[cur-1]&&H[cur-1].el;
 [n,p].forEach(e=>{if(e){e.style.visibility='hidden';e.classList.remove('mov')}});c.classList.remove('mov');c.style.transition='none';c.style.willChange='transform';
 if(dx<0&&n){n.style.transition='none';n.style.transform='none';n.style.visibility='visible';n.style.zIndex=N;c.style.zIndex=N+1;c.style.transform=`translateX(${dx}px)`;c.classList.add('mov')}
 else if(dx>0&&p){p.style.transition='none';p.style.willChange='transform';p.style.visibility='visible';p.style.zIndex=N+2;p.style.transform=`translateX(${-W()+dx}px)`;c.style.transform='none';p.classList.add('mov')}
 else c.style.transform=`translateX(${dx*.25}px)`}
stage.addEventListener('pointerdown',e=>{
 if(overlayItem!=null||fullOpen||N<2||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest('.rail,video,input,textarea,select,summary'))return;
 settleNow();dg={id:e.pointerId,x:e.clientX,y:e.clientY,mode:null,dx:0,s:[[e.timeStamp,e.clientX]]}});
stage.addEventListener('pointermove',e=>{if(!dg||e.pointerId!==dg.id)return;
 const dx=e.clientX-dg.x,dy=e.clientY-dg.y;
 if(!dg.mode){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
  if(Math.abs(dx)>Math.abs(dy)*1.2){dg.mode='h';try{stage.setPointerCapture(e.pointerId)}catch(_){}stage.classList.add('drag')}else{dg=null;return}}
 dg.dx=dx;dg.s.push([e.timeStamp,e.clientX]);if(dg.s.length>6)dg.s.shift();dragTo(dx)});
function endDrag(e,cancel){if(!dg||e.pointerId!==dg.id)return;const d=dg;dg=null;stage.classList.remove('drag');if(d.mode!=='h')return;
 supp=true;setTimeout(()=>supp=false,60);
 const a=d.s[0],b=d.s[d.s.length-1],vx=b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0,fwd=d.dx<0,t=cur+(fwd?1:-1);
 const ok=!cancel&&H[t]&&(Math.abs(d.dx)>W()*.28||(Math.abs(vx)>.45&&Math.sign(vx)===Math.sign(d.dx)));
 if(ok){history.pushState({app:1},'',url(H[t].id));showCat(t,{drag:true})}else spring()}
stage.addEventListener('pointerup',e=>endDrag(e,false));
stage.addEventListener('pointercancel',e=>endDrag(e,true));

// ── rutas: #/categoria y #/categoria/plato ──
const parse=h=>{const m=String(h).replace(/^#\/?/,'').split('/').filter(Boolean);return{cat:m[0]||null,item:m[1]||null}};
const url=(cat,item)=>'#/'+cat+(item?'/'+item:'');
function apply({animate=true,focus=false}={}){
 const raw=parse(location.hash);let i=H.findIndex(h=>h.id===raw.cat),item=raw.item;
 if(item&&ITEMS.has(item)){const j=H.findIndex(h=>h.id===ITEMS.get(item).sec.id);if(j>=0)i=j}else item=null;
 if(i<0)i=0;
 const want=url(H[i].id,item);if(location.hash!==want)history.replaceState(history.state,'',want);
 closeFull();
 const ov=item&&DET(item);
 if(!ov)closeCapa();
 if(i!==cur)showCat(i,{animate,focus});
 if(ov)openCapa(item);
 else if(item){const f=()=>reveal(item);if(endFn)pendingReveal=f;else f()}}
function nav(cat,item,{focus=false}={}){const want=url(cat,item);if(location.hash===want)return;
 history.pushState({app:1,ov:!!(item&&DET(item))},'',want);apply({animate:true,focus})}
function reveal(id){const s=H[cur].el,it=$('#it-'+CSS.escape(id),s);if(!it)return;s.scrollTop=Math.max(0,it.offsetTop-90);it.classList.remove('hl');void it.offsetWidth;it.classList.add('hl');setTimeout(()=>it.classList.remove('hl'),2500)}
addEventListener('popstate',()=>apply({animate:true}));
addEventListener('resize',()=>{if(!endFn)layout()});

// ── capa de plato: historia → vino → volver a la carta ──
function capaHTML(id){const{it,sec}=ITEMS.get(id),e=ED.get(id)||{},vv=e.maridaje&&ITEMS.get(e.maridaje.vino);
 return `<div class="top"><button class="back" data-close>← Volver a la carta</button><button class="ib" data-share aria-label="Compartir este plato">${chev('M12 3v12M7 8l5-5 5 5M5 14v6h14v-6')}</button></div><div class="pad"><p class="eyebrow">${esc(sec.titulo)}</p><h2 class="tit" id="capa-t">${esc(e.titulo||it.nombre)}</h2>${it.precio!=null?`<p class="cp">${esc(fmt(it.precio))}</p>`:''}${foto(e.foto||it.foto)}${it.desc?`<p class="d">${esc(it.desc)}</p>`:''}${e.video&&e.video.src?`<video controls playsinline preload="none"${e.video.poster?` poster="${esc(dir+e.video.poster)}"`:''} src="${esc(dir+e.video.src)}"></video>`:''}${(e.texto||[]).length?`<div class="hist"><h3 class="mini">Historia</h3>${e.texto.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`:''}${vv?`<details class="vino"><summary><span><span class="mini">Vino sugerido</span><b>${esc(vv.it.nombre)}</b></span>${chev('M12 5v14M5 12h14')}</summary><div class="vc"><ul class="vr">${vr(vv.it)}</ul>${e.maridaje.nota?`<p class="nota">${esc(e.maridaje.nota)}</p>`:''}<a class="ver" href="#/${esc(vv.sec.id)}/${esc(vv.it.id)}">Ver en la carta de vinos ${ARR}</a></div></details>`:''}${e.placeholder?'<p class="ejemplo">Texto de ejemplo del prototipo.</p>':''}<button class="btn-v" data-close>Volver a la carta</button></div>`}
function openCapa(id){if(overlayItem===id)return;
 if(overlayItem==null){opener=document.activeElement&&document.activeElement!==document.body?document.activeElement:null}
 overlayItem=id;capa.innerHTML=capaHTML(id);capa.scrollTop=0;pila.inert=true;capa.classList.add('on');
 capa.focus({preventScroll:true});track('plato_abierto',{item:id,cat:ITEMS.get(id).sec.id})}
function closeCapa(){if(overlayItem==null)return;const id=overlayItem;overlayItem=null;capa.classList.remove('on');pila.inert=false;
 if(deepItem===id){deepItem=null;reveal(id)}
 else if(opener&&opener.isConnected&&H[cur].el.contains(opener)){opener.focus({preventScroll:true})}
 else H[cur].el.focus({preventScroll:true});
 opener=null}
function closeCapaUser(){track('volver_a_carta',{item:overlayItem});
 if(history.state&&history.state.ov)history.back();
 else{history.replaceState(history.state,'',url(H[cur].id));apply()}}

// ── índice completo (acceso de tres líneas) ──
function openFull(){if(fullOpen)return;fullOpen=true;pila.inert=true;capa.inert=true;full.classList.add('on');bmenu.setAttribute('aria-expanded','true');full.focus({preventScroll:true});track('indice_completo')}
function closeFull(){if(!fullOpen)return;fullOpen=false;full.classList.remove('on');bmenu.setAttribute('aria-expanded','false');capa.inert=false;if(overlayItem==null)pila.inert=false}

// ── interacciones ──
let toastTm;const toast=t=>{toastEl.textContent=t;toastEl.classList.add('on');clearTimeout(toastTm);toastTm=setTimeout(()=>toastEl.classList.remove('on'),2200)};
async function share(){const u=location.origin+location.pathname+location.hash,title=`${document.title}`;track('compartir',{item:overlayItem});
 if(navigator.share){try{await navigator.share({title,url:u})}catch(_){}return}
 try{await navigator.clipboard.writeText(u);toast('Link copiado')}catch(_){toast('Copiá el link desde la barra del navegador')}}
document.addEventListener('click',e=>{
 if(supp){e.preventDefault();e.stopPropagation();return}
 const t=e.target,a=t.closest('a[href^="#/"]');
 if(a&&!(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0)){e.preventDefault();const r=parse(a.getAttribute('href'));nav(r.cat,r.item,{focus:!!a.closest('.tira,.full')});return}
 const g=t.closest('[data-go]');if(g){const j=cur+Number(g.dataset.go);if(H[j])nav(H[j].id,null,{focus:true});return}
 if(t.closest('[data-close]')){closeCapaUser();return}
 if(t.closest('[data-share]')){share();return}
 if(t.closest('#bmenu')){fullOpen?closeFull():openFull();return}
 if(t.closest('[data-closefull]')){closeFull();bmenu.focus();return}
 const m=t.closest('.marian a[href^="http"]');if(m)track('marian_click',{href:m.href})},true);
capa.addEventListener('toggle',e=>{if(e.target.matches('details.vino')&&e.target.open)track('vino_consultado',{item:overlayItem})},true);
capa.addEventListener('play',()=>track('video_play',{item:overlayItem}),true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(fullOpen){closeFull();bmenu.focus();e.preventDefault()}else if(overlayItem!=null){closeCapaUser();e.preventDefault()}return}
 if(e.key==='Tab'&&(fullOpen||overlayItem!=null)){const box=fullOpen?full:capa,f=$$('a[href],button:not([disabled]),summary,video[controls]',box).filter(x=>x.offsetParent!==null&&x.getAttribute('tabindex')!=='-1');
  if(f.length&&!box.contains(document.activeElement)){f[0].focus();e.preventDefault()}
  else if(f.length&&e.shiftKey&&(document.activeElement===f[0]||document.activeElement===box)){f[f.length-1].focus();e.preventDefault()}
  else if(f.length&&!e.shiftKey&&document.activeElement===f[f.length-1]){f[0].focus();e.preventDefault()}return}
 if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!fullOpen&&overlayItem==null&&!e.target.closest('input,textarea,select,video,[contenteditable]')){
  const j=cur+(e.key==='ArrowRight'?1:-1);if(H[j]){nav(H[j].id,null,{focus:true});e.preventDefault()}}});

// ── arranque ──
layout();
const first=parse(location.hash);if(first.item&&DET(first.item)&&!history.state)deepItem=first.item;
apply({animate:false});
track('abierta',{ruta:location.hash||'#/'});
})();
