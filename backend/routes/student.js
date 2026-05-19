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

// GET /api/student/rank
// Returns the student's CGPA rank within their own section AND within their
// full batch year. Also returns their section and batch year for display.
router.get('/rank', async (req, res) => {
  try {
    const ht_no = req.user.id;

    // Get this student's section and year
    const [[student]] = await db.query(
      'SELECT section, year FROM students WHERE ht_no = ?',
      [ht_no]
    );
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // Calculate CGPA for ALL students in same year (batch), then find this student's rank
    const [batchRows] = await db.query(`
      SELECT
        r.ht_no,
        ROUND(
          SUM(r.grade_points * r.credits)
          / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END), 0),
          2
        ) AS cgpa
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE s.year = ? AND r.credits > 0
      GROUP BY r.ht_no
      ORDER BY cgpa DESC
    `, [student.year]);

    // Find this student's CGPA and position in the batch
    let batchRank = null;
    let cgpa = null;
    let batchTotal = batchRows.length;
    let rank = 1;
    for (let i = 0; i < batchRows.length; i++) {
      if (i > 0 && batchRows[i].cgpa < batchRows[i - 1].cgpa) rank = i + 1;
      if (batchRows[i].ht_no === ht_no) {
        batchRank = rank;
        cgpa = batchRows[i].cgpa;
        break;
      }
    }

    // Now rank within section only
    const [sectionRows] = await db.query(`
      SELECT
        r.ht_no,
        ROUND(
          SUM(r.grade_points * r.credits)
          / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END), 0),
          2
        ) AS cgpa
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE s.section = ? AND r.credits > 0
      GROUP BY r.ht_no
      ORDER BY cgpa DESC
    `, [student.section]);

    let sectionRank = null;
    let sectionTotal = sectionRows.length;
    rank = 1;
    for (let i = 0; i < sectionRows.length; i++) {
      if (i > 0 && sectionRows[i].cgpa < sectionRows[i - 1].cgpa) rank = i + 1;
      if (sectionRows[i].ht_no === ht_no) {
        sectionRank = rank;
        break;
      }
    }

    res.json({
      ht_no,
      cgpa,
      section:       student.section,
      year:          student.year,
      batch_rank:    batchRank,
      batch_total:   batchTotal,
      section_rank:  sectionRank,
      section_total: sectionTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
