const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { all, get, run, save, getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function setup() {
  // GET /api/reveal/status - public, no auth
  router.get('/reveal/status', (req, res) => {
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    return res.json({ drawGenerated: !!activeDraw });
  });

  // POST /api/reveal - public, no auth
  router.post('/reveal', (req, res) => {
    const { code } = req.body || {};
    if (!code || !String(code).trim()) {
      return res.status(400).json({ message: 'Please enter your access code.' });
    }

    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    if (!activeDraw) {
      return res.status(409).json({
        message: 'The draw has not been generated yet. Please check back later.',
      });
    }

    const input = String(code).trim();

    // Find an active access code for this draw whose hash matches the input.
    const codes = all(`
      SELECT ac.id, ac.participant_id, ac.code_hash, ac.is_active, p.name AS participant_name
      FROM access_codes ac
      JOIN participants p ON p.id = ac.participant_id
      WHERE ac.draw_id = ? AND ac.is_active = 1
    `, [activeDraw.id]);

    let matched = null;
    for (const c of codes) {
      try {
        if (bcrypt.compareSync(input, c.code_hash)) {
          matched = c;
          break;
        }
      } catch (e) {
        // Ignore hash compare errors and keep checking.
      }
    }

    if (!matched) {
      return res.status(401).json({ message: 'Invalid access code. Please try again.' });
    }

    // Return only this participant's own recipient.
    const assignment = get(`
      SELECT a.recipient_id, r.name AS recipient_name
      FROM assignments a
      JOIN participants r ON r.id = a.recipient_id
      WHERE a.draw_id = ? AND a.giver_id = ?
    `, [activeDraw.id, matched.participant_id]);

    if (!assignment) {
      return res.status(404).json({ message: 'No assignment found for this code.' });
    }

    return res.json({
      participantName: matched.participant_name,
      recipientName: assignment.recipient_name,
    });
  });

  // POST /api/access-codes/generate (admin-only)
  router.post('/access-codes/generate', authenticateToken, (req, res) => {
    const activeDraw = get('SELECT id FROM draws WHERE is_active = 1');
    if (!activeDraw) {
      return res.status(400).json({ message: 'No active draw. Generate a draw first.' });
    }

    const participants = all(
      'SELECT id, name FROM participants ORDER BY name COLLATE NOCASE'
    );

    // Invalidate any previous codes for this draw first.
    run('UPDATE access_codes SET is_active = 0 WHERE draw_id = ?', [activeDraw.id]);

    const codes = [];
    const insertStmt = getDb().prepare(
      'INSERT INTO access_codes (participant_id, draw_id, code_hash, is_active) VALUES (?, ?, ?, 1)'
    );
    for (const p of participants) {
      const plainCode = 'SANTA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const codeHash = bcrypt.hashSync(plainCode, 10);
      insertStmt.bind([p.id, activeDraw.id, codeHash]);
      insertStmt.run();
      insertStmt.reset();
      codes.push({ participantId: p.id, participantName: p.name, code: plainCode });
    }
    insertStmt.free();

    save();

    return res.json({ codes, drawId: activeDraw.id });
  });

  return router;
}

module.exports = setup;
