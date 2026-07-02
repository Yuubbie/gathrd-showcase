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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm p-6 space-y-4"
      >
        <img src="/logo-mark.png" alt="Gathrd" className="h-14 w-14 mx-auto" />
        <h1 className="text-xl font-semibold text-center">Log in to Gathrd</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">
            {error}
          </div>
        )}

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-sm text-center text-gray-500">
          New church?{' '}
          <Link to="/signup" className="text-indigo-600 font-medium">
            Set up your church
          </Link>
        </p>
      </form>
    </div>
  );
}
