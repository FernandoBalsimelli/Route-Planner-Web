// The proxy budgets 25 s for locations; allow 5 s for browser/network overhead.
export const LOCATION_SEARCH_TIMEOUT_MS = 30000;

export class LocationSearchError extends Error {
  constructor(public readonly code: string, message: string, public readonly status?: number) {
    super(message); this.name = 'LocationSearchError';
  }
}
type SearchPayload = { suggestions: unknown[]; warning?: unknown };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const cancelled = () => new DOMException('Búsqueda cancelada.', 'AbortError');
const invalidResponse = (status: number) => new LocationSearchError('LOCATION_INVALID_RESPONSE', 'La búsqueda devolvió una respuesta no válida. Vuelve a intentarlo o corrobora el punto en el mapa.', status);

export async function fetchLocationSuggestions(url: string, signal?: AbortSignal, timeoutMs = LOCATION_SEARCH_TIMEOUT_MS): Promise<SearchPayload> {
  if (signal?.aborted) throw signal.reason ?? cancelled();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => { reject(signal?.reason ?? cancelled()); controller.abort(); };
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      reject(new LocationSearchError('LOCATION_SEARCH_TIMEOUT', 'La búsqueda de ubicaciones tardó demasiado. Vuelve a intentarlo o corrobora el punto en el mapa.'));
      controller.abort();
    }, timeoutMs);
  });
  try {
    // Race the full operation, including the body. Aborting alone depends on
    // fetch/body honoring the signal and must not leave the field busy forever.
    return await Promise.race([interrupted, (async () => {
      let response: Response;
      try { response = await fetch(url, { signal: controller.signal }); }
      catch {
        if (controller.signal.aborted) throw cancelled();
        throw new LocationSearchError('LOCATION_NETWORK_ERROR', 'No se pudo conectar con la búsqueda de ubicaciones. Revisa tu conexión y vuelve a intentarlo.');
      }
      if (controller.signal.aborted) throw cancelled();
      let payload: unknown;
      try { payload = await response.json(); }
      catch {
        if (controller.signal.aborted) throw cancelled();
        if (response.ok) throw invalidResponse(response.status);
      }
      if (controller.signal.aborted) throw cancelled();
      if (!response.ok) {
        const code = object(payload) && typeof payload.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(payload.code) ? payload.code : 'LOCATION_HTTP_ERROR';
        const message = object(payload) && typeof payload.message === 'string' && payload.message.trim()
          ? payload.message.trim().slice(0, 500)
          : response.status === 429 ? 'El servicio de búsqueda alcanzó su límite de consultas (HTTP 429). Espera un momento antes de reintentar.'
          : `El servicio de búsqueda respondió con un error (HTTP ${response.status}). Vuelve a intentarlo o corrobora el punto en el mapa.`;
        throw new LocationSearchError(code, message, response.status);
      }
      if (!object(payload) || payload.ok === false || !Array.isArray(payload.suggestions)) throw invalidResponse(response.status);
      return { suggestions: payload.suggestions, warning: payload.warning };
    })()]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    controller.abort();
  }
}
