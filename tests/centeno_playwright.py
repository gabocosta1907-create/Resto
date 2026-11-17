import re, json, sys, time
from playwright.sync_api import sync_playwright
F='/tmp/gf/ofl/'
FILES={'Fraunces':F+'fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf','DM Sans':F+'dmsans/DMSans[opsz,wght].ttf','Bebas Neue':F+'bebasneue/BebasNeue-Regular.ttf','Work Sans':F+'worksans/WorkSans[wght].ttf','Instrumental Serif':F+'instrumentserif/InstrumentSerif-Regular.ttf','Nunito':F+'nunito/Nunito[wght].ttf','Nunito Sans':F+'nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf','Cormorant Garamond':F+'cormorantgaramond/CormorantGaramond[wght].ttf','Newsreader':'/tmp/nr/package/files/newsreader-latin-wght-normal.woff2'}
BASE='http://127.0.0.1:8767'
res=[]
def ok(name,cond,extra=''):
    res.append((bool(cond),name,extra)); print(('PASS ' if cond else 'FAIL ')+name+(' | '+str(extra) if (extra!='' and not cond) else ''))
def gf_css(route):
    css=''
    for f in re.findall(r'family=([^:&]+)',route.request.url):
        n=f.replace('+',' ');css+=f"@font-face{{font-family:'{n}';font-weight:100 900;src:url(https://fonts.gstatic.com/x/{n.replace(' ','_')}.ttf)}}"
    route.fulfill(status=200,content_type='text/css',body=css)
def gs_font(route):
    n=route.request.url.rsplit('/',1)[1][:-4].replace('_',' ');route.fulfill(status=200,content_type='font/ttf',path=FILES[n])
def mk(p,**kw):
    ctx=p.chromium.launch().new_context(**p.devices['iPhone 13'],**kw)
    pg=ctx.new_page();errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.route('https://fonts.googleapis.com/**',gf_css);pg.route('https://fonts.gstatic.com/**',gs_font);pg.route('https://marian.marianacaci.com/**',lambda r:r.abort())
    for h in ('images.unsplash.com','plus.unsplash.com','static.wixstatic.com','api.photon.aremedia.net.au'): pg.route(f'https://{h}/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',path='/tmp/ph.jpg'))
    return ctx,pg,errs
def load(pg,path):
    pg.goto('about:blank');pg.goto(BASE+path,wait_until='networkidle');pg.wait_for_timeout(350)
class Touch:
    def __init__(s,ctx,pg): s.c=ctx.new_cdp_session(pg);s.pg=pg
    def ev(s,t,x=0,y=0): s.c.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y}] if t!='touchEnd' else []})
    def swipe(s,x0,y0,x1,y1,steps=10,dt=16,end=True):
        s.ev('touchStart',x0,y0)
        for k in range(1,steps+1):
            s.ev('touchMove',x0+(x1-x0)*k/steps,y0+(y1-y0)*k/steps);s.pg.wait_for_timeout(dt)
        if end: s.ev('touchEnd',x1,y1)
    def end(s): s.ev('touchEnd')
