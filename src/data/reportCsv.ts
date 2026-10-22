/** RFC-style CSV quoting plus spreadsheet formula neutralisation for text cells. */
export function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? '');
  if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
/** Starts a browser download; it does not assert the user saved the file. */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  try { document.body.append(link); link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
}
