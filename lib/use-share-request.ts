'use client';
import { useEffect, useRef, useState } from 'react';
import { SHARE_TIMEOUT_MS } from './route-sharing';

// A pending response must never survive leaving a panel or changing account.
export function useShareRequest(messages?: { timeout: string; connection: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const generation = useRef(0);
  function cancel() { generation.current++; request.current?.controller.abort(); clearTimeout(request.current?.timer); request.current = null; }
  useEffect(() => cancel, []);
  async function run<T>(task: (signal: AbortSignal) => PromiseLike<{ data: T; error: { message: string } | null }>, done: (data: T) => void) {
    cancel(); const version = generation.current, controller = new AbortController();
    setBusy(true); setError('');
    const timer = setTimeout(() => {
      if (generation.current !== version) return;
      cancel(); setBusy(false); setError(messages?.timeout || 'La solicitud tardó demasiado. Reintenta; si creabas un enlace, actualiza la lista antes de generar otro.');
    }, SHARE_TIMEOUT_MS);
    request.current = { controller, timer };
    try {
      const result = await task(controller.signal);
      if (generation.current !== version || controller.signal.aborted) return;
      if (result.error) throw new Error(result.error.message);
      done(result.data);
    } catch (cause) {
      if (generation.current === version && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : messages?.connection || 'No se pudo conectar con los enlaces compartidos.');
    } finally {
      clearTimeout(timer);
      if (generation.current === version) { setBusy(false); request.current = null; }
    }
  }
  return { busy, error, run };
}
