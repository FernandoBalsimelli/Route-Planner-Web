import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { pdfPageRange, pdfTextLines } from './manifest-pdf-text';

export type PdfManifestResult = { text: string; totalPages: number; pages: number[]; ocrPages: number[] };
export type PdfManifestOptions = { firstPage?: number; lastPage?: number; forceOcr?: boolean };

export async function readPdfManifest(file: File, onProgress: (message: string) => void, signal: AbortSignal, options: PdfManifestOptions = {}): Promise<PdfManifestResult> {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Selecciona un archivo PDF del manifiesto.');
  if (file.size > 20 * 1024 * 1024) throw new Error('El PDF supera 20 MB. Divide o reduce el documento antes de leerlo.');
  if (signal.aborted) throw new DOMException('Lectura cancelada', 'AbortError');
  const controller = new AbortController();
  let loading: PDFDocumentLoadingTask | undefined;
  let rendering: RenderTask | undefined;
  let timedOut = false;
  const cancel = () => { controller.abort(); rendering?.cancel(); void loading?.destroy().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => { timedOut = true; cancel(); }, 180000);
  function check() {
    if (timedOut) throw new Error('La lectura tardó demasiado. Lee menos páginas o usa una imagen más clara.');
    if (controller.signal.aborted) throw new DOMException('Lectura cancelada', 'AbortError');
  }
  try {
    onProgress('Preparando lector de PDF…');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    check();
    const assetBase = `/pdfjs/${pdfjs.version}/`;
    if (typeof window !== 'undefined') pdfjs.GlobalWorkerOptions.workerSrc = assetBase + 'pdf.worker.min.mjs';
    const bytes = new Uint8Array(await file.arrayBuffer());
    check();
    // Parse local bytes, not a document URL. No document upload or PDF scripting.
    loading = pdfjs.getDocument({
      data: bytes, enableXfa: false, stopAtErrors: true, useSystemFonts: true,
      maxImageSize: 12_000_000, canvasMaxAreaInBytes: 16_000_000,
      cMapUrl: assetBase + 'cmaps/', cMapPacked: true,
      standardFontDataUrl: assetBase + 'standard_fonts/', wasmUrl: assetBase + 'wasm/', iccUrl: assetBase + 'iccs/',
    });
    const pdf = await loading.promise;
    check();
    const pages = pdfPageRange(pdf.numPages, options.firstPage, options.lastPage);
    const texts: string[] = [], ocrPages: number[] = [];
    let totalCharacters = 0;
    for (const number of pages) {
      check(); onProgress(`Leyendo PDF: página ${number} de ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        check();
        let text = pdfTextLines(content.items);
        if (options.forceOcr || text.replace(/\s/g, '').length < 20) {
          if (typeof document === 'undefined') throw new Error(`La página ${number} necesita OCR. Ábrela en el navegador para leer el PDF escaneado.`);
          onProgress(`La página ${number} es una imagen; preparando OCR…`);
          const original = page.getViewport({ scale: 1 });
          const scale = Math.min(2, 1800 / Math.max(original.width, original.height), Math.sqrt(3_000_000 / (original.width * original.height)));
          const viewport = page.getViewport({ scale });
          if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) throw new Error('La página no tiene dimensiones válidas.');
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Tu navegador no pudo preparar la página. Puedes pegar el texto o usar una foto.');
          try {
            rendering = page.render({ canvas, canvasContext: context, viewport });
            await rendering.promise; rendering = undefined; check();
            const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo leer la imagen del PDF.')), 'image/png'));
            check();
            const { scanManifest } = await import('./manifest-ocr');
            text = await scanManifest(new File([blob], 'pagina.png', { type: 'image/png' }), message => { if (!controller.signal.aborted) onProgress(`Página ${number}: ${message}`); }, controller.signal);
            ocrPages.push(number);
          } finally { canvas.width = 0; canvas.height = 0; }
        }
        totalCharacters += text.length;
        if (totalCharacters > 29980) throw new Error('El texto del PDF supera el espacio del manifiesto. Selecciona menos páginas para no omitir entregas.');
        texts.push(text);
      } finally { page.cleanup(); }
    }
    check();
    return { text: texts.join('\n\n'), totalPages: pdf.numPages, pages, ocrPages };
  } catch (error) {
    check();
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('El PDF está protegido con contraseña. Usa una copia sin protección o pega las direcciones.');
    if (error instanceof Error && error.name === 'InvalidPDFException') throw new Error('El archivo no es un PDF válido o está dañado. Usa otra copia o pega las direcciones.');
    throw error;
  } finally {
    clearTimeout(timeout); signal.removeEventListener('abort', cancel);
    rendering?.cancel();
    await loading?.destroy().catch(() => {});
  }
}
