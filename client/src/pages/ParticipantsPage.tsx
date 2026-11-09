import { useState, useEffect } from 'react';
import api from '../lib/api';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Participant } from '../types';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadParticipants();
  }, []);

  async function loadParticipants() {
    setLoading(true);
    try {
      const res = await api.get('/admin/participants');
      setParticipants(res.data || []);
      setError('');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  }

  function apiErr(err: any) {
    const m = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || 'Failed to load participants.';
    return String(m);
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      await api.post('/admin/participants', { name });
      setNewName('');
      await loadParticipants();
      setSuccess('Participant added.');
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function startEdit(p: Participant) {
    setEditId(p.id);
    setEditName(p.name);
    setError('');
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editId === null) return;
    const name = editName.trim();
    if (!name) return;
    setError('');
    try {
      await api.put(`/admin/participants/${editId}`, { name });
      setEditId(null);
      setEditName('');
      await loadParticipants();
      setSuccess('Participant updated.');
    } catch (err: any) {
      setError(apiErr(err));
    }
  }

  function cancelEdit() {
    setEditId(null);
    setEditName('');
    setError('');
  }

  function requestDelete(id: number) {
    setDeleteId(id);
  }

  async function deleteParticipant() {
    if (deleteId === null) return;
    setError('');
    try {
      await api.delete(`/admin/participants/${deleteId}`);
      setDeleteId(null);
      await loadParticipants();
      setSuccess('Participant deleted.');
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setDeleteId(null);
    }
  }

  async function importCsv() {
    setError('');
    setImporting(true);
    try {
      const names = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (names.length === 0) {
        setError('Please paste at least one name.');
        return;
      }
      await api.post('/admin/participants/import', { names });
      setCsvText('');
      await loadParticipants();
      setSuccess(`Imported ${names.length} participants.`);
    } catch (err: any) {
      setError(apiErr(err));
    } finally {
      setImporting(false);
    }
  }

  const hasEdit = editId !== null;
  const editing = participants.find((p) => p.id === editId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-santa-dark">Participants</h2>
          <p className="text-santa-dark/60">
            Manage the people taking part in the draw. Each person needs a unique internal ID.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCsvText((c) => (c ? '' : c))}
            className="btn-secondary hidden md:block"
          >
            Toggle CSV import
          </button>
        </div>
      </div>

      <Alert variant="success" message={success} onClose={() => setSuccess('')} />
      <Alert variant="error" message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-santa-dark mb-4">Add participant</h3>
          <form onSubmit={addParticipant} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-santa-dark/70 mb-1">Name</label>
              <input
                className="input-field"
                placeholder="e.g. Sangeeth"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              Add participant
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="font-bold text-santa-dark mb-4">Import from CSV</h3>
          <p className="text-xs text-santa-dark/50 mb-3">
            Paste one name per line. Duplicate names are rejected.
          </p>
          <textarea
            className="input-field h-32 font-mono text-sm"
            placeholder="Sangeeth\nNimmy\nAmal\nRenju"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={importCsv}
              className="btn-primary flex-1"
              disabled={importing || !csvText.trim()}
            >
              Import names
            </button>
            <button
              type="button"
              onClick={() => setCsvText('')}
              className="btn-secondary px-4"
              disabled={importing}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-santa-light/30 bg-santa-light/20">
          <span className="font-semibold text-santa-dark">
            Participant list ({participants.length})
          </span>
          {participants.length < 3 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              Need at least 3 to draw
            </span>
          )}
        </div>
        <div className="divide-y divide-santa-light/30">
          {participants.length === 0 && (
            <div className="px-4 py-8 text-center text-santa-dark/40">
              No participants yet. Add your first name above.
            </div>
          )}
          {participants.map((p) => {
            const isEditing = hasEdit && editId === p.id;
            return (
              <div key={p.id} className="table-row group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-santa-dark font-medium truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-santa-dark/40 bg-santa-light/30 px-2 py-0.5 rounded">
                    ID: {p.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <form onSubmit={saveEdit} className="flex gap-2 w-full max-w-xs">
                      <input
                        className="input-field flex-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button type="submit" className="btn-success px-3" disabled={loading}>
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-secondary px-3"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="text-xs text-santa-green hover:text-santa-greenDark underline underline-offset-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(p.id)}
                        className="text-xs text-santa-red hover:text-santa-redDark underline underline-offset-2"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete participant"
        message="Are you sure you want to remove this participant? Any exclusions and access codes involving them will also be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={deleteParticipant}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
