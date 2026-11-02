import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, QrCode, Users, Play, Square, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';

const SERVICE_TYPES = [
  { id: 'sunday', label: 'Sunday', defaultName: 'Sunday Service' },
  { id: 'midweek', label: 'Midweek', defaultName: 'Midweek Service' },
  { id: 'special', label: 'Special', defaultName: 'Special Service' },
];

const METHOD_LABELS = { qr_self: 'QR', dashboard: 'App', manual: 'Manual' };

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

function formatShortDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AttendanceRow({ person, record, onCheckIn, onUndo }) {
  return (
    <div className="flex items-center justify-between py-1">
      <button
        type="button"
        onClick={() => onCheckIn(person)}
        disabled={!!record}
        className="flex-1 flex items-center gap-3 py-2.5 px-1 text-left disabled:cursor-default"
      >
        {record ? (
          <CheckCircle2 size={20} className="text-sage shrink-0" />
        ) : (
          <Circle size={20} className="text-ink/20 shrink-0" />
        )}
        <span className={`text-sm font-medium ${record ? 'text-ink/40' : 'text-ink'}`}>{person.full_name}</span>
      </button>
      {record && (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-ink/40">{METHOD_LABELS[record.method] || record.method}</span>
          <button
            type="button"
            onClick={() => onUndo(person)}
            className="text-xs text-rose hover:text-rose/80 font-medium"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function ServiceAttendance() {
  const { profile } = useAuth();
  const [service, setService] = useState(null); // the open service, or null
  const [members, setMembers] = useState([]);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState({}); // member_id -> { method, at }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [attendanceSlug, setAttendanceSlug] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Start-service form
  const [serviceType, setServiceType] = useState('sunday');
  const [serviceName, setServiceName] = useState('Sunday Service');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Attendance reports (shown when no service is open)
  const [history, setHistory] = useState([]);
  const [missed, setMissed] = useState(null); // { sessions, members }
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [childDetails, setChildDetails] = useState({});
  const [reportLoading, setReportLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);

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

  const load = useCallback(
    async (silent = false) => {
      if (!profile?.church_id) return;
      if (!silent) setLoading(true);

      const { data: svc, error: svcError } = await supabase.rpc('get_open_service');
      if (svcError) {
        setMessage('Could not load the service. Please refresh the page.');
        setLoading(false);
        return;
      }

      if (!svc?.open) {
        setService(null);
        setAttendance({});
        setChildren([]);
        setLoading(false);
        return;
      }

      setService(svc);

      const [{ data: memberRows }, { data: childRows }, { data: attendanceRows }] = await Promise.all([
        supabase
          .from('members')
          .select('id, full_name')
          .eq('church_id', profile.church_id)
          .eq('status', 'active')
          .neq('age_group', 'child')
          .is('deleted_at', null)
          .order('full_name'),
        supabase
          .from('members')
          .select('id, full_name, gender')
          .eq('church_id', profile.church_id)
          .eq('status', 'active')
          .eq('age_group', 'child')
          .is('deleted_at', null)
          .order('full_name'),
        supabase
          .from('attendance_records')
          .select('member_id, check_in_method, checked_in_at')
          .eq('service_session_id', svc.session_id)
          .is('deleted_at', null),
      ]);

      setMembers(memberRows || []);
      setChildren(childRows || []);
      const map = {};
      for (const a of attendanceRows || []) {
        map[a.member_id] = { method: a.check_in_method, at: a.checked_in_at };
      }
      setAttendance(map);
      setLoading(false);
    },
    [profile]
  );

  useEffect(() => {
    load();
  }, [load]);

  // While a service is open, refresh quietly so QR and app check-ins show up live.
  useEffect(() => {
    if (!service) return undefined;
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, [service, load]);

  const loadReports = useCallback(async () => {
    setReportLoading(true);
    const [hist, miss] = await Promise.all([
      supabase.rpc('get_attendance_history', { p_limit: 12 }),
      supabase.rpc('get_missed_services', { p_last: 3 }),
    ]);
    setHistory(Array.isArray(hist.data) ? hist.data : []);
    setMissed(miss.data && !miss.error ? miss.data : null);
    setDetails({});
    setChildDetails({});
    setOpenId(null);
    setReportLoading(false);
  }, []);

  // When no service is open, show who came and who did not.
  useEffect(() => {
    if (!loading && !service && profile?.church_id) loadReports();
  }, [loading, service, profile, loadReports]);

  async function handleRemoveService(sessionId, serviceName) {
    if (!window.confirm(`Remove "${serviceName}" from history? This cannot be undone.`)) return;
    setRemovingId(sessionId);
    setMessage('');
    const { data, error } = await supabase.rpc('delete_service_session', { p_session_id: sessionId });
    setRemovingId(null);
    if (error || !data || data.status !== 'deleted') {
      setMessage('Could not remove that service. Please try again.');
      return;
    }
    setHistory((prev) => prev.filter((h) => h.session_id !== sessionId));
    if (openId === sessionId) setOpenId(null);
  }

  async function toggleSession(sessionId) {
    if (openId === sessionId) {
      setOpenId(null);
      return;
    }
    setOpenId(sessionId);
    if (!details[sessionId]) {
      const { data, error } = await supabase.rpc('get_service_attendance', { p_session_id: sessionId });
      if (!error && data && data.status === 'ok') {
        setDetails((prev) => ({ ...prev, [sessionId]: data }));
      }
    }
    if (!childDetails[sessionId]) {
      const { data, error } = await supabase.rpc('get_session_children_attendance', { p_session_id: sessionId });
      setChildDetails((prev) => ({
        ...prev,
        [sessionId]: !error && data?.ok ? data : { ok: true, present: [], roster: [] },
      }));
    }
  }

  function pickType(type) {
    setServiceType(type.id);
    setServiceName(type.defaultName);
  }

  async function handleStart() {
    setStarting(true);
    setMessage('');
    const { data, error } = await supabase.rpc('start_service', {
      p_service_name: serviceName,
      p_service_type: serviceType,
    });
    setStarting(false);

    if (error || !data) {
      setMessage('Could not start the service. Please try again.');
      return;
    }
    if (data.status === 'not_allowed') {
      setMessage('Only a pastor or church admin can start a service.');
      return;
    }
    await load();
  }

  async function handleEnd() {
    if (!service) return;
    if (!window.confirm('End this service? Members will no longer be able to check in.')) return;
    setEnding(true);
    const { data, error } = await supabase.rpc('end_service', { p_session_id: service.session_id });
    setEnding(false);
    if (error || !data || (data.status !== 'ended' && data.status !== 'not_found')) {
      setMessage('Could not end the service. Please try again.');
      return;
    }
    setShowQr(false);
    await load();
  }

  async function handleChildCheckIn(child) {
    if (!service || attendance[child.id]) return;
    setMessage('');
    setAttendance((prev) => ({ ...prev, [child.id]: { method: 'manual', at: new Date().toISOString() } }));
    const { data, error } = await supabase.rpc('teacher_check_in', { p_member_id: child.id });
    const ok = !error && data && (data.status === 'checked_in' || data.status === 'already_checked_in');
    if (!ok) {
      setAttendance((prev) => {
        const next = { ...prev };
        delete next[child.id];
        return next;
      });
      setMessage(
        data?.status === 'closed'
          ? 'This service has ended.'
          : `Could not check in ${child.full_name}. Please try again.`
      );
    }
  }

  async function handleChildUndo(child) {
    if (!service) return;
    if (!window.confirm(`Remove the check-in for ${child.full_name}?`)) return;
    setMessage('');
    const previous = attendance[child.id];
    setAttendance((prev) => {
      const next = { ...prev };
      delete next[child.id];
      return next;
    });
    const { data, error } = await supabase.rpc('teacher_undo_check_in', { p_member_id: child.id });
    if (error || !data || (data.status !== 'undone' && data.status !== 'not_found')) {
      setAttendance((prev) => ({ ...prev, [child.id]: previous }));
      setMessage(`Could not remove the check-in for ${child.full_name}. Please try again.`);
    }
  }

  async function handleCheckIn(member) {
    if (!service || attendance[member.id]) return;
    setMessage('');
    // Show the tap instantly. Roll back if the server says no.
    setAttendance((prev) => ({ ...prev, [member.id]: { method: 'manual', at: new Date().toISOString() } }));

    const { data, error } = await supabase.rpc('staff_check_in', {
      p_session_id: service.session_id,
      p_member_id: member.id,
    });

    const ok = !error && data && (data.status === 'checked_in' || data.status === 'already_checked_in');
    if (!ok) {
      setAttendance((prev) => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
      setMessage(
        data?.status === 'closed'
          ? 'This service has ended.'
          : `Could not check in ${member.full_name}. Please try again.`
      );
    }
  }

  async function handleUndo(member) {
    if (!service) return;
    if (!window.confirm(`Remove the check-in for ${member.full_name}?`)) return;
    setMessage('');

    const previous = attendance[member.id];
    setAttendance((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });

    const { data, error } = await supabase.rpc('staff_undo_check_in', {
      p_session_id: service.session_id,
      p_member_id: member.id,
    });

    if (error || !data || (data.status !== 'undone' && data.status !== 'not_found')) {
      setAttendance((prev) => ({ ...prev, [member.id]: previous }));
      setMessage(`Could not remove the check-in for ${member.full_name}. Please try again.`);
    }
  }

  const checkInUrl =
    attendanceSlug && service?.check_in_token
      ? `${window.location.origin}/checkin/${attendanceSlug}?t=${service.check_in_token}`
      : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setMessage('Could not copy the link. Select it and copy it by hand.');
    }
  }

  const q = search.toLowerCase();
  const filteredMembers = members.filter((m) => m.full_name.toLowerCase().includes(q));
  const filteredChildren = children.filter((c) => c.full_name.toLowerCase().includes(q));
  const adultPresent = members.filter((m) => attendance[m.id]).length;
  const childPresent = children.filter((c) => attendance[c.id]).length;
  const selfCount = Object.values(attendance).filter((a) => a.method === 'qr_self' || a.method === 'dashboard').length;
  const manualCount = Object.values(attendance).filter((a) => a.method === 'manual').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-10">
        <p className="text-ink/40 text-sm text-center">Loading…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- no service open
  if (!service) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-xl font-semibold">Attendance</h1>

          <div className={`${CARD} p-6 space-y-4`}>
            <div>
              <h2 className="font-display font-bold text-ink">Start a service</h2>
              <p className="text-ink/50 text-sm mt-1">
                Check-in opens when you start a service and closes when you end it.
              </p>
            </div>

            <div className="flex gap-2">
              {SERVICE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickType(t)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    serviceType === t.id ? 'bg-signal text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="service-name" className="block text-sm text-ink/60 mb-1">
                Service name
              </label>
              <input
                id="service-name"
                value={serviceName}
                maxLength={80}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
            >
              <Play size={16} /> {starting ? 'Starting…' : 'Start service'}
            </button>
          </div>

          {message && <p className="text-sm text-rose text-center">{message}</p>}

          <div className={`${CARD} p-6 space-y-2`}>
            <h2 className="font-display font-bold text-ink">Children</h2>
            <p className="text-ink/50 text-sm">
              Children are listed separately from adults. Teachers can add a child, mark them present while a service is open, or paste yesterday's names onto a past service.
            </p>
            <Link to="/children" className="inline-block text-sm text-signal font-semibold hover:text-signal-deep">
              Open children desk
            </Link>
          </div>

          <div className={`${CARD} p-6 space-y-3`}>
            <h2 className="font-display font-bold text-ink">Needs a call</h2>
            {reportLoading && !missed ? (
              <p className="text-ink/40 text-sm">Loading…</p>
            ) : missed && missed.sessions >= 3 ? (
              missed.members.length === 0 ? (
                <p className="text-ink/50 text-sm">
                  Everyone came to at least one of the last {missed.sessions} Sundays.
                </p>
              ) : (
                <>
                  <p className="text-ink/50 text-sm">
                    {missed.members.length} member{missed.members.length === 1 ? '' : 's'} missed the last{' '}
                    {missed.sessions} Sundays.
                  </p>
                  <div className="divide-y divide-ink/5">
                    {missed.members.map((m) => (
                      <div key={m.member_id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{m.full_name}</p>
                          <p className="text-xs text-ink/40">
                            {m.last_seen ? `Last seen ${formatShortDate(m.last_seen)}` : 'Not seen yet'}
                          </p>
                        </div>
                        <ContactActions
                          phone={m.phone}
                          name={m.full_name}
                          message={`Good day ${m.full_name}, Pastor and the church family missed you in service. Praying you are doing well.`}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              <p className="text-ink/50 text-sm">This list appears after three completed Sunday services.</p>
            )}
          </div>

          <div className={`${CARD} p-6 space-y-3`}>
            <h2 className="font-display font-bold text-ink">Past services</h2>
            {history.length === 0 ? (
              <p className="text-ink/50 text-sm">{reportLoading ? 'Loading…' : 'No completed services yet.'}</p>
            ) : (
              <div className="divide-y divide-ink/5">
                {history.map((h) => {
                  const pct = h.total > 0 ? Math.round((h.present / h.total) * 100) : 0;
                  const detail = details[h.session_id];
                  const kids = childDetails[h.session_id];
                  const kidsPresent = kids?.present || [];
                  const childIdSet = new Set([
                    ...kidsPresent.map((p) => p.member_id),
                    ...(kids?.roster || []).map((r) => r.member_id),
                  ]);
                  const kidsAbsent = (kids?.roster || []).filter((r) => !kidsPresent.some((p) => p.member_id === r.member_id));
                  const adultPresentList = (detail?.present || []).filter((p) => !childIdSet.has(p.member_id));
                  const adultAbsentList = (detail?.absent || []).filter((a) => !childIdSet.has(a.member_id));
                  return (
                    <div key={h.session_id} className="py-1">
                      <button
                        type="button"
                        onClick={() => toggleSession(h.session_id)}
                        className={`w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg text-left ${
                          openId === h.session_id ? 'bg-signal/5' : 'hover:bg-ink/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{formatShortDate(h.service_date)}</p>
                          <p className="text-xs text-ink/40">{h.service_name} · tap to view adults and children</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-ink">
                            {h.present} of {h.total}
                          </p>
                          <p className="text-xs text-ink/40">{pct}% attended</p>
                        </div>
                      </button>
                      {openId === h.session_id && (
                        <div className="pb-3 space-y-3">
                          <button
                            type="button"
                            disabled={removingId === h.session_id}
                            onClick={() => handleRemoveService(h.session_id, h.service_name)}
                            className="text-xs text-rose font-semibold hover:underline disabled:opacity-50"
                          >
                            {removingId === h.session_id ? 'Removing…' : 'Remove from history'}
                          </button>
                          {!detail ? (
                            <p className="text-ink/40 text-sm">Loading…</p>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-2">Adults</p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-1">
                                      Present ({adultPresentList.length})
                                    </p>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {adultPresentList.map((p) => (
                                        <p key={p.member_id} className="text-sm text-ink/70">
                                          {p.full_name}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-rose mb-1">
                                      Absent ({adultAbsentList.length})
                                    </p>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {adultAbsentList.map((a) => (
                                        <div key={a.member_id} className="flex items-center justify-between gap-2">
                                          <p className="text-sm text-ink/70 min-w-0 truncate">{a.full_name}</p>
                                          <ContactActions phone={a.phone} name={a.full_name} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-ink/5 pt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-2">Children</p>
                                {!kids ? (
                                  <p className="text-ink/40 text-sm">Loading children…</p>
                                ) : kidsPresent.length === 0 && kidsAbsent.length === 0 ? (
                                  <p className="text-ink/50 text-sm">No children on the list for this service.</p>
                                ) : (
                                  <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-1">
                                        Present ({kidsPresent.length})
                                      </p>
                                      <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {kidsPresent.map((p) => (
                                          <p key={p.member_id} className="text-sm text-ink/70">
                                            {p.full_name}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-rose mb-1">
                                        Absent ({kidsAbsent.length})
                                      </p>
                                      <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {kidsAbsent.map((a) => (
                                          <p key={a.member_id} className="text-sm text-ink/70">
                                            {a.full_name}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-ink/30 text-xs text-center flex items-center justify-center gap-1.5">
            <Users size={14} /> A service closes by itself after 6 hours if nobody ends it.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- service open
  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold">{service.service_name}</h1>
            <p className="text-ink/50 text-xs mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-sage" /> Check-in is open
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              className="flex items-center gap-1.5 text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors"
            >
              <QrCode size={16} /> {showQr ? 'Hide QR' : 'Show Check-In QR'}
            </button>
            <button
              type="button"
              onClick={handleEnd}
              disabled={ending}
              className="flex items-center gap-1.5 text-sm bg-rose/10 text-rose rounded-lg px-3.5 py-2 font-semibold hover:bg-rose/20 transition-colors disabled:opacity-50"
            >
              <Square size={14} /> {ending ? 'Ending…' : 'End service'}
            </button>
          </div>
        </div>

        <div className={`${CARD} p-6 text-center space-y-2`}>
          <p className="text-sm text-ink/60">Check-in code</p>
          {service.check_in_code ? (
            <>
              <p className="font-display text-5xl font-bold tracking-[0.3em] pl-[0.3em] text-ink">
                {service.check_in_code}
              </p>
              <p className="text-ink/40 text-xs">
                Announce this code or show it on the screen. Members type it into the app to check in. It changes every
                service and stops working when you end the service.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink/50">This service has no code. End it and start a new service to get one.</p>
          )}
        </div>

        {showQr && (
          <div className={`${CARD} p-6 text-center space-y-3`}>
            {checkInUrl ? (
              <>
                <p className="text-sm text-ink/60">
                  Display this at the entrance. Members scan it with their phone camera to check in. It stops working
                  when you end the service.
                </p>
                <div className="inline-block p-3 bg-white border rounded-lg">
                  <QRCodeSVG value={checkInUrl} size={240} />
                </div>
                <p className="text-ink/40 text-xs break-all">{checkInUrl}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 text-sm text-signal font-semibold hover:text-signal-deep"
                >
                  <Copy size={14} /> {copied ? 'Copied' : 'Copy link'}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink/50">The check-in link is not ready yet. Refresh the page and try again.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`${CARD} p-4 text-center`}>
            <p className="font-display text-2xl font-bold text-ink">{adultPresent}</p>
            <p className="text-ink/50 text-xs mt-0.5">Adults here</p>
          </div>
          <div className={`${CARD} p-4 text-center`}>
            <p className="font-display text-2xl font-bold text-ink">{childPresent}</p>
            <p className="text-ink/50 text-xs mt-0.5">Children here</p>
          </div>
          <div className="bg-signal-50 rounded-2xl p-4 text-center">
            <p className="font-display text-2xl font-bold text-signal-deep">{selfCount}</p>
            <p className="text-signal text-xs mt-0.5">Self check-in</p>
          </div>
          <div className="bg-sage-50 rounded-2xl p-4 text-center">
            <p className="font-display text-2xl font-bold text-sage">{manualCount}</p>
            <p className="text-sage text-xs mt-0.5">Manual</p>
          </div>
        </div>

        {message && <p className="text-sm text-rose text-center">{message}</p>}

        <div className={`${CARD} p-5 space-y-3`}>
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
          />

          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Adults</p>
          {filteredMembers.length === 0 ? (
            <p className="text-ink/40 text-sm py-4 text-center">No adults found.</p>
          ) : (
            <div className="divide-y max-h-[40vh] overflow-y-auto">
              {filteredMembers.map((m) => (
                <AttendanceRow
                  key={m.id}
                  person={m}
                  record={attendance[m.id]}
                  onCheckIn={handleCheckIn}
                  onUndo={handleUndo}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`${CARD} p-5 space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Children</p>
            <Link to="/children" className="text-xs text-signal font-semibold hover:text-signal-deep">
              Open children desk
            </Link>
          </div>
          {filteredChildren.length === 0 ? (
            <p className="text-ink/40 text-sm py-4 text-center">No children on the list yet. Add them on the children desk.</p>
          ) : (
            <div className="divide-y max-h-[40vh] overflow-y-auto">
              {filteredChildren.map((c) => (
                <AttendanceRow
                  key={c.id}
                  person={c}
                  record={attendance[c.id]}
                  onCheckIn={handleChildCheckIn}
                  onUndo={handleChildUndo}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}