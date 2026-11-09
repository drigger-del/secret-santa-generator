import { useState, useEffect } from 'react';

export default function RevealPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'revealed' | 'error'>('idle');
  const [result, setResult] = useState<{ participantName: string; recipientName: string } | null>(null);
  const [error, setError] = useState('');
  const [drawReady, setDrawReady] = useState<boolean | null>(null);

  async function checkDrawStatus() {
    try {
      const res = await fetch('/api/reveal/status');
      const data = await res.json();
      setDrawReady(data.drawGenerated === true);
    } catch {
      setDrawReady(null);
    }
  }

  async function reveal(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setStatus('checking');

    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your access code.');
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.message || 'The draw has not been generated yet.');
        } else {
          setError(data.message || 'Invalid access code. Please try again.');
        }
        setStatus('error');
        return;
      }

      setResult({ participantName: data.participantName, recipientName: data.recipientName });
      setStatus('revealed');
    } catch {
      setError('Unable to connect to the server. Please try again later.');
      setStatus('error');
    }
  }

  useEffect(() => {
    checkDrawStatus();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-santa-light px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-santa-green flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3 shadow-lg">
            🎁
          </div>
          <h1 className="text-2xl font-bold text-santa-dark">Your Secret Santa</h1>
          <p className="text-santa-dark/50 text-sm">Find out who you are gifting to</p>
        </div>

        <div className="card">
          <div className="p-6">
            {drawReady === false && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 text-sm">
                The draw has not been generated yet. Please check back later or ask your organizer.
              </div>
            )}

            {status === 'error' && drawReady !== false && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 text-sm">
                {error}
              </div>
            )}

            {status === 'revealed' && result && (
              <div className="bg-santa-green text-white rounded-2xl p-6 text-center shadow-xl mb-6">
                <p className="text-green-100 text-sm uppercase tracking-wider font-semibold mb-2">
                  You are gifting to:
                </p>
                <p className="text-2xl font-bold">{result.recipientName}</p>
                <p className="text-green-100/80 text-sm mt-3">
                  Keep this a secret! 🤫
                </p>
              </div>
            )}

            {(status === 'idle' || status === 'checking') && drawReady !== false && (
              <form onSubmit={reveal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-santa-dark/70 mb-2">
                    Access code
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="e.g. SANTA-A1B2C3"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={status === 'checking'}
                  />
                </div>
                <p className="text-xs text-santa-dark/50">
                  Enter the personal access code your organizer gave you.
                </p>
                <button
                  type="submit"
                  className="btn-success w-full py-3"
                  disabled={status === 'checking'}
                >
                  {status === 'checking' ? 'Checking code…' : 'Reveal my recipient'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
