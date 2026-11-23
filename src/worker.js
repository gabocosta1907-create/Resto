// Resto · API de estado por comercio (etapa A de HERRAMIENTA-apoyo-comercio.md)
// Todo lo que no es /api/* lo sirven los assets estáticos (run_worker_first solo para /api/*).
const J=(o,s=200,h={})=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...h}});
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const SLUG=/^[a-z0-9-]{2,40}$/;
const vacio=()=>({v:0,items:{},altas:[],bajas:[],hist:[]});
const txt=(s,n)=>String(s??'').replace(/[<>]/g,'').trim().slice(0,n);
const pub=e=>({v:e.v,items:e.items,altas:e.altas,bajas:e.bajas});

async function carta(env,req,slug){
  const pb=await env.ESTADO.get('pub:'+slug,'json');
  if(pb){const c=await env.ESTADO.get(`cv:${slug}:${pb.n}`,'json');if(c)return c}
  const r=await env.ASSETS.fetch(new URL(`/${slug}/resto.json`,req.url));
  if(!r.ok)return null;
  try{return await r.json()}catch(e){return null}
}
function indexar(c){const m={};(c.secciones||[]).forEach(s=>(s.items||[]).forEach(i=>{m[i.id]={nombre:i.nombre,seccion:s.id,vars:(i.variantes||[]).map(v=>v.n)}}));return m}

async function quien(env,req){
  const a=req.headers.get('authorization')||'';const t=a.startsWith('Bearer ')?a.slice(7).trim():'';
  if(t.length<20)return null;
  const r=await env.ESTADO.get('tok:'+await sha(t),'json');
  return r&&r.slug&&SLUG.test(r.slug)?r:null;
}


