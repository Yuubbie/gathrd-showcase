import { Phone, MessageSquare } from 'lucide-react';
import { telHref, waHref } from '../lib/phone';

export default function ContactActions({
  phone,
  name,
  message,
  size = 'sm',
  className = '',
  stopClick = false,
}) {
  const tel = telHref(phone);
  const wa = waHref(phone, message || (name ? `Hello ${name}` : ''));
  if (!tel && !wa) return null;

  const stop = stopClick
    ? (e) => {
        e.stopPropagation();
      }
    : undefined;

  const btn =
    size === 'md'
      ? 'text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors'
      : 'text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors';

  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`} onClick={stop}>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name ? `WhatsApp ${name}` : 'WhatsApp'}
          className={`bg-emerald-600 hover:bg-emerald-700 text-white ${btn}`}
        >
          <MessageSquare size={13} /> WhatsApp
        </a>
      )}
      {tel && (
        <a
          href={tel}
          aria-label={name ? `Call ${name}` : 'Call'}
          className={`bg-white border border-ink/15 hover:bg-ink/5 text-ink ${btn}`}
        >
          <Phone size={13} /> Call
        </a>
      )}
    </div>
  );
}
