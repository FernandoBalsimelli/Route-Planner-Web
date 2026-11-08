import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://route-planner-api-fernandobalsimellis-projects.vercel.app';
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
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
    const responseHeaders = new Headers();
    responseHeaders.set('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    responseHeaders.set('cache-control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    console.error('Route Planner API proxy failed:', message);
    return Response.json({
      ok: false,
      code: 'API_UPSTREAM_UNAVAILABLE',
      message: 'No se pudo conectar con el servicio de Route Planner. Comprueba la conexión e inténtalo de nuevo.',
    }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}
