import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Users, Wallet, CheckSquare, Building2,
  Activity, ArrowLeft, Download, AlertCircle
} from 'lucide-react';

export default function DistrictDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadDistrictData();
  }, [timeRange]);

  async function loadDistrictData() {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }

      // 1. Get current user's profile and church
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, churches(*)')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.churches) {
        navigate('/dashboard');
        return;
      }

      const currentChurch = profile.churches;
      setChurch(currentChurch);

      // 2. Fetch District HQ + All Child Branches
      let branchQuery = supabase
        .from('churches')
        .select(`
          id,
          name,
          plan,
          subscription_status,
          members(count),
          attendance(count)
        `)
        .or(`id.eq.${currentChurch.id},parent_church_id.eq.${currentChurch.id}`);

      const { data: branchData, error: branchErr } = await branchQuery;
      if (branchErr) throw branchErr;

      setBranches(branchData || []);
    } catch (err) {
      console.error('Error loading district dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalMembers = branches.reduce((acc, b) => acc + (b.members?.[0]?.count || 0), 0);
  const totalAttendance = branches.reduce((acc, b) => acc + (b.attendance?.[0]?.count || 0), 0);
  const branchesWithActivity = branches.filter((b) => (b.attendance?.[0]?.count || 0) > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-xs text-ink/50">
        Loading District Dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-8 md:px-10 text-ink">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink font-semibold transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* District Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              {church?.name || 'District'} — District Dashboard
            </h1>
            <p className="text-xs text-ink/60 mt-0.5">
              Monitor headquarters and all branches under your district
            </p>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="self-start md:self-auto bg-white border border-ink/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink shadow-sm focus:outline-none"
          >
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
            <option value="365">This Year</option>
          </select>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink/5 text-ink flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink/50">Total Members</p>
              <p className="font-display text-xl font-bold text-ink">{totalMembers}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink/50">Total Giving ({timeRange} Days)</p>
              <p className="font-display text-xl font-bold text-emerald-600">₦0</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink/5 text-ink flex items-center justify-center">
              <CheckSquare size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink/50">Attendance Check-ins</p>
              <p className="font-display text-xl font-bold text-ink">{totalAttendance}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink/5 text-ink flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink/50">Total Locations</p>
              <p className="font-display text-xl font-bold text-ink">{branches.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-ink/5 text-ink flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink/50">Active Locations</p>
              <p className="font-display text-xl font-bold text-ink">{branchesWithActivity}</p>
            </div>
          </div>
        </div>

        {/* Branches & HQ Table */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-ink/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-ink">
              District Organizations ({branches.length})
            </h2>
            <span className="text-[11px] text-ink/40">Includes Headquarters & Child Branches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-parchment/60 text-ink/50 font-semibold border-b border-ink/5">
                <tr>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Role / Plan</th>
                  <th className="py-3 px-4">Members</th>
                  <th className="py-3 px-4">Giving ({timeRange} Days)</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {branches.map((b) => {
                  const isHq = b.id === church?.id;
                  const memberCount = b.members?.[0]?.count || 0;
                  const attendanceCount = b.attendance?.[0]?.count || 0;

                  return (
                    <tr key={b.id} className="hover:bg-parchment/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink flex items-center gap-2">
                        {b.name}
                        {isHq && (
                          <span className="text-[10px] bg-signal/10 text-signal font-bold px-1.5 py-0.5 rounded">
                            HQ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-ink/70">
                        {b.plan || 'Starter'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-ink">
                        {memberCount}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        ₦0
                      </td>
                      <td className="py-3.5 px-4 text-ink/70">
                        {attendanceCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          b.subscription_status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.subscription_status || 'active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}