import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // The invite link carries a token in the URL that supabase-js
    // automatically detects and uses to establish a temporary session —
    // this happens before this component even mounts, in most cases. We
    // just need to confirm that session actually exists before showing
    // the form, rather than assume it silently worked.
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionValid(!!session);
      setChecking(false);
    }
    checkSession();

    // Also listen for the moment Supabase finishes processing the invite
    // token, in case it hasn't resolved yet on the very first check above.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionValid(true);
        setChecking(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard');
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <p className="text-ink/40 text-sm">Confirming your invite…</p>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 text-center space-y-3">
          <h1 className="font-display text-lg font-bold text-ink">This link isn't working</h1>
          <p className="text-ink/60 text-sm">
            This invite link may have expired or already been used. Ask whoever invited you to send a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-parchment">
      <div className="hidden md:flex md:w-[42%] bg-signal-gradient relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          <span className="font-display font-bold text-white text-xl">Gathrd</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-3xl font-bold text-white leading-tight mb-3">
            You've been added to your church's Gathrd account.
          </h1>
          <p className="text-white/70 text-sm">
            Set a password to finish getting in.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2 justify-center mb-6">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Set your password</h2>
            <p className="text-ink/50 text-sm mt-1">Choose a password to finish setting up your account.</p>
          </div>

          {error && (
            <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 pr-10 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 pr-10 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Setting password…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
