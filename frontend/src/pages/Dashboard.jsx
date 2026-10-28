import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Wallet, Sparkles, ArrowUpRight, AlertCircle, AlertTriangle, Cake, UsersRound, ClipboardCheck, CheckCircle2, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import OnboardingChecklist from '../components/OnboardingChecklist';

const ROLE_LABELS = {
  senior_pastor: 'Senior Pastor', assistant_pastor: 'Assistant Pastor',
  church_admin: 'Admin', finance_admin: 'Finance',
  department_head: 'Head of Department', cell_leader: 'Cell Group Leader',
  childrens_teacher: "Children's Ministry Teacher", member: 'Church Member',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Roles covered by is_pastor_or_admin() at the RLS layer (confirmed against
// 0004/0007/0015 policy files). Anything gated by this flag reflects real,
// church-wide data these roles can actually see. Do NOT run an ungated
// church-wide query and assume everyone sees the same numbers — they don't;
// RLS silently narrows the result set instead of erroring, so a wrong count
// looks identical to a real one unless we gate on the client too.
const CHURCH_WIDE_ROLES = ['senior_pastor', 'assistant_pastor', 'church_admin'];

function isBirthdayThisWeek(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const original = new Date(dateStr);
  const month = original.getUTCMonth();
  const day = original.getUTCDate();
  let occurrence = new Date(todayMidnight.getFullYear(), month, day);
  if (occurrence < todayMidnight) occurrence = new Date(todayMidnight.getFullYear() + 1, month, day);
  const diffDays = Math.round((occurrence - todayMidnight) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  // FIX (Low): guard against clock skew / future timestamps instead of
  // silently showing "-3m ago".
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDutyDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function Dashboard() {
  const { profile, church } = useAuth();
  const [stats, setStats] = useState({ members: 0, visitors: 0, givingThisMonth: 0, converts: 0 });
  const [cellStats, setCellStats] = useState(null); // scoped stat for cell_leader role
  // FIX: personal stats for a plain member — their own giving total and
  // attendance count, pulled via the member_read_own_giving and
  // member_read_own_attendance RLS policies. Only populates for members
  // whose members row has been linked to their login via profile_id (see
  // claim-account Edge Function) — otherwise these correctly stay at 0,
  // since there's genuinely nothing to link yet.
  const [myStats, setMyStats] = useState({ totalGiving: null, servicesAttended: null });
  const [flags, setFlags] = useState([]);
  const [birthdaysThisWeek, setBirthdaysThisWeek] = useState([]);
  const [cellMeetingsThisWeek, setCellMeetingsThisWeek] = useState([]);
  const [activity, setActivity] = useState([]);
  const [churchNotices, setChurchNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // FIX (High): surfaced load errors instead of silent zeros
  // Open service the member can check in to from this dashboard.
  const [service, setService] = useState(null);
  const [checkInWorking, setCheckInWorking] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [checkInCode, setCheckInCode] = useState('');
  // Roster duties assigned to the logged-in person (next 60 days).
  const [myDuties, setMyDuties] = useState([]);

  const canSeeFinance = ['senior_pastor', 'assistant_pastor', 'finance_admin'].includes(profile?.role);
  const canSeeChurchStats = CHURCH_WIDE_ROLES.includes(profile?.role);
  const isCellLeader = profile?.role === 'cell_leader';
  const isMember = profile?.role === 'member';

  // FIX (High): race-condition / unmount guard. If profile changes mid-flight
  // (role switch, fast re-render, navigating away), a slower stale response
  // can no longer clobber newer state or fire setState after unmount.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    let cancelled = false;

    async function load() {
      if (!profile?.church_id) return;
      setLoading(true);
      setLoadError(null);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().slice(0, 10);
      const todayName = DAY_NAMES[new Date().getDay()];
      const todayStr = new Date().toISOString().slice(0, 10);

      try {
        const [
          membersRes, visitorsRes, discipleshipCountRes, givingRes,
          overdueTasksRes, discipleshipStallRes,
          membersListRes, cellGroupsRes,
          recentVisitorsRes, recentGivingRes, recentAnnouncementsRes,
          myGivingRes, myAttendanceCountRes,
        ] = await Promise.all([
          // FIX (Critical): church-wide counts now gated to the roles that
          // can actually see church-wide data. Ungated before, which meant
          // RLS silently narrowed results for 5 of 8 roles and the UI showed
          // the narrowed number as if it were the real one.
          canSeeChurchStats
            ? supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('status', 'active').is('deleted_at', null)
            : Promise.resolve({ count: null }),
          canSeeChurchStats
            ? supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).is('deleted_at', null)
            : Promise.resolve({ count: null }),
          canSeeChurchStats
            // FIX (High): exclude soft-deleted rows AND treat 'worker_consecration'
            // as a terminal stage so this stops growing forever. This is a product
            // default, not a hard schema rule — flag if you'd rather count everyone
            // who's ever gone through discipleship instead of just those "in progress."
            ? supabase.from('discipleship_records').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).is('deleted_at', null).neq('current_stage', 'worker_consecration')
            : Promise.resolve({ count: null }),
          canSeeFinance
            // FIX: deleted_at filter added — confirmed present in 0010_giving_schema.sql.
            ? supabase.from('giving_records').select('amount').eq('church_id', profile.church_id).eq('status', 'success').is('deleted_at', null).gte('given_at', startStr)
            : Promise.resolve({ data: [] }),
          canSeeChurchStats
            ? supabase.from('follow_up_tasks').select('id, visitors(full_name)').eq('church_id', profile.church_id).eq('status', 'pending').lt('due_at', new Date().toISOString()).limit(5)
            : Promise.resolve({ data: [] }),
          canSeeChurchStats
            ? supabase.from('discipleship_records').select('id, current_stage, stage_entered_at, visitors(full_name)').eq('church_id', profile.church_id).is('deleted_at', null)
            : Promise.resolve({ data: [] }),
          canSeeChurchStats
            ? supabase.from('members').select('id, full_name, date_of_birth').eq('church_id', profile.church_id).eq('status', 'active').is('deleted_at', null)
            : Promise.resolve({ data: [] }),
          // Cell group NAMES are visible to everyone in the church (open RLS
          // policy) — this stays ungated. Only the per-group report STATUS
          // below needs role checks.
          supabase.from('cell_groups').select('id, name, meeting_day, leader_profile_id').eq('church_id', profile.church_id).is('deleted_at', null),
          canSeeChurchStats
            ? supabase.from('visitors').select('id, full_name, created_at').eq('church_id', profile.church_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(3)
            : Promise.resolve({ data: [] }),
          canSeeFinance
            ? supabase.from('giving_records').select('id, amount, category, given_at, status').eq('church_id', profile.church_id).eq('status', 'success').is('deleted_at', null).order('given_at', { ascending: false }).limit(3)
            : Promise.resolve({ data: [] }),
          supabase.from('announcements').select('id, title, body, sent_at').eq('church_id', profile.church_id).not('sent_at', 'is', null).is('deleted_at', null).order('sent_at', { ascending: false }).limit(5),
          // FIX: personal giving/attendance for a plain member. RLS
          // (member_read_own_giving / member_read_own_attendance) already
          // scopes these to only the caller's own records via their
          // members.profile_id link — no client-side member_id filter
          // needed or even possible, since a member has no access to look
          // up their own members.id directly.
          isMember
            ? supabase.from('giving_records').select('amount').eq('status', 'success').is('deleted_at', null)
            : Promise.resolve({ data: [] }),
          isMember
            ? supabase.from('attendance_records').select('id', { count: 'exact', head: true }).is('deleted_at', null)
            : Promise.resolve({ count: null }),
        ]);

        // Bail out silently if a newer load has since started, or we've unmounted.
        if (cancelled || requestIdRef.current !== thisRequestId) return;

        // FIX (High): collect real query errors instead of treating a failed
        // fetch the same as "zero results." Any error becomes a visible banner.
        const results = {
          members: membersRes, visitors: visitorsRes, discipleshipCount: discipleshipCountRes,
          giving: givingRes, overdueTasks: overdueTasksRes, discipleshipStall: discipleshipStallRes,
          membersList: membersListRes, cellGroups: cellGroupsRes,
          recentVisitors: recentVisitorsRes, recentGiving: recentGivingRes, recentAnnouncements: recentAnnouncementsRes,
          myGiving: myGivingRes, myAttendanceCount: myAttendanceCountRes,
        };
        const failed = Object.entries(results).filter(([, r]) => r?.error);
        if (failed.length > 0) {
          console.error('Dashboard load errors:', failed.map(([k, r]) => `${k}: ${r.error.message}`));
          setLoadError('Some information on this page may be out of date. Try refreshing.');
        }

        setStats({
          members: membersRes.count ?? null,
          visitors: visitorsRes.count ?? null,
          converts: discipleshipCountRes.count ?? null,
          givingThisMonth: (givingRes.data || []).reduce((sum, g) => sum + Number(g.amount), 0),
        });

        if (isMember) {
          setMyStats({
            totalGiving: (myGivingRes.data || []).reduce((sum, g) => sum + Number(g.amount), 0),
            servicesAttended: myAttendanceCountRes.count ?? 0,
          });
        }

        // Scoped stat for cell_leader: their own cell's member count, which
        // RLS (cell_leader_read_own_cell_members) actually grants them.
        if (isCellLeader && profile?.cell_group_id) {
          const { count, error } = await supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('cell_group_id', profile.cell_group_id)
            .eq('status', 'active')
            .is('deleted_at', null);
          if (!cancelled && requestIdRef.current === thisRequestId) {
            setCellStats(error ? null : { count: count ?? 0 });
          }
        } else {
          setCellStats(null);
        }

        const collectedFlags = [];
        for (const t of overdueTasksRes.data || []) {
          collectedFlags.push({ id: `v-${t.id}`, label: `Follow up with ${t.visitors?.full_name || 'a visitor'}`, to: '/visitors' });
        }
        for (const d of discipleshipStallRes.data || []) {
          const days = Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 30) {
            collectedFlags.push({ id: `d-${d.id}`, label: `${d.visitors?.full_name || 'A convert'} stalled ${days}d at "${d.current_stage.replace(/_/g, ' ')}"`, to: '/discipleship' });
          }
        }
        setFlags(collectedFlags.slice(0, 4));

        setBirthdaysThisWeek((membersListRes.data || []).filter((m) => isBirthdayThisWeek(m.date_of_birth)));

        // FIX (Critical + Medium): the old version ran one report-status
        // query PER cell group meeting today (N+1), and ran it for every
        // role even though RLS only lets pastors/admins/the group's own
        // leader read cell_group_meeting_reports. For everyone else it came
        // back empty and got rendered as "Pending report" — false, since
        // "I can't see it" and "it's actually pending" look identical if you
        // don't check who's allowed to know.
        //
        // Fixed: one batched query instead of N, and each group's badge only
        // renders if the current user is actually allowed to know its status
        // (pastor/admin, or the specific leader of that group).
        const cellGroups = cellGroupsRes.data || [];
        const meetingsToday = cellGroups.filter((c) => c.meeting_day === todayName);
        let reportedIds = new Set();
        if (meetingsToday.length > 0) {
          const { data: reports } = await supabase
            .from('cell_group_meeting_reports')
            .select('cell_group_id')
            .in('cell_group_id', meetingsToday.map((c) => c.id))
            .eq('meeting_date', todayStr);
          reportedIds = new Set((reports || []).map((r) => r.cell_group_id));
        }
        const withReportStatus = meetingsToday.map((c) => {
          const statusKnown = canSeeChurchStats || c.leader_profile_id === profile?.id;
          return { ...c, reported: reportedIds.has(c.id), statusKnown };
        });
        if (!cancelled && requestIdRef.current === thisRequestId) setCellMeetingsThisWeek(withReportStatus);

        setChurchNotices(recentAnnouncementsRes.data || []);
        const feed = [
          ...(recentVisitorsRes.data || []).map((v) => ({ id: `av-${v.id}`, text: `${v.full_name} checked in as a visitor`, at: v.created_at, to: '/visitors' })),
          ...(recentGivingRes.data || []).map((g) => ({ id: `ag-${g.id}`, text: `₦${Number(g.amount).toLocaleString()} received (${g.category})`, at: g.given_at, to: '/giving' })),
        ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
        if (!cancelled && requestIdRef.current === thisRequestId) setActivity(feed);
      } catch (err) {
        if (!cancelled && requestIdRef.current === thisRequestId) {
          console.error('Dashboard load failed:', err);
          setLoadError("Couldn't load your dashboard. Try refreshing the page.");
        }
      } finally {
        if (!cancelled && requestIdRef.current === thisRequestId) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile, canSeeFinance, canSeeChurchStats, isCellLeader, isMember]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Members: look for an open service every 30 seconds so the check-in
  // button appears while a service is running and disappears when it ends.
  useEffect(() => {
    if (!isMember) return undefined;
    let cancelled = false;
    async function loadService() {
      const { data } = await supabase.rpc('get_open_service');
      if (!cancelled) setService(data && data.open ? data : null);
    }
    loadService();
    const timer = setInterval(loadService, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isMember]);

  // Anyone with a linked member record: load the duties assigned to them.
  // The database function only ever returns the caller's own duties.
  useEffect(() => {
    if (!profile?.church_id) return undefined;
    let cancelled = false;
    async function loadDuties() {
      const { data, error } = await supabase.rpc('get_my_duties');
      if (!cancelled && !error && Array.isArray(data)) setMyDuties(data);
    }
    loadDuties();
    return () => {
      cancelled = true;
    };
  }, [profile?.church_id]);

  async function handleMemberCheckIn() {
    const code = checkInCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setCheckInError('Enter the 6-digit code shown at church.');
      return;
    }
    setCheckInWorking(true);
    setCheckInError('');
    const { data, error } = await supabase.rpc('member_check_in_with_code', { p_code: code });
    setCheckInWorking(false);

    if (error || !data) {
      setCheckInError('Check-in failed. Please try again, or ask an usher to check you in.');
      return;
    }
    if (data.status === 'checked_in' || data.status === 'already_checked_in') {
      setCheckInCode('');
      setService((prev) => (prev ? { ...prev, already_checked_in: true } : prev));
      if (data.status === 'checked_in') {
        setMyStats((prev) => ({ ...prev, servicesAttended: (prev.servicesAttended ?? 0) + 1 }));
      }
      return;
    }
    if (data.status === 'wrong_code') {
      setCheckInError('That code is not correct. Check the screen or ask an usher.');
      return;
    }
    if (data.status === 'too_many_attempts') {
      setCheckInError('Too many wrong codes. Please wait 10 minutes, or ask an usher to check you in.');
      return;
    }
    if (data.status === 'no_service') {
      setService(null);
      setCheckInError('This service has just ended.');
      return;
    }
    setCheckInError(
      data.status === 'no_member'
        ? 'Your login is not linked to a member record yet. Please ask an usher to check you in.'
        : 'Check-in failed. Please ask an usher to check you in.'
    );
  }

  // Nothing church-wide to show this role, and they don't lead a cell or
  // have personal member stats either — rather than an empty stat row,
  // say so plainly instead of implying there's just no data.
  const noStatsAvailable = !canSeeChurchStats && !canSeeFinance && !cellStats && !isMember;

  // Group the duty lines by service so a person with several duties at one
  // service sees them together.
  const dutyGroups = [];
  for (const d of myDuties) {
    const key = `${d.service_date}|${d.service_title}`;
    let group = dutyGroups.find((g) => g.key === key);
    if (!group) {
      group = { key, date: d.service_date, title: d.service_title, duties: [] };
      dutyGroups.push(group);
    }
    group.duties.push(d.duty);
  }

  return (
    <div className="px-5 py-8 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-ink/50 text-sm">{greeting()}, {ROLE_LABELS[profile?.role]}</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink mt-0.5">
          {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        {church?.name && (
          <p className="text-ink/40 text-sm mt-1">{church.name}</p>
        )}
      </div>

      {loadError && (
        <Card className="p-4 mb-6 border-amberflag/30 bg-amberflag/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amberflag shrink-0" />
          <p className="text-sm text-ink/70">{loadError}</p>
        </Card>
      )}

      <OnboardingChecklist />

      {!isMember && (
        <Card className="p-6 md:p-8 bg-signal-gradient border-0 mb-6">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">Sunday desk</p>
          <h2 className="font-display text-xl font-bold text-white mb-4">What needs doing today?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {canSeeChurchStats && <QuickAction to="/attendance" label="Start service / take attendance" />}
            {canSeeChurchStats && <QuickAction to="/visitors/check-in" label="Check in a visitor" />}
            {canSeeFinance && <QuickAction to="/giving/counting" label="Count the offering" />}
            {canSeeChurchStats && <QuickAction to="/follow-up" label="Who needs a call" />}
            {canSeeFinance && <QuickAction to="/giving/transfers" label="Verify bank transfers" />}
            {canSeeChurchStats && <QuickAction to="/members/new" label="Add a member" />}
          </div>
        </Card>
      )}

      {isMember && service && service.is_member && (
        <Card className="p-5 mb-6">
          {service.already_checked_in ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={28} className="text-sage shrink-0" />
              <div>
                <p className="font-display font-bold text-ink">You're checked in</p>
                <p className="text-sm text-ink/50">{service.service_name}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-ink/40">Service in progress</p>
                <p className="font-display font-bold text-ink">{service.service_name}</p>
                <p className="text-sm text-ink/50 mt-1">Enter the 6-digit code shown at church.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="000000"
                  aria-label="6-digit check-in code"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 border border-ink/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleMemberCheckIn}
                  disabled={checkInWorking || checkInCode.length !== 6}
                  className="bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {checkInWorking ? 'Checking in…' : 'Check me in'}
                </button>
              </div>
            </div>
          )}
          {checkInError && <p className="text-sm text-rose mt-3">{checkInError}</p>}
        </Card>
      )}

      {dutyGroups.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-signal" />
              <h2 className="font-display font-bold text-ink text-sm">My Duties</h2>
            </div>
            <Link to="/roster" className="text-xs text-signal font-semibold hover:text-signal-deep">View roster →</Link>
          </div>
          <div className="divide-y divide-ink/5">
            {dutyGroups.slice(0, 5).map((g) => (
              <div key={g.key} className="py-2.5">
                <p className="text-sm font-medium text-ink">
                  {formatDutyDate(g.date)} <span className="text-ink/40 font-normal">· {g.title}</span>
                </p>
                <p className="text-sm text-ink/60 mt-0.5">{g.duties.join(', ')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!noStatsAvailable && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {canSeeChurchStats && (
            <>
              <StatCard icon={Users} label="Active Members" value={loading ? '—' : stats.members} to="/members" color="signal" />
              <StatCard icon={UserPlus} label="Visitors Logged" value={loading ? '—' : stats.visitors} to="/visitors" color="sage" />
              <StatCard icon={Sparkles} label="In Discipleship" value={loading ? '—' : stats.converts} to="/discipleship" color="amberflag" />
            </>
          )}
          {isCellLeader && cellStats && (
            <StatCard icon={UsersRound} label="My Cell Group" value={loading ? '—' : cellStats.count} to="/cell-groups" color="signal" />
          )}
          {isMember && (
            <>
              <StatCard
                icon={Wallet}
                label="My Giving (All Time)"
                value={loading ? '—' : `₦${(myStats.totalGiving ?? 0).toLocaleString()}`}
                to="/dashboard"
                color="signal"
              />
              <StatCard
                icon={ClipboardCheck}
                label="Services Attended"
                value={loading ? '—' : myStats.servicesAttended ?? 0}
                to="/dashboard"
                color="sage"
              />
            </>
          )}
          {canSeeFinance && (
            <StatCard
              icon={Wallet}
              label="Giving This Month"
              value={loading ? '—' : `₦${stats.givingThisMonth.toLocaleString()}`}
              to="/giving"
              color="signal"
            />
          )}
        </div>
      )}

      {noStatsAvailable && !loading && (
        <Card className="p-5 mb-6">
          <p className="text-sm text-ink/60">Your role doesn't have a church-wide overview here yet — use the menu to get to what you need.</p>
        </Card>
      )}

      {!loading && canSeeChurchStats && flags.length > 0 && (
        <Card className="p-5 mb-6 border-rose/20 bg-rose-50/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose" />
              <h2 className="font-display font-bold text-ink">Needs Your Attention</h2>
            </div>
            <Link to="/follow-up" className="text-xs text-signal font-semibold hover:text-signal-deep">View all →</Link>
          </div>
          <div className="space-y-2">
            {flags.map((f) => (
              <Link key={f.id} to={f.to} className="block text-sm text-ink/70 hover:text-signal transition-colors">• {f.label}</Link>
            ))}
          </div>
        </Card>
      )}

      {!loading && (birthdaysThisWeek.length > 0 || cellMeetingsThisWeek.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {birthdaysThisWeek.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cake size={18} className="text-amberflag" />
                <h2 className="font-display font-bold text-ink text-sm">Birthdays This Week</h2>
              </div>
              <div className="space-y-1.5">
                {birthdaysThisWeek.slice(0, 5).map((m) => (
                  <p key={m.id} className="text-sm text-ink/70">{m.full_name}</p>
                ))}
              </div>
              <Link to="/milestones" className="text-xs text-signal font-semibold hover:text-signal-deep mt-2 inline-block">View all →</Link>
            </Card>
          )}
          {cellMeetingsThisWeek.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <UsersRound size={18} className="text-signal" />
                <h2 className="font-display font-bold text-ink text-sm">Cell Groups Meeting Today</h2>
              </div>
              <div className="space-y-1.5">
                {cellMeetingsThisWeek.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink/70">{c.name}</span>
                    {c.statusKnown ? (
                      <span className={c.reported ? 'text-sage text-xs' : 'text-amberflag text-xs'}>
                        {c.reported ? '✓ Reported' : 'Pending report'}
                      </span>
                    ) : (
                      <span className="text-ink/30 text-xs">—</span>
                    )}
                  </div>
                ))}
              </div>
              <Link to="/cell-groups" className="text-xs text-signal font-semibold hover:text-signal-deep mt-2 inline-block">View all →</Link>
            </Card>
          )}
        </div>
      )}

      {!loading && churchNotices.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-display font-bold text-ink text-sm mb-3">From your church</h2>
          <div className="divide-y divide-ink/5">
            {churchNotices.map((a) => (
              <div key={a.id} className="py-2.5">
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <p className="text-sm text-ink/60 mt-0.5">{a.body}</p>
                <p className="text-xs text-ink/30 mt-1">{timeAgo(a.sent_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && activity.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-display font-bold text-ink text-sm mb-3">Recent Activity</h2>
          <div className="divide-y divide-ink/5">
            {activity.map((a) => (
              <Link key={a.id} to={a.to} className="flex items-center justify-between py-2 text-sm hover:text-signal transition-colors">
                <span className="text-ink/70">{a.text}</span>
                <span className="text-ink/30 text-xs shrink-0 ml-2">{timeAgo(a.at)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {canSeeChurchStats && (
        <Card className="p-5">
          <p className="text-ink/50 text-xs font-medium uppercase tracking-wide mb-2">Share the work</p>
          <h2 className="font-display font-bold text-ink text-sm mb-1">Invite someone to help</h2>
          <p className="text-xs text-ink/50 mb-3">You do not have to run Sunday alone. An Admin can start and end attendance. Invite Finance, a Head of Department, or a Children's Teacher too.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/team/invite?role=member"
              className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold"
            >
              Invite Member
            </Link>
            <Link
              to="/team/invite?role=church_admin"
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
            >
              Invite Admin
            </Link>
            <Link
              to="/team/invite?role=finance_admin"
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
            >
              Invite Finance
            </Link>
            <Link
              to="/team/invite?role=department_head"
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
            >
              Invite Head of Department
            </Link>
            <Link
              to="/team/invite?role=childrens_teacher"
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
            >
              Invite Children's Teacher
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

const COLOR_STYLES = {
  signal: { bg: 'bg-signal-50', text: 'text-signal-deep' },
  sage: { bg: 'bg-sage-50', text: 'text-sage' },
  amberflag: { bg: 'bg-amberflag/10', text: 'text-amberflag' },
};

function StatCard({ icon: Icon, label, value, to, color }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.signal;
  return (
    <Link to={to}>
      <Card className="p-4 md:p-5 hover:shadow-[0_1px_2px_rgba(21,17,31,0.04),0_12px_28px_-8px_rgba(21,17,31,0.14)] transition-shadow h-full">
        <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${styles.bg} mb-3`}>
          <Icon size={18} className={styles.text} strokeWidth={2} />
        </div>
        <p className="font-display text-xl md:text-2xl font-bold text-ink">{value}</p>
        <p className="text-ink/50 text-xs mt-0.5">{label}</p>
      </Card>
    </Link>
  );
}

function QuickAction({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
    >
      {label}
      <ArrowUpRight size={16} />
    </Link>
  );
}