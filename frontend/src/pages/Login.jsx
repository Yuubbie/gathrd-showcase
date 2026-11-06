// Login.jsx - NEW VERSION with Forgot password
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justJoined = Boolean(location.state?.justJoined || location.state?.justClaimed);
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error } = await signIn({ email, password });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard');
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
    });

    setSubmitting(false);

    if (error) {
      if (/rate|too many|seconds/i.test(error.message || '')) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError("We couldn't send the email right now. Please try again in a few minutes.");
      }
      return;
    }

    // Same message whether or not the email has an account, so nobody can use this
    // form to find out which emails are registered.
    setResetSent(true);
  }

  function openForgot() {
    setError('');
    setResetSent(false);
    setMode('forgot');
  }

  function backToLogin() {
    setError('');
    setResetSent(false);
    setMode('login');
  }

  const inputClass =
    'w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors';

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
            The Church Operating System for Nigerian Churches
          </h1>
          <p className="text-white/70 text-sm">
            Manage people. Track giving. Grow churches.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
            <div className="md:hidden flex items-center gap-2 justify-center mb-6">
              <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Welcome back</h2>
              <p className="text-ink/50 text-sm mt-1">Log in to your Gathrd account.</p>
            </div>

            {justJoined && !error && (
              <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">
                Your login is ready. Log in with the password you just set.
              </div>
            )}

            {error && (
              <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' pr-10'}
                  autoComplete="current-password"
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
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-sm text-signal font-semibold hover:text-signal-deep"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Logging in...' : 'Log In'}
            </button>

            <p className="text-sm text-center text-ink/50">
              New church?{' '}
              <Link to="/signup" className="text-signal font-semibold hover:text-signal-deep">
                Set up your church
              </Link>
            </p>
          </form>
        )}

        {mode === 'forgot' && !resetSent && (
          <form onSubmit={handleReset} className="w-full max-w-sm space-y-5">
            <div className="md:hidden flex items-center gap-2 justify-center mb-6">
              <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Reset your password</h2>
              <p className="text-ink/50 text-sm mt-1">
                Enter the email you use for Gathrd and we will send you a link to choose a new password.
              </p>
            </div>

            {error && (
              <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send reset link'}
            </button>

            <p className="text-sm text-center text-ink/50">
              <button
                type="button"
                onClick={backToLogin}
                className="text-signal font-semibold hover:text-signal-deep"
              >
                Back to log in
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && resetSent && (
          <div className="w-full max-w-sm space-y-5">
            <div className="md:hidden flex items-center gap-2 justify-center mb-6">
              <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Check your email</h2>
              <p className="text-ink/60 text-sm mt-2">
                If an account exists for <strong>{email.trim()}</strong>, we have sent a link to choose a
                new password. It can take a few minutes to arrive, so please also check your spam folder.
              </p>
            </div>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors"
            >
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}