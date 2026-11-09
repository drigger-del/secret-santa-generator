const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { all, get, run, transaction, save } = require('../db');

const router = express.Router();

function setup() {
  // GET /api/admin/participants
  router.get('/', authenticateToken, (req, res) => {
    const rows = all(
      'SELECT id, name, created_at FROM participants ORDER BY name COLLATE NOCASE'
    );
    return res.json(rows);
  });

  // POST /api/admin/participants
  router.post('/', authenticateToken, (req, res) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Participant name is required.' });
    }
    const trimmed = String(name).trim();
    const existing = get(
      "SELECT id FROM participants WHERE lower(trim(name)) = lower(trim(?))",
      [trimmed]
    );
    if (existing) {
      return res.status(409).json({ message: 'A participant with this name already exists.' });
    }
    const info = run('INSERT INTO participants (name) VALUES (?)', [trimmed]);
    const row = get('SELECT id, name, created_at FROM participants WHERE id = ?', [
      info.lastInsertRowid,
    ]);
    save();
    return res.status(201).json(row);
  });

  // PUT /api/admin/participants/:id
  router.put('/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Participant name is required.' });
    }
    const trimmed = String(name).trim();
    const row = get('SELECT id FROM participants WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ message: 'Participant not found.' });
    }
    const existing = get(
      "SELECT id FROM participants WHERE lower(trim(name)) = lower(trim(?)) AND id != ?",
      [trimmed, id]
    );
    if (existing) {
      return res.status(409).json({ message: 'A participant with this name already exists.' });
    }
    run('UPDATE participants SET name = ? WHERE id = ?', [trimmed, id]);
    const updated = get('SELECT id, name, created_at FROM participants WHERE id = ?', [id]);
    save();
    return res.json(updated);
  });

  // DELETE /api/admin/participants/:id
  router.delete('/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const row = get('SELECT id FROM participants WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ message: 'Participant not found.' });
    }
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    transaction(() => {
      run('DELETE FROM exclusions WHERE participant_a_id = ? OR participant_b_id = ?', [id, id]);
      run('DELETE FROM access_codes WHERE participant_id = ?', [id]);
      run('DELETE FROM assignments WHERE giver_id = ? OR recipient_id = ?', [id, id]);
      run('DELETE FROM participants WHERE id = ?', [id]);
      if (activeDraw) {
        run('UPDATE draws SET is_active = 0 WHERE id = ?', [activeDraw.id]);
        run('DELETE FROM assignments WHERE draw_id = ?', [activeDraw.id]);
        run('DELETE FROM access_codes WHERE draw_id = ?', [activeDraw.id]);
      }
    });
    save();
    return res.json({ message: 'Participant removed.' });
  });

  // POST /api/admin/participants/import
  router.post('/import', authenticateToken, (req, res) => {
    const { names } = req.body || {};
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ message: 'No names provided.' });
    }

    const cleaned = [];
    const seen = new Set();
    for (const raw of names) {
      const n = String(raw).trim();
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(n);
    }
    if (cleaned.length === 0) {
      return res.status(400).json({ message: 'No valid names provided.' });
    }

    const existingRows = all('SELECT lower(trim(name)) AS k FROM participants');
    const existingNames = new Set(existingRows.map((e) => e.k));
    const dupes = cleaned.filter((n) => existingNames.has(n.toLowerCase()));
    if (dupes.length > 0) {
      return res.status(409).json({
        message: 'Duplicate names not allowed: ' + dupes.join(', '),
      });
    }

    transaction(() => {
      for (const n of cleaned) run('INSERT INTO participants (name) VALUES (?)', [n]);
    });
    save();

    return res.json({ imported: cleaned.length });
  });

  return router;
}

module.exports = setup;
