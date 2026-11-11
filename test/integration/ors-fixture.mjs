// Loaded only via --import by the integration test's API child process.
// Auth and PostgREST remain real; no external routing quota is consumed.
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(process.env.SUPABASE_URL, 'http://127.0.0.1:54321');
assert.equal(process.env.ORS_API_KEY, 'route-planner-synthetic-provider');
assert.ok(process.env.RP_ORS_CAPTURE_FILE);
const realFetch = globalThis.fetch;
function polyline(points) {
  let lat = 0, lng = 0, encoded = '';
  const encode = value => { let n = value < 0 ? ~(value << 1) : value << 1, result = ''; while (n >= 32) { result += String.fromCharCode((32 | (n & 31)) + 63); n >>>= 5; } return result + String.fromCharCode(n + 63); };
  for (const [longitude, latitude] of points) { const y = Math.round(latitude * 1e5), x = Math.round(longitude * 1e5); encoded += encode(y-lat) + encode(x-lng); lat=y; lng=x; }
  return encoded;
}
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'api.heigit.org') {
    if (url.pathname.includes('/pelias/v1/reverse')) {
      const lat = Number(url.searchParams.get('point.lat')), lng = Number(url.searchParams.get('point.lon'));
      return Response.json({ features: [{ geometry: { coordinates: [lng, lat] }, properties: { label: `Acceso de prueba ${lat}, ${lng}`, layer: 'address' } }] });
    }
    if (url.pathname.includes('/directions/')) {
      const body = JSON.parse(init.body);
      appendFileSync(process.env.RP_ORS_CAPTURE_FILE, JSON.stringify({ path: url.pathname, body }) + '\n');
      const routes = [{ summary: { distance: 3421, duration: 620 }, geometry: polyline(body.coordinates), way_points: body.coordinates.map((_,i)=>i), segments: [{ distance: 3421, duration: 620, steps: [{ instruction: 'Indicación sintética de la prueba, sin validación vial', distance: 3421, duration: 620, type: 0 }] }] }];
      if (body.alternative_routes) {
        const [start,end] = body.coordinates;
        const coordinates = [start, [(start[0]+end[0])/2+.002,(start[1]+end[1])/2+.002], end];
        routes.push({ summary: { distance: 4100, duration: 780 }, geometry: polyline(coordinates), way_points: [0,2], segments: [{ distance:4100,duration:780,steps:[{instruction:'Alternativa sintética',distance:4100,duration:780,type:0,way_points:[0,2]}] }] });
      }
      return Response.json({ routes });
    }
    if (url.pathname === '/vroom/v0') {
      const body = JSON.parse(init.body);
      appendFileSync(process.env.RP_ORS_CAPTURE_FILE, JSON.stringify({ path: url.pathname, body }) + '\n');
      return Response.json({ routes: [{ steps: [{ type: 'start' }, ...body.jobs.toReversed().map(job => ({ type: 'job', id: job.id })), { type: 'end' }] }], unassigned: [] });
    }
    throw Error(`Unexpected fixture provider request: ${url.pathname}`);
  }
  // A test must not fall through to another geocoding service.
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), `Unexpected external request to ${url.hostname}`);
  return realFetch(input, init);
};
