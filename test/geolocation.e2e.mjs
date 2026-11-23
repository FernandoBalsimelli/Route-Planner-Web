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
async function confirmPlannerPoint(page,title,value){
 await page.getByRole('combobox',{name:title,exact:true}).fill(value);
 await page.getByRole('listbox',{name:`Sugerencias para ${title}`,exact:true}).getByRole('option').first().click();
 await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();
}

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

test('Maps search links paste as unconfirmed coordinates while short links and viewports preserve the draft',async()=>{
 for(const viewport of [{width:390,height:844},{width:1365,height:900}]){
  const {context,page}=await setup(()=>{},viewport);const queries=[];let external=0;
  try{
   await context.grantPermissions(['clipboard-read','clipboard-write']);
   await page.route('https://www.google.com/**',route=>{external++;return route.abort();});
   await page.route('**/api/route-planner/**',route=>{
    const q=new URL(route.request().url()).searchParams.get('q');if(q)queries.push(q);
    return route.fulfill({json:{ok:true,suggestions:[{label:'Acceso corroborado, Chihuahua',lat:28.635300123,lng:-106.088900456}]}});
   });
   await page.goto(base);await page.getByRole('button',{name:'Usar mi ubicación actual',exact:true}).waitFor();
   const input=page.getByRole('combobox',{name:'Destino',exact:true});await input.fill('Borrador anterior');
   const paste=async text=>{await page.evaluate(value=>navigator.clipboard.writeText(value),text);await input.focus();await input.press('Control+V');};
   await paste('https://maps.app.goo.gl/Example');await page.getByText(/El centro de la vista/).waitFor();assert.equal(await input.inputValue(),'Borrador anterior');assert.equal(queries.some(q=>q.includes('maps.app')),false);
   await paste('https://www.google.com/maps/search/?api=1&query=28.635300123%2C-106.088900456&center=25,-100');await page.getByText(/Búsqueda extraída/).waitFor();assert.equal(await input.inputValue(),'28.635300123,-106.088900456');
   assert.equal(await page.locator('.location-confirmed').count(),0);await page.getByRole('option',{name:/Acceso corroborado/}).click();await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();assert.equal(await input.inputValue(),'Acceso corroborado, Chihuahua');
   await paste('https://www.google.com/maps/@25,-100,15z');await page.getByText(/El centro de la vista/).waitFor();assert.equal(await input.inputValue(),'Acceso corroborado, Chihuahua');assert.equal(await page.locator('.location-confirmed').count(),1);assert.equal(external,0);
   assert.ok(queries.includes('28.635300123,-106.088900456'));assert.ok(queries.every(q=>!q.startsWith('http')));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  }finally{await context.close();}
 }
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

test('missing nearby branches keep the picker at the origin and reveal distant matches only on request',async()=>{
 for(const viewport of [{width:390,height:844},{width:1365,height:900}]){
  const {context,page}=await setup(success,viewport);const reverses=[];
  try{
   await page.route('**/api/route-planner/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/reverse')){reverses.push({lat:Number(url.searchParams.get('lat')),lng:Number(url.searchParams.get('lng'))});return route.fulfill({json:{ok:true,location:{label:'Acceso en Chihuahua'}}});}
    return route.fulfill({json:{ok:true,nearby:true,warning:'NO_NEARBY_MATCHES',suggestions:[{label:'Bodega Aurrera Express, Monterrey',lat:25.721274,lng:-100.325989,distanceMeters:655570,kind:'venue'}]}});
   });
   await page.goto(base);await page.getByRole('button',{name:'Usar mi ubicación actual',exact:true}).click();await page.getByText('Ubicación actual establecida como origen.').waitFor();
   const destination=page.getByRole('combobox',{name:'Destino',exact:true}),field=page.locator('.location-field').filter({has:destination});await destination.fill('Bodega Aurrera Express');
   await page.getByRole('button',{name:'Ver coincidencias lejanas (1)',exact:true}).waitFor();assert.equal(await field.getByRole('option').count(),0);assert.equal(await page.getByRole('button',{name:'S1',exact:true}).count(),0);
   await destination.press('Enter');assert.equal(await page.locator('.location-confirm-card').count(),0);
   await page.getByRole('button',{name:'Elegir destino en el mapa',exact:true}).click();await page.getByRole('button',{name:'Elegir el centro del mapa',exact:true}).click();await page.getByRole('button',{name:'Confirmar punto del mapa',exact:true}).waitFor({state:'visible'});
   await page.getByText('Comprueba la dirección y confirma el punto.').waitFor();assert.equal(reverses.length,2);assert.ok(Math.abs(reverses[1].lat-28.662926123)<.00001);assert.ok(Math.abs(reverses[1].lng+106.099908456)<.00001);
   await page.getByRole('button',{name:'Cerrar mapa de destino',exact:true}).click();await page.getByRole('button',{name:'Ver coincidencias lejanas (1)',exact:true}).click();
   await page.getByRole('option',{name:/Bodega Aurrera Express, Monterrey/}).click();assert.equal(await destination.inputValue(),'Bodega Aurrera Express');await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();assert.equal(await destination.inputValue(),'Bodega Aurrera Express, Monterrey');
   const link=new URL(await page.getByRole('link',{name:/Abrir puntos en Google Maps/}).getAttribute('href'));assert.equal(link.searchParams.get('destination'),'25.721274, -100.325989');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  }finally{await context.close();}
 }
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

test('map retains its geographic center across hidden-panel resize on desktop and mobile', { timeout: 60000 }, async () => {
  for(const dimensions of [{initial:{width:1440,height:1000},resized:{width:1100,height:850}},{initial:{width:390,height:844},resized:{width:844,height:390}}]){
    const {context,page}=await setup(()=>{},dimensions.initial);page.setDefaultTimeout(15000);
    const centered=()=>{
      const map=document.querySelector('.route-map'),marker=document.querySelector('.rp-map-pin-start')?.closest('.leaflet-marker-icon');
      if(!map||!marker)return false;
      const box=map.getBoundingClientRect(),pin=marker.getBoundingClientRect();
      return box.width>0&&Math.abs(pin.x+pin.width/2-box.x-box.width/2)<20&&Math.abs(pin.y+pin.height/2-box.y-box.height/2)<20;
    };
    try{
      await page.route('**/api/route-planner/**',route=>route.fulfill({json:{ok:true,suggestions:[{label:'Referencia de prueba, Chihuahua',lat:28.63,lng:-106.07}]}}));
      await page.goto(base);
      await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Referencia de prueba');
      await page.getByRole('listbox',{name:'Sugerencias para Origen',exact:true}).getByRole('option').click();await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();
      await page.waitForFunction(centered,{},{timeout:10000});
      const nav=page.getByRole('navigation',{name:'Secciones de Route Planner'});
      await nav.getByRole('button',{name:'Vehículos',exact:true}).click();
      await page.setViewportSize(dimensions.resized);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await nav.getByRole('button',{name:'Planificar',exact:true}).click();
      await page.waitForFunction(centered,{},{timeout:10000});
      assert.ok(await page.evaluate(centered),'the confirmed origin must remain at the geographic center after the hidden resize');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    }finally{await context.close();}
  }
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

test('mobile manifest preserves repeated deliveries and makes coincident points reviewable before import', { timeout: 60000 }, async () => {
  const { context, page } = await setup(() => {});
  page.setDefaultTimeout(15000);
  try {
    await page.route('**/api/route-planner/**',route=>route.fulfill({json:{ok:true,suggestions:[{label:'Express de prueba, Calle Uno 123',lat:25.681,lng:-100.31}]}}));
    await page.goto(base);
    await page.getByRole('button',{name:'Escanear o pegar manifiesto'}).click();
    await page.getByRole('textbox',{name:'Texto del manifiesto'}).fill('Calle Uno 123\nCalle Uno 123');
    await page.getByRole('button',{name:'Preparar direcciones para revisar'}).click();
    assert.equal(await page.locator('.manifest-candidate').count(),2);
    await page.getByLabel('Texto repetido en el manifiesto').getByText('Entregas 1, 2: mismo texto.',{exact:true}).waitFor();
    for(let i=0;i<2;i++){
      const row=page.locator('.manifest-candidate').nth(i);
      await row.getByRole('option').click();
      await row.getByRole('button',{name:'Confirmar punto',exact:true}).click();
    }
    const notice=page.getByLabel('Puntos cercanos entre entregas');
    await notice.getByText(/Entregas 1 y 2/).waitFor();
    await notice.getByRole('button',{name:'Revisar entrega 2',exact:true}).click();
    assert.ok(await page.getByRole('combobox',{name:'Entrega 2',exact:true}).evaluate(node=>node===document.activeElement),'review shortcut focuses its delivery');
    await page.getByRole('combobox',{name:'Entrega 2',exact:true}).fill('Calle corregida 456');
    assert.equal(await notice.count(),0,'editing invalidates the old confirmed point and its warning');
    assert.ok(await page.getByRole('button',{name:'Añadir 1 entregas confirmadas',exact:true}).isDisabled());
    await page.locator('.manifest-candidate').nth(1).getByRole('option').click();
    await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();
    await page.getByRole('button',{name:'Añadir 2 entregas confirmadas',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).inputValue(),'Express de prueba, Calle Uno 123');
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'Express de prueba, Calle Uno 123');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  } finally { await context.close(); }
});

test('mobile manifest uses central-map branches for the correct row and clears closed previews', {timeout:60000}, async()=>{
  const {context,page}=await setup(()=>{});page.setDefaultTimeout(15000);
  const origin={label:'Origen de prueba',lat:25.68,lng:-100.31};
  const north={label:'Express Norte seleccionado',lat:25.6812,lng:-100.3112,kind:'venue',numberMatch:'missing',requestedHouseNumber:'123'};
  const south={label:'Express Sur seleccionado',lat:25.6822,lng:-100.3122};
  const queries=[];
  try{
    await page.route('**/api/route-planner/**',route=>{
      const url=new URL(route.request().url()),q=url.searchParams.get('q');
      if(q?.includes('Express'))queries.push(url);
      return route.fulfill({json:{ok:true,suggestions:q==='Origen de prueba'?[origin]:q?.includes('Norte')?[{label:'Otra sucursal',lat:25.69,lng:-100.32},north]:[south]}});
    });
    await page.goto(base);await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Origen de prueba');
    await page.getByRole('listbox',{name:'Sugerencias para Origen',exact:true}).getByRole('option').click();
    await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();
    await page.getByRole('button',{name:'Escanear o pegar manifiesto'}).click();
    await page.getByRole('textbox',{name:'Texto del manifiesto'}).fill('Express Norte\nExpress Sur');
    await page.getByRole('button',{name:'Preparar direcciones para revisar'}).click();
    await page.getByRole('button',{name:'S2',exact:true}).click();
    await page.getByRole('button',{name:'Cerrar manifiesto',exact:false}).click();
    await page.locator('.map-candidate-confirm').waitFor({state:'detached'});
    assert.equal(await page.locator('.map-candidate-confirm').count(),0);
    assert.equal(await page.getByRole('button',{name:'S2',exact:true}).count(),0);
    await page.getByRole('button',{name:'Escanear o pegar manifiesto'}).click();
    await page.getByRole('button',{name:'S2',exact:true}).click();
    await page.getByText(/No se encontró el número 123/).waitFor();
    await page.getByText(/El proveedor no informa la calle de esta sucursal/).waitFor();
    await page.getByRole('button',{name:'Usar como Entrega 1 del manifiesto',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'');
    assert.equal(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).count(),0);
    await page.getByRole('button',{name:'S1',exact:true}).click();
    await page.getByRole('button',{name:'Usar como Entrega 2 del manifiesto',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement===document.querySelector('.manifest-body .primary-button'),{},{timeout:5000});
    assert.ok(await page.getByRole('button',{name:'Añadir 2 entregas confirmadas',exact:true}).evaluate(node=>node===document.activeElement),'the last map confirmation returns focus to explicit import');
    await page.getByRole('button',{name:'Añadir 2 entregas confirmadas',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).inputValue(),north.label);
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),south.label);
    const href=new URL(await page.getByRole('link',{name:/Abrir puntos en Google Maps/}).getAttribute('href'));
    assert.equal(href.searchParams.get('waypoints'),`${north.lat}, ${north.lng}`);
    assert.equal(href.searchParams.get('destination'),`${south.lat}, ${south.lng}`);
    assert.ok(queries.length>=2);assert.ok(queries.every(q=>q.searchParams.get('lat')===String(origin.lat)&&q.searchParams.get('lng')===String(origin.lng)));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  }finally{await context.close();}
});

test('manifest map review preserves a calculated route and stops active GPS without a new calculation',{timeout:60000},async()=>{
  const {context,page,calculations}=await navigationSetup(15000);
  try{
    await page.getByRole('checkbox',{name:/Revisé los accesos y permisos/}).check();
    await page.getByRole('button',{name:'Iniciar navegación en la app',exact:true}).click();
    const before=await page.locator('.metrics').innerText();
    await page.route('**/v1/locations/suggest?*',route=>route.fulfill({json:{ok:true,suggestions:[{label:'Entrega de revisión',lat:25.001,lng:-99.998}]}}));
    await page.getByRole('button',{name:'Escanear o pegar manifiesto'}).click();
    await page.getByRole('textbox',{name:'Texto del manifiesto'}).fill('Entrega de revisión');
    await page.getByRole('button',{name:'Preparar direcciones para revisar'}).click();
    await page.getByRole('button',{name:'S1',exact:true}).click();
    await page.getByRole('button',{name:'Usar como Entrega 1 del manifiesto',exact:true}).click();
    assert.equal(await page.locator('.metrics').innerText(),before);assert.equal(calculations(),1);
    assert.deepEqual(await page.evaluate(()=>window.__gps.cleared),[1]);
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'Destino de prueba');
    await page.getByRole('button',{name:'Cerrar manifiesto',exact:false}).click();
    assert.equal(await page.locator('.metrics').innerText(),before);assert.equal(calculations(),1);
    assert.equal(await page.getByRole('button',{name:'Iniciar navegación en la app',exact:true}).count(),1);
    assert.equal(await page.evaluate(()=>window.__gps.started),1,'closing review never restarts GPS automatically');
  }finally{await context.close();}
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

async function navigationSetup(timeoutMs){
 const testUser={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'driver@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const exp=Math.floor(Date.now()/1000)+3600;
 const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:testUser.id,aud:'authenticated',exp})).toString('base64url'),'test-signature'].join('.');
 const session={access_token:token,refresh_token:'synthetic-refresh-token',expires_in:3600,expires_at:exp,token_type:'bearer',user:testUser};
 const {context,page}=await setup(()=>{
  window.__gps={started:0,cleared:[],callbacks:[]};
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){},watchPosition(ok,fail){const gps=window.__gps;gps.started++;gps.callbacks.push({ok,fail});return gps.started;},clearWatch(id){window.__gps.cleared.push(id);}}});
 });
 if (timeoutMs) page.setDefaultTimeout(timeoutMs);
 await context.addInitScript(({session})=>localStorage.setItem('sb-auth-auth-token',JSON.stringify(session)),{session});
 await context.route('https://auth.example.test/**',route=>route.fulfill({json:route.request().url().includes('/auth/v1/user')?testUser:[]}));
 const {navigationRoute}=await import('./fixtures/route-navigation.mjs');
 let calculations=0;
 await page.route('**/api/route-planner/**',route=>{
  if(new URL(route.request().url()).pathname.endsWith('/routes/plan')){calculations++;return route.fulfill({json:{ok:true,route:navigationRoute}});}
  const q=new URL(route.request().url()).searchParams.get('q');
  return route.fulfill({json:{ok:true,suggestions:q?[{label:q,lat:25.68,lng:-100.31}]:[]}});
 });
 await page.goto(base);
 await page.getByRole('button',{name:'Camión',exact:true}).click();
 await confirmPlannerPoint(page,'Origen','Origen de prueba');
 await confirmPlannerPoint(page,'Destino','Destino de prueba');
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
   if(url.pathname.endsWith('/19039'))return route.fulfill({json:{name:'Monterrey',status:'reference_only',routingEnforced:false,source:{id:'monterrey-transito',url:'https://www.monterrey.gob.mx/reglamento.pdf',checkedAt:'2026-11-09T00:00:00Z'},trunkSegments:[{road:'Morones Prieto',segment:'Tramo de referencia, sentido al poniente',page:163,annex:1}],timeRules:[],notices:['Falta validar geometrías y permisos.']}});
   if(url.pathname.endsWith('/19001'))return route.fulfill({json:{name:'Abasolo',status:'not_loaded',routingEnforced:false,source:null,trunkSegments:[],timeRules:[],notices:['No equivale a circulación libre.']}});
   return route.fulfill({json:{states:[{id:'19',name:'Nuevo León'},{id:'08',name:'Chihuahua'},{id:'01',name:'Aguascalientes'}],totalMunicipalities:2478,municipalities:[{id:'19039',name:'Monterrey',state:'19',coverage:'reference_only',routingEnforced:false},{id:'19001',name:'Abasolo',state:'19',coverage:'not_loaded',routingEnforced:false}]}});
  });
  await page.goto(base+'/#guia-camion');await page.getByRole('button',{name:'Consultar cobertura municipal'}).click();
  await page.getByText(/Ningún municipio tiene todavía validación automática completa/).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Consultar las vías municipales: Monterrey'}).count(),0);
  assert.ok(await page.getByRole('combobox',{name:'Municipio o demarcación'}).isDisabled());
  assert.deepEqual(await page.getByRole('combobox',{name:'Entidad federativa'}).locator('option').allTextContents(),['Elige una entidad','Aguascalientes','Chihuahua','Nuevo León']);
  await page.getByRole('combobox',{name:'Entidad federativa'}).selectOption('19');
  await page.getByRole('combobox',{name:'Municipio o demarcación'}).locator('option').filter({hasText:'Abasolo'}).waitFor({state:'attached'});
  const names=await page.getByRole('combobox',{name:'Municipio o demarcación'}).locator('option').allTextContents();assert.match(names[1],/^Abasolo/);
  await page.getByRole('combobox',{name:'Municipio o demarcación'}).selectOption('19039');
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
    const locations=[{label:'Origen de prueba',lat:28.63,lng:-106.06},...Array.from({length:12},(_,i)=>({label:`Entrega ${i+1}`,lat:28.63+(i+1)*.0001,lng:-106.06})),{label:'Destino de prueba',lat:28.64,lng:-106.07}];
    await page.route('**/api/route-planner/**', route => {const q=new URL(route.request().url()).searchParams.get('q'),point=locations.find(point=>point.label===q);return route.fulfill({json:{ok:true,suggestions:point?[point]:[]}});});
    await page.goto(base);
    await confirmPlannerPoint(page,'Origen','Origen de prueba');
    await confirmPlannerPoint(page,'Destino','Destino de prueba');
    for(let i=1;i<=12;i++){
      await page.getByRole('button',{name:'Agregar parada'}).click();
      await confirmPlannerPoint(page,`PARADA ${i}`,`Entrega ${i}`);
    }
    assert.equal(await page.getByRole('combobox',{name:'PARADA 12',exact:true}).inputValue(),'Entrega 12');
    const expected=locations.map(point=>`${point.lat}, ${point.lng}`);
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

 test('truck Google links add maneuver guides without losing the endpoints and can return to deliveries only',async()=>{
 const {context,page}=await navigationSetup();
 try{
  const checkbox=page.getByRole('checkbox',{name:/Añadir puntos guía/});await checkbox.waitFor();assert.ok(await checkbox.isChecked());
  const link=page.getByRole('link',{name:'Abrir puntos en Google Maps ↗'});let params=new URL(await link.getAttribute('href')).searchParams;assert.equal(params.get('waypoints').split('|').length,2);
  await checkbox.uncheck();params=new URL(await link.getAttribute('href')).searchParams;assert.equal(params.has('waypoints'),false);assert.equal(params.get('origin'),'25, -100');assert.equal(params.get('destination'),'25.001, -99.998');
  await checkbox.check();await page.getByText(/Google puede desviarse entre ellos/).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});
test('mobile branch confirmation preserves street and coordinates after showing the loading-access notice',async()=>{
 const {context,page}=await setup(()=>{});
 try{
  await page.route('**/api/route-planner/v1/locations/suggest**',route=>route.fulfill({json:{ok:true,nearby:true,suggestions:[{label:'Bodega Aurrera Express, Calle Cedro 101, Monterrey',lat:25.6801,lng:-100.31,kind:'venue',street:'Calle Cedro',houseNumber:'101',distanceMeters:500}]}}));
  await page.goto(base);await page.getByRole('combobox',{name:'Destino',exact:true}).fill('Bodega Aurrera Express');await page.getByRole('option',{name:/Calle Cedro 101/}).click();
  await page.getByText(/Corrobora la sucursal y el acceso de descarga/).waitFor();assert.equal(await page.locator('.location-confirmed').count(),0);
  const link=page.getByRole('link',{name:'Ver mapa ↗',exact:true});assert.equal(new URL(await link.getAttribute('href')).searchParams.get('query'),'25.6801,-100.31');
  const street=page.getByRole('link',{name:'Ver entorno en Street View ↗',exact:true});const streetParams=new URL(await street.getAttribute('href')).searchParams;assert.equal(streetParams.get('map_action'),'pano');assert.equal(streetParams.get('viewpoint'),'25.6801,-100.31');assert.equal(await street.getAttribute('target'),'_blank');await page.getByText(/imágenes antiguas o un punto cercano/).waitFor();assert.equal(await page.locator('.location-confirmed').count(),0);
  await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'Bodega Aurrera Express, Calle Cedro 101, Monterrey');assert.equal(await page.locator('.location-confirmed').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});


test('mobile road preferences reach all Google links and preserve delivery order', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => {const q=new URL(route.request().url()).searchParams.get('q'),[lat,lng]=(q||'').split(',').map(Number);return route.fulfill({ json: { ok: true, suggestions: q?[{label:q,lat,lng}]:[] } });});
    await page.goto(base);
    await confirmPlannerPoint(page,'Origen','28.63, -106.06');
    await confirmPlannerPoint(page,'Destino','28.64, -106.07');
    for (let i = 1; i <= 12; i++) {
      await page.getByRole('button', { name: 'Agregar parada' }).click();
      await confirmPlannerPoint(page,`PARADA ${i}`,`28.63${i}, -106.06`);
    }
    const optimization = page.getByRole('checkbox', { name: /Optimizar orden de paradas/ });
    await optimization.check();
    await page.getByRole('checkbox', { name: 'Evitar casetas de peaje', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Evitar autopistas', exact: true }).check();
    assert.equal(await optimization.isChecked(), false);
    assert.equal(await optimization.isDisabled(), true);
    await page.getByRole('combobox', { name: 'Paradas intermedias por enlace', exact: true }).selectOption('3');
    const hrefs = await page.locator('.navigation-segments a').evaluateAll(nodes => nodes.map(node => node.href));
    assert.equal(hrefs.length, 4);
    const visited = [];
    for (const [index, href] of hrefs.entries()) {
      const params = new URL(href).searchParams;
      assert.equal(params.get('avoid'), 'tolls,highways');
      assert.ok(href.length <= 2048);
      const part = [params.get('origin'), ...(params.get('waypoints')?.split('|') || []), params.get('destination')];
      if (index) assert.equal(part[0], visited.at(-1));
      visited.push(...part.slice(index ? 1 : 0));
    }
    assert.deepEqual(visited,['28.63, -106.06',...Array.from({length:12},(_,i)=>`${Number(`28.63${i+1}`)}, -106.06`),'28.64, -106.07']);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});


test('mobile route opens the exact municipality and shows changed-source review before expanding details',async()=>{
 const {context,page}=await navigationSetup();
 try{
  await page.route('**/api/route-planner/v1/regulations/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/source-status'))return route.fulfill({json:{intervalHours:6,checkedAt:'2026-11-10T00:00:00Z',stale:false,overdue:true,notice:'No acredita vigencia legal.',sources:[{id:'monterrey-transito',title:'Fuente de Monterrey',url:'https://official.gob.mx/reglamento',status:'changed',scope:'Municipio de prueba',reviewedAt:'2026-11-09T00:00:00Z'}]}});
   if(path.endsWith('/19039'))return route.fulfill({json:{name:'Monterrey',status:'reference_only',source:{id:'monterrey-transito',url:'https://official.gob.mx/reglamento',checkedAt:'2026-11-10T00:00:00Z'},notices:['Referencia de prueba; no aplica al cálculo.'],trunkSegments:[],timeRules:[]}});
   return route.fulfill({json:{states:[{id:'19',name:'Nuevo León'}],municipalities:[{id:'19039',name:'Monterrey',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:14}});
  });
  await page.getByRole('button',{name:'Revisar normativa de Monterrey',exact:true}).click();
  await page.getByRole('heading',{name:'Monterrey',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Entidad federativa',{exact:true}).inputValue(),'19');
  assert.equal(await page.getByLabel('Municipio o demarcación',{exact:true}).inputValue(),'19039');
  await page.locator('.source-monitor-alert').getByText('Cambio detectado · requiere revisar el documento',{exact:true}).waitFor();
  await page.locator('.source-monitor-alert').filter({hasText:'intervalo previsto'}).waitFor();
  assert.equal(await page.locator('.official-source-monitor details').evaluate(node=>node.open),false);
  await page.getByRole('navigation',{name:'Secciones de Route Planner'}).getByRole('button',{name:'Planificar',exact:true}).click();
  await page.getByRole('heading',{name:'Detalle del recorrido',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),'Origen de prueba');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});


test('mobile source review retains a verified principal alongside a failed linked document',async()=>{
 const {context,page}=await setup(()=>{});
 try{
  await page.route('**/api/route-planner/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/source-status'))return route.fulfill({json:{intervalHours:6,checkedAt:'2026-11-10T12:00:00Z',stale:false,notice:'No certifica vigencia.',sources:[{id:'monterrey-transito',title:'Fuente de prueba',url:'https://official.gob.mx/rules',status:'unavailable',availability:'partial',changeDetected:true,documentBreakdownAvailable:true,documents:[{kind:'primary',url:'https://official.gob.mx/rules',status:'changed',checkedAt:'2026-11-10T12:00:00Z',lastSuccessAt:'2026-11-10T12:00:00Z'},{kind:'related',url:'https://official.gob.mx/gazette',status:'unavailable',checkedAt:'2026-11-10T12:00:00Z',lastSuccessAt:'2026-11-09T12:00:00Z',error:'HTTP_503'}]}]}});
   return route.fulfill({json:{states:[{id:'19',name:'Nuevo León'}],municipalities:[],totalMunicipalities:2478,municipalitiesWithPartialReference:14}});
  });
  await page.goto(base+'/#guia-camion');await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
  await page.locator('.source-monitor-alert').filter({hasText:'Cambio detectado'}).waitFor();await page.locator('.source-monitor-alert').filter({hasText:'no se pudieron comprobar'}).waitFor();
  assert.equal(await page.locator('.official-source-monitor details').evaluate(node=>node.open),false);
  await page.getByText('Seguimiento de fuentes oficiales',{exact:true}).click();
  const docs=page.locator('.source-documents li');assert.equal(await docs.count(),2);
  await docs.nth(0).getByText('Documento principal',{exact:true}).waitFor();await docs.nth(1).getByText('HTTP_503',{exact:true}).waitFor();
  assert.equal(await docs.nth(1).getByRole('link').getAttribute('href'),'https://official.gob.mx/gazette');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});


test('mobile truck operating profile derives axles, allows unidentified units and fits a narrow screen', async () => {
  const { context, page } = await setup(() => {}, { width: 360, height: 800 });
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Camión', exact: true }).click();
    const config = page.getByLabel('Configuración vehicular', { exact: true });
    const axes = page.getByLabel('Número total de ejes', { exact: true });
    const capacity = page.getByLabel('Capacidad máxima de carga (t)', { exact: true });
    assert.equal(await config.inputValue(), ''); assert.equal(await axes.inputValue(), ''); assert.equal(await capacity.inputValue(), '');
    await config.selectOption('T3-S2');
    assert.equal(await axes.inputValue(), '5'); assert.notEqual(await axes.getAttribute('readonly'), null);
    await capacity.fill('30.125');
    assert.equal(await page.getByLabel('Peso bruto (t)', { exact: true }).inputValue(), '40', 'capacity must not replace actual gross weight');
    await config.selectOption('');
    assert.equal(await axes.getAttribute('readonly'), null);
    await axes.fill('3'); assert.equal(await axes.inputValue(), '3'); assert.equal(await capacity.inputValue(), '30.125');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Reparto', exact: true }).click();
    assert.equal(await config.count(), 0);
  } finally { await context.close(); }
});

test('mobile municipal review uses planner capacity, preserves an unresolved threshold and clears truck data in reparto', async () => {
  const { context, page } = await setup(() => {}, { width: 360, height: 800 });
  try {
    await page.route('**/api/route-planner/**', route => {
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});
      if(path.endsWith('/21114'))return route.fulfill({json:{name:'Puebla',status:'reference_only',source:{id:'puebla-carga',url:'https://official.gob.mx/puebla',checkedAt:'2026-11-10T00:00:00Z'},notices:['Referencia sintética para probar la interfaz.'],trunkSegments:[],timeRules:[],rules:[{id:'lower',title:'Comparador menor',description:'Maniobras por corroborar.',citation:'Fixture de comparación',vehicleConditions:{payloadCapacityT:{lt:3.5}}},{id:'higher',title:'Comparador mayor',description:'Maniobras por corroborar.',citation:'Fixture de comparación',vehicleConditions:{payloadCapacityT:{gt:3.5}}},{id:'dimensions',title:'Cuadro C2',description:'Zona por corroborar.',citation:'Fixture de comparación',vehicleConfigurations:['C2'],limits:{grossWeightT:13,loadWidthM:2.6}}]}});
      return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:14}});
    });
    await page.goto(base);await page.getByRole('button',{name:'Camión',exact:true}).click();
    await page.getByLabel('Configuración vehicular',{exact:true}).selectOption('C2');
    await page.getByLabel('Capacidad máxima de carga (t)',{exact:true}).fill('3.5');
    await page.getByLabel('Peso bruto (t)',{exact:true}).fill('12');
    const nav=page.getByRole('navigation',{name:'Secciones de Route Planner'});
    await nav.getByRole('button',{name:'Guía camión',exact:true}).click();
    await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
    await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');
    await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
    await page.getByRole('heading',{name:'Puebla',exact:true}).waitFor();
    assert.equal(await page.locator('[data-comparison="boundary"]').count(),2);
    assert.match(await page.locator('[data-comparison="within"]').innerText(),/Peso bruto cargado: 12 t/);
    assert.match(await page.locator('[data-comparison="unknown"]').innerText(),/Ancho de la carga: sin dato válido/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await nav.getByRole('button',{name:'Planificar',exact:true}).click();await page.getByRole('button',{name:'Reparto',exact:true}).click();
    await nav.getByRole('button',{name:'Guía camión',exact:true}).click();
    assert.equal(await page.locator('[data-comparison="boundary"]').count(),0);
    await page.getByText(/Selecciona Camión en el planificador/).waitFor();
  } finally { await context.close(); }
});

