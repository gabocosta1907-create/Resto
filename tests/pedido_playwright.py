"""Pruebas del pedido de mesa (maqueta con almacenamiento local). Requiere servidor en :8767 sobre public/."""
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8767'
res=[]
def ok(n,c,d=''):
    res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,'' if c else d)
def nuevo(b):
    c=b.new_context(viewport={'width':390,'height':664},device_scale_factor=1,is_mobile=True,has_touch=True)
    c.route("**/fonts.*/**",lambda r:r.abort());c.route("**/images.unsplash.com/**",lambda r:r.abort());return c
def abrir(c,url):
    pg=c.new_page();pg.goto(BASE+url);pg.wait_for_selector('.hoja',state='attached');pg.wait_for_timeout(500);return pg
with sync_playwright() as p:
    b=p.chromium.launch()
    # sin mesa: solo carta
    c=nuevo(b);pg=abrir(c,'/centeno/?debug#/brunch')
    ok('P1 sin mesa identificada no hay botones de pedido',pg.evaluate("document.querySelectorAll('.add').length")==0 and pg.evaluate("!document.getElementById('pbar')"))
    c.close()
    for ver in ('/centeno/','/centeno-visual/'):
        c=nuevo(b);pg=abrir(c,ver+'?m=3&local&debug#/brunch')
        n=pg.evaluate("document.querySelectorAll('#h-brunch .add').length")
        ok(f'P2 {ver} hay botón + en los platos con precio',n>=4,n)
        xs=pg.evaluate("[...document.querySelectorAll('#h-brunch .it .p')].map(e=>Math.round(e.getBoundingClientRect().right))")
        ok(f'P2 {ver} precios alineados con el +',len(set(xs))==1,xs)
        pg.tap('#h-brunch .it:nth-of-type(2) .add');pg.tap('#h-brunch .it:nth-of-type(2) .add');pg.wait_for_timeout(200)
        r=pg.evaluate("(()=>{const b=document.getElementById('pbar'),i=document.querySelector('.indice').getBoundingClientRect(),r=b.getBoundingClientRect();return{vis:!b.hidden,txt:b.textContent,gap:Math.round(i.top-r.bottom),solap:false}})()")
        ok(f'P3 {ver} barra de pedido visible y sin tocar la barra de categorías',r['vis'] and r['gap']>=8,r)
        ok(f'P3b {ver} botón «Llamá a Lucía» visible con su leyenda completa',pg.evaluate("(()=>{const b=document.getElementById('bmozo');return !!b&&b.textContent.trim()==='Llamá a Lucía'&&b.getBoundingClientRect().width>100})()"))
        ok(f'P3b {ver} «Mi pedido» flota arriba, sobre el hero',pg.evaluate("(()=>{const b=document.getElementById('pbar').getBoundingClientRect(),h=document.querySelector('.cab').getBoundingClientRect();return b.top>=h.bottom&&b.top<h.bottom+30})()"))
        ok(f'P3b {ver} hay estrella de Google Maps',pg.evaluate("!!document.getElementById('bres')"))
        pg.tap('#h-brunch .it:nth-of-type(2) .menos');pg.wait_for_timeout(150)
        ok(f'P3c {ver} el − baja de 2 a 1 y desaparece al llegar a 0',pg.evaluate("document.getElementById('pbar').textContent.startsWith('1')&&!document.querySelector('#h-brunch .it:nth-of-type(2) .menos').hidden"))
        pg.tap('#h-brunch .it:nth-of-type(2) .menos');pg.wait_for_timeout(150)
        ok(f'P3c {ver} en 0 el − se oculta y la barra se va',pg.evaluate("document.querySelector('#h-brunch .it:nth-of-type(2) .menos').hidden&&document.getElementById('pbar').hidden"))
        pg.tap('#h-brunch .it:nth-of-type(2) .add');pg.tap('#h-brunch .it:nth-of-type(2) .add');pg.wait_for_timeout(150)
        ok(f'P3 {ver} la barra muestra cantidad y total',r['txt'].startswith('2') and '$' in r['txt'],r['txt'])
        # ficha
        pg.evaluate("location.hash='#/brunch/french-toast-de-banana'");pg.wait_for_timeout(500)
        has=pg.evaluate("!!document.querySelector('.capa .addf')")
        if has:
            pg.tap('.capa .addf');pg.wait_for_timeout(150)
            ok(f'P4 {ver} agregar desde la ficha',pg.evaluate("document.querySelector('.capa .addf-t').textContent").startswith('Agregar otro (3'))
        else: ok(f'P4 {ver} la ficha de ese plato tiene botón de agregar',False)
        pg.evaluate("history.back()");pg.wait_for_timeout(300)
        # vinos con variantes
        pg.evaluate("location.hash='#/vinos'");pg.wait_for_timeout(700)
        v=pg.evaluate("document.querySelectorAll('#h-vinos .vr li .add').length")
        pg.tap('#h-vinos .vr li:nth-child(2) .add >> nth=0');pg.wait_for_timeout(150)
        st=pg.evaluate("JSON.parse(localStorage.getItem('gratto:centeno:mesa:3')).lineas.map(l=>l.nombre)")
        ok(f'P5 {ver} cada variante (copa/botella) se agrega por separado',v>=6 and any('Botella' in x for x in st),(v,st))
        c.close()
    # concurrencia: dos celulares (pestañas) en la misma mesa
    c=nuevo(b);A=abrir(c,'/centeno/?m=3&local&debug#/brunch');B=abrir(c,'/centeno-visual/?m=3&local&debug#/brunch')
    A.tap('#h-brunch .it:nth-of-type(2) .add');B.wait_for_timeout(300)
    ok('P6 lo que agrega un celular aparece en el otro (y entre versiones)',B.evaluate("!document.getElementById('pbar').hidden && document.getElementById('pbar').textContent.startsWith('1')"))
    B.tap('#pbar');B.wait_for_timeout(300);A.tap('#h-brunch .it:nth-of-type(3) .add');B.wait_for_timeout(300)
    ok('P6 si otro celular cambia el pedido mientras se revisa, se avisa y se pide revisar',B.evaluate("!!document.querySelector('.ped .aviso') && document.querySelector('[data-enviar]').textContent=='Ya lo revisé'"))
    B.tap('[data-enviar]');B.wait_for_timeout(150)
    ok('P6 tras revisar, el botón vuelve a "Enviar pedido"',B.evaluate("document.querySelector('[data-enviar]').textContent=='Enviar pedido'"))
    # el otro celular abre el panel con el mismo carro y ambos envían "a la vez": gana el primero
    A.tap('#pbar');A.wait_for_timeout(200)
    vA=A.evaluate("window.__ped.store.estado().version")
    B.tap('[data-enviar]');A.wait_for_timeout(400)
    ok('P7 el panel del otro celular se actualiza solo: ya no ofrece enviar',A.evaluate("!document.querySelector('[data-enviar]') && !!document.querySelector('.ped .ronda')"))
    r=A.evaluate("window.__ped.store.enviarRonda(%d)"%vA)
    ok('P7 un envío desactualizado o repetido se rechaza (el primero gana)',r['ok']==False and r['motivo'] in ('vacio','carro_cambio'),r)
    n=A.evaluate("JSON.parse(localStorage.getItem('gratto:centeno:mesa:3')).rondas.length")
    ok('P7 doble envío simultáneo: se crea una sola ronda y el carro queda vacío',n==1 and A.evaluate("JSON.parse(localStorage.getItem('gratto:centeno:mesa:3')).lineas.length")==0,n)
    c2=A.evaluate("(()=>{const s=window.__ped.store;s.agregar({plato:'x',nombre:'X',precio:100},1);const v=s.estado().version;s.agregar({plato:'y',nombre:'Y',precio:100},1);const r=s.enviarRonda(v);s.vaciar();return r})()")
    ok('P7 si el carro cambió después de revisarlo, el envío se rechaza',c2['ok']==False and c2['motivo']=='carro_cambio',c2)
    # cancelación: distinto si ya empezó
    A.tap('[data-cx]');A.wait_for_timeout(100)
    t1=A.evaluate("document.querySelector('.ped .cf p').textContent")
    A.tap('[data-cx-no]')
    A.evaluate("(()=>{const s=window.__ped.store,r=s.estado().rondas[0];s.demo(r.id,{estado:'en_preparacion'})})()");A.wait_for_timeout(200)
    A.tap('[data-cx]');t2=A.evaluate("document.querySelector('.ped .cf p').textContent")
    ok('P8 la cancelación avisa distinto si el pedido ya está en preparación',t1!=t2 and 'preparación' in t2 and 'preparación' not in t1,(t1,t2))
    A.tap('[data-cx-si]');A.wait_for_timeout(200)
    ok('P8 queda "Cancelación solicitada" y se avisa al mozo',A.evaluate("document.querySelector('.ped .ronda .re').textContent")=='Cancelación solicitada' and 'Avisamos' in A.evaluate("document.querySelector('.ped .av.cx').textContent"))
    c.close();b.close()
print(f"{sum(res)}/{len(res)} OK");raise SystemExit(0 if all(res) else 1)