// ───────── Despliegue desde el campo (etapa C) ─────────
const FUENTES=['Newsreader','DM Sans','Playfair Display','Cormorant Garamond','Inter','Lora','Fraunces','Work Sans'];
const COLOR=/^#[0-9a-fA-F]{6}$/;
const MAPA=/^https:\/\/(www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|maps\.google\.com)/i;
const ID=/^[a-z0-9][a-z0-9_-]{0,119}$/;
const RATIO=/^\d{1,2}(\.\d+)?\/\d{1,2}(\.\d+)?$/;
const aleatorio=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>b.toString(16).padStart(2,'0')).join('');
const urlOk=u=>typeof u==='string'&&u.length<500&&(/^https:\/\/[^\s"'<>]+$/.test(u)||/^\/img\/[\w./-]+$/.test(u));
const precioOk=p=>p==null||p===''||(typeof p==='number'&&p>=0&&p<1e8)||(typeof p==='string'&&p.length<=30);

function limpiar(p,slug){
  const av=[],er=[];
  if(!p||typeof p!=='object'||!p.resto||!Array.isArray(p.secciones))return{er:['El archivo no es una carta del Agente (faltan resto o secciones).']};
  const R=p.resto,o={resto:{layout:'hojas',listado:'conciso',estado:slug}};
  o.resto.nombre=txt(R.nombre,60);if(!o.resto.nombre)er.push('Falta el nombre del comercio.');
  for(const k of['subtitulo','bajada','direccion','horario'])if(R[k])o.resto[k]=txt(R[k],120);
  if(R.whatsapp)o.resto.whatsapp=String(R.whatsapp).replace(/[^\d+]/g,'').slice(0,20);
  if(R.mapa){if(MAPA.test(String(R.mapa))&&String(R.mapa).length<1200)o.resto.mapa=String(R.mapa);else av.push('El link de Google Maps no es válido y se omitió.')}
  if(R.resena&&o.resto.mapa)o.resto.resena={titulo:txt(R.resena.titulo,60),texto:txt(R.resena.texto,200),boton:txt(R.resena.boton,40)};
  const T=R.tema||{};const tm={escala:'fina',pesoTitulos:T.pesoTitulos===500?500:400};
  for(const k of['fondo','texto','acento','cabecera','cabeceraTexto','piedra'])if(COLOR.test(String(T[k]||'')))tm[k]=T[k];else if(k!=='piedra')er.push('Falta el color «'+k+'» del estilo.');
  tm.titulos=FUENTES.includes(T.titulos)?T.titulos:'Newsreader';tm.cuerpo=FUENTES.includes(T.cuerpo)?T.cuerpo:'DM Sans';
  if(!tm.piedra)tm.piedra=tm.acento;o.resto.tema=tm;
  const ids=new Set();let ni=0;o.secciones=[];
  if(p.secciones.length<1||p.secciones.length>40)er.push('La carta debe tener entre 1 y 40 secciones.');
  for(const s of p.secciones.slice(0,40)){
    if(!s||!ID.test(String(s.id||''))||ids.has('s:'+s.id)){er.push('Sección con id inválido o repetido: '+txt(s&&s.titulo,40));continue}
    ids.add('s:'+s.id);
    const S={id:s.id,titulo:txt(s.titulo,60),items:[]};if(!S.titulo)er.push('Sección sin título: '+s.id);
    if(s.corto)S.corto=txt(s.corto,30);if(s.sub)S.sub=txt(s.sub,300);
    if(s.foto){const f=s.foto;if(urlOk(f.src)){S.foto={src:f.src,alt:txt(f.alt,160),ratio:RATIO.test(String(f.ratio||''))?f.ratio:'5/2'};if(f.ref)S.foto.ref=true}else av.push('Foto de «'+S.titulo+'» con URL no permitida; se omitió.')}
    if(!Array.isArray(s.items)||s.items.length>200){er.push('Items inválidos en '+S.titulo);continue}
    for(const i of s.items){
      if(!i||!ID.test(String(i.id||''))||ids.has('i:'+i.id)){er.push('Plato con id inválido o repetido en '+S.titulo+': '+txt(i&&i.nombre,40));continue}
      ids.add('i:'+i.id);const I={id:i.id,nombre:txt(i.nombre,100)};if(!I.nombre){er.push('Plato sin nombre: '+i.id);continue}
      if(i.desc)I.desc=txt(i.desc,400);
      if(!precioOk(i.precio)){er.push('Precio inválido en '+I.nombre);continue}
      if(i.precio!=null&&i.precio!=='')I.precio=i.precio;
      if(Array.isArray(i.variantes)){I.variantes=[];for(const v of i.variantes.slice(0,8)){if(precioOk(v.p)){I.variantes.push({n:txt(v.n,40),p:v.p})}else er.push('Precio de versión inválido en '+I.nombre)}}
      if(i.dudoso)av.push('Plato dudoso sin resolver: '+I.nombre);
      S.items.push(I);ni++;
    }
    o.secciones.push(S);
  }
  if(ni<1)er.push('La carta no tiene platos.');
  if(JSON.stringify(o).length>300000)er.push('La carta es demasiado grande.');
  if(p._nota)o._nota=txt(p._nota,600);
  return{o,er,av,ni};
}

async function plantilla(env,req,carta){
  const r=await env.ASSETS.fetch(new URL('/plantilla/index.html',req.url));let h=await r.text();
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return new Response(h.replace('{{TITULO}}',esc(carta.resto.nombre)).replace('{{COLOR}}',carta.resto.tema.fondo),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
}
const jsonRes=o=>new Response(JSON.stringify(o),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache'}});

async function servirKV(env,req,p){
  let m=p.match(/^\/p\/([a-f0-9]{32})(\/(?:index\.html|resto\.json)?)?$/);
  if(m){
    if(!m[2])return Response.redirect(new URL(p+'/',req.url),301);
    const pv=await env.ESTADO.get('pv:'+m[1],'json');if(!pv)return null;
    const c=await env.ESTADO.get(`cv:${pv.slug}:${pv.n}`,'json');if(!c)return null;
    return m[2]==='/resto.json'?jsonRes(c):plantilla(env,req,c);
  }
  m=p.match(/^\/([a-z0-9-]{2,40})(\/(?:index\.html|resto\.json)?)?$/);
  if(!m)return null;
  if(!m[2])return Response.redirect(new URL(p+'/',req.url),301);
  const c=await carta(env,req,m[1]);
  const pb=await env.ESTADO.get('pub:'+m[1],'json');if(!pb||!c)return null;
  return m[2]==='/resto.json'?jsonRes(c):plantilla(env,req,c);
}

async function equipo(env,req,p,q){
  if(q.rol!=='equipo')return J({error:'solo el equipo'},403);
  let b={};if(req.method==='POST'){try{b=await req.json()}catch(e){return J({error:'pedido inválido'},400)}}
  const slug=String(b.slug||new URL(req.url).searchParams.get('slug')||'');
  const link=async s=>{const tok=aleatorio(32);const old=await env.ESTADO.get('ct:'+s);if(old)await env.ESTADO.delete('tok:'+old);const h=await sha(tok);await env.ESTADO.put('tok:'+h,JSON.stringify({slug:s,rol:'comercio'}));await env.ESTADO.put('ct:'+s,h);return '/herramienta/#t='+tok};
  if(req.method==='GET'&&p==='/api/equipo/cartas'){
    const l=await env.ESTADO.list({prefix:'pub:'});const out=[];
    for(const k of l.keys){const s=k.name.slice(4);const pb=await env.ESTADO.get(k.name,'json');const c=await env.ESTADO.get(`cv:${s}:${pb.n}`,'json');out.push({slug:s,n:pb.n,prev:pb.prev||null,nombre:c&&c.resto.nombre})}
    return J(out);
  }
  if(req.method==='POST'&&p==='/api/equipo/borrador'){
    if(!SLUG.test(slug)||['api','p','js','css','img','data','herramienta','equipo','plantilla'].includes(slug))return J({error:'dirección inválida (usá letras minúsculas, números y guiones)'},400);
    const pb=await env.ESTADO.get('pub:'+slug,'json');
    if(!pb){const r=await env.ASSETS.fetch(new URL(`/${slug}/resto.json`,req.url));if(r.ok)return J({error:'esa dirección ya existe como carta fija; elegí otra'},409)}
    const L=limpiar(b.paquete,slug);if(L.er.length)return J({error:'La carta tiene errores',errores:L.er},422);
    const n=((await env.ESTADO.get('cn:'+slug,'json'))||0)+1;
    await env.ESTADO.put('cn:'+slug,JSON.stringify(n));await env.ESTADO.put(`cv:${slug}:${n}`,JSON.stringify(L.o));
    const tok=aleatorio(16);await env.ESTADO.put('pv:'+tok,JSON.stringify({slug,n}),{expirationTtl:604800});
    return J({ok:true,n,vista:`/p/${tok}/`,avisos:L.av,platos:L.ni,secciones:L.o.secciones.length});
  }
  if(req.method==='POST'&&p==='/api/equipo/publicar'){
    const n=Number(b.n);if(!SLUG.test(slug)||!Number.isInteger(n))return J({error:'faltan datos'},400);
    const c=await env.ESTADO.get(`cv:${slug}:${n}`,'json');if(!c)return J({error:'ese borrador no existe'},404);
    const pb=await env.ESTADO.get('pub:'+slug,'json');
    await env.ESTADO.put('pub:'+slug,JSON.stringify({n,prev:pb?pb.n:null,t:new Date().toISOString()}));
    const nuevo=!(await env.ESTADO.get('ct:'+slug));
    return J({ok:true,url:'/'+slug+'/',herramienta:nuevo?await link(slug):null});
  }
  if(req.method==='POST'&&p==='/api/equipo/revertir'){
    const pb=await env.ESTADO.get('pub:'+slug,'json');if(!pb||!pb.prev)return J({error:'no hay versión anterior'},409);
    await env.ESTADO.put('pub:'+slug,JSON.stringify({n:pb.prev,prev:pb.n,t:new Date().toISOString()}));
    return J({ok:true,n:pb.prev});
  }
  if(req.method==='POST'&&p==='/api/equipo/token'){
    const pb=await env.ESTADO.get('pub:'+slug,'json');if(!pb)return J({error:'carta no publicada'},404);
    return J({ok:true,herramienta:await link(slug)});
  }
  return J({error:'no existe'},404);
}

export default{
  async fetch(req,env){
    const u=new URL(req.url),p=u.pathname;
    if(!p.startsWith('/api/')){
      const r=await env.ASSETS.fetch(req);
      if(r.status!==404||req.method!=='GET')return r;
      try{return (await servirKV(env,req,p))||r}catch(e){return r}
    }
    try{
      let m;
      if(req.method==='GET'&&(m=p.match(/^\/api\/estado\/([a-z0-9-]{2,40})$/))){
        const e=await env.ESTADO.get('est:'+m[1],'json');
        return J(e?pub(e):pub(vacio()),200,{'cache-control':'no-cache'});
      }
      const q=await quien(env,req);
      if(!q)return J({error:'sin acceso'},401);
      const slug=q.slug;
      if(req.method==='GET'&&p==='/api/yo')return J({slug,rol:q.rol});
      if(p.startsWith('/api/equipo/'))return equipo(env,req,p,q);
      if(req.method==='GET'&&p==='/api/historial'){
        const e=(await env.ESTADO.get('est:'+slug,'json'))||vacio();
        return J(e.hist.map(h=>({t:h.t,txt:h.txt})).reverse());
      }
      if(req.method==='POST'&&p==='/api/op'){
        let b;try{b=await req.json()}catch(e){return J({error:'pedido inválido'},400)}
        const base=await carta(env,req,slug);if(!base)return J({error:'carta no encontrada'},404);
        const idx=indexar(base);
        const e=(await env.ESTADO.get('est:'+slug,'json'))||vacio();
        const snap=JSON.stringify(pub(e));
        const nombreDe=id=>idx[id]?idx[id].nombre:(e.altas.find(a=>a.id===id)||{}).nombre;
        const existe=id=>typeof id==='string'&&(idx[id]||e.altas.some(a=>a.id===id));
        let msg='';
        if(b.op==='deshacer'){
          const h=e.hist.pop();if(!h)return J({error:'no hay nada para deshacer'},409);
          const s=JSON.parse(h.snap);e.items=s.items;e.altas=s.altas;e.bajas=s.bajas;e.v++;
          await env.ESTADO.put('est:'+slug,JSON.stringify(e));
          return J({ok:true,msg:'Deshice: '+h.txt,estado:pub(e)});
        }
        const id=b.id;
        if(['suspender','reactivar','precio','quitar','modificar'].includes(b.op)&&!existe(id))return J({error:'plato inexistente'},404);
        const it=()=>(e.items[id]=e.items[id]||{});
        if(b.op==='suspender'){it().off=true;msg=`Suspendí ${nombreDe(id)}`}
        else if(b.op==='reactivar'){if(e.items[id])delete e.items[id].off;msg=`Reactivé ${nombreDe(id)}`}
        else if(b.op==='precio'){
          const n=Number(b.precio);if(!Number.isFinite(n)||n<=0||n>10000000)return J({error:'precio inválido'},400);
          const a=e.altas.find(x=>x.id===id);const vs=idx[id]?idx[id].vars:[];
          if(vs.length){
            const vn=vs.find(x=>x.toLowerCase()===txt(b.variante,40).toLowerCase());
            if(!vn)return J({error:'tiene varias versiones, indicá cuál: '+vs.join(', ')},400);
            it().vp=Object.assign(it().vp||{},{[vn]:Math.round(n)});
            msg=`Precio de ${nombreDe(id)} (${vn}): $${Math.round(n).toLocaleString('es-AR')}`;
          }else{
            if(a)a.precio=Math.round(n);else it().precio=Math.round(n);
            msg=`Precio de ${nombreDe(id)}: $${Math.round(n).toLocaleString('es-AR')}`;
          }
        }
        else if(b.op==='quitar'){
          const k=e.altas.findIndex(x=>x.id===id);
          if(k>=0)e.altas.splice(k,1);else if(!e.bajas.includes(id))e.bajas.push(id);
          msg=`Quité ${nombreDe(id)}`;
        }
        else if(b.op==='modificar'){
          const nom=txt(b.nombre,80),des=txt(b.desc,300);if(!nom&&b.desc===undefined)return J({error:'nada para modificar'},400);
          const a=e.altas.find(x=>x.id===id);const t=a||it();
          if(nom)t.nombre=nom;if(b.desc!==undefined)t.desc=des;
          msg=`Modifiqué ${nombreDe(id)}`;
        }
        else if(b.op==='editar'){
          const a=e.altas.find(x=>x.id===id);const vs=idx[id]?idx[id].vars:[];
          const cam={};
          if(b.nombre!==undefined){const nom=txt(b.nombre,80);if(!nom)return J({error:'el nombre no puede quedar vacío'},400);cam.nombre=nom}
          if(b.desc!==undefined)cam.desc=txt(b.desc,300);
          if(b.precio!=null){const n=Number(b.precio);if(!Number.isFinite(n)||n<=0||n>10000000)return J({error:'precio inválido'},400);if(vs.length)return J({error:'tiene varias versiones, indicá el precio de cada una'},400);cam.precio=Math.round(n)}
          const vp={};
          if(b.vp&&typeof b.vp==='object')for(const[k,v]of Object.entries(b.vp)){const vn=vs.find(x=>x.toLowerCase()===String(k).toLowerCase());const n=Number(v);if(!vn||!Number.isFinite(n)||n<=0||n>10000000)return J({error:'precio de versión inválido'},400);vp[vn]=Math.round(n)}
          if(!Object.keys(cam).length&&!Object.keys(vp).length)return J({error:'nada para modificar'},400);
          const tg=a||(e.items[id]=e.items[id]||{});
          Object.assign(tg,cam);if(Object.keys(vp).length)tg.vp=Object.assign(tg.vp||{},vp);
          msg=`Edité ${nombreDe(id)}`;
        }
        else if(b.op==='agregar'){
          const sec=(base.secciones||[]).find(s=>s.id===b.seccion);if(!sec)return J({error:'sección inexistente'},404);
          const nom=txt(b.nombre,80),n=Number(b.precio);
          if(!nom||!Number.isFinite(n)||n<=0||n>10000000)return J({error:'faltan nombre o precio válido'},400);
          if(e.altas.length>=60)return J({error:'demasiados platos agregados'},409);
          const nid='x'+Date.now().toString(36);
          e.altas.push({id:nid,seccion:sec.id,nombre:nom,desc:txt(b.desc,300),precio:Math.round(n)});
          msg=`Agregué ${nom} en ${sec.titulo}`;
        }
        else return J({error:'operación desconocida'},400);
        e.v++;e.hist.push({t:new Date().toISOString(),txt:msg,snap});if(e.hist.length>30)e.hist.shift();
        await env.ESTADO.put('est:'+slug,JSON.stringify(e));
        return J({ok:true,msg,estado:pub(e)});
      }
      return J({error:'no existe'},404);
    }catch(err){return J({error:'error interno'},500)}
  }
};
