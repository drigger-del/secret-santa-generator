import { useState, useEffect } from 'react';
import api from '../lib/api';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Assignment } from '../types';
import type { Participant } from '../types';

export default function GenerateDrawPage() {
  const [settings, setSettings] = useState<{ preventReciprocal: boolean }>({ preventReciprocal: true });
  const [stats, setStats] = useState<{ participantCount: number; exclusionCount: number; activeDraw: boolean }>({
    participantCount: 0,
    exclusionCount: 0,
    activeDraw: false,
  });
  const [toggleLoading, setToggleLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ drawId: number; assignments: Assignment[] } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [codesGenerated, setCodesGenerated] = useState(false);
  const [codes, setCodes] = useState<{ participantId: number; participantName: string; code: string }[]>([]);
  const [generateConfirm, setGenerateConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sRes, stRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/stats'),
      ]);
      setSettings(sRes.data || { preventReciprocal: true });
      setStats(stRes.data || { participantCount: 0, exclusionCount: 0, activeDraw: false });
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function apiErr(err: any) {
    const m = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || 'Operation failed.';
    return String(m);
  }

  async function toggleSetting() {
    setToggleLoading(true);
    setError('');
    try {
      await api.put('/admin/settings', {
        preventReciprocal: !settings.preventReciprocal,
      });
      setSettings((prev) => ({ preventReciprocal: !prev.preventReciprocal }));
      setSuccess('Setting updated.');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setToggleLoading(false);
    }
  }

  async function generateDraw() {
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/admin/draw/generate');
      setResult(res.data);
      setSuccess(res.data.message || 'Draw generated successfully!');
      await loadData();
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateDraw() {
    setRegenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/admin/draw/regenerate');
      setResult(res.data);
      setSuccess(res.data.message || 'Draw regenerated successfully!');
      setCodesGenerated(false);
      await loadData();
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setRegenerating(false);
    }
  }

  async function resetDraw() {
    setError('');
    try {
      await api.post('/admin/draw/reset');
      setResult(null);
      setCodesGenerated(false);
      setCodes([]);
      setSuccess('Draw reset.');
      await loadData();
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setResetConfirm(false);
    }
  }

  async function generateAccessCodes() {
    setError('');
    try {
      const res = await api.post('/access-codes/generate');
      setCodes(res.data.codes || []);
      setCodesGenerated(true);
      setSuccess('Access codes generated. Share each code privately with the matching participant.');
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function downloadCsv(assignments: Assignment[]) {
    const rows = ['GIVER,RECIPIENT'];
    assignments.forEach((a) => {
      rows.push(`${a.giver?.name || 'Unknown'},${a.recipient?.name || 'Unknown'}`);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secret-santa-results-draw-${result?.drawId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-santa-dark">Generate Draw</h2>
          <p className="text-santa-dark/60">
            Run the Secret Santa assignment algorithm. All exclusions and settings are respected.
          </p>
        </div>
      </div>

      <Alert variant="success" message={success} onClose={() => setSuccess('')} />
      <Alert variant="error" message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-bold text-santa-dark mb-3">Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-santa-dark/60">Participants</span>
              <span className="font-medium text-santa-dark">{stats.participantCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-santa-dark/60">Exclusion rules</span>
              <span className="font-medium text-santa-dark">{stats.exclusionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-santa-dark/60">Active draw</span>
              <span className={`font-medium ${stats.activeDraw ? 'text-santa-green' : 'text-santa-red'}`}>
                {stats.activeDraw ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {stats.participantCount > 0 && stats.participantCount < 3 && (
            <p className="text-xs text-red-600 mt-2">At least 3 participants are required.</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-santa-dark mb-3">Settings</h3>
          <div className="flex items-center justify-between p-3 bg-santa-light/30 rounded-xl mb-4">
            <div>
              <div className="font-medium text-santa-dark">Prevent reciprocal assignments</div>
              <div className="text-xs text-santa-dark/50">
                If A → B, then B must not → A. Enabled by default.
              </div>
            </div>
            <button
              onClick={toggleSetting}
              disabled={toggleLoading}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                settings.preventReciprocal
                  ? 'bg-santa-green text-white'
                  : 'bg-santa-light text-santa-dark border border-santa-light/60'
              }`}
            >
              {settings.preventReciprocal ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="text-xs text-santa-dark/50 bg-amber-50 border border-amber-100 rounded p-3">
            This rule is separate from manual exclusions. Both are applied during generation.
          </div>
        </div>

        <div className="card flex flex-col">
          <h3 className="font-bold text-santa-dark mb-3">Actions</h3>
          <button
            onClick={() => setGenerateConfirm(true)}
            disabled={generating || stats.participantCount < 3}
            className="btn-primary w-full mb-3 py-3"
          >
            {generating ? <LoadingSpinner className="w-5 h-5" /> : 'Generate Draw'}
          </button>
          {stats.activeDraw && (
            <>
              <button
                onClick={() => setRegenerating(true)}
                disabled={regenerating || generating}
                className="btn-secondary w-full mb-3 py-3"
              >
                {regenerating ? <LoadingSpinner className="w-5 h-5" /> : 'Regenerate Draw'}
              </button>
              {!codesGenerated && (
                <button
                  onClick={generateAccessCodes}
                  className="btn-secondary w-full mb-3 py-3"
                >
                  Generate access codes
                </button>
              )}
              <button
                onClick={() => setResetConfirm(true)}
                className="btn-secondary w-full py-3 text-santa-red"
              >
                Reset draw
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="card border-santa-green/30 bg-green-50/20">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-green-200/50 bg-green-50/50">
            <span className="text-santa-green font-bold">✓ Draw complete</span>
            <span className="text-xs text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
              {result.assignments.length} assignments
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {result.assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-santa-light/20">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-santa-dark">{a.giver?.name}</span>
                  <span className="text-santa-green font-mono text-sm">→</span>
                  <span className="font-medium text-santa-dark">{a.recipient?.name}</span>
                </div>
                <span className="text-xs text-santa-dark/40">ID #{a.id}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-4 flex gap-3">
            <button
              onClick={() => downloadCsv(result.assignments)}
              className="btn-secondary flex-1"
            >
              Download CSV
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary flex-1"
            >
              Print
            </button>
          </div>
        </div>
      )}

      {!result && stats.activeDraw && (
        <div className="card border-amber-200 bg-amber-50/20 p-4">
          <p className="text-amber-800 text-sm">
            A draw already exists. Generate a new draw to replace it, or view the
            <Link to="/admin/results">results</Link>.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={generateConfirm}
        title="Confirm generate draw"
        message="This will create a new Secret Santa assignment. If a draw already exists, it will be replaced. Participants will not see results until you share their access codes."
        confirmLabel="Generate draw"
        cancelLabel="Cancel"
        onConfirm={generateDraw}
        onCancel={() => setGenerateConfirm(false)}
      />
      <ConfirmDialog
        open={regenerating}
        title="Confirm regenerate draw"
        message="This will replace the current draw with a new random assignment. All previous access codes become invalid."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={regenerateDraw}
        onCancel={() => setRegenerating(false)}
      />
      <ConfirmDialog
        open={resetConfirm}
        title="Confirm reset draw"
        message="This will delete the current draw and all assignments. Access codes will be invalidated."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        danger
        onConfirm={resetDraw}
        onCancel={() => setResetConfirm(false)}
      />
    </div>
  );
}
