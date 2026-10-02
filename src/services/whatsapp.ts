// Sin país implícito: un número local corto requiere completar su código internacional.
export function whatsappNumber(value: string): string | null {
  if (/[a-z]/i.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
}
export function whatsappUrl(phone: string, message?: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
