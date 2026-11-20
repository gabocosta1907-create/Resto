"""Pruebas del pedido con SERVIDOR (dos «celulares» = dos contextos de navegador distintos).
Requiere: servidor estático en :8767 sobre public/ y el Worker de Gratto local (lo levanta este script en :8788)."""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8767'; SRV='http://127.0.0.1:8788'; TOKEN='clave-de-prueba'
res=[]
def ok(n,c,d=''):
    res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,'' if c else d)
def nuevo(b):
    c=b.new_context(viewport={'width':390,'height':664},device_scale_factor=1,is_mobile=True,has_touch=True)
    c.route("**/fonts.*/**",lambda r:r.abort());c.route("**/images.unsplash.com/**",lambda r:r.abort());return c
def abrir(c,mesa,srv=SRV,ver='/centeno/'):
    pg=c.new_page();pg.goto(f'{BASE}{ver}?m={mesa}&srv={srv}&debug#/brunch');pg.wait_for_selector('.hoja',state='attached');pg.wait_for_timeout(900);return pg
def personal(mesa,op):
    r=urllib.request.Request(f'{SRV}/api/centeno/mesa/{mesa}/personal',data=json.dumps(op).encode(),headers={'content-type':'application/json','x-personal-token':TOKEN},method='POST')
    return json.load(urllib.request.urlopen(r))
def estado(mesa): return json.load(urllib.request.urlopen(f'{SRV}/api/centeno/mesa/{mesa}'))['estado']
def espera(pg,js,ms=4000):
    t=time.time()
    while time.time()-t<ms/1000:
        if pg.evaluate(js): return True
        pg.wait_for_timeout(100)
    return False

d=tempfile.mkdtemp()
w=subprocess.Popen(['npx','wrangler','dev','--port','8788','--persist-to',d,'--var',f'PERSONAL_TOKEN:{TOKEN}'],cwd='/home/claude/gratto/worker',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(SRV+'/health');break
        except Exception: time.sleep(0.5)
    M=str(20+int(time.time())%70)
    with sync_playwright() as p:
        b=p.chromium.launch()
        cA=nuevo(b);cB=nuevo(b)   # dos celulares: almacenamiento separado
        A=abrir(cA,M);B=abrir(cB,M)
        ok('S0 ambos celulares se conectan al servidor',A.evaluate("window.__ped.store.conectado()") and B.evaluate("window.__ped.store.conectado()"))
        sel='#h-brunch .it:nth-of-type(2) .add'
        A.tap(sel)
        ok('S1 lo que agrega un celular aparece en el otro',espera(B,f"document.querySelector('{sel} .bd')&&document.querySelector('{sel} .bd').textContent==='1'"))
        B.tap(sel)
        ok('S2 el mismo plato desde dos celulares se suma (2 en ambos)',espera(A,f"document.querySelector('{sel} .bd').textContent==='2'") and espera(B,f"document.querySelector('{sel} .bd').textContent==='2'"))
        # A revisa el pedido; B agrega otra cosa
        A.tap('#pbar');A.wait_for_timeout(300)
        B.tap(sel)
        ok('S3 A ve el aviso de que cambió el pedido y debe revisarlo',espera(A,"!!document.querySelector('.ped .aviso')") and 'revisé' in A.inner_text('.ped .env').lower())
        A.tap('.ped .env');A.wait_for_timeout(300)
        ok('S3 «Ya lo revisé» deja enviar',A.evaluate("!document.querySelector('.ped .aviso')") and 'enviar' in A.inner_text('.ped .env').lower())
        A.tap('.ped .env')
        ok('S4 se envía: una ronda en el servidor y en la pantalla de A',espera(A,"document.querySelectorAll('.ped .ronda').length===1") and len(estado(M)['rondas'])==1)
        ok('S4 el otro celular ve la misma ronda y el carro vacío',espera(B,"window.__ped.store.estado().rondas.length===1 && window.__ped.store.estado().lineas.length===0"))
        e=estado(M);rid=e['rondas'][0]['id']
        ok('S4 la comida del brunch fue a cocina',list(e['rondas'][0]['tramos'].keys())==['cocina'],e['rondas'][0]['tramos'])
        # cocina avanza: los celulares se enteran en vivo
        personal(M,{'op':'avanzar','rondaId':rid,'destino':'cocina'})
        ok('S5 cocina pasa a «en preparación» y el cliente lo ve en vivo',espera(A,"/En preparaci/.test(document.querySelector('.ped .ronda .re')?.textContent||'')"))
        # cancelación: ya empezó → aviso distinto
        A.tap('.ped [data-cx]');A.tap('.ped [data-cx-si]')
        ok('S6 cancelar un pedido en preparación: queda solicitada y avisa distinto',espera(A,"/en preparaci/i.test(document.querySelector('.ped .av.cx')?.textContent||'')") and estado(M)['rondas'][0]['estado']=='cancelacion_solicitada')
        cA.close();cB.close()
        # Sin conexión: se arma el carro, no dice «enviado», y al volver la conexión se suma a la mesa
        M2=str(int(M)%90+5)
        c=nuevo(b);P=abrir(c,M2,srv='http://127.0.0.1:8799')
        ok('S7 sin servidor la carta sigue andando (carro local)',not P.evaluate("window.__ped.store.conectado()"))
        P.tap('#h-brunch .it:nth-of-type(2) .add');P.wait_for_timeout(300);P.tap('#pbar');P.wait_for_timeout(300);P.tap('.ped .env');P.wait_for_timeout(600)
        ok('S7 «Enviar» sin conexión no confirma y el pedido queda guardado',len(estado(M2)['rondas'])==0 and P.evaluate("window.__ped.store.estado().lineas.length")==1 and P.evaluate("document.querySelectorAll('.ped .ronda').length")==0)
        P.goto(f'{BASE}/centeno/?m={M2}&srv={SRV}&debug#/brunch');P.wait_for_selector('.hoja',state='attached')
        ok('S8 al volver la conexión, lo armado se suma al carro de la mesa',espera(P,"window.__ped.store.conectado()") and espera(P,"window.__ped.store.estado().lineas.length===1") and len(estado(M2)['lineas'])==1)
        c.close();b.close()
finally:
    w.terminate()
print(f'\n{sum(res)}/{len(res)} OK')
