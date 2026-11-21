import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import LegalAgreement from '../components/LegalAgreement';

export default function ChurchJoin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [churchName, setChurchName] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadChurch() {
      const { data, error: rpcError } = await supabase.rpc('get_church_name_by_slug', {
        p_slug: slug,
      });
      if (rpcError || !data) {
        setChurchName(null);
      } else {
        setChurchName(data);
      }
      setLoadingChurch(false);
    }
    loadChurch();
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-account`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            email,
            password,
            full_name: fullName.trim(),
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      const { error: signInError } = await signIn({ email: email.trim(), password });
      if (signInError) {
        navigate('/login', { state: { justJoined: true } });
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (loadingChurch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <p className="text-ink/50">Loading…</p>
      </div>
    );
  }

  if (!churchName) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="text-center">
          <p className="text-ink font-medium">This link is not valid.</p>
          <p className="text-ink/50 text-sm mt-1">Ask your church for the correct join link.</p>
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
            Join {churchName}
          </h1>
          <p className="text-white/70 text-sm">
            Create your login. You will see the message, roster, and your dashboard as a member. Your pastor can raise your role later.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2 justify-center mb-6">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Join {churchName}</h2>
            <p className="text-ink/50 text-sm mt-1">
              One signup. Set your password. Log in to this church.
            </p>
          </div>

          {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

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
            {submitting ? 'Creating login…' : 'Create my login'}
          </button>

          <LegalAgreement />

          <p className="text-sm text-center text-ink/50">
            Already have a login?{' '}
            <Link to="/login" className="text-signal font-semibold hover:text-signal-deep">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
