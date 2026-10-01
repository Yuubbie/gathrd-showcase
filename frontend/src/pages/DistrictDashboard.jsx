import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import {
  Users, Wallet, ClipboardCheck, Building2, Activity,
  Download, Plus, AlertTriangle,
} from 'lucide-react';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const RANGE_LABELS = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', '1y': '1 Year' };

function getSinceDate(range) {
  const d = new Date();
  d.setDate(d.getDate() - (RANGE_DAYS[range] || 30));
  return d;
}

function formatDate(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status) {
  return status ? String(status).replace(/_/g, ' ') : 'unknown';
}

function statusClasses(status) {
  if (status === 'active') return 'bg-sage/10 text-sage';
  if (status === 'trialing') return 'bg-signal/10 text-signal';
  if (!status) return 'bg-ink/10 text-ink/60';
  return 'bg-rose/10 text-rose';
}

// 'active' = attendance or giving in the period; 'new' = under 14 days old; 'quiet' = needs a check-in
function activityOf(row) {
  if (Number(row.attendance_count) > 0 || Number(row.giving_count) > 0) return 'active';
  const ageDays = (Date.now() - new Date(row.branch_created_at).getTime()) / 86400000;
  if (ageDays < 14) return 'new';
  return 'quiet';
}

const ACTIVITY_STYLES = {
  active: { label: 'Active', classes: 'bg-sage/10 text-sage' },
  new: { label: 'New', classes: 'bg-signal/10 text-signal' },
  quiet: { label: 'No recent activity', classes: 'bg-amber/10 text-amber' },
};

