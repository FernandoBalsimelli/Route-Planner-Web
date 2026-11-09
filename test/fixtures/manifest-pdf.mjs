// Synthetic public-address fixtures. No customer documents or personal data.
export function manifestPdf(pages = [['Bodega Aurrera Express', 'Calle Cedro 312, Chihuahua'], ['Bodega Aurrera Express', 'Avenida Universidad 100, Monterrey']]) {
  const objects = [null, '<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for (const lines of pages) {
    const page = objects.length, content = page + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`);
    const stream = 'BT /F1 14 Tf 40 740 Td 22 TL ' + lines.map((line, i) => `${i ? 'T* ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join(' ') + ' ET';
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  return assemblePdf(objects);
}
export function assemblePdf(objects) {
  const chunks = [Buffer.from('%PDF-1.4\n')], offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets.push(chunks.reduce((n, chunk) => n + chunk.length, 0));
    chunks.push(Buffer.from(`${i} 0 obj\n`), Buffer.isBuffer(objects[i]) ? objects[i] : Buffer.from(objects[i]), Buffer.from('\nendobj\n'));
  }
  const xref = chunks.reduce((n, chunk) => n + chunk.length, 0);
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
