import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const COOLDOWN_SECONDS = 60;

// Shown right after sign-up. Explains what to do, and lets people ask for another
// email once the short cooldown has passed (instead of an unexplained error).
export default function CheckEmail() {
  const { state } = useLocation();
  const expired = state?.reason === 'expired'; // arrived from a confirmation link that did not work
  const [email, setEmail] = useState(state?.email || '');
  const [seconds, setSeconds] = useState(state?.email ? COOLDOWN_SECONDS : 0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const counting = seconds > 0;
  useEffect(() => {
    if (!counting) return undefined;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  async function resend(e) {
    e.preventDefault();
    if (busy || seconds > 0) return;
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setNote('');
    setError('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: address });
    setBusy(false);
    if (resendError) {
      const message = String(resendError.message || '');
      const wait = message.match(/after\s+(\d+)\s+seconds?/i);
      if (wait) {
        setSeconds(Number(wait[1]) || COOLDOWN_SECONDS);
        setError(`Please wait a moment before asking again. You can try again in ${wait[1]} seconds.`);
      } else if (/rate limit|too many/i.test(message)) {
        setSeconds(COOLDOWN_SECONDS);
        setError('Too many emails requested. Please wait a few minutes, then try again.');
      } else {
        setError('We could not send the email just now. Please try again in a minute.');
      }
      return;
    }
    setNote('Sent again. Please check your inbox and spam folder.');
    setSeconds(COOLDOWN_SECONDS);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 text-center space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
          <MailCheck size={24} />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">{expired ? "That link didn't work" : 'Check your email'}</h1>
        {expired ? (
          <>
            <p className="text-sm text-ink/70">
              A confirmation link works only once, and it expires after a while. If you have already confirmed your email,
              you can simply log in.
            </p>
            <Link
              to="/login"
              className="block w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Log in
            </Link>
            <p className="text-xs text-ink/50 pt-1">Not confirmed yet? Enter your email and we will send a new link.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/70">
              {state?.email ? (
                <>
                  Your account is created. We sent a confirmation link to <strong>{state.email}</strong>. Open it to finish and log in.
                </>
              ) : (
                'Your account is created. Open the confirmation link we emailed you to finish and log in.'
              )}
            </p>
            <p className="text-xs text-ink/50">It can take a minute or two. Please also look in your spam or promotions folder.</p>
          </>
        )}

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {note && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{note}</div>}

        <form onSubmit={resend} className="space-y-2.5">
          {!state?.email && (
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              autoComplete="email"
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
            />
          )}
          <button
            type="submit"
            disabled={busy || seconds > 0 || !email.trim()}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? 'Sending…' : seconds > 0 ? `Send the email again in ${seconds}s` : 'Send the email again'}
          </button>
        </form>

        {!expired && (
          <p className="text-sm text-ink/50">
            Confirmed already?{' '}
            <Link to="/login" className="text-signal font-semibold hover:text-signal-deep">Log in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
