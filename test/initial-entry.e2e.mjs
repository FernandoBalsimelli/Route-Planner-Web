import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.RP_BASE_URL||'http://127.0.0.1:4462';
let server,browser;
before(async()=>{
 if(!process.env.RP_BASE_URL){
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','4462','-H','127.0.0.1'],{stdio:'ignore'});
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready,'production build starts');
 }
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();server?.kill('SIGTERM');});

test('an address entered before application scripts load is not silently lost after startup on mobile and desktop',async()=>{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  let release;const gate=new Promise(resolve=>{release=resolve;});let scripts=0;const queries=[];
  try{
   await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')}));
   await context.route('https://fonts.googleapis.com/**',route=>route.abort());await context.route('https://fonts.gstatic.com/**',route=>route.abort());
   await context.route('**/_next/static/**/*.js',async route=>{scripts++;await gate;await route.continue();});
   await context.route('**/api/route-planner/**',route=>{
    const url=new URL(route.request().url());if(url.pathname.endsWith('/suggest')){queries.push(url.searchParams.get('q'));return route.fulfill({json:{ok:true,suggestions:[{label:'Acceso sintético corroborable',lat:28.635300123,lng:-106.088900456}]}});}
    return route.fulfill({json:{ok:true}});
   });
   const page=await context.newPage();await page.goto(base,{waitUntil:'commit'});
   const input=page.getByRole('combobox',{name:'Origen',exact:true}),value='28.635300123,-106.088900456';
   await input.waitFor({state:'visible'});assert.ok(scripts>0,'scripts are held while server-rendered fields are visible');
   // Native keyboard events, rather than fill/DOM assignment, distinguish a
   // real early-entry problem from the previous computer-use timing observation.
   await input.pressSequentially(value,{delay:15});assert.equal(await input.inputValue(),value);assert.equal(queries.length,0);
   release();await page.locator('.leaflet-container').first().waitFor();
   assert.equal(await input.inputValue(),value,'startup must preserve the address accepted before hydration');
   assert.equal(await page.locator('.location-confirmed').count(),0,'typing never confirms a point');
   await input.pressSequentially(' ');await page.getByRole('listbox',{name:'Sugerencias para Origen',exact:true}).waitFor();
   assert.equal(queries.at(-1),value);assert.equal(await input.inputValue(),value+' ');assert.equal(await page.locator('.location-confirmed').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{release();await context.close();}
 }
});
