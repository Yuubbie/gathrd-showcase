import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Where someone lands after clicking the confirmation link in their email.
export default function EmailConfirmed() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [waited, setWaited] = useState(false);

  // Give the app a moment to finish signing the person in.
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Once signed in, take them to their dashboard shortly after showing the good news.
  useEffect(() => {
    if (!session) return undefined;
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [session, navigate]);

  const signedIn = Boolean(session);
  const unsure = !signedIn && (loading || !waited);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 text-center space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage">
          <CheckCircle2 size={26} />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">Your email is confirmed</h1>
        {signedIn ? (
          <>
            <p className="text-sm text-ink/70">Welcome to Gathrd. Taking you to your dashboard…</p>
            <Link
              to="/dashboard"
              className="block w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Go to my dashboard
            </Link>
          </>
        ) : unsure ? (
          <p className="text-sm text-ink/60">One moment…</p>
        ) : (
          <>
            <p className="text-sm text-ink/70">Thank you. You can now log in with your email and password.</p>
            <Link
              to="/login"
              className="block w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
