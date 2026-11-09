import { useState, useEffect } from 'react';
import api from '../lib/api';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Participant } from '../types';
import type { Exclusion } from '../types';

export default function ExclusionsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [selA, setSelA] = useState<number | null>(null);
  const [selB, setSelB] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        api.get('/admin/participants'),
        api.get('/admin/exclusions'),
      ]);
      setParticipants(pRes.data || []);
      setExclusions(eRes.data || []);
      setError('');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  }

  function apiErr(err: any) {
    const m = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || 'Failed to load data.';
    return String(m);
  }

  function participantName(id: number) {
    const p = participants.find((x) => x.id === id);
    return p ? p.name : `Unknown (${id})`;
  }

  async function addExclusion() {
    setError('');
    if (!selA || !selB) {
      setError('Please select two different participants.');
      return;
    }
    if (selA === selB) {
      setError('A participant cannot be excluded from themselves.');
      return;
    }
    try {
      await api.post('/admin/exclusions', { participantAId: selA, participantBId: selB });
      setSelA(null);
      setSelB(null);
      await loadData();
      setSuccess('Exclusion added.');
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function requestDelete(id: number) {
    setDeleteId(id);
  }

  async function deleteExclusion() {
    if (deleteId === null) return;
    setError('');
    try {
      await api.delete(`/admin/exclusions/${deleteId}`);
      setDeleteId(null);
      await loadData();
      setSuccess('Exclusion removed.');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setDeleteId(null);
    }
  }

  const canAdd =
    participants.length >= 2 && selA !== null && selB !== null && selA !== selB;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-santa-dark">Exclusions</h2>
          <p className="text-santa-dark/60">
            Create mutual exclusion rules. If A is excluded from B, then B is also excluded from A.
          </p>
        </div>
      </div>

      <Alert variant="success" message={success} onClose={() => setSuccess('')} />
      <Alert variant="error" message={error} onClose={() => setError('')} />

      <div className="card">
        <h3 className="font-bold text-santa-dark mb-4">Add exclusion rule</h3>
        <p className="text-xs text-santa-dark/50 mb-4">
          Example: Sangeeth ↔ Nimmy means neither can draw the other.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); addExclusion(); }} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-santa-dark/70 mb-1">Participant A</label>
            <select
              className="select-field"
              value={selA ?? ''}
              onChange={(e) => setSelA(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select participant</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <span className="mr-2 mt-[6px] text-xl">↔</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-santa-dark/70 mb-1">Participant B</label>
            <select
              className="select-field"
              value={selB ?? ''}
              onChange={(e) => setSelB(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select participant</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading || !canAdd}>
            Add exclusion
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-santa-light/30 bg-santa-light/20">
          <span className="font-semibold text-santa-dark">
            Existing exclusions ({exclusions.length})
          </span>
        </div>
        <div className="divide-y divide-santa-light/30">
          {exclusions.length === 0 && (
            <div className="px-4 py-8 text-center text-santa-dark/40">
              No exclusion rules yet.
            </div>
          )}
          {exclusions.map((e) => (
            <div key={e.id} className="table-row">
              <div className="flex items-center gap-3">
                <span className="font-medium text-santa-dark">{participantName(e.participant_a_id)}</span>
                <span className="text-xl text-santa-red/60">↔</span>
                <span className="font-medium text-santa-dark">{participantName(e.participant_b_id)}</span>
              </div>
              <button
                type="button"
                onClick={() => requestDelete(e.id)}
                className="text-xs text-santa-red hover:text-santa-redDark underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remove exclusion"
        message="Are you sure you want to remove this exclusion rule?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={deleteExclusion}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
