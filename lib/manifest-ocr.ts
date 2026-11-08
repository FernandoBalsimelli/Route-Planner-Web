import type { Worker } from 'tesseract.js';

export async function scanManifest(file: File, onProgress: (message: string) => void, signal: AbortSignal): Promise<string> {
  if (!/^image\/(jpeg|png|webp|bmp)$/.test(file.type)) throw new Error('Usa una foto JPG, PNG o WebP del manifiesto. También puedes pegar el texto.');
  if (file.size > 15 * 1024 * 1024) throw new Error('La foto supera 15 MB. Recorta o reduce la imagen e inténtalo de nuevo.');
  const { createWorker } = await import('tesseract.js');
  if (signal.aborted) throw new DOMException('Lectura cancelada', 'AbortError');
  let worker: Worker | undefined;
  let finished = false;
  const cancel = () => { void worker?.terminate(); };
  signal.addEventListener('abort', cancel, { once: true });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectOnAbort: (() => void) | undefined;
  let rejectWorkerError: (error: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => { rejectWorkerError = reject; });
  try {
    // Recognize locally in a Web Worker. Only the public language/engine files
    // are downloaded; the manifest image is never sent to an OCR service.
    const work = (async () => {
      worker = await createWorker('spa', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
        errorHandler: error => rejectWorkerError(new Error('El lector de fotos falló: ' + String(error).slice(0, 220))),
        logger: event => { if (!signal.aborted) onProgress(event.status === 'recognizing text' ? `Leyendo foto: ${Math.round(event.progress * 100)} %` : 'Preparando lector de fotos…'); },
      });
      if (signal.aborted || finished) { await worker.terminate(); throw new DOMException('Lectura cancelada', 'AbortError'); }
      const { data } = await worker.recognize(file);
      return data.text;
    })();
    const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('La lectura tardó demasiado. Intenta una foto más clara o pega las direcciones.')), 120000); });
    const cancelled = new Promise<never>((_, reject) => { rejectOnAbort = () => reject(new DOMException('Lectura cancelada', 'AbortError')); signal.addEventListener('abort', rejectOnAbort, { once: true }); });
    return await Promise.race([work, deadline, cancelled, failed]);
  } finally {
    finished = true; clearTimeout(timeout); signal.removeEventListener('abort', cancel); if (rejectOnAbort) signal.removeEventListener('abort', rejectOnAbort); await worker?.terminate();
  }
}
