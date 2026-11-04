import { useState, useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const METHOD_LABELS = { qr_self: 'QR', dashboard: 'App', manual: 'Manual' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyAttendance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_my_attendance', { p_limit: 50 });
      if (rpcError || !data?.ok) {
        setError('Could not load your attendance. Try again.');
        setRows([]);
      } else {
        setRows(Array.isArray(data.rows) ? data.rows : []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={20} className="text-signal" />
          <h1 className="font-display text-xl font-bold text-ink">My attendance</h1>
        </div>
        <p className="text-ink/50 text-sm">Services you have been marked present at.</p>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : error ? (
            <p className="text-rose text-sm py-6 text-center">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No attendance recorded on this login yet.</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {rows.map((row) => (
                <div key={row.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{row.service_name || 'Service'}</p>
                    <p className="text-xs text-ink/50">{formatDate(row.service_date)}</p>
                  </div>
                  <span className="text-xs text-ink/40">{METHOD_LABELS[row.method] || row.method}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
