const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { all, get, run, save } = require('../db');

const router = express.Router();

function setup() {
  // GET /api/admin/exclusions
  router.get('/', authenticateToken, (req, res) => {
    const rows = all(`
      SELECT e.id, e.participant_a_id, e.participant_b_id,
             a.name AS participantA_name, b.name AS participantB_name
      FROM exclusions e
      JOIN participants a ON a.id = e.participant_a_id
      JOIN participants b ON b.id = e.participant_b_id
      ORDER BY a.name, b.name
    `);
    return res.json(rows);
  });

  // POST /api/admin/exclusions
  router.post('/', authenticateToken, (req, res) => {
    const { participantAId, participantBId } = req.body || {};
    const aId = Number(participantAId);
    const bId = Number(participantBId);

    if (!aId || !bId) {
      return res.status(400).json({ message: 'Please select two participants.' });
    }
    if (aId === bId) {
      return res.status(400).json({ message: 'A participant cannot be excluded from themselves.' });
    }
    const a = get('SELECT id FROM participants WHERE id = ?', [aId]);
    const b = get('SELECT id FROM participants WHERE id = ?', [bId]);
    if (!a || !b) {
      return res.status(404).json({ message: 'One or both participants not found.' });
    }

    // Prevent duplicate rules in either direction.
    const existing = get(
      'SELECT id FROM exclusions WHERE (participant_a_id = ? AND participant_b_id = ?) OR (participant_a_id = ? AND participant_b_id = ?)',
      [aId, bId, bId, aId]
    );
    if (existing) {
      return res.status(409).json({ message: 'This exclusion rule already exists.' });
    }

    const info = run(
      'INSERT INTO exclusions (participant_a_id, participant_b_id) VALUES (?, ?)',
      [aId, bId]
    );
    const row = get(`
      SELECT e.id, e.participant_a_id, e.participant_b_id,
             a.name AS participantA_name, b.name AS participantB_name
      FROM exclusions e
      JOIN participants a ON a.id = e.participant_a_id
      JOIN participants b ON b.id = e.participant_b_id
      WHERE e.id = ?
    `, [info.lastInsertRowid]);
    save();
    return res.status(201).json(row);
  });

  // DELETE /api/admin/exclusions/:id
  router.delete('/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const row = get('SELECT id FROM exclusions WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ message: 'Exclusion not found.' });
    }
    run('DELETE FROM exclusions WHERE id = ?', [id]);
    save();
    return res.json({ message: 'Exclusion removed.' });
  });

  return router;
}

module.exports = setup;
