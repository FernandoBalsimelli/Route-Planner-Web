import assert from 'node:assert/strict';
import { act } from 'react';

// Drive the same two explicit choices as an operator. Only the suggestion
// response is controlled; route requests retain each test's original behavior.
export async function confirmLocation(input, value) {
  const view = input.ownerDocument.defaultView, previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url), view.location.href);
    if (parsed.pathname.endsWith('/v1/locations/suggest')) return Response.json({ok:true,suggestions:[{label:parsed.searchParams.get('q'),lat:input.getAttribute('aria-label')==='Destino'?28.64:28.63,lng:-106.07}]});
    return previous(url, options);
  };
  try {
    await act(async()=>{Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new view.Event('input',{bubbles:true}));});
    await act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
    const field = input.closest('.location-field');
    const option = field.querySelector('[role="option"]');assert.ok(option, `suggestion required for ${value}`);
    await act(async()=>option.click());
    const confirm = [...field.querySelectorAll('button')].find(button=>button.textContent==='Confirmar punto');assert.ok(confirm);
    await act(async()=>confirm.click());
  } finally { globalThis.fetch = previous; }
}
