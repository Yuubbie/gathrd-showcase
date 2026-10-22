import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Building2, Users, Calendar, ShieldCheck, Phone,
  MessageSquare, RefreshCw, Search, ShieldAlert
} from 'lucide-react';

// Only this account has superadmin access
const SUPERADMIN_EMAILS = [
  'owner@example.invalid',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [churches, setChurches] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  async function checkAuthAndFetch() {
    try {
      setLoading(true);

      // Verify active session
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        navigate('/login');
        return;
      }

      // Check access permission
      const userEmail = (user.email || '').toLowerCase().trim();
      if (!SUPERADMIN_EMAILS.includes(userEmail)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      // Fetch church data
      const { data, error } = await supabase
        .from('churches')
        .select(`
          *,
          members(count),
          visitors(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChurches(data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  function cleanPhone(raw) {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) return `234${digits.slice(1)}`;
    if (digits.startsWith('234')) return digits;
    return `234${digits}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-xs text-ink/50">
        Checking access credentials…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-parchment flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <ShieldAlert size={24} />
        </div>
        <h1 className="font-display font-bold text-lg text-ink">Access Denied</h1>
        <p className="text-xs text-ink/60 mt-1 max-w-sm">
          Your account is not authorized to view the platform monitor.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-xs bg-signal text-white font-semibold px-4 py-2 rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const filtered = churches.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  return (
    <div className="min-h-screen bg-parchment px-4 py-8 md:px-10 text-ink">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-ink/5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <p className="text-xs uppercase font-bold text-signal tracking-wider">Internal Master Control</p>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mt-0.5">Platform Signups & Church Monitor</h1>
            <p className="text-xs text-ink/60 mt-1">
              Live database oversight of registered churches, active trials, and usage statistics.
            </p>
          </div>

          <button
            onClick={checkAuthAndFetch}
            className="text-xs bg-signal/10 text-signal hover:bg-signal/20 px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Total Signups</p>
            <p className="font-display text-3xl font-extrabold text-signal mt-1">{churches.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Active Free Trials</p>
            <p className="font-display text-3xl font-extrabold text-emerald-600 mt-1">
              {churches.filter((c) => c.subscription_status === 'trialing' || !c.subscription_status).length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Total Members Tracked</p>
            <p className="font-display text-3xl font-extrabold text-ink mt-1">
              {churches.reduce((acc, curr) => acc + (curr.members?.[0]?.count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Visitors Logged</p>
            <p className="font-display text-3xl font-extrabold text-gold mt-1">
              {churches.reduce((acc, curr) => acc + (curr.visitors?.[0]?.count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search by church name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink/10 bg-white text-xs focus:outline-none focus:border-signal"
          />
        </div>

        {/* Churches List */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-ink/5">
            <h2 className="font-display font-bold text-sm text-ink">Registered Churches ({filtered.length})</h2>
          </div>

          {filtered.length > 0 ? (
            <div className="divide-y divide-ink/5 text-xs">
              {filtered.map((church) => {
                const phone = cleanPhone(church.phone);
                const waUrl = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Hello Pastor, this is Gathrd following up to welcome ${church.name} to the platform!`
                    )}`
                  : null;

                return (
                  <div key={church.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-parchment/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{church.name}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                          {church.subscription_status || 'Trial'}
                        </span>
                      </div>
                      <p className="text-ink/60">
                        Email: <strong>{church.email || 'None'}</strong> • Phone: <strong className="font-mono">{church.phone || 'None'}</strong>
                      </p>
                      <p className="text-[11px] text-ink/40">
                        Registered: {new Date(church.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-start md:self-center">
                      <div className="text-right">
                        <p className="font-bold text-ink">{church.members?.[0]?.count || 0} Members</p>
                        <p className="text-[11px] text-ink/50">{church.visitors?.[0]?.count || 0} Visitors</p>
                      </div>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare size={13} /> Message
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-10 text-center text-xs text-ink/40">No churches match your search query.</p>
          )}
        </div>
      </div>
    </div>
  );
}