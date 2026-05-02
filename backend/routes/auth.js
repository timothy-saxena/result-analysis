const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const db         = require('../config/db');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/student-login
router.post('/student-login', async (req, res) => {
  try {
    const { ht_no, password } = req.body;
    if (!ht_no || !password)
      return res.status(400).json({ error: 'HT number and password are required.' });

    const [rows] = await db.query('SELECT * FROM students WHERE ht_no = ?', [ht_no]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const student = rows[0];
    const valid   = await bcrypt.compare(password, student.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken({ id: student.ht_no, role: 'student' });
    res.json({ token, role: 'student', ht_no: student.ht_no });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/faculty-login
router.post('/faculty-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });

    const [rows] = await db.query('SELECT * FROM faculty WHERE username = ?', [username]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const faculty = rows[0];
    const valid   = await bcrypt.compare(password, faculty.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken({ id: faculty.id, role: 'faculty', course_code: faculty.course_code });
    res.json({ token, role: 'faculty', name: faculty.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });

    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken({ id: admin.id, role: 'admin' });
    res.json({ token, role: 'admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
