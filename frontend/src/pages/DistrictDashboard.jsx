import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import {
  Users, Wallet, ClipboardCheck, Building2,
  BarChart3, PieChart, Activity, Download, Plus,
} from 'lucide-react';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

function getSinceDate(range) {
  const d = new Date();
  d.setDate(d.getDate() - (RANGE_DAYS[range] || 30));
  return d;
}

function statusLabel(status) {
  return status ? status.replace(/_/g, ' ') : 'unknown';
}

function statusClasses(status) {
  if (status === 'active') return 'bg-sage/10 text-sage';
  if (status === 'trialing') return 'bg-signal/10 text-signal';
  if (!status) return 'bg-ink/10 text-ink/60';
  return 'bg-rose/10 text-rose';
}

export default function DistrictDashboard() {
  const { church } = useAuth();
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedBranch, setSelectedBranch] = useState(null);

  const isDistrict = church?.hierarchy_level === 'district';
  const isZone = church?.hierarchy_level === 'zone';
  const terminology = church?.terminology || 'District';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, church?.id]);

  function emptyStats() {
    return {
      totalMembers: 0,
      totalGiving: 0,
      totalAttendance: 0,
      activeBranches: 0,
      branchesWithActivity: 0,
    };
  }

  async function loadData() {
    // Wait until the church has loaded; this effect runs again when it does
    if (!church) return;

    setLoading(true);
    try {
      // Child churches (branches for a district, districts for a zone)
      const childLevel = isZone ? 'district' : 'branch';

      const { data: childChurches, error } = await supabase
        .from('churches')
        .select('id, name, logo_url, plan, hierarchy_level, created_at, max_members, subscription_status')
        .eq('parent_church_id', church.id)
        .eq('hierarchy_level', childLevel)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(childChurches || []);

      const branchIds = (childChurches || []).map((b) => b.id);
      if (branchIds.length > 0) {
        await loadAggregatedStats(branchIds);
      } else {
        setStats(emptyStats());
      }
    } catch (err) {
      console.error('Failed to load district dashboard:', err);
      setStats(emptyStats());
    }
    setLoading(false);
  }

  async function loadAggregatedStats(branchIds) {
    const since = getSinceDate(timeRange);
    const sinceIso = since.toISOString();
    const sinceDay = sinceIso.split('T')[0];

    const { count: totalMembers, error: membersError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('church_id', branchIds)
      .is('deleted_at', null);
    if (membersError) console.error('District members query failed:', membersError);

    const { data: givingData, error: givingError } = await supabase
      .from('giving_records')
      .select('amount')
      .in('church_id', branchIds)
      .eq('status', 'success')
      .gte('given_at', sinceIso);
    if (givingError) console.error('District giving query failed:', givingError);

    const totalGiving = givingData?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('id, church_id')
      .in('church_id', branchIds)
      .gte('date', sinceDay)
      .is('deleted_at', null);
    if (attendanceError) console.error('District attendance query failed:', attendanceError);

    const totalAttendance = attendanceData?.length || 0;
    const uniqueBranches = new Set((attendanceData || []).map((a) => a.church_id)).size;

    setStats({
      totalMembers: totalMembers || 0,
      totalGiving,
      totalAttendance,
      activeBranches: branchIds.length,
      branchesWithActivity: uniqueBranches,
    });
  }

  async function loadBranchDetail(branchId) {
    const sinceIso = getSinceDate(timeRange).toISOString();
    const sinceDay = sinceIso.split('T')[0];

    const [membersRes, givingRes, attendanceRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', branchId)
        .is('deleted_at', null),
      supabase
        .from('giving_records')
        .select('amount, given_at')
        .eq('church_id', branchId)
        .eq('status', 'success')
        .gte('given_at', sinceIso)
        .order('given_at', { ascending: false }),
      supabase
        .from('attendance_records')
        .select('*')
        .eq('church_id', branchId)
        .gte('date', sinceDay)
        .is('deleted_at', null),
    ]);

    if (membersRes.error) console.error('Branch members query failed:', membersRes.error);
    if (givingRes.error) console.error('Branch giving query failed:', givingRes.error);
    if (attendanceRes.error) console.error('Branch attendance query failed:', attendanceRes.error);

    const branch = branches.find((b) => b.id === branchId);
    const giving = givingRes.data || [];
    const attendanceRows = attendanceRes.data || [];

    // Group attendance by date (uses a count column if the table has one, otherwise 1 per row)
    const byDate = {};
    attendanceRows.forEach((a) => {
      const add = typeof a.count === 'number' ? a.count : 1;
      byDate[a.date] = (byDate[a.date] || 0) + add;
    });
    const attendanceDays = Object.entries(byDate)
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .slice(0, 10)
      .map(([date, count]) => ({ date, count }));

    setSelectedBranch({
      branch,
      members: membersRes.count || 0,
      giving: giving.reduce((sum, g) => sum + (g.amount || 0), 0),
      givingRecords: giving.slice(0, 10),
      attendanceTotal: attendanceRows.length,
      attendance: attendanceDays,
    });
  }

  function closeBranchDetail() {
    setSelectedBranch(null);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format((amount || 0) / 100);
  }

  function getTimeRangeLabel() {
    const labels = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', '1y': '1 Year' };
    return labels[timeRange] || '30 Days';
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">Loading…</div>
    );
  }

  const isChildView = isDistrict || isZone;
  const childLabel = isZone ? 'Districts' : 'Branches';

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

  const totalMembers = stats.totalMembers || 0;
  const totalGiving = stats.totalGiving || 0;
  const totalAttendance = stats.totalAttendance || 0;
  const activeBranches = stats.activeBranches || 0;
  const branchesWithActivity = stats.branchesWithActivity || 0;

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
          <div className="flex items-center gap-3">
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
        </div>

        {/* Branch Detail Modal */}
        {selectedBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  {selectedBranch.branch?.logo_url ? (
                    <img
                      src={selectedBranch.branch.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-signal/10 flex items-center justify-center">
                      <Building2 size={20} className="text-signal" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-display font-bold text-ink">{selectedBranch.branch?.name}</h2>
                    <p className="text-ink/50 text-sm">{selectedBranch.branch?.plan} Plan</p>
                  </div>
                </div>
                <button onClick={closeBranchDetail} className="text-ink/40 hover:text-ink">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-parchment rounded-lg p-4 text-center">
                    <p className="text-xs text-ink/50">Members</p>
                    <p className="font-display font-bold text-2xl text-ink">{selectedBranch.members}</p>
                  </div>
                  <div className="bg-parchment rounded-lg p-4 text-center">
                    <p className="text-xs text-ink/50">Giving ({getTimeRangeLabel()})</p>
                    <p className="font-display font-bold text-2xl text-sage">
                      {formatCurrency(selectedBranch.giving)}
                    </p>
                  </div>
                  <div className="bg-parchment rounded-lg p-4 text-center">
                    <p className="text-xs text-ink/50">Attendance Records</p>
                    <p className="font-display font-bold text-2xl text-gold">
                      {selectedBranch.attendanceTotal || 0}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-ink mb-2">Recent Giving</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedBranch.givingRecords?.length === 0 ? (
                      <p className="text-ink/40 text-sm">No giving records</p>
                    ) : (
                      selectedBranch.givingRecords?.map((g, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm text-ink/70">
                            {new Date(g.given_at).toLocaleDateString('en-NG')}
                          </span>
                          <span className="font-semibold text-sage">{formatCurrency(g.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-ink mb-2">Recent Attendance</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedBranch.attendance?.length === 0 ? (
                      <p className="text-ink/40 text-sm">No attendance records</p>
                    ) : (
                      selectedBranch.attendance?.map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm text-ink/70">
                            {new Date(a.date).toLocaleDateString('en-NG')}
                          </span>
                          <span className="font-semibold text-gold">{a.count || 0}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`bg-white rounded-2xl border p-5 ${stats.totalGiving > 0 ? 'ring-1 ring-sage' : ''}`}>
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
                <p className="text-xs text-ink/50">Total Giving ({getTimeRangeLabel()})</p>
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
                <p className="text-xs text-ink/50">Attendance Records</p>
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
                <p className="text-xs text-ink/50">Active {childLabel}</p>
                <p className="font-display font-bold text-2xl text-ink">{activeBranches}</p>
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
                <p className="font-display font-bold text-2xl text-emerald">{branchesWithActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">Giving Trend</h3>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-sm border border-ink/10 rounded-lg px-3 py-1.5 focus:border-signal focus:ring-1 focus:ring-signal outline-none"
              >
                <option value="7d">7D</option>
                <option value="30d">30D</option>
                <option value="90d">90D</option>
                <option value="1y">1Y</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center bg-parchment rounded-lg">
              <div className="text-center text-ink/30">
                <BarChart3 size={48} className="mx-auto mb-2" />
                <p className="text-sm">Giving trend chart</p>
                <p className="text-xs text-ink/40">Connect chart library (Recharts/Chart.js)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-ink mb-4">Branch Performance</h3>
            <div className="h-64 flex items-center justify-center bg-parchment rounded-lg">
              <div className="text-center text-ink/30">
                <PieChart size={48} className="mx-auto mb-2" />
                <p className="text-sm">Branch comparison</p>
                <p className="text-xs text-ink/40">Giving distribution across branches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Branches Table */}
        <div className="bg-white rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-ink">All {childLabel}</h3>
            <div className="flex items-center gap-2">
              <Download size={16} className="text-ink/40" />
              <span className="text-xs text-ink/40">Export CSV</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-ink/50">
                  <th className="p-3 font-semibold">Branch</th>
                  <th className="p-3 font-semibold">Plan</th>
                  <th className="p-3 font-semibold">Members</th>
                  <th className="p-3 font-semibold">Giving ({getTimeRangeLabel()})</th>
                  <th className="p-3 font-semibold">Attendance</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-b last:border-0 hover:bg-parchment/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {branch.logo_url ? (
                          <img src={branch.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-signal/10 flex items-center justify-center">
                            <Building2 size={16} className="text-signal" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-ink truncate max-w-[200px]">{branch.name}</p>
                          <p className="text-xs text-ink/40 capitalize">{branch.hierarchy_level}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-parchment text-ink/70 capitalize">
                        {(branch.plan || 'unknown').replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-ink/70">—</td>
                    <td className="p-3 text-sm text-ink/70">—</td>
                    <td className="p-3 text-sm text-ink/70">—</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full capitalize ${statusClasses(
                          branch.subscription_status
                        )}`}
                      >
                        {statusLabel(branch.subscription_status)}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => loadBranchDetail(branch.id)}
                        className="text-xs text-signal hover:text-signal-deep font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && branches.length === 0 && (
            <div className="p-10 text-center">
              <Building2 size={48} className="mx-auto text-ink/20 mb-3" />
              <p className="text-ink/50">No {childLabel.toLowerCase()} yet</p>
              <Link
                to="/branches"
                className="inline-flex items-center gap-2 mt-4 mx-auto bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} /> Add {childLabel.slice(0, -1)}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}