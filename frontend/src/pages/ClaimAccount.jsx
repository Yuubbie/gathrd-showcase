import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function ClaimAccount() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-account`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, email, password }),
        }
      );
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      // They now have a real password-based account, but no session was
      // established by this flow (unlike an invite link) — send them to a
      // normal login with their new credentials ready to use.
      navigate('/login', { state: { justClaimed: true } });
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setSubmitting(false);
    }
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
            Already on the roster? Set up your login.
          </h1>
          <p className="text-white/70 text-sm">
            See your own giving history and attendance, anytime.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2 justify-center mb-6">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Set up your login</h2>
            <p className="text-ink/50 text-sm mt-1">
              Use the same email you registered with at church.
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
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Set Up My Login'}
          </button>

          <p className="text-sm text-center text-ink/50">
            Already have a login?{' '}
            <Link to="/login" className="text-signal font-semibold hover:text-signal-deep">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
