import assert from 'node:assert/strict';
import {test,after,afterEach}from'node:test';import React,{act}from'react';import{JSDOM}from'jsdom';import{parseProvisionReview}from'../lib/provision-review.ts';import{provisionReviewFixture as fixture}from'./fixtures/provision-review.mjs';
test('provision review only exposes safe sources for the selected municipality and nonlegal reviewed text',()=>{
 const result=parseProvisionReview({...fixture,privateField:'omitted'},'21114');assert.equal(result.municipalityId,'21114');assert.equal(result.privateField,undefined);assert.deepEqual(result.documents.map(d=>d.pages),[[70],[7]]);assert.equal(parseProvisionReview(fixture,'08019'),null);
 const mutations=[s=>s.routingEnforced=true,s=>s.legalValidityVerified=true,s=>s.status='approved',s=>s.reviewedAt='2026-02-30',s=>s.documents[0].url='javascript:alert(1)',s=>s.documents[0].url='https://bad.example/private',s=>s.documents[0].url='https://user:pass@gaceta.pueblacapital.gob.mx/doc',s=>s.documents[0].pages=[0],s=>s.documents[1].pages=[19],s=>s.documents[0].pages=[70,70],s=>s.documents[0].sha256='bad',s=>s.articles[0].number=14,s=>s.articles.push(s.articles[0])];
 for(const mutate of mutations){const s=structuredClone(fixture);mutate(s);assert.equal(parseProvisionReview(s,'21114'),null);}
});
const dom=new JSDOM('<body></body>',{url:'https://routes.example.test'});Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const{createRoot}=await import('react-dom/client');const{default:Review}=await import('../components/MunicipalProvisionReview.tsx');let root,container;
async function render(review){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Review,{review,municipalityId:'21114'})));}
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>dom.window.close());
test('review is folded with both counterpart pages and keeps permit, scope and validity limitations visible',async()=>{
 await render(fixture);assert.equal(container.querySelector('details').open,false);assert.match(container.querySelector('summary').textContent,/artículos 11/);assert.deepEqual([...container.querySelectorAll('a')].map(a=>a.href),[fixture.documents[0].url+'#page=70',fixture.documents[1].url+'#page=7']);assert.match(container.textContent,/no es peso bruto/);assert.match(container.textContent,/No acredita permiso vigente/);
});
test('malformed or wrong-jurisdiction evidence cannot expose corroboration links',async()=>{await render({...fixture,municipalityId:'08019'});assert.equal(container.querySelectorAll('a').length,0);assert.match(container.textContent,/No se pudo verificar el contraste/);});