test('mobile axle review is limited to the selected municipality and keeps unknown or larger units under review', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => {
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});
      if(path.endsWith('/19039'))return route.fulfill({json:{name:'Monterrey',status:'reference_only',source:{id:'monterrey-transito',url:'https://official.gob.mx/monterrey',checkedAt:'2026-11-10T00:00:00Z'},notices:[],trunkSegments:[],timeRules:[{maximumAxlesExempt:4}],rules:[]}});
      return route.fulfill({json:{states:[{id:'19',name:'Nuevo León'}],municipalities:[{id:'19039',name:'Monterrey',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:14}});
    });
    await page.goto(base);await page.getByRole('button',{name:'Camión',exact:true}).click();
    await page.getByLabel('Configuración vehicular',{exact:true}).selectOption('T3-S2');
    const nav=page.getByRole('navigation',{name:'Secciones de Route Planner'});
    await nav.getByRole('button',{name:'Guía camión',exact:true}).click();await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
    await page.getByLabel('Entidad federativa',{exact:true}).selectOption('19');await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('19039');
    const review=page.locator('[aria-label="Comparación de ejes con artículo 39"]');
    await review.getByText(/Número total de ejes: 5 ejes/).waitFor();
    assert.equal(await review.locator('[data-comparison="differs"]').count(),1);
    assert.match(await review.innerText(),/No acredita acceso a otras vías/);
    await nav.getByRole('button',{name:'Planificar',exact:true}).click();await page.getByLabel('Configuración vehicular',{exact:true}).selectOption('T2-S2');
    await nav.getByRole('button',{name:'Guía camión',exact:true}).click();assert.match(await review.locator('[data-comparison="matches"]').innerText(),/4 ejes/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  } finally { await context.close(); }
});

