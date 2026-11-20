import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Turns Supabase's raw messages into plain language, and spots the case where the
// account was created a moment ago (a repeat request inside Supabase's short cooldown).
function explainSignupError(error) {
  const text = String(error?.message || '');
  if (/after\s+\d+\s+seconds?/i.test(text)) {
    return { alreadySent: true };
  }
  if (/rate limit|too many/i.test(text)) {
    return { text: 'Too many sign-up attempts right now. Please wait a few minutes and try again.' };
  }
  if (/already (been )?registered/i.test(text)) {
    return { text: 'This email already has an account. Please log in, or use "Forgot password" on the login page.' };
  }
  if (/password/i.test(text)) {
    return { text: 'Please choose a stronger password of at least 8 characters.' };
  }
  return { text: 'We could not create your account right now. Please check your details and try again.' };
}

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // blocks a second submit before the screen has re-rendered

  // The server builds the welcome email itself from a fixed template and sends it
  // only to the logged-in user's own address. The browser only asks for it.
  async function sendWelcomeEmail() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Welcome email skipped: no active session after signup (email confirmation may be required).');
        return false;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: 'welcome' }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn('send-email returned a non-JSON response');
      }
      console.log('Welcome email send result:', response.status, data);
      return response.ok && !(data && data.error);
    } catch (err) {
      console.error('Welcome email send failed:', err);
      return false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { error: signUpError } = await signUp({ email, password, fullName, churchName, role: 'senior_pastor' });

      if (signUpError) {
        const outcome = explainSignupError(signUpError);
        if (outcome.alreadySent) {
          // The account was created moments ago and its email is on the way.
          navigate('/check-email', { state: { email, alreadySent: true } });
          return;
        }
        setError(outcome.text);
        return;
      }

      // Ask the server to send the welcome email (never blocks signup if it fails)
      await sendWelcomeEmail();

      navigate('/check-email', { state: { email } });
    } finally {
      submittingRef.current = false;
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
            Bring your church's people, giving, and growth into one place.
          </h1>
          <p className="text-white/70 text-sm">
            Set up your church in under two minutes.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2 justify-center mb-6">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Set up your church</h2>
            <p className="text-ink/50 text-sm mt-1">You'll be the Senior Pastor admin for this account.</p>
          </div>

          {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Church name</label>
            <input
              required
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Your full name</label>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-sm text-center text-ink/50">
            Already have an account?{' '}
            <Link to="/login" className="text-signal font-semibold hover:text-signal-deep">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
