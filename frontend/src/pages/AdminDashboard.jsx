import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { cleanPhone } from '../lib/phone';
import {
  Building2, Users, Calendar, ShieldCheck, Phone,
  MessageSquare, RefreshCw, Search, ShieldAlert,
  Trash2, Edit2, Check, X
} from 'lucide-react';

const SUPERADMIN_EMAILS = [
  'owner@example.invalid',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [churches, setChurches] = useState([]);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Inline rename state
  const [editingChurchId, setEditingChurchId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  async function checkAuthAndFetch() {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }

      const userEmail = (user.email || '').toLowerCase().trim();
      if (!SUPERADMIN_EMAILS.includes(userEmail)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase.rpc('list_platform_churches');

      if (error) throw error;
      setChurches(data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateChurchPlan(churchId, newPlan, newStatus) {
    try {
      setUpdatingId(churchId);
      const updates = {};
      if (newPlan) updates.plan = newPlan;
      if (newStatus) updates.subscription_status = newStatus;

      const { error } = await supabase
        .from('churches')
        .update(updates)
        .eq('id', churchId);

      if (error) throw error;

      setChurches((prev) =>
        prev.map((c) => (c.id === churchId ? { 
          ...c, 
          subscription_tier: newPlan || c.subscription_tier,
          subscription_status: newStatus || c.subscription_status 
        } : c))
      );
    } catch (err) {
      alert('Error updating church: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRename(churchId) {
    if (!editName.trim()) return;
    try {
      setUpdatingId(churchId);
      const { error } = await supabase
        .from('churches')
        .update({ name: editName.trim() })
        .eq('id', churchId);

      if (error) throw error;

      setChurches((prev) =>
        prev.map((c) => (c.id === churchId ? { ...c, name: editName.trim() } : c))
      );
      setEditingChurchId(null);
    } catch (err) {
      alert('Error renaming church: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(churchId, churchName) {
    const confirmed = window.confirm(`Are you sure you want to delete "${churchName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setUpdatingId(churchId);
      const { error } = await supabase
        .from('churches')
        .delete()
        .eq('id', churchId);

      if (error) throw error;

      setChurches((prev) => prev.filter((c) => c.id !== churchId));
    } catch (err) {
      alert('Error deleting church: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
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

  const filtered = churches.filter((c) => {
    const searchTarget = `
      ${c.name || ''} 
      ${c.pastor_name || ''} 
      ${c.pastor_email || ''} 
      ${c.pastor_phone || ''}
    `.toLowerCase();
    return searchTarget.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-parchment px-4 py-8 md:px-10 text-ink">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-ink/5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <p className="text-xs uppercase font-bold text-signal tracking-wider">Superadmin Command Console</p>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mt-0.5">Platform Oversight & Management</h1>
            <p className="text-xs text-ink/60 mt-1">
              Live metrics, pastor contact information, and account administration across all Nigerian branches.
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
            <p className="text-xs font-semibold text-ink/50">Members Tracked</p>
            <p className="font-display text-3xl font-extrabold text-ink mt-1">
              {churches.reduce((acc, curr) => acc + (curr.members_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm">
            <p className="text-xs font-semibold text-ink/50">Visitors Logged</p>
            <p className="font-display text-3xl font-extrabold text-gold mt-1">
              {churches.reduce((acc, curr) => acc + (curr.visitors_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search by church name, pastor name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink/10 bg-white text-xs focus:outline-none focus:border-signal"
          />
        </div>

        {/* Church Directory */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-ink/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-ink">Registered Churches ({filtered.length})</h2>
            <span className="text-[11px] text-ink/40">Showing all platform organizations</span>
          </div>

          {filtered.length > 0 ? (
            <div className="divide-y divide-ink/5 text-xs">
              {filtered.map((church) => {
                const pastorName = church.pastor_name || 'Pastor / Administrator';
                const contactEmail = church.pastor_email;
                const phone = cleanPhone(church.pastor_phone);

                const waUrl = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Hello ${pastorName}, this is Gathrd following up to ensure${church.name} is completely set up for your services!`
                    )}`
                  : null;

                const isTrial = church.subscription_status === 'trialing' || !church.subscription_status;
                const isEditing = editingChurchId === church.id;

                return (
                  <div key={church.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-parchment/30 transition-colors">
                    
                    {/* Organization & Pastor Identity */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="border border-signal rounded px-2 py-0.5 text-xs font-bold text-ink focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(church.id)}
                              className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              title="Save"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingChurchId(null)}
                              className="p-1 rounded bg-ink/10 text-ink hover:bg-ink/20"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-ink">{church.name}</span>
                            <button
                              onClick={() => {
                                setEditingChurchId(church.id);
                                setEditName(church.name);
                              }}
                              className="p-1 text-ink/40 hover:text-signal transition-colors"
                              title="Rename Church"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isTrial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {church.subscription_status || 'trialing'}
                        </span>
                        <span className="text-[10px] bg-signal/10 text-signal font-semibold px-2 py-0.5 rounded-full capitalize">
                          {church.subscription_tier || 'Starter'} Plan
                        </span>
                      </div>

                      <p className="text-ink/70">
                        Admin: <strong className="text-ink">{pastorName}</strong> • Email: <strong className="text-ink">{contactEmail || 'No email recorded'}</strong>
                      </p>

                      <p className="text-ink/50 text-[11px]">
                        Phone: <strong className="font-mono text-ink/70">{church.pastor_phone || 'None'}</strong> • Registered: {new Date(church.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Usage Metrics */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-ink/5 text-right min-w-[110px]">
                      <div>
                        <span className="font-bold text-sm text-ink">{church.members_count || 0}</span>
                        <span className="text-[11px] text-ink/50 ml-1">Members</span>
                      </div>
                      <div className="text-[11px] text-ink/50">
                        <span>{church.visitors_count || 0} Visitors</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                      {/* Plan Selector */}
                      <select
                        disabled={updatingId === church.id}
                        value={church.subscription_tier || 'starter'}
                        onChange={(e) => updateChurchPlan(church.id, e.target.value, null)}
                        className="bg-parchment border border-ink/10 rounded-lg px-2 py-1.5 text-[11px] font-medium text-ink focus:outline-none"
                      >
                        <option value="starter">Starter</option>
                        <option value="regular">Regular</option>
                        <option value="district">District</option>
                        <option value="zone">Zone</option>
                      </select>

                      {/* Status Toggle */}
                      <button
                        disabled={updatingId === church.id}
                        onClick={() => updateChurchPlan(church.id, null, isTrial ? 'active' : 'trialing')}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isTrial 
                            ? 'border-emerald-600/30 text-emerald-700 hover:bg-emerald-50' 
                            : 'border-amber-600/30 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {isTrial ? 'Mark Active' : 'Mark Trial'}
                      </button>

                      {/* Direct WhatsApp link */}
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare size={13} /> Message
                        </a>
                      ) : null}

                      {/* Delete Church Button */}
                      <button
                        disabled={updatingId === church.id}
                        onClick={() => handleDelete(church.id, church.name)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete Church"
                      >
                        <Trash2 size={14} />
                      </button>
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