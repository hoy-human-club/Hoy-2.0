/** Display obscuring only, never phone validation, authorization or server redaction.
 * Retains the existing three leading / four trailing digits (plus an explicit short prefix).
 * Unsupported text and extensions have no raw fallback. The stored contact is never changed.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (typeof phone !== 'string') return '—';
  const value = phone.trim();
  if (!/^\+?[\d .()\-\u00a0\u202f]+$/.test(value) || !/^\+?[\d(]/.test(value) || !/[\d)]$/.test(value)) return '—';
  let open = false, digitsInGroup = 0;
  for (const char of value) {
    if (char === '(') { if (open) return '—'; open = true; digitsInGroup = 0; }
    else if (char === ')') { if (!open || !digitsInGroup) return '—'; open = false; }
    else if (open && /\d/.test(char)) digitsInGroup++;
  }
  if (open) return '—';
  const obscure = (digits: string) => digits.length >= 8 ? `${digits.slice(0, 3)} ··· ${digits.slice(-4)}` : '—';
  // Preserve the existing explicitly separated prefix + contiguous national output.
  // This is a grouping hint already present in the input, not an inferred country code.
  const prefix = value.match(/^(\+?\d{1,3})([ .\-\u00a0\u202f]+)(.+)$/);
  if (prefix) {
    const rest = prefix[3].replace(/\D/g, '');
    if (rest.length >= 8) return `${prefix[1]}${/^\d+$/.test(prefix[3]) ? prefix[2] : ' '}${obscure(rest)}`;
  }
  const digits = value.replace(/\D/g, '');
  const masked = obscure(digits);
  return masked === '—' ? masked : `${value.startsWith('+') ? '+' : ''}${masked}`;
}
