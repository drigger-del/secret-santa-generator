import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { username, password });
      const token = res.data.token;
      if (!token) throw new Error('No token received.');
      localStorage.setItem('ss_admin_token', token);
      navigate('/admin/participants', { replace: true });
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  }

  function apiErr(err: any) {
    const m = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || 'Login failed.';
    return String(m);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-santa-light px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-santa-red flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3 shadow-lg">
            🎅
          </div>
          <h1 className="text-2xl font-bold text-santa-dark">Admin sign in</h1>
          <p className="text-santa-dark/50 text-sm">Secret Santa Generator</p>
        </div>

        <div className="card">
          <form onSubmit={login} className="space-y-4 p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-santa-dark/70 mb-1">Username</label>
              <input
                className="input-field"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-santa-dark/70 mb-1">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-santa-dark/40 mt-4">
          First time? Use the default credentials from your .env file, then change them.
        </p>
      </div>
    </div>
  );
}
