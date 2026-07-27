import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, QrCode, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ServiceAttendance() {
  const { profile } = useAuth();
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({}); // member_id -> { method, at }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  // FIX: attendance_slug isn't on the shared `church` object from
  // AuthContext (that only fetches id, name). Fetching it directly here,
  // same pattern Members.jsx already uses for onboarding_slug — this is
  // what was producing a QR pointing at ".../checkin/" with nothing after
  // the slash.
  const [attendanceSlug, setAttendanceSlug] = useState(null);

  useEffect(() => {
    async function loadSlug() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('attendance_slug')
        .eq('id', profile.church_id)
        .single();
      if (data) setAttendanceSlug(data.attendance_slug);
    }
    loadSlug();
  }, [profile]);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    // Find or reflect today's default session. We don't create it here —
    // self_check_in() creates it lazily the moment the first QR scan
    // happens. If nobody's scanned yet and no usher has opened this page
    // before, "no session yet" is the honest starting state.
    const { data: sessionRow } = await supabase
      .from('service_sessions')
      .select('id, service_name, service_date')
      .eq('church_id', profile.church_id)
      .eq('service_date', new Date().toISOString().slice(0, 10))
      .eq('service_name', 'Sunday Service')
      .is('deleted_at', null)
      .maybeSingle();

    const { data: memberRows } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .eq('church_id', profile.church_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('full_name');

    setMembers(memberRows || []);

    if (sessionRow) {
      setSession(sessionRow);
      const { data: attendanceRows } = await supabase
        .from('attendance_records')
        .select('member_id, check_in_method, checked_in_at')
        .eq('service_session_id', sessionRow.id)
        .is('deleted_at', null);

      const map = {};
      for (const a of attendanceRows || []) {
        map[a.member_id] = { method: a.check_in_method, at: a.checked_in_at };
      }
      setAttendance(map);
    } else {
      setSession(null);
      setAttendance({});
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function ensureSession() {
    if (session) return session;
    const { data, error } = await supabase
      .from('service_sessions')
      .insert({
        church_id: profile.church_id,
        service_name: 'Sunday Service',
        service_date: new Date().toISOString().slice(0, 10),
      })
      .select('id, service_name, service_date')
      .single();
    if (error) return null;
    setSession(data);
    return data;
  }

  async function handleManualToggle(memberId) {
    const already = attendance[memberId];
    if (already) return; // one-way: check-in only, no un-checking from this screen by design

    const activeSession = await ensureSession();
    if (!activeSession) return;

    // Optimistic update — the roster should feel instant during a live
    // service, not wait on a round trip before showing the tap registered.
    setAttendance((prev) => ({ ...prev, [memberId]: { method: 'manual', at: new Date().toISOString() } }));

    const { error } = await supabase.from('attendance_records').insert({
      church_id: profile.church_id,
      service_session_id: activeSession.id,
      member_id: memberId,
      check_in_method: 'manual',
    });

    if (error) {
      // Roll back on failure — RLS or a duplicate-key race are the two
      // realistic causes; either way the optimistic mark shouldn't stick
      // if the write didn't actually happen.
      setAttendance((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
    }
  }

  const checkInUrl = attendanceSlug
    ? `${window.location.origin}/checkin/${attendanceSlug}`
    : '';

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const checkedInCount = Object.keys(attendance).length;
  const qrCount = Object.values(attendance).filter((a) => a.method === 'qr_self').length;
  const manualCount = Object.values(attendance).filter((a) => a.method === 'manual').length;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold">Today's Attendance</h1>
          <button
            onClick={() => setShowQr((v) => !v)}
            className="flex items-center gap-1.5 text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors"
          >
            <QrCode size={16} /> Show Check-In QR
          </button>
        </div>

        {showQr && checkInUrl && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 text-center space-y-3">
            <p className="text-sm text-ink/60">
              Display this at the entrance — members scan with their own phone camera to check in.
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(checkInUrl)}`}
              alt="Attendance check-in QR code"
              className="mx-auto border rounded-lg"
              width={240}
              height={240}
            />
            <p className="text-ink/40 text-xs break-all">{checkInUrl}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-4 text-center">
            <p className="font-display text-2xl font-bold text-ink">{checkedInCount}</p>
            <p className="text-ink/50 text-xs mt-0.5">Checked In</p>
          </div>
          <div className="bg-signal-50 rounded-2xl p-4 text-center">
            <p className="font-display text-2xl font-bold text-signal-deep">{qrCount}</p>
            <p className="text-signal text-xs mt-0.5">Via QR</p>
          </div>
          <div className="bg-sage-50 rounded-2xl p-4 text-center">
            <p className="font-display text-2xl font-bold text-sage">{manualCount}</p>
            <p className="text-sage text-xs mt-0.5">Manual</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
          />

          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No members found.</p>
          ) : (
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {filteredMembers.map((m) => {
                const record = attendance[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => handleManualToggle(m.id)}
                    disabled={!!record}
                    className="w-full flex items-center justify-between py-3 px-1 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      {record ? (
                        <CheckCircle2 size={20} className="text-sage shrink-0" />
                      ) : (
                        <Circle size={20} className="text-ink/20 shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${record ? 'text-ink/40' : 'text-ink'}`}>
                        {m.full_name}
                      </span>
                    </div>
                    {record && (
                      <span className="text-xs text-ink/40">
                        {record.method === 'qr_self' ? 'QR' : 'Manual'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!session && !loading && (
          <p className="text-ink/30 text-xs text-center flex items-center justify-center gap-1.5">
            <Users size={14} /> No one has checked in yet today — the session starts automatically with the first check-in.
          </p>
        )}
      </div>
    </div>
  );
}
