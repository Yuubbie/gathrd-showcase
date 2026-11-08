export function cleanPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  if (digits.startsWith('234')) return digits;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

export function telHref(raw) {
  const cleaned = cleanPhone(raw);
  return cleaned ? `tel:+${cleaned}` : '';
}

export function waHref(raw, message = '') {
  const cleaned = cleanPhone(raw);
  if (!cleaned) return '';
  if (!message) return `https://wa.me/${cleaned}`;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function smsHref(raw, message = '') {
  const cleaned = cleanPhone(raw);
  if (!cleaned) return '';
  if (!message) return `sms:+${cleaned}`;
  return `sms:+${cleaned}?body=${encodeURIComponent(message)}`;
}
