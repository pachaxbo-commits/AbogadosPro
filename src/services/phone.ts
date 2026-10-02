export const PHONE_COUNTRIES = [
  ['591', 'Bolivia'], ['54', 'Argentina'], ['595', 'Paraguay'],
  ['51', 'Perú'], ['56', 'Chile'], ['55', 'Brasil'],
  ['57', 'Colombia'], ['1', 'Estados Unidos/Canadá'],
  ['593', 'Ecuador'], ['598', 'Uruguay'], ['58', 'Venezuela'],
  ['52', 'México'], ['34', 'España'],
] as const;
export interface PhoneParts { code: string; number: string }

// Interpretación para el editor solamente: no migra ni reescribe registros al abrirlos.
export function splitPhone(value: string): PhoneParts {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  const international = /^\s*(\+|00)/.test(value) || digits.length >= 10;
  if (international) {
    const country = PHONE_COUNTRIES.find(([code]) => digits.startsWith(code));
    if (country) return { code: country[0], number: digits.slice(country[0].length) };
    return { code: '', number: value.trim() }; // País no listado: conserva el número completo.
  }
  return { code: '591', number: value.trim() };
}
export function joinPhone({ code, number }: PhoneParts): string {
  if (!number.trim()) return '';
  // No ocultar entradas inválidas: la validación nativa puede explicarlas al usuario.
  if (/[^\d\s()+-]/.test(number)) return number;
  const digits = number.replace(/\D/g, '');
  return digits ? `+${code}${code ? digits : digits.replace(/^00/, '')}` : '';
}