test('mobile alternative selection changes the route and stops GPS without another calculation',{timeout:60000},async()=>{
 const {context,page}=await navigationSetup(10000);
 try{
  const {navigationRoute,encodePath,points}=await import('./fixtures/route-navigation.mjs');
  const alternative={...navigationRoute,distanceMeters:420,durationSeconds:80,polyline:encodePath(points.map((point,index)=>index===1||index===2?[point[0]+.0004,point[1]]:point))};
  let requests=0;
  await page.route('**/api/route-planner/v1/routes/plan',route=>{requests++;assert.equal(route.request().postDataJSON().alternatives,true);return route.fulfill({json:{ok:true,route:navigationRoute,alternatives:[alternative]}});});
  await page.getByRole('checkbox',{name:/Buscar rutas alternativas/}).check();await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();
  const option=page.locator('.route-alternatives').getByRole('button',{name:/Ruta 2/});await option.waitFor();
  await page.getByRole('checkbox',{name:/Revisé los accesos y permisos/}).check();await page.getByRole('button',{name:'Iniciar navegación en la app'}).click();assert.equal(await page.evaluate(()=>window.__gps.started),1);
  await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');assert.match(await page.locator('.metrics').innerText(),/420 m/);assert.deepEqual(await page.evaluate(()=>window.__gps.cleared),[1]);assert.equal(requests,1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'Agregar parada'}).click();assert.equal(await page.locator('.route-alternatives').count(),0);assert.equal(await page.getByRole('checkbox',{name:/Buscar rutas alternativas/}).isChecked(),false);assert.equal(await page.getByRole('checkbox',{name:/Buscar rutas alternativas/}).isDisabled(),true);
 }finally{await context.close();}
});

