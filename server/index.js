require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const { initPromise, save } = require('./db');
const { authenticateToken, JWT_SECRET } = require('./middleware/auth');

const adminSetup = require('./routes/admin');
const participantsSetup = require('./routes/participants');
const exclusionsSetup = require('./routes/exclusions');
const drawSetup = require('./routes/draw');
const resultsSetup = require('./routes/results');
const revealSetup = require('./routes/reveal');

const app = express();
const PORT = process.env.PORT || 5000;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Hash the admin password at startup so it is never stored in plain text.
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(ADMIN_PASSWORD, 10);

// Initialize the database before accepting requests.
initPromise.then(() => {
  // Ensure the default setting exists.
  const { get } = require('./db');
  const settingsRow = get("SELECT value FROM settings WHERE key = 'prevent_reciprocal'");
  if (!settingsRow) {
    const { run } = require('./db');
    run("INSERT INTO settings (key, value) VALUES ('prevent_reciprocal', 'true')");
    save();
  }

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check (public)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Admin auth routes
  app.use('/api/admin', adminSetup(ADMIN_USERNAME, ADMIN_PASSWORD_HASH));

  // Admin settings (protected)
  const { get: _get, run: _run } = require('./db');
  app.get('/api/admin/settings', authenticateToken, (req, res) => {
    const row = _get("SELECT value FROM settings WHERE key = 'prevent_reciprocal'");
    return res.json({ preventReciprocal: row ? row.value === 'true' : true });
  });
  app.put('/api/admin/settings', authenticateToken, (req, res) => {
    const { preventReciprocal } = req.body || {};
    const value = preventReciprocal === true || preventReciprocal === 'true' ? 'true' : 'false';
    _run(
      "INSERT INTO settings (key, value) VALUES ('prevent_reciprocal', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [value]
    );
    save();
    return res.json({ preventReciprocal: value === 'true' });
  });

  // Protected API routes
  app.use('/api/admin/participants', authenticateToken, participantsSetup());
  app.use('/api/admin/exclusions', authenticateToken, exclusionsSetup());
  app.use('/api/admin/draw', authenticateToken, drawSetup());
  app.use('/api/admin/results', authenticateToken, resultsSetup());

  // Public participant reveal routes (no admin auth)
  app.use('/api', revealSetup());

  // Serve the built frontend in production.
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  // SPA fallback: send index.html for any non-API route so client-side routing works.
  app.get(/^\/((?!api).*)$/, (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Secret Santa server running on http://localhost:${PORT}`);
    console.log(`Admin username: ${ADMIN_USERNAME}`);
    console.log(`Admin password: ${ADMIN_PASSWORD}  (change via .env in production)`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
