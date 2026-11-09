const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { generateDraw } = require('../drawAlgorithm');
const { all, get, run, transaction, save } = require('../db');

const router = express.Router();

const IMPOSSIBLE_MESSAGE =
  'No valid Secret Santa assignment is possible with the current exclusion rules. Please review your exclusions.';

function getFullAssignments(assignments) {
  return assignments.map((a) => {
    const g = get('SELECT id, name FROM participants WHERE id = ?', [a.giver_id]);
    const r = get('SELECT id, name FROM participants WHERE id = ?', [a.recipient_id]);
    return {
      id: null,
      giver_id: a.giver_id,
      recipient_id: a.recipient_id,
      giver: g,
      recipient: r,
    };
  });
}

function runGenerate(res) {
  try {
    const participants = all(
      'SELECT id, name FROM participants ORDER BY name COLLATE NOCASE'
    );
    const exclusions = all(
      'SELECT participant_a_id, participant_b_id FROM exclusions'
    );
    const settingRow = get("SELECT value FROM settings WHERE key = 'prevent_reciprocal'");
    const preventReciprocal = settingRow ? settingRow.value === 'true' : true;

    if (participants.length < 3) {
      return res.status(400).json({
        message: 'At least 3 participants are required to generate a draw.',
      });
    }

    const assignments = generateDraw(participants, exclusions, preventReciprocal);
    if (!assignments) {
      return res.status(400).json({ message: IMPOSSIBLE_MESSAGE });
    }

    const drawId = transaction(() => {
      // Deactivate any previous draws so only one active draw exists at a time.
      run('UPDATE draws SET is_active = 0');
      const info = run('INSERT INTO draws (is_active) VALUES (1)');
      const drawId = info.lastInsertRowid;
      for (const a of assignments) {
        run(
          'INSERT INTO assignments (draw_id, giver_id, recipient_id) VALUES (?, ?, ?)',
          [drawId, a.giver_id, a.recipient_id]
        );
      }
      return drawId;
    });

    const fullAssignments = getFullAssignments(assignments);
    save();

    return res.json({
      drawId,
      assignments: fullAssignments,
      message: 'Secret Santa draw generated successfully.',
    });
  } catch (err) {
    console.error('Generate draw error:', err);
    return res.status(500).json({ message: err.message || 'Failed to generate draw.' });
  }
}

function setup() {
  // GET /api/admin/stats
  router.get('/stats', authenticateToken, (req, res) => {
    const participantCount = get('SELECT COUNT(*) AS c FROM participants').c;
    const exclusionCount = get('SELECT COUNT(*) AS c FROM exclusions').c;
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    return res.json({
      participantCount,
      exclusionCount,
      activeDraw: !!activeDraw,
    });
  });

  // POST /api/admin/draw/generate
  router.post('/generate', authenticateToken, (req, res) => {
    runGenerate(res);
  });

  // POST /api/admin/draw/regenerate
  router.post('/regenerate', authenticateToken, (req, res) => {
    runGenerate(res);
  });

  // POST /api/admin/draw/reset
  router.post('/reset', authenticateToken, (req, res) => {
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    if (!activeDraw) {
      return res.status(400).json({ message: 'No active draw to reset.' });
    }
    transaction(() => {
      run('DELETE FROM assignments WHERE draw_id = ?', [activeDraw.id]);
      run('DELETE FROM access_codes WHERE draw_id = ?', [activeDraw.id]);
      run('UPDATE draws SET is_active = 0 WHERE id = ?', [activeDraw.id]);
    });
    save();
    return res.json({ message: 'Draw reset successfully.' });
  });

  return router;
}

module.exports = setup;
