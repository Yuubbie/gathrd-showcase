import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const TARGET_LABELS = { all: 'Everyone', department: 'A Department', cell_group: 'A Cell Group' };

const emptyForm = {
  title: '', body: '', target_type: 'all', target_department_id: '', target_cell_group_id: '',
  send_via_whatsapp: true, is_emergency: false, scheduled_at: '',
};

export default function Announcements() {
  const { profile, session } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cellGroups, setCellGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    const [{ data: ann }, { data: depts }, { data: cells }] = await Promise.all([
      supabase.from('announcements').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('departments').select('id, name').eq('church_id', profile.church_id).is('deleted_at', null),
      supabase.from('cell_groups').select('id, name').eq('church_id', profile.church_id).is('deleted_at', null),
    ]);

    setAnnouncements(ann || []);
    setDepartments(depts || []);
    setCellGroups(cells || []);

    // Load recipient counts per announcement
    if (ann?.length) {
      const counts = {};
      for (const a of ann) {
        const { data: recipients } = await supabase
          .from('announcement_recipients')
          .select('whatsapp_status')
          .eq('announcement_id', a.id);
        counts[a.id] = {
          total: recipients?.length || 0,
          sent: recipients?.filter((r) => r.whatsapp_status === 'sent').length || 0,
          notConfigured: recipients?.filter((r) => r.whatsapp_status === 'not_configured').length || 0,
        };
      }
      setStats(counts);
    }
    setLoading(false);
  }, [profile]);

  const [stats, setStats] = useState({});

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error } = await supabase.from('announcements').insert({
      church_id: profile.church_id,
      title: form.title,
      body: form.body,
      target_type: form.target_type,
      target_department_id: form.target_type === 'department' ? form.target_department_id : null,
      target_cell_group_id: form.target_type === 'cell_group' ? form.target_cell_group_id : null,
      send_via_whatsapp: form.send_via_whatsapp,
      is_emergency: form.is_emergency,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function sendNow(id) {
    setSendingId(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ announcement_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send.');
      } else {
        setNotice(
          data.not_configured > 0
            ? `Sent to ${data.total_recipients} recipient(s). WhatsApp isn't connected yet, so messages are logged but not delivered — connect Termii to activate real sending.`
            : `Sent to ${data.sent} of ${data.total_recipients} recipient(s).`
        );
      }
    } catch {
      setError('Could not reach the server.');
    }
    setSendingId(null);
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Announcements</h1>
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-indigo-600 text-white rounded-md px-3 py-1.5 font-medium">
            + New Announcement
          </button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</div>}
        {notice && <div className="text-sm text-blue-700 bg-blue-50 rounded-md p-2">{notice}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea required rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Send to</label>
              <select value={form.target_type} onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base bg-white">
                {Object.entries(TARGET_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.target_type === 'department' && (
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select required value={form.target_department_id} onChange={(e) => setForm((f) => ({ ...f, target_department_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base bg-white">
                  <option value="">Select…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {form.target_type === 'cell_group' && (
              <div>
                <label className="block text-sm font-medium mb-1">Cell Group</label>
                <select required value={form.target_cell_group_id} onChange={(e) => setForm((f) => ({ ...f, target_cell_group_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base bg-white">
                  <option value="">Select…</option>
                  {cellGroups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Schedule for later (optional)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base" />
              <p className="text-xs text-gray-400 mt-1">Leave blank to send immediately after creating.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.send_via_whatsapp} onChange={(e) => setForm((f) => ({ ...f, send_via_whatsapp: e.target.checked }))} />
              Send via WhatsApp (in addition to in-app)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_emergency} onChange={(e) => setForm((f) => ({ ...f, is_emergency: e.target.checked }))} />
              Mark as emergency broadcast
            </label>
            <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Announcement'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4">
          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No announcements yet.</p>
          ) : (
            <div className="divide-y">
              {announcements.map((a) => (
                <div key={a.id} className="py-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">
                        {a.is_emergency && <span className="text-red-600 mr-1">🚨</span>}
                        {a.title}
                      </p>
                      <p className="text-gray-600 text-sm mt-0.5">{a.body}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        To: {TARGET_LABELS[a.target_type]} • {a.sent_at ? `Sent ${new Date(a.sent_at).toLocaleString()}` : `Scheduled ${new Date(a.scheduled_at).toLocaleString()}`}
                      </p>
                      {stats[a.id] && (
                        <p className="text-gray-400 text-xs">
                          {stats[a.id].sent}/{stats[a.id].total} delivered via WhatsApp
                          {stats[a.id].notConfigured > 0 && ' (WhatsApp not connected yet)'}
                        </p>
                      )}
                    </div>
                    {!a.sent_at && (
                      <button
                        onClick={() => sendNow(a.id)}
                        disabled={sendingId === a.id}
                        className="text-xs bg-indigo-600 text-white rounded-md px-3 py-1.5 font-medium disabled:opacity-50 shrink-0"
                      >
                        {sendingId === a.id ? 'Sending…' : 'Send Now'}
                      </button>
                    )}
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