test('municipal operational evidence preserves scope and its own dated source on mobile and desktop',{timeout:60000},async()=>{
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const {context,page}=await setup(()=>{},viewport);
  const evidence={jurisdiction:'Municipio de Puebla · INEGI 21114',scope:'Sólo perímetro rotativo de prueba',consultedAt:'2026-11-15',consolidatedThrough:'2025-12-10'};
  try{
   await page.route('**/api/route-planner/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});
    if(url.pathname.endsWith('/21114'))return route.fulfill({json:{name:'Puebla',status:'reference_only',routingEnforced:false,source:{id:'puebla-carga',url:'https://official.gob.mx/amendment',checkedAt:'2026-11-10T00:00:00Z'},notices:['Referencia parcial; falta vigencia.'],trunkSegments:[],timeRules:[],rules:[{id:'parking',title:'Estacionamiento de prueba',activity:'parking',description:'Horario y tonelaje sin interpretación automática.',citation:'Fuente sintética',evidence,sourceUrl:'https://official.gob.mx/coremun.pdf',page:176},{id:'act',title:'Acto operativo de prueba',activity:'loading',description:'Permiso y corredor pendientes.',citation:'Acto sintético',actEvidence:{...evidence,consolidatedThrough:undefined,approvedAt:'2025-08-14'},sourceUrl:'https://official.gob.mx/act.pdf',page:70}]}});
    return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',state:'21',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:15}});
   });
   await page.goto(base);await page.getByRole('button',{name:'Guía camión',exact:true}).click();
   await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
   await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');
   await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
   await page.getByText('Estacionamiento · no es permiso de circulación',{exact:true}).waitFor();
   const details=page.getByLabel('Ámbito y fecha de esta disposición',{exact:true}).first();
   await details.getByText('Sólo perímetro rotativo de prueba',{exact:true}).waitFor();
   await details.getByText('15/11/2026',{exact:true}).waitFor();
   await details.getByText('10/12/2025 · vigencia posterior pendiente de comprobar',{exact:true}).waitFor();
   assert.equal(await page.getByRole('link',{name:'Consultar página 176 ↗',exact:true}).getAttribute('href'),'https://official.gob.mx/coremun.pdf#page=176');
   await page.getByText('14/08/2025 · publicación y vigencia posterior por comprobar',{exact:true}).waitFor();
   assert.equal(await page.getByRole('link',{name:'Consultar página 70 ↗',exact:true}).getAttribute('href'),'https://official.gob.mx/act.pdf#page=70');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('municipal parking annex filters crossings and exact polygon labels without dropping repeated source records',{timeout:60000},async()=>{
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const {context,page}=await setup(()=>{},viewport);
  const schedules=[{days:[1,2,3,4,5],status:'hours_cited',start:'08:00',end:'22:00'},{days:[6],status:'hours_cited',start:'11:00',end:'17:00'},{days:[7],status:'not_applicable_in_source'}];
  const row=(id,polygon,corridor,betweenStreets,sourcePages)=>({sourceRow:id,polygon,corridor,betweenStreets,sourcePages,schedules,geometry:null,geometryStatus:'not_validated',directionStatus:'not_specified_in_annex',routingEnforced:false});
  const annex={municipalityId:'21114',activity:'parking_operation',timezone:'America/Mexico_City',status:'reference_only',routingEnforced:false,source:{url:'https://official.gob.mx/annex.pdf',approvedAt:'2025-08-14',consultedAt:'2026-11-15',pages:[80,87,88]},notices:['Operating schedule only.','Not a routing permission.','Polígonos 5 y 6 según la fuente.'],duplicateGroups:[[126,128]],rows:[row(1,'Polígono 1 Centro Histórico','12 Poniente-Oriente','11 Norte y 4 Norte',[80]),row(122,'Polígono 5 San Alejandro - Ortopedia','29 Norte','4 Poniente y Diagonal de la 10 Poniente',[87]),row(124,'Polígono 5 San Alejandro - Ortopedia','29 A Norte','8 Poniente y Diagonal de la 10 Poniente',[87,88]),row(126,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente','Blvd. Norte y 10 Poniente',[88]),row(128,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente','Blvd. Norte y 10 Poniente',[88])]};
  try{
   await page.route('**/api/route-planner/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});
    if(url.pathname.endsWith('/21114'))return route.fulfill({json:{name:'Puebla',status:'reference_only',routingEnforced:false,source:{id:'puebla-carga',url:'https://official.gob.mx/rules',checkedAt:'2026-11-15T00:00:00Z'},notices:['Referencia parcial.'],trunkSegments:[],timeRules:[],rules:[],parkingCorridorReference:annex}});
    return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',state:'21',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:15}});
   });
   await page.goto(base);await page.getByRole('button',{name:'Guía camión',exact:true}).click();
   await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
   await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
   await page.getByText('5 registros de corredores · estacionamiento rotativo',{exact:true}).click();
   await page.locator('.parking-corridors-list>li').first().waitFor();assert.equal(await page.locator('.parking-corridors-list>li').count(),5);
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('ALEJANDRO');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===4);
   await page.getByLabel('Polígono citado',{exact:true}).selectOption('Polígono 5 San Alejandro - Ortopedia');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===2);
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('29 A Norte');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===1);
   assert.deepEqual(await page.locator('.parking-corridors-list a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),['https://official.gob.mx/annex.pdf#page=87','https://official.gob.mx/annex.pdf#page=88']);
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('ALEJANDRO');
   await page.getByLabel('Polígono citado',{exact:true}).selectOption('Polígono 6 San Alejandro - Ortopedia');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===2);
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('DIAGONAL 10 poniente');assert.equal(await page.locator('.parking-corridors-list>li').count(),2);
   await page.getByText('«No aplica» en el anexo',{exact:true}).first().waitFor();
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('sin coincidencias');await page.getByText('No hay coincidencias. Prueba con otra calle o cambia el polígono.',{exact:true}).waitFor();
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('');await page.getByLabel('Polígono citado',{exact:true}).selectOption('');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===5);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('municipal publication history distinguishes historical publication and superseded sanctions on mobile and desktop',{timeout:60000},async()=>{
 const {parkingPublicationFixture}=await import('./fixtures/parking-publications.mjs');
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const {context,page}=await setup(()=>{},viewport);
  try{
   await page.route('**/api/route-planner/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});
    if(path.endsWith('/21114'))return route.fulfill({json:{name:'Puebla',status:'reference_only',routingEnforced:false,source:{id:'puebla-carga',url:'https://official.example.test/source',checkedAt:'2026-11-16T00:00:00Z'},notices:[],trunkSegments:[],timeRules:[],rules:[],parkingCorridorReference:{municipalityId:'21114',activity:'parking_operation',timezone:'America/Mexico_City',status:'reference_only',routingEnforced:false,source:{url:'https://official.example.test/annex',approvedAt:'2025-08-14',consultedAt:'2026-11-15',pages:[87,88]},notices:[],duplicateGroups:[],rows:[],publicationReview:parkingPublicationFixture}}});
    return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',state:'21',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:15}});
   });
   await page.goto(base);await page.getByRole('button',{name:'Guía camión',exact:true}).click();await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
   await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
   await page.getByText('0 registros de corredores · estacionamiento rotativo',{exact:true}).click();
   await page.getByText(/Publicación histórica de la reforma corroborada: 14\/08\/2025/).waitFor();
   await page.getByText('Publicación y cambios revisados',{exact:true}).click();
   const history=page.locator('.publication-history');
   await history.getByText('01/10/2025 · sustituida por RES. 2025/162',{exact:true}).waitFor();
   await history.getByText('01/11/2025 · no es una comprobación de vigencia actual',{exact:true}).waitFor();
   assert.equal(await history.getByRole('link').count(),4);assert.match(await history.innerText(),/Sólo Polígono 5; no todo el municipio/);
   assert.deepEqual(await history.locator('a').evaluateAll(nodes=>nodes.map(n=>n.href)),parkingPublicationFixture.sources.map(s=>s.url));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('signing out clears the account route and stops active GPS on mobile',{timeout:60000},async()=>{
 const {context,page}=await navigationSetup(15000);
 try{
  await page.route('https://auth.example.test/auth/v1/logout*',route=>route.fulfill({status:204,body:''}));
  await page.getByRole('checkbox',{name:/Revisé los accesos y permisos/}).check();await page.getByRole('button',{name:'Iniciar navegación en la app'}).click();
  assert.equal(await page.evaluate(()=>window.__gps.started),1);
  await page.locator('.account-button').click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await page.locator('.account-button').filter({hasText:'Iniciar sesión'}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),'');assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'');
  assert.equal(await page.locator('.metrics').count(),0);assert.deepEqual(await page.evaluate(()=>window.__gps.cleared),[1]);
  assert.equal(await page.getByRole('button',{name:'Reparto',exact:true}).getAttribute('aria-pressed'),'true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await context.close();}
});

for(const width of [390,1280])test(`search recovery preserves the typed branch and confirmation at width ${width}`,{timeout:60000},async()=>{
 const {context,page}=await setup(()=>{}, {width,height:844});
 try{
  let calls=0;const query='Bodega Aurrera Express';const point={label:'Bodega Aurrera Express, Sucursal pública de prueba',lat:25.72,lng:-100.32,kind:'venue'};
  await page.route('**/api/route-planner/v1/locations/suggest?**',async route=>{
   assert.equal(new URL(route.request().url()).searchParams.get('q'),query);calls++;
   if(calls===1)return route.abort('failed');
   if(calls===2)return route.fulfill({status:503,json:{ok:false,code:'PHOTON_UNAVAILABLE',message:'Proveedor alterno temporalmente no disponible.'}});
   if(calls===3)return route.fulfill({status:200,contentType:'text/html',body:'<html>Unavailable</html>'});
   return route.fulfill({json:{ok:true,suggestions:[point]}});
  });
  await page.goto(base);const input=page.getByRole('combobox',{name:'Origen',exact:true});await input.fill(query);
  const error=page.locator('.location-search-error'),retry=page.getByRole('button',{name:'Reintentar búsqueda de origen',exact:true});
  await error.waitFor();assert.equal(await error.getAttribute('data-error-code'),'LOCATION_NETWORK_ERROR');assert.equal(await input.inputValue(),query);assert.equal(calls,1);
  await retry.click();assert.equal(await input.evaluate(node=>document.activeElement===node),true);await error.filter({hasText:'Proveedor alterno temporalmente no disponible.'}).waitFor();assert.equal(await error.getAttribute('data-error-code'),'PHOTON_UNAVAILABLE');assert.equal(calls,2);
  await retry.click();await error.filter({hasText:'respuesta no válida'}).waitFor();assert.equal(await error.getAttribute('data-error-code'),'LOCATION_INVALID_RESPONSE');assert.equal(calls,3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await retry.click();await page.getByRole('option').filter({hasText:point.label}).click();assert.equal(calls,4);assert.equal(await input.inputValue(),query);assert.equal(await page.locator('.location-confirmed').count(),0);
  await page.getByRole('button',{name:'Confirmar punto',exact:true}).click();assert.equal(await input.inputValue(),point.label);assert.equal(await page.locator('.location-confirmed').count(),1);assert.equal(await error.count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await context.close();}
});

test('mobile stalled search stops loading at the client deadline and can be retried',{timeout:60000},async()=>{
 const {context,page}=await setup(()=>{});let release;
 try{
  let calls=0;
  await page.route('**/api/route-planner/v1/locations/suggest?**',async route=>{
   calls++;if(calls===1){await new Promise(resolve=>{release=resolve;});await route.abort().catch(()=>{});return;}
   return route.fulfill({json:{ok:true,suggestions:[{label:'Sucursal después del tiempo límite',lat:25.7,lng:-100.3}]}});
  });
  await page.goto(base);const input=page.getByRole('combobox',{name:'Origen',exact:true});await input.fill('Bodega Aurrera Express');
  const error=page.locator('.location-search-error');await error.waitFor({timeout:40000});
  assert.equal(await error.getAttribute('data-error-code'),'LOCATION_SEARCH_TIMEOUT');assert.equal(await input.getAttribute('aria-busy'),'false');assert.equal(await input.inputValue(),'Bodega Aurrera Express');assert.equal(calls,1);
  await page.getByRole('button',{name:'Reintentar búsqueda de origen',exact:true}).click();await page.getByRole('option').filter({hasText:'Sucursal después del tiempo límite'}).waitFor();assert.equal(calls,2);assert.equal(await error.count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{release?.();await context.close();}
});

for(const width of [390,1280])test(`Google links block an incomplete delivery instead of silently skipping it at width ${width}`,async()=>{
 const {context,page}=await setup(()=>{},{width,height:844});
 try{
  await page.route('**/api/route-planner/**',route=>{const q=new URL(route.request().url()).searchParams.get('q');return route.fulfill({json:{ok:true,suggestions:q?[{label:q,lat:28.635300123,lng:-106.088900456}]:[]}});});await page.goto(base);
  await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Origen público de prueba');await page.getByRole('combobox',{name:'Destino',exact:true}).fill('Destino público de prueba');
  assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());assert.equal(await page.locator('.navigation-segments a').count(),0);
  await confirmPlannerPoint(page,'Origen','Origen público de prueba');await confirmPlannerPoint(page,'Destino','Destino público de prueba');
  await page.getByRole('link',{name:'Abrir puntos en Google Maps ↗',exact:true}).waitFor();
  await page.getByRole('button',{name:/Agregar parada/}).click();await page.locator('.route-point-review').waitFor();assert.equal(await page.locator('.navigation-segments a').count(),0);assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Revisar parada 1',exact:true}).click();assert.ok(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).evaluate(node=>node===document.activeElement));
  await page.getByRole('combobox',{name:'PARADA 1',exact:true}).fill('Sucursal | otra parada');assert.equal(await page.locator('.navigation-segments a').count(),0);
  await confirmPlannerPoint(page,'PARADA 1','Sucursal pública de prueba');const link=page.getByRole('link',{name:'Abrir puntos en Google Maps ↗',exact:true});await link.waitFor();
  assert.equal(new URL(await link.getAttribute('href')).searchParams.get('waypoints'),'28.635300123, -106.088900456');assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isEnabled());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await context.close();}
});

test('annex counterpart pages remain reviewable without replacing original records on mobile and desktop',{timeout:60000},async()=>{
 const {comparisonFixture}=await import('./fixtures/parking-comparison.mjs');
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const {context,page}=await setup(()=>{},viewport);
  const row=(sourceRow,polygon,corridor,sourcePages)=>({sourceRow,polygon,corridor,betweenStreets:'Cruce sintético',sourcePages,publishedSourcePages:[7],schedules:[{days:[7],status:'not_applicable_in_source'}],geometry:null,geometryStatus:'not_validated',directionStatus:'not_specified_in_annex',routingEnforced:false});
  const annex={municipalityId:'21114',activity:'parking_operation',timezone:'America/Mexico_City',status:'reference_only',routingEnforced:false,source:{url:'https://gaceta.pueblacapital.gob.mx/acta-fixture.pdf',approvedAt:'2025-08-14',consultedAt:'2026-11-15',pages:[87,88]},notices:[],duplicateGroups:[[126,128]],annexComparison:comparisonFixture,rows:[row(124,'Polígono 5 San Alejandro - Ortopedia','29 A Norte',[87,88]),row(125,'Polígono 6 San Alejandro - Ortopedia','29 B Norte',[88]),row(126,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente',[88]),row(128,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente',[88])]};
  try{
   await page.route('**/api/route-planner/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});if(path.endsWith('/21114'))return route.fulfill({json:{name:'Puebla',status:'reference_only',routingEnforced:false,source:{url:'https://official.example.test/source',checkedAt:'2026-11-18T00:00:00Z'},notices:[],trunkSegments:[],timeRules:[],rules:[],parkingCorridorReference:annex}});return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',state:'21',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:15}});});
   await page.goto(base);await page.getByRole('button',{name:'Guía camión',exact:true}).click();await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
   await page.getByText('4 registros de corredores · estacionamiento rotativo',{exact:true}).click();await page.getByText('Contraste de anexos · 4 registros',{exact:true}).click();await page.getByText(/No significa que los PDF sean idénticos/).waitFor();await page.getByText(/La ambigüedad no queda resuelta/).waitFor();
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('29 A Norte');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===1);assert.deepEqual(await page.locator('.parking-corridors-list a').evaluateAll(nodes=>nodes.map(n=>n.href)),[annex.source.url+'#page=87',annex.source.url+'#page=88',comparisonFixture.documents[1].url+'#page=7']);
   await page.getByLabel('Buscar corredor o cruce',{exact:true}).fill('');await page.getByLabel('Polígono citado',{exact:true}).selectOption('Polígono 6 San Alejandro - Ortopedia');await page.waitForFunction(()=>document.querySelectorAll('.parking-corridors-list>li').length===3);assert.equal(await page.locator('.parking-corridors-list>li').count(),3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('loading references expose selected article counterparts without replacing vehicle conditions or granting permits',{timeout:60000},async()=>{
 const {provisionReviewFixture:review}=await import('./fixtures/provision-review.mjs');
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const {context,page}=await setup(()=>{},viewport);
  const rules=[{id:'small',title:'Hasta 3.5 t de prueba',description:'08:00–20:59; permiso por corroborar.',citation:'Acta de prueba, artículo 11',activity:'loading',vehicleConditions:{payloadCapacityT:{lte:3.5}},page:70,sourceUrl:review.documents[0].url,documentReview:review},{id:'permit',title:'Permiso previo de prueba',description:'20 minutos y 10 de tolerancia; sin autorización automática.',citation:'Acta de prueba, artículos 12–13',activity:'loading',page:70,sourceUrl:review.documents[0].url,documentReview:{...review,articles:[{number:12,normalizedSha256:'d'.repeat(64),characters:286},{number:13,normalizedSha256:'e'.repeat(64),characters:394}]}},{id:'legacy',title:'Fuente anterior de prueba',description:'Ámbito independiente.',citation:'Lineamientos de prueba',vehicleConditions:{payloadCapacityT:{lt:3.5}}}];
  try{
   await page.route('**/api/route-planner/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/source-status'))return route.fulfill({json:{sources:[],intervalHours:6,stale:false}});if(path.endsWith('/21114'))return route.fulfill({json:{municipalityId:'21114',name:'Puebla',status:'reference_only',routingEnforced:false,source:{url:review.documents[0].url,checkedAt:'2026-11-18T00:00:00Z'},notices:[],trunkSegments:[],timeRules:[],rules}});return route.fulfill({json:{states:[{id:'21',name:'Puebla'}],municipalities:[{id:'21114',state:'21',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:15}});});
   await page.goto(base);await page.getByRole('button',{name:'Guía camión',exact:true}).click();await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
   const small=page.getByRole('article',{name:'Referencia Hasta 3.5 t de prueba',exact:true});await small.getByText('Contrastar esta referencia · artículos 11',{exact:true}).click();await small.getByText(/No acredita permiso vigente/).waitFor();assert.deepEqual(await small.locator('.provision-review a').evaluateAll(nodes=>nodes.map(n=>n.href)),[review.documents[0].url+'#page=70',review.documents[1].url+'#page=7']);assert.match(await small.locator('.vehicle-reference-comparison').innerText(),/hasta 3.5 t/);
   const permit=page.getByRole('article',{name:'Referencia Permiso previo de prueba',exact:true});await permit.getByText('Contrastar esta referencia · artículos 12, 13',{exact:true}).click();await permit.getByText(/permiso vigente/).waitFor();assert.equal(await page.getByRole('article',{name:'Referencia Fuente anterior de prueba',exact:true}).locator('.provision-review').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});
