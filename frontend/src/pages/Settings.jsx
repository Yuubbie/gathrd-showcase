import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ logo_url: '', brand_color: '#1B3A5C' });
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDepartments() {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('church_id', profile.church_id)
      .is('deleted_at', null)
      .order('name');
    setDepartments(data || []);
  }

  useEffect(() => {
    async function load() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('logo_url, brand_color')
        .eq('id', profile.church_id)
        .single();
      if (data) {
        setForm({ logo_url: data.logo_url || '', brand_color: data.brand_color || '#1B3A5C' });
      }
      await loadDepartments();
      setLoading(false);
    }
    load();
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const { error } = await supabase
      .from('churches')
      .update({ logo_url: form.logo_url || null, brand_color: form.brand_color })
      .eq('id', profile.church_id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess('Saved.');
  }

  async function addDepartment(e) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    setError('');

    const { error } = await supabase.from('departments').insert({
      church_id: profile.church_id,
      name: newDeptName.trim(),
    });

    setAddingDept(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewDeptName('');
    loadDepartments();
  }

  async function removeDepartment(id) {
    await supabase.from('departments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    loadDepartments();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Church Settings</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{success}</div>}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink/80">Branding</h2>
          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Church logo URL</label>
            <input
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              placeholder="https://…"
            />
            <p className="text-xs text-ink/40 mt-1">
              Use a direct image link. Google Drive "share" links won't work — try imgur.com: upload your image, right-click it, "Copy image address," paste that link here.
            </p>
            {form.logo_url && (
              <img src={form.logo_url} alt="Church logo preview" className="mt-2 h-16 w-16 object-contain rounded-lg border border-ink/10" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Brand color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                className="h-10 w-16 rounded-lg border border-ink/10 cursor-pointer"
              />
              <span className="text-sm text-ink/50">{form.brand_color}</span>
            </div>
            <p className="text-xs text-ink/40 mt-1">Applied throughout the app — buttons, links, and accents use your brand color.</p>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink/80">Departments</h2>
          <form onSubmit={addDepartment} className="flex gap-2">
            <input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. Ushering, Choir, Media"
              className="flex-1 border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
            <button type="submit" disabled={addingDept} className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors disabled:opacity-50 shrink-0">
              {addingDept ? 'Adding…' : 'Add'}
            </button>
          </form>

          {departments.length === 0 ? (
            <p className="text-ink/40 text-sm">No departments yet — add your first one above.</p>
          ) : (
            <div className="divide-y">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-ink/70">{d.name}</span>
                  <button onClick={() => removeDepartment(d.id)} className="text-xs text-rose hover:text-rose/80">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-2">
          <p className="text-sm font-semibold text-ink/80">More settings</p>
          <Link to="/giving/settings" className="block text-sm text-signal font-semibold hover:text-signal-deep">Giving & Bank Account →</Link>
          <Link to="/billing" className="block text-sm text-signal font-semibold hover:text-signal-deep">Billing & Plan →</Link>
        </div>
      </div>
    </div>
  );
}

