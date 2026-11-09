const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { all, get, run } = require('../db');

const router = express.Router();

function setup() {
  // GET /api/admin/results
  router.get('/', authenticateToken, (req, res) => {
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    if (!activeDraw) {
      return res.json({
        assignments: [],
        valid: false,
        message: 'No draw has been generated yet.',
      });
    }

    const assignments = all(`
      SELECT a.id, a.giver_id, a.recipient_id,
             g.name AS giver_name, r.name AS recipient_name
      FROM assignments a
      JOIN participants g ON g.id = a.giver_id
      JOIN participants r ON r.id = a.recipient_id
      WHERE a.draw_id = ?
      ORDER BY g.name
    `, [activeDraw.id]);

    const exclusions = all('SELECT participant_a_id, participant_b_id FROM exclusions');
    const settingRow = get("SELECT value FROM settings WHERE key = 'prevent_reciprocal'");
    const preventReciprocal = settingRow ? settingRow.value === 'true' : true;

    // Server-side validation: clearly indicate whether all constraints hold.
    let valid = true;
    let message = 'All constraints satisfied.';
    try {
      const participants = all('SELECT id, name FROM participants');
      const formatted = assignments.map((a) => ({
        giver_id: a.giver_id,
        recipient_id: a.recipient_id,
      }));
      const n = participants.length;
      const idToIndex = {};
      participants.forEach((p, i) => {
        idToIndex[p.id] = i;
      });
      const forbidden = Array.from({ length: n }, () => new Set());
      for (let i = 0; i < n; i++) forbidden[i].add(i);
      for (const e of exclusions) {
        const ai = idToIndex[e.participant_a_id];
        const bi = idToIndex[e.participant_b_id];
        if (ai !== undefined && bi !== undefined) {
          forbidden[ai].add(bi);
          forbidden[bi].add(ai);
        }
      }
      const givesTo = new Array(n).fill(-1);
      const givenBy = new Array(n).fill(-1);
      for (const a of formatted) {
        const gi = idToIndex[a.giver_id];
        const ri = idToIndex[a.recipient_id];
        if (gi === undefined || ri === undefined) throw new Error('Invalid participant.');
        if (gi === ri) throw new Error('Self assignment.');
        if (forbidden[gi].has(ri)) throw new Error('Exclusion violated.');
        if (givesTo[gi] !== -1) throw new Error('Giver assigned multiple recipients.');
        if (givenBy[ri] !== -1) throw new Error('Recipient has multiple givers.');
        givesTo[gi] = ri;
        givenBy[ri] = gi;
      }
      for (let i = 0; i < n; i++) {
        if (givesTo[i] === -1) throw new Error('Participant gives no gift.');
        if (givenBy[i] === -1) throw new Error('Participant receives no gift.');
      }
      if (preventReciprocal) {
        for (let i = 0; i < n; i++) {
          const j = givesTo[i];
          if (givesTo[j] === i) throw new Error('Reciprocal assignment detected.');
        }
      }
    } catch (err) {
      valid = false;
      message = err.message || 'Constraint violation detected.';
    }

    return res.json({
      assignments,
      valid,
      message,
    });
  });

  return router;
}

module.exports = setup;
