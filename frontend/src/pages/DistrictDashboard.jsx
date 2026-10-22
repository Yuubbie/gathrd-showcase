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
  const [hqChurch, setHqChurch] = useState(null);
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

      // 1. Fetch user's profile to get their assigned church_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('church_id')
        .eq('id', user.id)
        .single();

      const userChurchId = profile?.church_id;
      if (!userChurchId) {
        navigate('/dashboard');
        return;
      }

      // 2. Fetch the HQ Church record with member count
      const { data: hqData } = await supabase
        .from('churches')
        .select('id, name, plan, subscription_status, members(count)')
        .eq('id', userChurchId)
        .single();

      // 3. Fetch all Child Branches under this District HQ safely
      // Checks parent_church_id first, falls back to district_id
      let { data: branchData } = await supabase
        .from('churches')
        .select('id, name, plan, subscription_status, members(count)')
        .eq('parent_church_id', userChurchId);

      if (!branchData || branchData.length === 0) {
        const fallback = await supabase
          .from('churches')
          .select('id, name, plan, subscription_status, members(count)')
          .eq('district_id', userChurchId);
        if (fallback.data) branchData = fallback.data;
      }

      setHqChurch(hqData);

      // Combine HQ + Child Branches into the district roster
      const allDistrictOrgs = [];
      if (hqData) {
        allDistrictOrgs.push({ ...hqData, is_hq: true });
      }
      if (branchData) {
        branchData.forEach((b) => {
          if (b.id !== userChurchId) {
            allDistrictOrgs.push({ ...b, is_hq: false });
          }
        });
      }

      setBranches(allDistrictOrgs);
    } catch (err) {
      console.error('Error loading district dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalMembers = branches.reduce((acc, b) => acc + (b.members?.[0]?.count || 0), 0);
  const totalLocations = branches.length;

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

        {/* Back Link */}
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
              {hqChurch?.name || 'Your church'} — District Dashboard
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Total Members</p>
            <p className="font-display text-3xl font-extrabold text-signal mt-1">{totalMembers}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Total Giving ({timeRange} Days)</p>
            <p className="font-display text-3xl font-extrabold text-emerald-600 mt-1">₦0</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Total Locations</p>
            <p className="font-display text-3xl font-extrabold text-ink mt-1">{totalLocations}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Active Branches</p>
            <p className="font-display text-3xl font-extrabold text-ink mt-1">
              {branches.filter((b) => !b.is_hq).length}
            </p>
          </div>
        </div>

        {/* Organizations Table */}
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
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Role / Plan</th>
                  <th className="py-3 px-4">Members</th>
                  <th className="py-3 px-4">Giving ({timeRange} Days)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {branches.map((b) => {
                  const memberCount = b.members?.[0]?.count || 0;

                  return (
                    <tr key={b.id} className="hover:bg-parchment/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink flex items-center gap-2">
                        {b.name}
                        {b.is_hq ? (
                          <span className="text-[10px] bg-signal/10 text-signal font-bold px-2 py-0.5 rounded-full">
                            District HQ
                          </span>
                        ) : (
                          <span className="text-[10px] bg-ink/5 text-ink/60 font-medium px-2 py-0.5 rounded-full">
                            Branch
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