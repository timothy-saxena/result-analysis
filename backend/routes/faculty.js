const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { Parser } = require('json2csv');

router.use(verifyToken, requireRole(['faculty']));

// GET /api/faculty/class-results
// All students' results for the faculty's assigned course
router.get('/class-results', async (req, res) => {
  try {
    const course_code = req.user.course_code;
    const { semester } = req.query;

    let query  = 'SELECT * FROM results WHERE course_code = ?';
    let params = [course_code];

    if (semester) {
      query += ' AND semester = ?';
      params.push(parseInt(semester));
    }

    query += ' ORDER BY ht_no';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faculty/update-marks
// Update CIE/SEE marks for a student in faculty's subject
// Body: { ht_no, semester, cie_marks, see_marks, total_marks, grade_letter, grade_points }
router.post('/update-marks', async (req, res) => {
  try {
    const course_code = req.user.course_code;
    const { ht_no, semester, cie_marks, see_marks, total_marks, grade_letter, grade_points } = req.body;

    if (!ht_no || !semester)
      return res.status(400).json({ error: 'ht_no and semester are required.' });

    await db.query(
      `UPDATE results
       SET cie_marks = ?, see_marks = ?, total_marks = ?, grade_letter = ?, grade_points = ?
       WHERE ht_no = ? AND course_code = ? AND semester = ?`,
      [cie_marks, see_marks, total_marks, grade_letter, grade_points, ht_no, course_code, semester]
    );

    res.json({ message: 'Marks updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/faculty/analytics
// Average marks, pass/fail count, top performers for faculty's subject
router.get('/analytics', async (req, res) => {
  try {
    const course_code = req.user.course_code;
    const { semester } = req.query;

    let baseQuery = 'SELECT * FROM results WHERE course_code = ?';
    let params    = [course_code];
    if (semester) { baseQuery += ' AND semester = ?'; params.push(parseInt(semester)); }

    const [rows] = await db.query(baseQuery, params);
    if (rows.length === 0) return res.json({ message: 'No data found.' });

    const totalMarks = rows.map(r => r.total_marks).filter(m => m != null);
    const avg        = totalMarks.reduce((a, b) => a + b, 0) / totalMarks.length;
    const highest    = Math.max(...totalMarks);
    const lowest     = Math.min(...totalMarks);
    const passed     = rows.filter(r => r.grade_letter !== 'F').length;
    const failed     = rows.filter(r => r.grade_letter === 'F').length;
    const toppers    = rows
      .filter(r => r.total_marks != null)
      .sort((a, b) => b.total_marks - a.total_marks)
      .slice(0, 5);

    res.json({
      course_code,
      total_students: rows.length,
      average_marks: parseFloat(avg.toFixed(2)),
      highest_marks: highest,
      lowest_marks: lowest,
      passed,
      failed,
      pass_percentage: parseFloat(((passed / rows.length) * 100).toFixed(2)),
      top_performers: toppers.map(r => ({ ht_no: r.ht_no, total_marks: r.total_marks, grade: r.grade_letter })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/faculty/export
// Export class results as CSV
router.get('/export', async (req, res) => {
  try {
    const course_code = req.user.course_code;
    const [rows] = await db.query(
      'SELECT ht_no, semester, course_code, course_name, cie_marks, see_marks, total_marks, grade_letter, grade_points FROM results WHERE course_code = ? ORDER BY ht_no',
      [course_code]
    );

    const parser = new Parser();
    const csv    = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${course_code}_results.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
