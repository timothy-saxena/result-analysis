const express      = require('express');
const router       = express.Router();
const db           = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { calculateCGPA, getSGPAPerSemester, getFailedSubjects } = require('../utils/gpa');
const { generateMarksheet } = require('../utils/pdf');

// All student routes require a valid student JWT
router.use(verifyToken, requireRole(['student']));

// GET /api/student/results?semester=3
// Returns all subject results for the logged-in student (optionally filtered by semester)
router.get('/results', async (req, res) => {
  try {
    const ht_no    = req.user.id;
    const semester = req.query.semester;

    let query  = 'SELECT * FROM results WHERE ht_no = ?';
    let params = [ht_no];

    if (semester) {
      query  += ' AND semester = ?';
      params.push(parseInt(semester));
    }

    query += ' ORDER BY semester, course_code';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/sgpa
// Returns SGPA for each semester
router.get('/sgpa', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM results WHERE ht_no = ? ORDER BY semester',
      [req.user.id]
    );
    res.json(getSGPAPerSemester(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/cgpa
// Returns overall CGPA across all semesters
router.get('/cgpa', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM results WHERE ht_no = ?',
      [req.user.id]
    );
    const cgpa   = calculateCGPA(rows);
    const failed = getFailedSubjects(rows);
    res.json({ cgpa, failed_count: failed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/failed
// Returns list of failed subjects
router.get('/failed', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM results WHERE ht_no = ? AND grade_letter = 'F' ORDER BY semester",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/marksheet/:semester
// Returns PDF marksheet for given semester
router.get('/marksheet/:semester', async (req, res) => {
  try {
    const ht_no    = req.user.id;
    const semester = parseInt(req.params.semester);

    const [rows] = await db.query(
      'SELECT * FROM results WHERE ht_no = ? AND semester = ? ORDER BY course_code',
      [ht_no, semester]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'No results found for this semester.' });

    const pdfBuffer = await generateMarksheet({ ht_no, semester, results: rows });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="marksheet_${ht_no}_sem${semester}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