export default function DistrictDashboard() {
  const { church } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [selected, setSelected] = useState(null);

  const isDistrict = church?.hierarchy_level === 'district';
  const isZone = church?.hierarchy_level === 'zone';
  const terminology = church?.terminology || 'District';
  const isChildView = isDistrict || isZone;
  const childLabel = isZone ? 'Districts' : 'Branches';
  const childSingular = isZone ? 'District' : 'Branch';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, church?.id]);

  async function loadData() {
    if (!church || !isChildView) return;

    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase.rpc('get_district_oversight', {
        p_since: getSinceDate(timeRange).toISOString(),
      });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('Failed to load oversight data:', err);
      setRows([]);
      setLoadError(err.message || 'Could not load branch data.');
    }
    setLoading(false);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format((Number(amount) || 0) / 100);
  }

  function exportCsv() {
    const header = [
      'Name', 'Pastor', 'Plan', 'Subscription', 'Active members', 'New members',
      `Giving (${RANGE_LABELS[timeRange]}, NGN)`, 'Gifts', 'Attendance check-ins',
      'Last attendance', 'Last gift', 'Activity',
    ];
    const lines = rows.map((r) => [
      r.branch_name,
      r.pastor_name || '',
      r.branch_plan || '',
      r.branch_status || '',
      r.member_count,
      r.new_members,
      ((Number(r.giving_total) || 0) / 100).toFixed(2),
      r.giving_count,
      r.attendance_count,
      r.last_attendance_at ? new Date(r.last_attendance_at).toISOString().slice(0, 10) : '',
      r.last_giving_at ? new Date(r.last_giving_at).toISOString().slice(0, 10) : '',
      ACTIVITY_STYLES[activityOf(r)].label,
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${childLabel.toLowerCase()}-summary-${timeRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">Loading…</div>
    );
  }

  if (church?.hierarchy_level === 'branch') {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-4 py-10">
        <div className="max-w-lg mx-auto text-center">
          <Building2 size={48} className="mx-auto text-ink/20 mb-4" />
          <h1 className="font-display text-2xl font-bold text-ink">District/Zone Dashboard</h1>
          <p className="text-ink/50 mt-2">
            This dashboard is for districts and zones that oversee branches. Your church is a branch, so there is nothing to set up here.
          </p>
          <Link
            to="/dashboard"
            className="inline-block mt-4 bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isChildView) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-4 py-10">
        <div className="max-w-lg mx-auto text-center">
          <Building2 size={48} className="mx-auto text-ink/20 mb-4" />
          <h1 className="font-display text-2xl font-bold text-ink">District/Zone Dashboard</h1>
          <p className="text-ink/50 mt-2">
            Upgrade to a {terminology} or Zone plan to monitor multiple branches.
          </p>
          <Link
            to="/billing"
            className="inline-block mt-4 bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const totalMembers = rows.reduce((sum, r) => sum + Number(r.member_count || 0), 0);
  const totalGiving = rows.reduce((sum, r) => sum + Number(r.giving_total || 0), 0);
  const totalAttendance = rows.reduce((sum, r) => sum + Number(r.attendance_count || 0), 0);
  const activeCount = rows.filter((r) => activityOf(r) === 'active').length;
  const quietRows = rows.filter((r) => activityOf(r) === 'quiet');
  const maxGiving = Math.max(1, ...rows.map((r) => Number(r.giving_total || 0)));

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <BackButton />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              {church.name} — {terminology} Dashboard
            </h1>
            <p className="text-ink/50 text-sm mt-1">
              Monitor all {childLabel.toLowerCase()} under your {terminology.toLowerCase()}
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-ink/10 rounded-lg px-3 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="1y">1 Year</option>
          </select>
        </div>

        {loadError && (
          <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">
            Could not load {childLabel.toLowerCase()} data: {loadError}
          </div>
        )}

        {/* Detail modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  {selected.branch_logo_url ? (
                    <img
                      src={selected.branch_logo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-signal/10 flex items-center justify-center">
                      <Building2 size={20} className="text-signal" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-display font-bold text-ink">{selected.branch_name}</h2>
                    <p className="text-ink/50 text-sm capitalize">
                      {selected.branch_plan || 'unknown'} plan · {statusLabel(selected.branch_status)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-ink/40 hover:text-ink">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-ink/60">
                  Pastor: <span className="font-medium text-ink">{selected.pastor_name || 'Not set'}</span>
                </p>
                <p className="text-xs text-ink/40">Figures for the last {RANGE_LABELS[timeRange].toLowerCase()}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-parchment rounded-lg p-4">
                    <p className="text-xs text-ink/50">Active members</p>
                    <p className="font-display font-bold text-2xl text-ink">{Number(selected.member_count)}</p>
                    <p className="text-xs text-ink/50 mt-1">{Number(selected.new_members)} joined in this period</p>
                  </div>
                  <div className="bg-parchment rounded-lg p-4">
                    <p className="text-xs text-ink/50">Giving</p>
                    <p className="font-display font-bold text-2xl text-sage">{formatCurrency(selected.giving_total)}</p>
                    <p className="text-xs text-ink/50 mt-1">{Number(selected.giving_count)} gifts · last {formatDate(selected.last_giving_at)}</p>
                  </div>
                  <div className="bg-parchment rounded-lg p-4">
                    <p className="text-xs text-ink/50">Attendance check-ins</p>
                    <p className="font-display font-bold text-2xl text-gold">{Number(selected.attendance_count)}</p>
                    <p className="text-xs text-ink/50 mt-1">Last service recorded {formatDate(selected.last_attendance_at)}</p>
                  </div>
                  <div className="bg-parchment rounded-lg p-4">
                    <p className="text-xs text-ink/50">Created</p>
                    <p className="font-display font-bold text-xl text-ink">{formatDate(selected.branch_created_at)}</p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 text-xs rounded-full ${ACTIVITY_STYLES[activityOf(selected)].classes}`}>
                      {ACTIVITY_STYLES[activityOf(selected)].label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink/40">
                  Member names, contact details and individual gifts stay private to each branch.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-signal/10 flex items-center justify-center">
                <Users size={24} className="text-signal" />
              </div>
              <div>
                <p className="text-xs text-ink/50">Total Members</p>
                <p className="font-display font-bold text-2xl text-ink">{totalMembers.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
                <Wallet size={24} className="text-sage" />
              </div>
              <div>
                <p className="text-xs text-ink/50">Total Giving ({RANGE_LABELS[timeRange]})</p>
                <p className="font-display font-bold text-2xl text-sage">{formatCurrency(totalGiving)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <ClipboardCheck size={24} className="text-gold" />
              </div>
              <div>
                <p className="text-xs text-ink/50">Attendance Check-ins</p>
                <p className="font-display font-bold text-2xl text-gold">{totalAttendance.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber/10 flex items-center justify-center">
                <Building2 size={24} className="text-amber" />
              </div>
              <div>
                <p className="text-xs text-ink/50">{childLabel}</p>
                <p className="font-display font-bold text-2xl text-ink">{rows.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald/10 flex items-center justify-center">
                <Activity size={24} className="text-emerald" />
              </div>
              <div>
                <p className="text-xs text-ink/50">{childLabel} with Activity</p>
                <p className="font-display font-bold text-2xl text-emerald">{activeCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Giving by branch + attention list */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-ink mb-4">Giving by {childSingular}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-ink/40">Nothing to show yet.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const value = Number(r.giving_total || 0);
                  return (
                    <div key={r.branch_id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-ink/70 truncate max-w-[60%]">{r.branch_name}</span>
                        <span className="font-medium text-sage">{formatCurrency(value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-parchment overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-sage"
                          style={{ width: `${Math.round((value / maxGiving) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber" /> Needs a check-in
            </h3>
            {quietRows.length === 0 ? (
              <p className="text-sm text-ink/50">
                Every {childSingular.toLowerCase()} has recorded attendance or giving in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {quietRows.map((r) => (
                  <div key={r.branch_id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{r.branch_name}</p>
                      <p className="text-xs text-ink/50">
                        Pastor: {r.pastor_name || 'Not set'} · last service {formatDate(r.last_attendance_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(r)}
                      className="text-xs text-signal hover:text-signal-deep font-medium shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-ink">All {childLabel}</h3>
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-2 text-xs text-ink/60 hover:text-ink disabled:opacity-40"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-ink/50">
                  <th className="p-3 font-semibold">{childSingular}</th>
                  <th className="p-3 font-semibold">Plan</th>
                  <th className="p-3 font-semibold">Members</th>
                  <th className="p-3 font-semibold">Giving ({RANGE_LABELS[timeRange]})</th>
                  <th className="p-3 font-semibold">Attendance</th>
                  <th className="p-3 font-semibold">Activity</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const act = ACTIVITY_STYLES[activityOf(r)];
                  return (
                    <tr key={r.branch_id} className="border-b last:border-0 hover:bg-parchment/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {r.branch_logo_url ? (
                            <img src={r.branch_logo_url} alt="" className="w-8 h-8 rounded-lg object-contain" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-signal/10 flex items-center justify-center">
                              <Building2 size={16} className="text-signal" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-ink truncate max-w-[200px]">{r.branch_name}</p>
                            <p className="text-xs text-ink/40">{r.pastor_name || 'Pastor not set'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-parchment text-ink/70 capitalize">
                          {(r.branch_plan || 'unknown').replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-ink/70">
                        {Number(r.member_count)}
                        {Number(r.new_members) > 0 && (
                          <span className="text-xs text-sage ml-1">+{Number(r.new_members)}</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-ink/70">{formatCurrency(r.giving_total)}</td>
                      <td className="p-3 text-sm text-ink/70">
                        {Number(r.attendance_count)}
                        <span className="block text-xs text-ink/40">last {formatDate(r.last_attendance_at)}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${act.classes}`}>
                          {act.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full capitalize ${statusClasses(r.branch_status)}`}>
                          {statusLabel(r.branch_status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelected(r)}
                          className="text-xs text-signal hover:text-signal-deep font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 && !loadError && (
            <div className="p-10 text-center">
              <Building2 size={48} className="mx-auto text-ink/20 mb-3" />
              <p className="text-ink/50">No {childLabel.toLowerCase()} yet</p>
              <Link
                to="/branches"
                className="inline-flex items-center gap-2 mt-4 mx-auto bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} /> Add {childSingular}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}