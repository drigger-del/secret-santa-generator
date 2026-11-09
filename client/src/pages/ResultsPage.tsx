import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Assignment } from '../types';

export default function ResultsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/results');
      setAssignments(res.data.assignments || []);
      setValid(res.data.valid !== false);
      setMessage(res.data.message || '');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  }

  function apiErr(err: any) {
    const m = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || 'Failed to load results.';
    return String(m);
  }

  async function resetDraw() {
    setError('');
    try {
      await api.post('/admin/draw/reset');
      setAssignments([]);
      setValid(false);
      setMessage('Draw has been reset.');
      setResetConfirm(false);
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function downloadCsv() {
    const rows = ['GIVER,RECIPIENT'];
    assignments.forEach((a) => {
      rows.push(`${a.giver?.name || 'Unknown'},${a.recipient?.name || 'Unknown'}`);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secret-santa-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = assignments.filter(
    (a) =>
      a.giver?.name.toLowerCase().includes(search.toLowerCase()) ||
      a.recipient?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-santa-dark">Results</h2>
          <p className="text-santa-dark/60">
            Organizer-only view of the complete assignment list.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/generate" className="btn-secondary">
            New draw
          </Link>
        </div>
      </div>

      <Alert variant="success" message={message && valid ? message : ''} onClose={() => setMessage('')} />
      <Alert variant="error" message={message && !valid ? message : ''} onClose={() => setMessage('')} />
      <Alert variant="error" message={error} onClose={() => setError('')} />

      {!assignments.length && (
        <div className="card text-center py-12">
          <p className="text-santa-dark/50">No results yet. Generate a draw first.</p>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-santa-light/30 bg-santa-light/20">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-santa-dark">
                Complete assignment ({assignments.length})
              </span>
              <span className={`badge ${valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {valid ? 'All constraints satisfied' : 'Constraint violation'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input-field w-64 max-w-xs"
                placeholder="Search names…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-santa-light/30">
            {filtered.map((a) => (
              <div key={a.id} className="table-row">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-santa-dark w-1/3">{a.giver?.name || 'Unknown'}</span>
                  <span className="text-santa-red font-mono text-sm">→</span>
                  <span className="font-medium text-santa-dark w-1/3">{a.recipient?.name || 'Unknown'}</span>
                </div>
                <span className="text-xs text-santa-dark/40">ID #{a.id}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-4 border-t border-santa-light/30 flex gap-3">
            <button onClick={downloadCsv} className="btn-secondary flex-1">
              Download CSV
            </button>
            <button onClick={() => window.print()} className="btn-secondary flex-1">
              Print results
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={resetConfirm}
        title="Reset draw"
        message="This will delete the current draw and all assignments. Participants will need new access codes after a new draw."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        danger
        onConfirm={resetDraw}
        onCancel={() => setResetConfirm(false)}
      />
    </div>
  );
}
