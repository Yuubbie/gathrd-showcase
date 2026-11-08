import { useState } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { smsHref, telHref, waHref } from '../lib/phone';
import { fillSoulMessage, nextSoulStep, timesReachedLabel } from '../lib/soulFollowUp';

export default function SoulFollowUpActions({ row, churchName, onRecorded }) {
  const [busy, setBusy] = useState(false);
  const times = Number(row.times_reached || 0);
  const step = nextSoulStep(times);
  const message = fillSoulMessage(step.template, {
    name: row.full_name,
    church: churchName,
  });
  const wa = waHref(row.phone, message);
  const sms = smsHref(row.phone, message);
  const tel = telHref(row.phone);

  async function record(channel) {
    setBusy(true);
    const { data } = await supabase.rpc('record_soul_outreach', {
      p_id: row.id,
      p_channel: channel,
    });
    setBusy(false);
    if (data?.ok && onRecorded) onRecorded();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50">
        {timesReachedLabel(times)}
        {row.last_contacted_at
          ? ` · last ${new Date(row.last_contacted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
          : ''}
        {times < 4 ? ` · next: ${step.label}` : ' · sequence complete'}
      </p>
      <p className="text-xs text-ink/60 bg-parchment rounded-lg px-2.5 py-2">{message}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => record('whatsapp')}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
          >
            <MessageSquare size={13} />
            {busy ? 'Saving…' : times < 4 ? `WhatsApp: ${step.label}` : 'WhatsApp again'}
          </a>
        )}
        {sms && (
          <a
            href={sms}
            onClick={() => record('sms')}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-ink/15 hover:bg-ink/5 text-ink flex items-center gap-1"
          >
            <MessageSquare size={13} />
            {times < 4 ? 'SMS' : 'SMS again'}
          </a>
        )}
        {tel && (
          <a
            href={tel}
            onClick={() => record('call')}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-ink/15 hover:bg-ink/5 text-ink flex items-center gap-1"
          >
            <Phone size={13} /> Call
          </a>
        )}
      </div>
    </div>
  );
}
