import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  async function sendWelcomeEmail({ to, fullName, churchName }) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Welcome email skipped: no active session after signup (email confirmation may be required).');
        return false;
      }

      const safeName = escapeHtml(fullName);
      const safeChurch = escapeHtml(churchName);
      const year = new Date().getFullYear();
      const loginUrl = `${window.location.origin}/login`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Gathrd!</h1>
            <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">Your church management journey starts now</p>
          </div>

          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello ${safeName},</p>
            <p style="color: #4b5563; margin-bottom: 24px;">
              Welcome to Gathrd! Your church <strong>${safeChurch}</strong> is now set up and ready to go.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: #fbbf24; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Log In to Your Dashboard
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Next steps:</strong><br>
                &bull; Log in to your dashboard<br>
                &bull; Invite your team members<br>
                &bull; Add your congregation members<br>
                &bull; Set up giving and tithes
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you have any questions, reply to this email &mdash; we're here to help!
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              &copy; ${year} Gathrd. All rights reserved.<br>
              Church Management Platform for Nigerian Churches
            </p>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to,
          subject: `Welcome to Gathrd, ${fullName}!`,
          html: emailHtml,
        }),
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
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { error } = await signUp({ email, password, fullName, churchName, role: 'senior_pastor' });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Send welcome email via the Vercel API route (never blocks signup if it fails)
    await sendWelcomeEmail({ to: email, fullName, churchName });

    navigate('/check-email');
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