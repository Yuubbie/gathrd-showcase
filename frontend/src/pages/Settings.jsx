import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ logo_url: '', brand_color: '#1B3A5C' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Church Settings</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{success}</div>}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Church logo URL</label>
            <input
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              placeholder="https://…"
            />
            <p className="text-xs text-ink/40 mt-1">
              Paste a link to your logo image (upload it somewhere like Google Drive or Imgur first, then paste the direct image link here).
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
            <p className="text-xs text-ink/40 mt-1">Stored for future use — not yet applied throughout the app.</p>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-2">
          <p className="text-sm font-semibold text-ink/80">More settings</p>
          <Link to="/giving/settings" className="block text-sm text-signal font-semibold hover:text-signal-deep">Giving & Bank Account →</Link>
          <Link to="/billing" className="block text-sm text-signal font-semibold hover:text-signal-deep">Billing & Plan →</Link>
        </div>
      </div>
    </div>
  );
}
