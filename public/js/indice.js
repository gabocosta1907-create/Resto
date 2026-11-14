(async()=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rutas=await (await fetch('/data/comercios.json')).json();
const cards=await Promise.all(rutas.map(async r=>{
  try{const c=await (await fetch(`/${r}/resto.json`)).json(),R=c.resto,T=R.tema;
    return `<a class="pc" href="/${esc(r)}/" style="--bg:${esc(T.fondo)};--tx:${esc(T.texto)}"><div class="sw"><i style="background:${esc(T.cabecera)}"></i><i style="background:${esc(T.acento)}"></i></div><div class="in"><b>${esc(R.nombre)}</b><p>${esc(R.bajada)}</p><small>${esc(T.titulos)} + ${esc(T.cuerpo)} · ${c.secciones.length} secciones · ${c.marian.items.length} productos de Marian · /${esc(r)}/</small></div></a>`}
  catch(e){return `<p>No se pudo leer /${esc(r)}/</p>`}}));
document.getElementById('lista').innerHTML=cards.join('');
})();
