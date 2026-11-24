export type SourceReportRefresh = {
  status: 'available' | 'unavailable';
  attemptedAt: string | null;
  lastSuccessAt: string | null;
  receivedCheckedAt: string | null;
  nextRefreshAt: string | null;
  reason: string | null;
};

const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

// This optional field describes retrieval of the report, not a legal review or
// a new check of each document. Older API responses remain usable without it.
export function sourceReportRefresh(value: unknown): SourceReportRefresh | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.status !== 'available' && data.status !== 'unavailable') return null;
  let reason: string | null = null;
  if (data.status === 'unavailable') {
    const code = typeof data.error === 'string' ? data.error : '';
    const http = /^REPORT_HTTP_([1-5]\d\d)$/.exec(code);
    if (http) reason = `El servicio del reporte respondió HTTP ${http[1]}.`;
    else if (code === 'REPORT_TOO_LARGE') reason = 'El reporte recibido supera el tamaño permitido.';
    else if (['REPORT_INVALID_JSON', 'REPORT_INVALID_SCHEMA'].includes(code)) reason = 'El reporte recibido tiene un formato no válido.';
    else if (code === 'REPORT_FUTURE_DATE') reason = 'La fecha del reporte recibido está en el futuro y no se aceptó.';
    else if (code === 'REPORT_NETWORK_OR_TIMEOUT') reason = 'La conexión con el reporte falló o excedió el tiempo de espera.';
    else reason = 'No se pudo recuperar el reporte remoto.';
  }
  return {
    status: data.status,
    attemptedAt: timestamp(data.attemptedAt),
    lastSuccessAt: timestamp(data.lastSuccessAt),
    receivedCheckedAt: timestamp(data.receivedCheckedAt),
    nextRefreshAt: timestamp(data.nextRefreshAt),
    reason,
  };
}
