const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function setup(adminUsername, adminPassword) {
  // POST /api/admin/login
  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (username !== adminUsername) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    let passwordOk = false;
    try {
      passwordOk = bcrypt.compareSync(password, adminPassword);
    } catch (e) {
      passwordOk = password === adminPassword;
    }
    if (!passwordOk) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username });
  });

  // GET /api/admin/me  - verify the current token
  router.get('/me', authenticateToken, (req, res) => {
    return res.json({ username: req.admin.username });
  });

  return router;
}

module.exports = setup;
