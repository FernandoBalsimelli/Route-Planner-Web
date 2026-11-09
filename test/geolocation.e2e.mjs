import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.RP_BASE_URL || 'http://127.0.0.1:4455';
let server, browser;
before(async () => {
  if (!process.env.RP_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '4455', '-H', '127.0.0.1'], { stdio: 'ignore' });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'production server must start');
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill('SIGTERM'); });

async function setup(mockPosition, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 768, hasTouch: viewport.width < 768 });
  // Third-party tiles/fonts are verified in production separately. Mobile
  // interaction tests must not depend on those services or consume their quota.
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64') }));
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.addInitScript(mockPosition);
  const page = await context.newPage();
  return { context, page };
}
const success = () => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
  getCurrentPosition(ok) { ok({ coords: { latitude: 28.662926123, longitude: -106.099908456, accuracy: 16.4 } }); },
} });

test('mobile GPS button resolves an address, retains coordinates and shows accuracy', async () => {
  const { context, page } = await setup(success);
  try {
    let reverseCalls = 0;
    await page.route('**/api/route-planner/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/reverse')) {
        reverseCalls++;
        assert.equal(Number(url.searchParams.get('lat')), 28.662926123);
        assert.equal(Number(url.searchParams.get('lng')), -106.099908456);
        await route.fulfill({ json: { ok: true, location: { label: 'Dirección de prueba en Chihuahua', plusCode: '75WMMW72+52' } } });
      } else await route.fulfill({ json: { ok: true, suggestions: [] } });
    });
    await page.goto(base);
    assert.equal(reverseCalls, 0, 'does not ask for location on page load');
    const button = page.getByRole('button', { name: 'Usar mi ubicación actual' });
    assert.equal(await button.count(), 1);
    await button.click();
    await page.getByText('Ubicación actual establecida como origen.').waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Dirección de prueba en Chihuahua');
    assert.match(await page.locator('.location-accuracy').innerText(), /±17 m/);
    assert.equal(await page.locator('.location-confirmed').count(), 1);
    assert.equal(reverseCalls, 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow');
  } finally { await context.close(); }
});

test('mobile map confirms the chosen nearby branch into the correct field', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => {
      const query = new URL(route.request().url()).searchParams.get('q');
      return route.fulfill({ json: { ok: true, suggestions: query === 'Monterrey'
        ? [{ label: 'Monterrey, México', lat: 25.685163, lng: -100.315238 }]
        : [{ label: 'Sucursal Express uno', lat: 25.721274, lng: -100.325989 }, { label: 'Sucursal Express dos', lat: 25.703465, lng: -100.253977, plusCode: '75QXPP3W+9C' }] } });
    });
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Monterrey');
    await page.getByRole('button', { name: 'S1', exact: true }).click();
    await page.getByRole('button', { name: 'Usar como Origen', exact: true }).click();
    await page.getByRole('combobox', { name: 'Destino', exact: true }).fill('Bodega Aurrera Express');
    await page.getByRole('button', { name: 'S2', exact: true }).click();
    await page.getByRole('button', { name: 'Usar como Destino', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Destino', exact: true }).inputValue(), 'Sucursal Express dos');
    const link = new URL(await page.getByRole('link', { name: /Abrir puntos en Google Maps/ }).getAttribute('href'));
    assert.equal(link.searchParams.get('destination'), '25.703465, -100.253977');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

test('permission denial keeps the typed origin and allows a retry', async () => {
  const { context, page } = await setup(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(ok, fail) { fail({ code: 1 }); } } }));
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Mi origen escrito');
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByText(/No se permitió el acceso/).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Mi origen escrito');
    assert.ok(await page.getByRole('button', { name: 'Usar mi ubicación actual' }).isEnabled());
  } finally { await context.close(); }
});

test('address service failure still confirms the device coordinates', async () => {
  const { context, page } = await setup(success);
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ status: 503, json: { ok: false } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByText(/Origen establecido con coordenadas/).waitFor();
    assert.match(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), /Mi ubicación/);
    assert.equal(await page.locator('.location-confirmed').count(), 1);
  } finally { await context.close(); }
});

test('typing after a GPS request cancels its late result', async () => {
  const { context, page } = await setup(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(ok) { setTimeout(() => ok({ coords: { latitude: 28.66, longitude: -106.09, accuracy: 10 } }), 700); } } }));
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Conservar este origen');
    await page.waitForTimeout(900);
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Conservar este origen');
    assert.equal(await page.locator('.location-confirmed').count(), 0);
  } finally { await context.close(); }
});

