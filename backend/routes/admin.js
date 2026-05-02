const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { calculateSGPA, groupBySemester } = require('../utils/gpa');
const { Parser } = require('json2csv');

router.use(verifyToken, requireRole(['admin']));

// GET /api/admin/dashboard
// High-level department summary
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_students }]] = await db.query('SELECT COUNT(DISTINCT ht_no) AS total_students FROM results');
    const [[{ total_subjects }]] = await db.query('SELECT COUNT(DISTINCT course_code) AS total_subjects FROM results');
    const [[{ pass_count }]]     = await db.query("SELECT COUNT(*) AS pass_count FROM results WHERE grade_letter != 'F'");
    const [[{ fail_count }]]     = await db.query("SELECT COUNT(*) AS fail_count FROM results WHERE grade_letter = 'F'");

    res.json({ total_students, total_subjects, pass_count, fail_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/toppers?semester=&year=&section=&limit=10
router.get('/toppers', async (req, res) => {
  try {
    const { semester, year, section, limit = 10 } = req.query;

    // Get all students matching optional filters
    let studentQuery  = 'SELECT ht_no FROM students WHERE 1=1';
    let studentParams = [];
    if (year)    { studentQuery += ' AND year = ?';    studentParams.push(year); }
    if (section) { studentQuery += ' AND section = ?'; studentParams.push(section); }

    const [students] = await db.query(studentQuery, studentParams);
    const htNos = students.map(s => s.ht_no);

    if (htNos.length === 0) return res.json([]);

    let resultsQuery  = 'SELECT * FROM results WHERE ht_no IN (?)';
    let resultsParams = [htNos];
    if (semester) { resultsQuery += ' AND semester = ?'; resultsParams.push(parseInt(semester)); }

    const [rows] = await db.query(resultsQuery, resultsParams);

    // Group by student and compute GPA
    const byStudent = rows.reduce((acc, r) => {
      if (!acc[r.ht_no]) acc[r.ht_no] = [];
      acc[r.ht_no].push(r);
      return acc;
    }, {});

    const ranklist = Object.entries(byStudent)
      .map(([ht_no, results]) => ({ ht_no, gpa: calculateSGPA(results) }))
      .sort((a, b) => b.gpa - a.gpa)
      .slice(0, parseInt(limit))
      .map((s, i) => ({ rank: i + 1, ...s }));

    res.json(ranklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/subject-analysis?semester=
// Per-subject stats: avg, highest, lowest, pass%, fail count
router.get('/subject-analysis', async (req, res) => {
  try {
    const { semester } = req.query;
    let query  = 'SELECT * FROM results WHERE 1=1';
    let params = [];
    if (semester) { query += ' AND semester = ?'; params.push(parseInt(semester)); }

    const [rows] = await db.query(query, params);

    const byCourse = rows.reduce((acc, r) => {
      if (!acc[r.course_code]) acc[r.course_code] = { name: r.course_name, rows: [] };
      acc[r.course_code].rows.push(r);
      return acc;
    }, {});

    const analysis = Object.entries(byCourse).map(([code, { name, rows }]) => {
      const marks  = rows.map(r => r.total_marks).filter(m => m != null);
      const passed = rows.filter(r => r.grade_letter !== 'F').length;
      return {
        course_code: code,
        course_name: name,
        total_students: rows.length,
        average: marks.length ? parseFloat((marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2)) : null,
        highest: marks.length ? Math.max(...marks) : null,
        lowest:  marks.length ? Math.min(...marks) : null,
        passed,
        failed: rows.length - passed,
        pass_percentage: parseFloat(((passed / rows.length) * 100).toFixed(2)),
      };
    });

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/cgpa-distribution
// Buckets: 9-10, 8-9, 7-8, 6-7, below 6
router.get('/cgpa-distribution', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM results');

    const byStudent = rows.reduce((acc, r) => {
      if (!acc[r.ht_no]) acc[r.ht_no] = [];
      acc[r.ht_no].push(r);
      return acc;
    }, {});

    const buckets = { '9-10': 0, '8-9': 0, '7-8': 0, '6-7': 0, 'below 6': 0 };

    for (const results of Object.values(byStudent)) {
      const gpa = calculateSGPA(results);
      if      (gpa >= 9) buckets['9-10']++;
      else if (gpa >= 8) buckets['8-9']++;
      else if (gpa >= 7) buckets['7-8']++;
      else if (gpa >= 6) buckets['6-7']++;
      else               buckets['below 6']++;
    }

    res.json(buckets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/section/:section
// Section-level breakdown
router.get('/section/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { semester } = req.query;

    const [students] = await db.query('SELECT ht_no FROM students WHERE section = ?', [section]);
    const htNos = students.map(s => s.ht_no);
    if (htNos.length === 0) return res.json({ section, students: 0, data: [] });

    let query  = 'SELECT * FROM results WHERE ht_no IN (?)';
    let params = [htNos];
    if (semester) { query += ' AND semester = ?'; params.push(parseInt(semester)); }

    const [rows] = await db.query(query, params);

    const byStudent = rows.reduce((acc, r) => {
      if (!acc[r.ht_no]) acc[r.ht_no] = [];
      acc[r.ht_no].push(r);
      return acc;
    }, {});

    const summary = Object.entries(byStudent).map(([ht_no, results]) => ({
      ht_no,
      gpa: calculateSGPA(results),
      failed_subjects: results.filter(r => r.grade_letter === 'F').length,
    }));

    res.json({ section, total_students: htNos.length, data: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/export?semester=
router.get('/export', async (req, res) => {
  try {
    const { semester } = req.query;
    let query  = 'SELECT r.*, s.branch, s.year, s.section FROM results r JOIN students s ON r.ht_no = s.ht_no WHERE 1=1';
    let params = [];
    if (semester) { query += ' AND r.semester = ?'; params.push(parseInt(semester)); }
    query += ' ORDER BY r.ht_no, r.course_code';

    const [rows] = await db.query(query, params);
    const parser = new Parser();
    const csv    = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results_export.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
