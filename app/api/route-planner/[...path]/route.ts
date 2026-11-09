import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://route-planner-api.vercel.app';
  try {
    const { path } = await context.params;
    const target = new URL('/' + path.map(segment => encodeURIComponent(segment)).join('/'), apiBase);
    target.search = request.nextUrl.search;
    const headers = new Headers();
    const authorization = request.headers.get('authorization');
    const contentType = request.headers.get('content-type');
    if (authorization) headers.set('authorization', authorization);
    if (contentType) headers.set('content-type', contentType);
    headers.set('accept', 'application/json');

    const method = request.method;
    // Planning may include geocoding, stop optimization, then directions. Its
    // combined budget must exceed the provider timeouts in the API.
    const timeoutMs = path.join('/') === 'v1/routes/plan' ? 75000 : 25000;
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!upstream.headers.get('content-type')?.includes('application/json')) {
      console.error('Route Planner API returned a non-JSON response:', upstream.status);
      await upstream.body?.cancel();
      return Response.json({
        ok: false,
        code: 'API_UPSTREAM_UNAVAILABLE',
        message: 'El servicio de rutas no está disponible en este momento. Intenta de nuevo en unos momentos.',
      }, { status: 502, headers: { 'cache-control': 'no-store' } });
    }
    const responseHeaders = new Headers();
    responseHeaders.set('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    responseHeaders.set('cache-control', 'no-store');
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    console.error('Route Planner API proxy failed:', message);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return Response.json({
      ok: false,
      code: timedOut ? 'API_UPSTREAM_TIMEOUT' : 'API_UPSTREAM_UNAVAILABLE',
      message: timedOut
        ? 'El servicio de rutas tardó demasiado en responder. Intenta de nuevo en unos momentos.'
        : 'No se pudo conectar con el servicio de Route Planner. Intenta de nuevo en unos momentos.',
    }, { status: timedOut ? 504 : 502, headers: { 'cache-control': 'no-store' } });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}
