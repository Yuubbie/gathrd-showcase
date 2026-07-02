import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Week 1 ships this as senior_pastor signup only (church creator).
// The other 7 roles get invited in later — full flow lands with
// Module 21 (Onboarding Flow) in Week 7.
export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { error } = await signUp({
      email,
      password,
      fullName,
      churchName,
      role: 'senior_pastor',
    });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    navigate('/check-email');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm p-6 space-y-4"
      >
        <img src="/logo-mark.png" alt="Gathrd" className="h-14 w-14 mx-auto" />
        <h1 className="text-xl font-semibold text-center">Set up your church</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Church name</label>
          <input
            required
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Your full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-medium">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
