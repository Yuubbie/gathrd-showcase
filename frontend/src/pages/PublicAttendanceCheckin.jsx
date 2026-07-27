import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function PublicAttendanceCheckin() {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null); // member id currently submitting
  const [result, setResult] = useState(null); // { status, memberName }

  useEffect(() => {
    async function load() {
      const { data: churchRows, error: churchError } = await supabase
        .rpc('get_church_attendance_info_by_slug', { p_slug: slug });

      if (churchError || !churchRows || churchRows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const churchInfo = churchRows[0];
      setChurch(churchInfo);

      const { data: memberRows, error: memberError } = await supabase
        .rpc('get_members_for_checkin', { p_church_id: churchInfo.church_id });

      if (!memberError) setMembers(memberRows || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return members.filter((m) => m.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [search, members]);

  async function handleCheckIn(member) {
    setCheckingIn(member.id);
    const { data, error } = await supabase.rpc('self_check_in', {
      p_church_id: church.church_id,
      p_member_id: member.id,
    });
    setCheckingIn(null);

    if (error || !data || data.length === 0) {
      setResult({ status: 'error', memberName: member.full_name });
      return;
    }
    setResult({ status: data[0].status, memberName: member.full_name });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <p className="text-ink/40 text-sm">Loading…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className="max-w-sm bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 text-center">
          <p className="text-ink/60 text-sm">This check-in link isn't recognized. Please ask an usher for help.</p>
        </div>
      </div>
    );
  }

  // Success / already-checked-in / error state — takes over the whole screen
  // so there's no confusion about whether the tap registered.
  if (result) {
    const isSuccess = result.status === 'checked_in' || result.status === 'already_checked_in';
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-8 text-center space-y-3">
          {isSuccess ? (
            <>
              <CheckCircle2 size={40} className="text-sage mx-auto" />
              <h1 className="font-display text-lg font-bold text-ink">
                {result.status === 'already_checked_in' ? "You're already checked in" : "You're checked in!"}
              </h1>
              <p className="text-ink/60 text-sm">Welcome, {result.memberName}. Good to have you here today.</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-lg font-bold text-ink">Something went wrong</h1>
              <p className="text-ink/60 text-sm">Please ask an usher to check you in manually — no need to try again.</p>
            </>
          )}
          <button
            onClick={() => { setResult(null); setSearch(''); }}
            className="text-signal text-sm font-semibold hover:text-signal-deep mt-2"
          >
            Not you? Check in someone else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-10">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="font-display text-xl font-bold text-ink">{church?.church_name}</h1>
          <p className="text-ink/50 text-sm">Find your name to check in</p>
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              autoFocus
              placeholder="Start typing your name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-ink/10 rounded-lg pl-10 pr-3.5 py-3 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          {search.trim() && (
            <div className="mt-3 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-ink/40 text-sm text-center py-4">
                  No match — check the spelling, or ask an usher to check you in.
                </p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleCheckIn(m)}
                    disabled={checkingIn === m.id}
                    className="w-full text-left px-3.5 py-3 rounded-lg hover:bg-parchment transition-colors text-base font-medium text-ink disabled:opacity-50"
                  >
                    {checkingIn === m.id ? 'Checking you in…' : m.full_name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <p className="text-ink/30 text-xs text-center">
          No smartphone? An usher near the entrance can check you in manually.
        </p>
      </div>
    </div>
  );
}
