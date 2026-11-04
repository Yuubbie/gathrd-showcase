import { useCallback, useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ContactActions from '../components/ContactActions';
import { PeopleTabs } from '../components/SectionTabs';

const STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  visited: 'Visited',
  converted: 'Converted',
  inactive: 'Inactive',
};

const STATUS_COLORS = {
  pending: 'bg-amberflag/10 text-amberflag',
  contacted: 'bg-signal-50 text-signal-deep',
  visited: 'bg-signal-50 text-signal-deep',
  converted: 'bg-sage-50 text-sage',
  inactive: 'bg-ink/5 text-ink/50',
};

export default function ChurchEvangelism() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('list_church_evangelism');
    if (rpcError || !data?.ok) {
      setError('Could not load evangelism records.');
      setRows([]);
    } else {
      setStats({
        total: Number(data.total || 0),
        pending: Number(data.pending || 0),
        converted: Number(data.converted || 0),
      });
      setRows(Array.isArray(data.rows) ? data.rows : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    const { data } = await supabase.rpc('update_soul_follow_up', {
      p_id: id,
      p_status: status,
      p_follow_up_notes: null,
    });
    setUpdatingId(null);
    if (data?.ok) load();
  }

  const visible = filter ? rows.filter((r) => r.status === filter) : rows;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <PeopleTabs />
        <div className="flex items-center gap-2">
          <HeartHandshake size={20} className="text-signal" />
          <h1 className="font-display text-xl font-bold text-ink">Souls won</h1>
        </div>
        <p className="text-ink/50 text-sm">People members recorded from personal evangelism, and how follow-up is going.</p>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={stats.total} />
          <Stat label="Pending follow-up" value={stats.pending} />
          <Stat label="Converted" value={stats.converted} />
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : error ? (
            <p className="text-rose text-sm py-6 text-center">{error}</p>
          ) : visible.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No souls recorded yet.</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {visible.map((row) => (
                <div key={row.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{row.full_name}</p>
                      <p className="text-xs text-ink/50 mt-0.5">Won by {row.won_by_name}</p>
                      {row.notes && <p className="text-xs text-ink/50 mt-0.5">{row.notes}</p>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 font-medium h-fit ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <ContactActions phone={row.phone} name={row.full_name} />
                    <select
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                      className="border border-ink/10 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-ink/5 p-3">
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink/50">{label}</p>
    </div>
  );
}
