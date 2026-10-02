import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

export default function PublicAttendanceCheckin() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || '';

  const [info, setInfo] = useState(null); // { found, church_name, open, service_name }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null); // member awaiting confirmation
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status, memberName }

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_checkin_info', { p_slug: slug, p_token: token });
      setInfo(error || !data ? { found: false } : data);
      setLoading(false);
    }
    load();
  }, [slug, token]);

  // Ask the server for matches only once at least 3 letters are typed. The full
  // member list is never sent to this page.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3 || !info?.open) {
      setMatches([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('search_checkin_members', {
        p_slug: slug,
        p_token: token,
        p_query: q,
      });
      if (cancelled) return;
      setMatches(error || !Array.isArray(data) ? [] : data);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, slug, token, info]);

  async function confirmCheckIn() {
    if (!picked) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('public_check_in', {
      p_slug: slug,
      p_token: token,
      p_member_id: picked.id,
    });
    setSubmitting(false);
    setResult({
      status: error || !data ? 'error' : data.status,
      memberName: picked.full_name,
    });
    setPicked(null);
  }

  function reset() {
    setResult(null);
    setPicked(null);
    setSearch('');
    setMatches([]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <p className="text-ink/40 text-sm">Loading…</p>
      </div>
    );
  }

  if (!info?.found) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className={`max-w-sm ${CARD} p-6 text-center`}>
          <p className="text-ink/60 text-sm">This check-in link isn't recognized. Please ask an usher for help.</p>
        </div>
      </div>
    );
  }

  if (!info.open) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className={`max-w-sm w-full ${CARD} p-6 text-center space-y-2`}>
          <h1 className="font-display text-lg font-bold text-ink">{info.church_name}</h1>
          <p className="text-ink/60 text-sm">Check-in is not open right now. Please ask an usher for help.</p>
        </div>
      </div>
    );
  }

  if (result) {
    const isSuccess = result.status === 'checked_in' || result.status === 'already_checked_in';
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className={`max-w-sm w-full ${CARD} p-8 text-center space-y-3`}>
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
              <h1 className="font-display text-lg font-bold text-ink">
                {result.status === 'closed' ? 'Check-in has closed' : 'Something went wrong'}
              </h1>
              <p className="text-ink/60 text-sm">Please ask an usher to check you in manually.</p>
            </>
          )}
          <button onClick={reset} className="text-signal text-sm font-semibold hover:text-signal-deep mt-2">
            Not you? Check in someone else
          </button>
        </div>
      </div>
    );
  }

  if (picked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className={`max-w-sm w-full ${CARD} p-8 text-center space-y-4`}>
          <h1 className="font-display text-lg font-bold text-ink">Check in as {picked.full_name}?</h1>
          <p className="text-ink/50 text-sm">Only tap yes if this is you.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPicked(null)}
              disabled={submitting}
              className="flex-1 border border-ink/15 text-ink/70 rounded-lg py-3 font-semibold hover:bg-parchment transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmCheckIn}
              disabled={submitting}
              className="flex-1 bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Checking in…' : "Yes, that's me"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = search.trim();

  return (
    <div className="min-h-screen bg-parchment px-4 py-10">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="font-display text-xl font-bold text-ink">{info.church_name}</h1>
          <p className="text-ink/50 text-sm">{info.service_name}</p>
          <p className="text-ink/50 text-sm">Find your name to check in</p>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              autoFocus
              placeholder="Type at least 3 letters of your name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-ink/10 rounded-lg pl-10 pr-3.5 py-3 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          {q.length > 0 && q.length < 3 && (
            <p className="text-ink/40 text-sm text-center py-4">Keep typing…</p>
          )}

          {q.length >= 3 && (
            <div className="mt-3 space-y-1">
              {searching ? (
                <p className="text-ink/40 text-sm text-center py-4">Searching…</p>
              ) : matches.length === 0 ? (
                <p className="text-ink/40 text-sm text-center py-4">
                  No match. Check the spelling, or ask an usher to check you in.
                </p>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPicked(m)}
                    disabled={m.checked_in}
                    className="w-full text-left px-3.5 py-3 rounded-lg hover:bg-parchment transition-colors text-base font-medium text-ink disabled:opacity-50 disabled:cursor-default flex items-center justify-between"
                  >
                    <span>{m.full_name}</span>
                    {m.checked_in && <span className="text-xs text-sage font-semibold">Checked in</span>}
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
