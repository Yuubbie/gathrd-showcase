import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2 justify-center mb-6">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Welcome back</h2>
            <p className="text-ink/50 text-sm mt-1">Log in to your Gathrd account.</p>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Logging in…' : 'Log In'}
          </button>

          <p className="text-sm text-center text-ink/50">
            New church?{' '}
            <Link to="/signup" className="text-signal font-semibold hover:text-signal-deep">
              Set up your church
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
