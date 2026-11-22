// Resto · API de estado por comercio (etapa A de HERRAMIENTA-apoyo-comercio.md)
// Todo lo que no es /api/* lo sirven los assets estáticos (run_worker_first solo para /api/*).
const J=(o,s=200,h={})=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...h}});
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const SLUG=/^[a-z0-9-]{2,40}$/;
const vacio=()=>({v:0,items:{},altas:[],bajas:[],hist:[]});
const txt=(s,n)=>String(s??'').replace(/[<>]/g,'').trim().slice(0,n);
const pub=e=>({v:e.v,items:e.items,altas:e.altas,bajas:e.bajas});

async function carta(env,req,slug){
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

export default{
  async fetch(req,env){
    const u=new URL(req.url),p=u.pathname;
    if(!p.startsWith('/api/'))return env.ASSETS.fetch(req);
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
