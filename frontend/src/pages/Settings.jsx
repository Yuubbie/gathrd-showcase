import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function Settings() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ logo_url: '', brand_color: '#1B3A5C' });
  const [departments, setDepartments] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDepartments() {
    const [{ data: deptRows }, { data: people }] = await Promise.all([
      supabase
        .from('departments')
        .select('id, name, leader_profile_id')
        .eq('church_id', profile.church_id)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('church_id', profile.church_id)
        .is('deleted_at', null)
        .order('full_name'),
    ]);
    setDepartments(deptRows || []);
    setLeaders(people || []);
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

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.church_id}/logo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('church-logos')
      .upload(fileName, file);

    if (uploadError) {
      setUploading(false);
      setError('Upload failed. Please try again.');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('church-logos')
      .getPublicUrl(fileName);

    setForm((f) => ({ ...f, logo_url: publicUrl }));
    setUploading(false);
    setSuccess('Logo uploaded! Click "Save Branding" to apply.');
  }

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
    setSuccess('Saved successfully!');
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

  async function assignHead(departmentId, leaderId) {
    const { data } = await supabase.rpc('set_department_head', {
      p_department_id: departmentId,
      p_leader_id: leaderId || null,
    });
    if (!data?.ok) {
      setError('Could not assign this head.');
      return;
    }
    loadDepartments();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <BackButton />
        <h1 className="font-display text-2xl font-bold text-ink">Church Settings</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{success}</div>}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink/80">Branding</h2>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Church Logo</label>

            {form.logo_url ? (
              <div className="flex items-center gap-3 mb-3">
                <img src={form.logo_url} alt="Church logo" className="h-16 w-16 object-contain rounded-lg border border-ink/10" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, logo_url: '' }))}
                  className="text-xs text-rose hover:text-rose/80 flex items-center gap-1"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-ink/10 rounded-lg p-6 text-center mb-3">
                <ImageIcon size={32} className="mx-auto text-ink/20 mb-2" />
                <p className="text-sm text-ink/50">No logo uploaded</p>
              </div>
            )}

            <label className={`flex items-center justify-center gap-2 w-full border border-ink/10 rounded-lg px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-ink/5 text-ink/40' : 'bg-parchment text-ink/70 hover:bg-ink/5'}`}>
              <Upload size={18} />
              {uploading ? 'Uploading…' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-ink/40 mt-1">
              Upload an image from your device. PNG, JPG up to 5MB.
            </p>
          </div>

          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                className="h-10 w-16 rounded-lg border border-ink/10 cursor-pointer"
              />
              <span className="text-sm text-ink/50">{form.brand_color}</span>
            </div>
            <p className="text-xs text-ink/40 mt-1">Applied throughout the app — sidebar, buttons, and accents use your brand color.</p>
          </div>

          <button type="submit" disabled={saving || uploading} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </form>

        {/* Departments */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink/80">Departments</h2>
          <p className="text-xs text-ink/50">
            Assign a head, then raise their role to Head of Department on{' '}
            <Link to="/team" className="text-signal font-semibold hover:text-signal-deep">Team</Link>
            {' '}so they can open Reports.
          </p>
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
                <div key={d.id} className="py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink/70">{d.name}</span>
                    <button onClick={() => removeDepartment(d.id)} className="text-xs text-rose hover:text-rose/80">Remove</button>
                  </div>
                  <select
                    value={d.leader_profile_id || ''}
                    onChange={(e) => assignHead(d.id, e.target.value)}
                    className="w-full border border-ink/10 rounded-lg px-3 py-1.5 text-xs bg-white"
                  >
                    <option value="">No head assigned</option>
                    {leaders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}{p.role === 'department_head' ? ' (head)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* More settings */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-2">
          <p className="text-sm font-semibold text-ink/80">More settings</p>
          <Link to="/settings/alerts" className="block text-sm text-signal font-semibold hover:text-signal-deep">Alerts & Reminders →</Link>
          <Link to="/giving/settings" className="block text-sm text-signal font-semibold hover:text-signal-deep">Giving & Bank Account →</Link>
          <Link to="/billing" className="block text-sm text-signal font-semibold hover:text-signal-deep">Billing & Plan →</Link>
        </div>
      </div>
    </div>
  );
}