test('mobile workspaces retain the draft, explain truck coverage, and remember the theme', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Origen que quiero conservar');
    const nav = page.getByRole('navigation', { name: 'Secciones de Route Planner' });
    await nav.getByRole('button', { name: 'Vehículos', exact: true }).click();
    await page.getByRole('heading', { name: 'Mi perfil y vehículos' }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).count(), 0, 'planner is hidden from accessibility tree');
    await nav.getByRole('button', { name: 'Mis rutas', exact: true }).click();
    await page.getByRole('heading', { name: 'Mis rutas guardadas' }).waitFor();
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Origen que quiero conservar');
    await page.getByRole('button', { name: 'Camión', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Altura (m)', exact: true }).fill('4.1');
    await page.getByRole('button', { name: 'Qué restricciones considera esta ruta' }).click();
    await page.getByRole('heading', { name: 'Cómo planeamos para tu camión' }).waitFor();
    await page.getByText('NOM-012-SCT-2-2017', { exact: true }).waitFor();
    assert.ok(await page.getByRole('link', { name: /DOF: texto y tablas/ }).getAttribute('href'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

test('desktop gives the map the main area and preserves its size after changing sections', async () => {
  const { context, page } = await setup(() => {}, { width: 1440, height: 1000 });
  try {
    await page.goto(base);
    await page.locator('.leaflet-container').waitFor();
    const form = await page.locator('.route-form').boundingBox();
    const map = await page.locator('.route-map').boundingBox();
    assert.ok(map.width > form.width && map.x > form.x, 'desktop map is larger than the planning panel');
    const nav = page.getByRole('navigation', { name: 'Secciones de Route Planner' });
    await nav.getByRole('button', { name: 'Vehículos', exact: true }).click();
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.ok((await page.locator('.route-map').boundingBox()).width > 600);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  } finally { await context.close(); }
});

test('mobile manifest reads a real multipage PDF locally and keeps geographic confirmation mandatory', async () => {
  const { context, page } = await setup(() => {});
  try {
    const { manifestPdf } = await import('./fixtures/manifest-pdf.mjs');
    const documentBytes = manifestPdf();
    const unexpectedUploads = [];
    page.on('request', request => {
      if (request.method() === 'POST' && !new URL(request.url()).pathname.startsWith('/api/route-planner/')) unexpectedUploads.push(request.url());
    });
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Escanear o pegar manifiesto' }).click();
    await page.locator('.manifest-pdf-file input').setInputFiles({ name: 'entregas.pdf', mimeType: 'application/pdf', buffer: documentBytes });
    await page.getByText(/Páginas leídas: 1, 2 de 2/).waitFor({ timeout: 30000 });
    const text = await page.getByRole('textbox', { name: 'Texto del manifiesto' }).inputValue();
    assert.ok(text.indexOf('Calle Cedro 312') < text.indexOf('Avenida Universidad 100'));
    await page.getByRole('button', { name: 'Preparar direcciones para revisar' }).click();
    assert.equal(await page.locator('.manifest-candidate').count(), 2);
    assert.ok(await page.getByRole('button', { name: 'Añadir 0 entregas confirmadas' }).isDisabled());
    assert.deepEqual(unexpectedUploads, [], 'document bytes stay on the device');
    await page.getByRole('textbox', { name: 'Texto del manifiesto' }).fill('Calle Corregida 55, Chihuahua');
    assert.equal(await page.locator('.manifest-candidate').count(), 0, 'editing the source invalidates prepared candidates');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

test('scanned PDF is rasterized and read by the real Spanish OCR worker before reviewing deliveries', { timeout: 180000 }, async () => {
  const { context, page } = await setup(() => {});
  try {
    const { scannedManifestPdf } = await import('./fixtures/manifest-pdf.mjs');
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Escanear o pegar manifiesto' }).click();
    await page.locator('.manifest-pdf-file input').setInputFiles({ name: 'escaneado.pdf', mimeType: 'application/pdf', buffer: await scannedManifestPdf() });
    await page.getByText(/Páginas leídas: 1 de 1\. OCR en páginas: 1/).waitFor({ timeout: 150000 });
    const text = await page.getByRole('textbox', { name: 'Texto del manifiesto' }).inputValue();
    assert.match(text, /Cedro\s+312/i); assert.match(text, /Universidad\s+100/i);
    await page.getByRole('button', { name: 'Preparar direcciones para revisar' }).click();
    assert.equal(await page.locator('.manifest-candidate').count(), 2);
    assert.ok(await page.getByRole('button', { name: 'Añadir 0 entregas confirmadas' }).isDisabled());
  } finally { await context.close(); }
});

test('mobile numbered-address search exposes a street fallback without claiming an exact house', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [{ label: 'San Ángel, Monterrey', lat: 25.603978, lng: -100.275075, kind: 'street', requestedHouseNumber: '202', numberMatch: 'missing', plusCode: '75QXJP3F+HX' }] } }));
    await page.goto(base);
    const query = 'S. Prueba 202, Colonia Ejemplo, 00000 Monterrey, N.L.';
    await page.getByRole('combobox', { name: 'Destino', exact: true }).fill(query);
    await page.locator('.location-suggestions').getByRole('option', { name: /San Ángel/ }).click();
    await page.getByText(/No se encontró el número 202/).waitFor();
    const external = new URL(await page.getByRole('link', { name: 'Buscar la dirección escrita en Google Maps' }).getAttribute('href'));
    assert.equal(external.searchParams.get('query'), query);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

async function navigationSetup(){
 const testUser={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'driver@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const exp=Math.floor(Date.now()/1000)+3600;
 const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:testUser.id,aud:'authenticated',exp})).toString('base64url'),'test-signature'].join('.');
 const session={access_token:token,refresh_token:'synthetic-refresh-token',expires_in:3600,expires_at:exp,token_type:'bearer',user:testUser};
 const {context,page}=await setup(()=>{
  window.__gps={started:0,cleared:[],callbacks:[]};
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){},watchPosition(ok,fail){const gps=window.__gps;gps.started++;gps.callbacks.push({ok,fail});return gps.started;},clearWatch(id){window.__gps.cleared.push(id);}}});
 });
 await context.addInitScript(({session})=>localStorage.setItem('sb-auth-auth-token',JSON.stringify(session)),{session});
 await context.route('https://auth.example.test/**',route=>route.fulfill({json:route.request().url().includes('/auth/v1/user')?testUser:[]}));
 const {navigationRoute}=await import('./fixtures/route-navigation.mjs');
 let calculations=0;
 await page.route('**/api/route-planner/**',route=>{
  if(new URL(route.request().url()).pathname.endsWith('/routes/plan')){calculations++;return route.fulfill({json:{ok:true,route:navigationRoute}});}
  return route.fulfill({json:{ok:true,suggestions:[]}});
 });
 await page.goto(base);
 await page.getByRole('button',{name:'Camión',exact:true}).click();
 await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Origen de prueba');
 await page.getByRole('combobox',{name:'Destino',exact:true}).fill('Destino de prueba');
 await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();
 await page.getByRole('heading',{name:'Navegar esta ruta'}).waitFor();
  await page.getByRole('heading',{name:'Jurisdicciones del recorrido'}).waitFor();
  await page.getByText('Monterrey',{exact:true}).waitFor();
  await page.getByText('Guadalupe',{exact:true}).waitFor();
  await page.getByText('Referencia cargada',{exact:true}).waitFor();
  await page.getByText('Reglas pendientes',{exact:true}).waitFor();
 return {context,page,calculations:()=>calculations};
}
test('mobile navigation follows the stored path, warns on deviation and never requests a replacement route',async()=>{
 const {context,page,calculations}=await navigationSetup();
 try{
  const start=page.getByRole('button',{name:'Iniciar navegación en la app'});
  assert.equal(await page.evaluate(()=>window.__gps.started),0);assert.ok(await start.isDisabled());
  await page.getByRole('checkbox',{name:/Revisé los accesos y permisos/}).check();await start.click();
  assert.equal(await page.evaluate(()=>window.__gps.started),1);
  await page.evaluate(()=>window.__gps.callbacks[0].ok({coords:{latitude:25,longitude:-99.9995,accuracy:10,speed:5},timestamp:Date.now()}));
  await page.locator('.next-maneuver').getByText(/Gira a la izquierda/).waitFor();
  await page.evaluate(()=>window.__gps.callbacks[0].ok({coords:{latitude:25.01,longitude:-99.999,accuracy:10,speed:5},timestamp:Date.now()+1000}));
  await page.locator('.navigation-status').getByText(/fuera del trazado/).waitFor();
  assert.equal(await page.locator('.next-maneuver').count(),0);assert.equal(calculations(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'Detener navegación'}).click();assert.deepEqual(await page.evaluate(()=>window.__gps.cleared),[1]);
  await page.evaluate(()=>window.__gps.callbacks[0].ok({coords:{latitude:25.001,longitude:-99.998,accuracy:10,speed:5},timestamp:Date.now()+2000}));
  await page.locator('.navigation-status').getByText('Navegación detenida.').waitFor();
 }finally{await context.close();}
});
test('leaving the planner stops active GPS and does not resume it upon returning',async()=>{
 const {context,page}=await navigationSetup();
 try{
  await page.getByRole('checkbox',{name:/Revisé los accesos y permisos/}).check();await page.getByRole('button',{name:'Iniciar navegación en la app'}).click();
  const nav=page.getByRole('navigation',{name:'Secciones de Route Planner'});
  await nav.getByRole('button',{name:'Vehículos',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.__gps.cleared),[1]);
  await nav.getByRole('button',{name:'Planificar',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Iniciar navegación en la app'}).isDisabled());assert.equal(await page.evaluate(()=>window.__gps.started),1);
 }finally{await context.close();}
});
test('municipal directory distinguishes source records from missing legal coverage on mobile',async()=>{
 const {context,page}=await setup(()=>{});
 try{
  await page.route('**/api/route-planner/v1/regulations/municipalities**',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/19039'))return route.fulfill({json:{name:'Monterrey',status:'reference_only',routingEnforced:false,source:{url:'https://www.monterrey.gob.mx/reglamento.pdf',checkedAt:'2026-11-09T00:00:00Z'},trunkSegments:[{road:'Morones Prieto',segment:'Tramo de referencia, sentido al poniente',page:163,annex:1}],timeRules:[],notices:['Falta validar geometrías y permisos.']}});
   if(url.pathname.endsWith('/19001'))return route.fulfill({json:{name:'Abasolo',status:'not_loaded',routingEnforced:false,source:null,trunkSegments:[],timeRules:[],notices:['No equivale a circulación libre.']}});
   return route.fulfill({json:{states:[{id:'19',name:'Nuevo León'}],totalMunicipalities:2478,municipalities:[{id:'19039',name:'Monterrey',state:'19',coverage:'reference_only',routingEnforced:false},{id:'19001',name:'Abasolo',state:'19',coverage:'not_loaded',routingEnforced:false}]}});
  });
  await page.goto(base+'/#guia-camion');await page.getByRole('button',{name:'Consultar cobertura municipal'}).click();
  await page.getByText(/Ningún municipio tiene todavía validación automática completa/).waitFor();
  await page.getByText('Referencia oficial consultable; no se aplica automáticamente al trazado.').waitFor();
  await page.getByText('1 tramos de red troncal · Anexo 1').click();await page.getByRole('cell',{name:'Morones Prieto'}).waitFor();
  await page.getByRole('combobox',{name:'Municipio o demarcación'}).selectOption('19001');
  await page.getByText('Reglas oficiales aún no incorporadas. No significa circulación libre.').waitFor();
  assert.equal(await page.getByRole('link',{name:'Abrir fuente oficial ↗'}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});

test('mobile creates twelve deliveries and sends every point to Google in consecutive maximum-size links', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({json:{ok:true,suggestions:[]}}));
    await page.goto(base);
    await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Origen de prueba');
    await page.getByRole('combobox',{name:'Destino',exact:true}).fill('Destino de prueba');
    for(let i=1;i<=12;i++){
      await page.getByRole('button',{name:'Agregar parada'}).click();
      await page.getByRole('combobox',{name:`PARADA ${i}`,exact:true}).fill(`Entrega ${i}`);
    }
    assert.equal(await page.getByRole('combobox',{name:'PARADA 12',exact:true}).inputValue(),'Entrega 12');
    const expected=['Origen de prueba',...Array.from({length:12},(_,i)=>`Entrega ${i+1}`),'Destino de prueba'];
    async function verify(limit,count){
      const links=await page.getByRole('link',{name:/^Abrir tramo/}).all();
      assert.equal(links.length,count);
      const visited=[];
      for(const [index,link] of links.entries()){
        const href=await link.getAttribute('href');assert.ok(href.length<=2048);
        const p=new URL(href).searchParams,stops=p.get('waypoints')?.split('|')||[];
        assert.ok(stops.length<=limit);
        const part=[p.get('origin'),...stops,p.get('destination')];
        if(index)assert.equal(part[0],visited.at(-1));
        visited.push(...part.slice(index?1:0));
      }
      assert.deepEqual(visited,expected);
    }
    await verify(9,2);
    await page.getByLabel('Paradas intermedias por enlace',{exact:true}).selectOption('3');
    await verify(3,4);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  } finally {await context.close();}
});