st=lambda pg:pg.evaluate("({h:location.hash,i:[...document.querySelectorAll('.tira a')].findIndex(a=>a.hasAttribute('aria-current')),n:history.length,t:document.title})")
sc=lambda pg:pg.evaluate("(()=>{const h=[...document.querySelectorAll('.hoja')].find(x=>!x.inert);return h?h.scrollTop:-1})()")
evs=lambda pg:pg.evaluate("window.__eventos.map(e=>e.ev)")
with sync_playwright() as p:
    ctx,pg,errs=mk(p);t=Touch(ctx,pg)
    # T1 carga
    load(pg,'/centeno/')
    d=pg.evaluate("({sheets:document.querySelectorAll('.hoja').length,tabs:document.querySelectorAll('.tira a').length,sw:document.documentElement.scrollWidth,iw:innerWidth,stageBottom:document.querySelector('.stage').getBoundingClientRect().bottom,navTop:document.querySelector('.indice').getBoundingClientRect().top,h1:getComputedStyle(document.querySelector('.tit')).fontFamily,inert:[...document.querySelectorAll('.hoja')].filter(h=>h.inert).length,sheet0:document.querySelector('.hoja:not([inert])').id})")
    s0=st(pg)
    ok('T1 12 hojas y 12 pestañas (11 categorías + Marian)',d['sheets']==12 and d['tabs']==12,d)
    ok('T1 ruta canónica #/cafeteria y activa la 1ª',s0['h']=='#/cafeteria' and s0['i']==0,s0)
    ok('T1 sin scroll horizontal',d['sw']==d['iw'],d)
    ok('T1 el índice inferior no tapa la hoja',abs(d['stageBottom']-d['navTop'])<1.5,d)
    ok('T1 11 hojas inertes (solo la activa es accesible)',d['inert']==11,d)
    ok('T1 tipografía Newsreader',"Newsreader" in d['h1'],d['h1'])
    pg.screenshot(path='/tmp/shots/c-01.png')
    # T2 swipe largo avanza
    n0=s0['n'];t.swipe(340,420,80,420,10,18);pg.wait_for_timeout(450);s=st(pg)
    ok('T2 swipe largo avanza y empuja historial',s['h']=='#/desayunos' and s['i']==1 and s['n']==n0+1,s)
    # T3 swipe corto y lento vuelve
    t.swipe(300,420,245,420,8,40);pg.wait_for_timeout(450);s=st(pg)
    ok('T3 gesto incompleto devuelve la hoja',s['h']=='#/desayunos',s)
    tr=pg.evaluate("[...document.querySelectorAll('.hoja')].map(h=>h.style.transform)")
    ok('T3 sin transformaciones residuales',tr[1]=='none',tr)
    # T4 flick rápido corto avanza
    t.swipe(300,420,255,420,3,10);pg.wait_for_timeout(450);s=st(pg)
    ok('T4 flick rápido avanza',s['h']=='#/brunch',s)
    # T5 swipe vertical hace scroll y no cambia de hoja
    t.swipe(200,520,206,160,10,16);pg.wait_for_timeout(500);s=st(pg);y=sc(pg)
    ok('T5 gesto vertical solo scrollea',s['h']=='#/brunch' and y>0,(s,y))
    # T6 captura a mitad de recorrido (hoja siguiente descubierta)
    t.swipe(330,420,170,420,8,25,end=False);pg.wait_for_timeout(80);pg.screenshot(path='/tmp/shots/c-02-mid.png')
    mid=pg.evaluate("[...document.querySelectorAll('.hoja')].filter(h=>h.style.visibility=='visible').map(h=>h.id+':'+h.style.transform)")
    t.end();pg.wait_for_timeout(450);s=st(pg)
    ok('T6 durante el arrastre están visibles la actual (desplazada) y la siguiente (debajo)',len(mid)==2 and 'translateX' in mid[0]+mid[1],mid)
    ok('T6 al soltar a mitad cancela (menos del umbral) o completa coherentemente',s['h'] in ('#/brunch','#/entradas'),s)
    # T7 atrás / adelante
    pg.go_back();pg.wait_for_timeout(450);a=st(pg);pg.go_forward();pg.wait_for_timeout(450);b=st(pg)
    ok('T7 Atrás deshace el último cambio de categoría y Adelante lo rehace',a['i']==b['i']-1 and a['h']!=b['h'],(a,b))
    # T8 restauración de scroll
    load(pg,'/centeno/#/cafeteria');pg.evaluate("document.querySelector('.hoja:not([inert])').scrollTop=240");y0=sc(pg)
    pg.click('.tira a:nth-child(11)');pg.wait_for_timeout(500);s=st(pg)
    ok('T8 salto por el índice a Bebidas sin pasar por las intermedias',s['h']=='#/bebidas' and s['i']==10,s)
    top=sc(pg)
    pg.click('.tira a:nth-child(1)');pg.wait_for_timeout(500);y1=sc(pg)
    ok('T8 al volver a una hoja visitada se restaura el scroll',abs(y1-y0)<2 and y0>100,(y0,y1))
    ok('T8 hoja nueva (Bebidas) empezó arriba',top==0,top)
    ok('T8 foco pasa a la hoja al usar el índice',pg.evaluate("document.activeElement.classList.contains('hoja')"))
    # T9 deep link a plato
    load(pg,'/centeno/?o=ig#/brunch/rosti-de-papa-y-huevo')
    o=pg.evaluate("({on:document.querySelector('.capa').classList.contains('on'),t:document.querySelector('#capa-t')?.textContent,det:!!document.querySelector('details.vino'),pilaInert:document.querySelector('.pila').inert,origen:window.__eventos[0].origen})")
    ok('T9 deep link abre el plato con historia y vino sugerido',o['on'] and o['t']=='Rosti de papa y huevo' and o['det'],o)
    ok('T9 la hoja de fondo queda inerte y el origen (ig) se registra',o['pilaInert'] and o['origen']=='ig',o)
    pg.screenshot(path='/tmp/shots/c-03-capa.png')
    pg.click('.capa .btn-v');pg.wait_for_timeout(450);s=st(pg)
    vis=pg.evaluate("(()=>{const it=document.querySelector('#it-rosti-de-papa-y-huevo').getBoundingClientRect(),sg=document.querySelector('.stage').getBoundingClientRect();return it.top>=sg.top&&it.bottom<=sg.bottom})()")
    ok('T9 Volver a la carta (entrada directa) deja la categoría con el plato a la vista',s['h']=='#/brunch' and vis and not pg.evaluate("document.querySelector('.capa').classList.contains('on')"),(s,vis))
    # T10 flujo: plato -> vino -> carta de vinos -> Atrás -> plato -> volver
    load(pg,'/centeno/#/brunch');pg.evaluate("document.querySelector('#it-rosti-de-papa-y-huevo').scrollIntoView({block:'center'})");pg.wait_for_timeout(200);y0=sc(pg)
    pg.click('#it-rosti-de-papa-y-huevo .pl');pg.wait_for_timeout(450)
    ok('T10 tocar el plato abre la capa y empuja una ruta #/brunch/plato',st(pg)['h']=='#/brunch/rosti-de-papa-y-huevo' and pg.evaluate("document.querySelector('.capa').classList.contains('on')"))
    pg.click('details.vino summary');pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/shots/c-04-vino.png')
    pg.click('.capa .ver');pg.wait_for_timeout(600);s=st(pg)
    hl=pg.evaluate("!!document.querySelector('#it-espumante-extra-brut.hl')||document.querySelector('.hoja:not([inert])').id")
    ok('T10 "Ver en la carta de vinos" lleva a Vinos con el vino resaltado',s['h']=='#/vinos/espumante-extra-brut' and hl is True,(s,hl))
    pg.go_back();pg.wait_for_timeout(600);s=st(pg)
    ok('T10 Atrás vuelve al plato (misma categoría, capa abierta)',s['h']=='#/brunch/rosti-de-papa-y-huevo' and pg.evaluate("document.querySelector('.capa').classList.contains('on')"),s)
    pg.click('.capa .back');pg.wait_for_timeout(450);s=st(pg);y1=sc(pg)
    ok('T10 Volver a la carta regresa a la misma categoría y posición de lectura',s['h']=='#/brunch' and abs(y1-y0)<2,(s,y0,y1))
    e=evs(pg)
    ok('T10 analítica: plato_abierto, vino_consultado, volver_a_carta',all(k in e for k in ('plato_abierto','vino_consultado','volver_a_carta')),e)
    # T11 teclado
    load(pg,'/centeno/#/pastas');pg.keyboard.press('ArrowRight');pg.wait_for_timeout(450);a=st(pg)['h'];pg.keyboard.press('ArrowLeft');pg.wait_for_timeout(450);b=st(pg)['h']
    ok('T11 flechas ←/→ cambian de categoría',a=='#/postres' and b=='#/pastas',(a,b))
    load(pg,'/centeno/#/entradas/burrata-remolachas-y-naranja');pg.keyboard.press('Escape');pg.wait_for_timeout(450)
    ok('T11 Esc cierra la capa',not pg.evaluate("document.querySelector('.capa').classList.contains('on')"),st(pg))
    # T12 índice completo
    load(pg,'/centeno/');pg.click('#bmenu');pg.wait_for_timeout(400)
    ok('T12 el acceso de tres líneas abre el índice completo',pg.evaluate("document.querySelector('.full').classList.contains('on')"))
    pg.screenshot(path='/tmp/shots/c-05-full.png')
    pg.click('.full a:has-text("Postres")');pg.wait_for_timeout(500);s=st(pg)
    ok('T12 elegir una categoría cierra el índice y salta',s['h']=='#/postres' and not pg.evaluate("document.querySelector('.full').classList.contains('on')"),s)
    # T13 hoja de Marian
    pg.click('.tira a:nth-child(12)');pg.wait_for_timeout(500)
    m=pg.evaluate("({cards:document.querySelectorAll('.marian .card').length,bg:getComputedStyle(document.querySelector('.marian-h')).backgroundColor,broken:[...document.querySelectorAll('.marian img')].filter(i=>!i.naturalWidth).length,h2:getComputedStyle(document.querySelector('.marian h2')).fontFamily,sw:document.documentElement.scrollWidth})")
    ok('T13 hoja de Marian: 7 productos, fondo rosa, tipografía de Marian, sin imágenes rotas',m['cards']==7 and m['bg']=='rgb(243, 201, 196)' and m['broken']==0 and 'Instrumental' in m['h2'],m)
    pg.screenshot(path='/tmp/shots/c-06-marian.png')
    pg.evaluate("(()=>{const b=document.querySelector('.marian .btn');b.addEventListener('click',e=>e.preventDefault(),{once:true});b.click()})()")
    ok('T13 analítica marian_click',('marian_click' in evs(pg)),evs(pg))
    ok('T13 sin errores de consola en toda la corrida',not errs,errs)
    # T20 contenido v1.6: producto nuevo, textos, fotos
    load(pg,'/centeno-visual/#/brunch')
    q=pg.evaluate("({names:[...document.querySelectorAll('.hoja:not([inert]) .it h3')].map(h=>h.textContent),thumbs:document.querySelectorAll('.hoja:not([inert]) .it .th').length,hero:!!document.querySelector('#h-brunch .foto img'),cap:document.querySelector('#h-brunch .foto figcaption')?.textContent,descs:[...document.querySelectorAll('.hoja:not([inert]) .it')].filter(i=>!i.querySelector('.d')).length})")
    ok('T20 (visual) Brunch: Bagel nuevo, hero, 4 miniaturas y todos con texto',('Bagel de pollo y palta' in q['names']) and q['hero'] and q['thumbs']==4 and q['descs']==0 and q['cap']=='Foto de referencia',q)
    pg.screenshot(path='/tmp/shots/c-07-brunch.png')
    pg.click('#it-huevos-benedictinos .pl');pg.wait_for_timeout(450)
    o=pg.evaluate("({on:document.querySelector('.capa').classList.contains('on'),img:!!document.querySelector('.capa .foto img'),hist:!!document.querySelector('.capa .hist'),h:location.hash,w:document.querySelector('.capa .foto').getBoundingClientRect().width,hh:document.querySelector('.capa .foto').getBoundingClientRect().height})")
    ok('T20 (visual) plato con foto (sin historia) abre ficha con foto 3:4 y sin bloque de historia',o['on'] and o['img'] and not o['hist'] and abs(o['hh']/o['w']-4/3)<.02,o)
    pg.screenshot(path='/tmp/shots/c-08-ficha.png')
    pg.go_back();pg.wait_for_timeout(450)
    ok('T20 Atrás cierra la ficha',not pg.evaluate("document.querySelector('.capa').classList.contains('on')") and st(pg)['h']=='#/brunch',st(pg))
    load(pg,'/centeno-visual/#/ensaladas');ok('T20 hero de Ensaladas',pg.evaluate("!!document.querySelector('#h-ensaladas .foto img')"))
    load(pg,'/centeno-visual/#/desayunos/tostadas-de-campo');ok('T20 deep link a plato con foto abre la ficha',pg.evaluate("document.querySelector('.capa').classList.contains('on')&&document.querySelector('#capa-t').textContent=='Tostadas de campo'"))
    # T21 modelo conciso (/centeno/): lista sin fotos ni descripción, ficha con foto y texto
    load(pg,'/centeno/#/desayunos')
    c=pg.evaluate("({th:document.querySelectorAll('.hoja .it .th').length,d:document.querySelectorAll('#h-desayunos .it .d').length,mas:document.querySelectorAll('#h-desayunos .it .go svg').length,hero:!!document.querySelector('#h-desayunos .foto img')})")
    ok('T21 (conciso) lista sin miniaturas ni descripciones; los 4 desayunos con ícono; hero conservado',c['th']==0 and c['d']==0 and c['mas']==4 and c['hero'],c)
    pg.click('#it-huevos-cremosos .pl' if pg.evaluate("!!document.querySelector('#it-huevos-cremosos .pl')") else '#it-huevos-cremosos .pl');pg.wait_for_timeout(450)
    f=pg.evaluate("({on:document.querySelector('.capa').classList.contains('on'),img:!!document.querySelector('.capa .foto img'),d:document.querySelector('.capa .exp')?.textContent.length})")
    ok('T21 (conciso) la ficha trae foto y texto completo',f['on'] and f['img'] and f['d']>60,f)
    pg.screenshot(path='/tmp/shots/c-09-conciso-ficha.png')
    pg.click('.capa .btn-v');pg.wait_for_timeout(450)
    load(pg,'/centeno/#/cafeteria');ok('T21 (conciso) café y bebidas sin texto: no son tocables',pg.evaluate("document.querySelectorAll('#h-cafeteria .it .mas, #h-cafeteria .it .go svg').length==0"))
    load(pg,'/centeno-visual/');ok('T21 índice: /centeno-visual/ extiende el contenido (12 hojas)',pg.evaluate("document.querySelectorAll('.hoja').length==12"))
    load(pg,'/');ok('T21 el índice de prototipos lista las 4 cartas',pg.evaluate("document.querySelectorAll('.pc').length==4"))
    # T22 heros iguales, ficha 4:3 en conciso, textos, íconos
    for ver in ('/centeno/','/centeno-visual/'):
        load(pg,ver+'#/cafeteria')
        hs=pg.evaluate("['cafeteria','desayunos','brunch','entradas','ensaladas'].map(id=>Math.round(document.querySelector('#h-'+id+' .foto.hero').getBoundingClientRect().height))")
        ok(f'T22 {ver} los 5 heros tienen la misma altura',len(set(hs))==1,hs)
    load(pg,'/centeno/#/desayunos/huevos-cremosos')
    r=pg.evaluate("(()=>{const f=document.querySelector('.capa .foto').getBoundingClientRect();return{r:f.width/f.height,w:f.width,iw:innerWidth,exp:document.querySelectorAll('.capa .exp p').length}})()")
    ok('T22 (conciso) la foto de la ficha es 4:3 a todo el ancho y hay elaboración + presentación',abs(r['r']-4/3)<.03 and r['w']>=r['iw']-1 and r['exp']==2,r)
    load(pg,'/centeno-visual/#/desayunos/huevos-cremosos')
    r=pg.evaluate("(()=>{const f=document.querySelector('.capa .foto').getBoundingClientRect();return f.height/f.width})()")
    ok('T22 (visual) la ficha mantiene la foto 3:4',abs(r-4/3)<.03,r)
    load(pg,'/centeno/#/brunch')
    ok('T22 (conciso) ya no hay textos "Ver el plato"',pg.evaluate("![...document.querySelectorAll('.it')].some(i=>/Ver el plato/.test(i.textContent))"))
    load(pg,'/centeno-visual/#/brunch')
    L=pg.evaluate("[...document.querySelectorAll('#h-brunch .it .d')].map(x=>x.textContent)")
    ok('T22 (visual) los textos de la lista son cortos y el Rosti es el del ejemplo',all(len(x)<75 for x in L) and 'Papa rallada, huevo, ricota cremosa y verdeo.' in L,L)
    # pellizco real (CDP): sí en texto e imágenes, no en cabecera ni heros
    load(pg,'/centeno/#/brunch')
    cd=ctx.new_cdp_session(pg)
    def pinch(x,y):
        def tp(pts):return [{'x':px,'y':py,'id':i} for i,(px,py) in enumerate(pts)]
        cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':tp([(x-12,y),(x+12,y)])})
        for k in range(1,11):
            d=12+k*8
            cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':tp([(x-d,y),(x+d,y)])});pg.wait_for_timeout(30)
        cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});pg.wait_for_timeout(500)
        sc_=pg.evaluate("visualViewport.scale")
        pg.reload();pg.wait_for_timeout(600);return sc_
    pos=pg.evaluate("(()=>{const q=s=>{const r=document.querySelector(s).getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2]};return{cab:q('.cab'),hero:q('#h-brunch .foto.hero'),txt:q('#h-brunch .it:nth-child(1) h3')}})()")
    zt=pinch(*pos['txt']);zh=pinch(*pos['hero']);zc=pinch(*pos['cab'])
    ok('T22 pellizco: hace zoom sobre el texto',zt>1.3,zt)
    ta=pg.evaluate("['.cab','.indice'].map(s=>getComputedStyle(document.querySelector(s)).touchAction)");hta=pg.evaluate("getComputedStyle(document.querySelector('.foto.hero')).touchAction")
    ok('T22 touch-action: cabecera, índice y heros sin pinch-zoom (el emulador no lo aplica a toques sintéticos; zoom hero/cab='+str((round(zh,2),round(zc,2)))+')',ta==['pan-x pan-y','pan-x pan-y'] and 'pinch' not in hta,(ta,hta))
    for ver in ('/centeno/','/centeno-visual/'):
        load(pg,ver+'#/brunch')
        xs=pg.evaluate("[...document.querySelectorAll('#h-brunch .it .p')].map(e=>Math.round(e.getBoundingClientRect().right))")
        ok(f'T23 {ver} precios alineados',len(set(xs))==1 and len(xs)>2,xs)
        ok(f'T23 {ver} sin "Ver el plato"',pg.evaluate("![...document.querySelectorAll('.it')].some(i=>/Ver el plato/.test(i.textContent))"))
    # T24 llamar al mozo (maqueta): lista larga, botón sobre la barra, fin de lista libre
    load(pg,'/centeno/#/brunch')
    pg.evaluate("(()=>{const l=document.querySelector('#h-brunch .its');const it=l.children[1];for(let i=0;i<14;i++)l.appendChild(it.cloneNode(true));document.querySelector('#h-brunch').scrollTop=99999})()")
    r=pg.evaluate("(()=>{const b=document.getElementById('bmozo').getBoundingClientRect(),bar=document.querySelector('.indice').getBoundingClientRect(),sig=document.querySelector('#h-brunch .sig').getBoundingClientRect();return{gap:bar.top-b.bottom,libre:sig.bottom<=b.top}})()")
    ok('T24 botón apoyado sobre la barra (sin tocarla) y el final de la lista queda libre',r['gap']>=8 and r['libre'],r)
    pg.tap('#bmozo');pg.tap('#mozoc')
    ok('T24 llamar → "Mozo avisado" y cancelar vuelve al estado inicial',pg.evaluate("document.getElementById('mozot').textContent")=='Mozo avisado')
    pg.tap('#bmozo');pg.tap('#bmozo');pg.tap('#mozoc')
    ok('T24 cancelar',pg.evaluate("document.getElementById('mozot').textContent")=='Llamar al mozo')
    # T17 rutas inválidas
    load(pg,'/centeno/#/xyz');a=st(pg)['h'];load(pg,'/centeno/#/vinos/nada');b=st(pg)['h']
    ok('T17 rutas inválidas se normalizan',a=='#/cafeteria' and b=='#/vinos',(a,b))
    # T15 datos: agotado, oculta, precio texto, orden del bloque Marian
    cfg=json.load(open('/home/claude/resto/public/centeno/resto.json'))
    cfg['secciones'][0]['items'][0]['agotado']=True
    cfg['secciones'][1]['oculta']=True
    cfg['marian']['despuesDe']='postres'
    cfg['editorial'][0]['video']={'src':'v.mp4'}
    pg.route('**/centeno/resto.json',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(cfg)))
    load(pg,'/centeno/')
    d=pg.evaluate("({ag:document.querySelectorAll('.ag').length,tabs:[...document.querySelectorAll('.tira a')].map(a=>a.textContent)})")
    ok('T15 agotado, categoría oculta y ubicación del bloque de Marian salen de los datos',d['ag']==1 and len(d['tabs'])==11 and d['tabs'].index('Marian')==8 and 'Desayunos' not in d['tabs'],d)
    load(pg,'/centeno/#/entradas/burrata-remolachas-y-naranja')
    vid=pg.evaluate("(()=>{const v=document.querySelector('.capa video');return v?{auto:v.autoplay,controls:v.controls,preload:v.preload}:null})()")
    ok('T15 video sin autoplay, con controles',vid and not vid['auto'] and vid['controls'],vid)
    pg.unroute('**/centeno/resto.json')
    # T16 error de carga
    pg.route('**/centeno/resto.json',lambda r:r.abort())
    load(pg,'/centeno/');ok('T16 estado de error con reintento',pg.evaluate("document.querySelector('.carga')?.textContent.includes('No pudimos')&&!!document.querySelector('#reintentar')"))
    pg.unroute('**/centeno/resto.json')
    # T19 regresión de las otras rutas
    for path,exp in [('/',None),('/cafe-tilo/','Café Tilo'),('/zorzal/','Vermutería Zorzal')]:
        e2=[];pg.on('console',lambda m,e2=e2: e2.append(m.text) if m.type=='error' else None)
        load(pg,path);q=pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,title:document.title,cards:document.querySelectorAll('.marian .card').length,bg:document.querySelector('.marian')?getComputedStyle(document.querySelector('.marian')).backgroundColor:null,mar:document.querySelector('.marian')?getComputedStyle(document.querySelector('.marian')).marginLeft:null,links:document.querySelectorAll('.pc').length})")
        good=q['sw']==q['iw'] and not e2 and ((path=='/' and q['links']==4) or (path!='/' and q['cards']>0 and q['bg']=='rgb(243, 201, 196)' and q['mar']=='-20px'))
        ok(f'T19 regresión {path}',good,(q,e2))
        pg.screenshot(path='/tmp/shots/r-'+(path.strip('/').replace('/','_') or 'index')+'.png')
    ctx.browser.close()
    # T14 movimiento reducido
    ctx,pg,errs=mk(p,reduced_motion='reduce');t=Touch(ctx,pg)
    load(pg,'/centeno/');t.swipe(340,420,80,420,10,16);pg.wait_for_timeout(120);s=st(pg)
    td=pg.evaluate("getComputedStyle(document.querySelector('.capa')).transitionDuration")
    ok('T14 con movimiento reducido el cambio es inmediato y sin transiciones',s['h']=='#/desayunos' and td=='0s',(s,td))
    ok('T14 sin errores',not errs,errs)
    ctx.browser.close()
bad=[r for r in res if not r[0]]
print(f'\n{len(res)-len(bad)}/{len(res)} OK');sys.exit(1 if bad else 0)
