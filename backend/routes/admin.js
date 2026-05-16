const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { calculateCGPA, getSGPAPerSemester } = require('../utils/gpa');
const { Parser } = require('json2csv');

// All admin routes require a valid admin JWT
router.use(verifyToken, requireRole(['admin']));

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// High-level department summary: total students, pass %, avg CGPA,
// per-section student count, semester-wise pass count
// ---------------------------------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    // Overall totals
    const [[totals]] = await db.query(`
      SELECT
        COUNT(DISTINCT ht_no)  AS total_students,
        COUNT(*)               AS total_result_rows
      FROM results
    `);

    // Overall pass/fail across all results
    const [[passFail]] = await db.query(`
      SELECT
        SUM(CASE WHEN grade_letter != 'F' THEN 1 ELSE 0 END) AS total_pass,
        SUM(CASE WHEN grade_letter  = 'F' THEN 1 ELSE 0 END) AS total_fail
      FROM results
    `);

    // Per-section breakdown
    const [sectionSummary] = await db.query(`
      SELECT
        s.section,
        COUNT(DISTINCT s.ht_no)                                 AS students,
        ROUND(AVG(r.total_marks), 2)                            AS avg_marks,
        SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN r.grade_letter  = 'F' THEN 1 ELSE 0 END) AS fail_count
      FROM students s
      JOIN results r ON s.ht_no = r.ht_no
      GROUP BY s.section
      ORDER BY s.section
    `);

    // Semester-wise pass rate
    const [semesterSummary] = await db.query(`
      SELECT
        semester,
        COUNT(DISTINCT ht_no)                                   AS students,
        ROUND(AVG(total_marks), 2)                              AS avg_marks,
        SUM(CASE WHEN grade_letter != 'F' THEN 1 ELSE 0 END)   AS pass_count,
        SUM(CASE WHEN grade_letter  = 'F' THEN 1 ELSE 0 END)   AS fail_count,
        ROUND(
          100.0 * SUM(CASE WHEN grade_letter != 'F' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS pass_percentage
      FROM results
      GROUP BY semester
      ORDER BY semester
    `);

    res.json({
      totals:           { ...totals, ...passFail },
      section_summary:  sectionSummary,
      semester_summary: semesterSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/toppers
// Ranked list by CGPA. Optional filters: ?semester=3&section=CSE-1&year=2
// When semester is provided, ranks by SGPA for that semester instead
// ---------------------------------------------------------------------------
router.get('/toppers', async (req, res) => {
  try {
    const { semester, section, year, limit = 20 } = req.query;

    if (semester) {
      // Rank by SGPA for a specific semester
      let query = `
        SELECT
          r.ht_no,
          s.section,
          s.year,
          r.semester,
          ROUND(
            SUM(r.grade_points * r.credits) / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END), 0),
            2
          ) AS sgpa,
          SUM(CASE WHEN r.grade_letter = 'F' THEN 1 ELSE 0 END) AS failed_subjects
        FROM results r
        JOIN students s ON r.ht_no = s.ht_no
        WHERE r.semester = ? AND r.credits > 0
      `;
      const params = [parseInt(semester)];

      if (section) { query += ' AND s.section = ?'; params.push(section); }
      if (year)    { query += ' AND s.year = ?';    params.push(parseInt(year)); }

      query += `
        GROUP BY r.ht_no, s.section, s.year, r.semester
        ORDER BY sgpa DESC
        LIMIT ?
      `;
      params.push(parseInt(limit));

      const [rows] = await db.query(query, params);

      // Assign ranks (handle ties)
      let rank = 1;
      const ranked = rows.map((row, i) => {
        if (i > 0 && row.sgpa < rows[i - 1].sgpa) rank = i + 1;
        return { rank, ...row };
      });

      return res.json(ranked);
    }

    // Default: rank by CGPA across all semesters
    let query = `
      SELECT
        r.ht_no,
        s.section,
        s.year,
        ROUND(
          SUM(r.grade_points * r.credits) / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END), 0),
          2
        ) AS cgpa,
        SUM(CASE WHEN r.grade_letter = 'F' THEN 1 ELSE 0 END) AS failed_subjects
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE r.credits > 0
    `;
    const params = [];

    if (section) { query += ' AND s.section = ?'; params.push(section); }
    if (year)    { query += ' AND s.year = ?';    params.push(parseInt(year)); }

    query += `
      GROUP BY r.ht_no, s.section, s.year
      ORDER BY cgpa DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);

    let rank = 1;
    const ranked = rows.map((row, i) => {
      if (i > 0 && row.cgpa < rows[i - 1].cgpa) rank = i + 1;
      return { rank, ...row };
    });

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/subject-analysis
// Per-subject stats across the department. Optional: ?semester=3
// ---------------------------------------------------------------------------
router.get('/subject-analysis', async (req, res) => {
  try {
    const { semester } = req.query;

    let query = `
      SELECT
        r.course_code,
        r.course_name,
        r.semester,
        COUNT(DISTINCT r.ht_no)                                 AS total_students,
        ROUND(AVG(r.total_marks), 2)                            AS avg_marks,
        MAX(r.total_marks)                                      AS highest_marks,
        MIN(r.total_marks)                                      AS lowest_marks,
        SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN r.grade_letter  = 'F' THEN 1 ELSE 0 END) AS fail_count,
        ROUND(
          100.0 * SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS pass_percentage
      FROM results r
    `;
    const params = [];

    if (semester) {
      query += ' WHERE r.semester = ?';
      params.push(parseInt(semester));
    }

    query += ' GROUP BY r.course_code, r.course_name, r.semester ORDER BY r.semester, r.course_code';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/cgpa-distribution
// Buckets all students into CGPA ranges for histogram chart
// Optional: ?section=CSE-1&year=2
// ---------------------------------------------------------------------------
router.get('/cgpa-distribution', async (req, res) => {
  try {
    const { section, year } = req.query;

    let query = `
      SELECT
        r.ht_no,
        ROUND(
          SUM(r.grade_points * r.credits) / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END), 0),
          2
        ) AS cgpa
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE r.credits > 0
    `;
    const params = [];

    if (section) { query += ' AND s.section = ?'; params.push(section); }
    if (year)    { query += ' AND s.year = ?';    params.push(parseInt(year)); }

    query += ' GROUP BY r.ht_no';

    const [rows] = await db.query(query, params);

    // Define CGPA buckets from 0 to 10 in 0.5 steps
    const buckets = {};
    for (let i = 0; i < 10; i += 0.5) {
      const label = `${i.toFixed(1)}-${(i + 0.5).toFixed(1)}`;
      buckets[label] = 0;
    }

    for (const { cgpa } of rows) {
      const val = parseFloat(cgpa);
      if (isNaN(val)) continue;
      // Find which bucket this CGPA falls into
      const bucketStart = Math.floor(val * 2) / 2;        // round down to nearest 0.5
      const capped      = Math.min(bucketStart, 9.5);      // max bucket is 9.5-10.0
      const label       = `${capped.toFixed(1)}-${(capped + 0.5).toFixed(1)}`;
      if (buckets[label] !== undefined) buckets[label]++;
    }

    // Return as array for Chart.js
    const distribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));
    res.json({ total_students: rows.length, distribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/section/:section
// Drill-down for a specific section (e.g. CSE-1)
// Optional: ?semester=3
// ---------------------------------------------------------------------------
router.get('/section/:section', async (req, res) => {
  try {
    const section  = req.params.section;
    const semester = req.query.semester;

    let baseWhere = 'WHERE s.section = ?';
    const params  = [section];

    if (semester) {
      baseWhere += ' AND r.semester = ?';
      params.push(parseInt(semester));
    }

    // Section summary
    const [[summary]] = await db.query(
      `SELECT
        COUNT(DISTINCT r.ht_no)                                 AS total_students,
        ROUND(AVG(r.total_marks), 2)                            AS avg_marks,
        SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN r.grade_letter  = 'F' THEN 1 ELSE 0 END) AS fail_count
       FROM results r
       JOIN students s ON r.ht_no = s.ht_no
       ${baseWhere}`,
      params
    );

    // Per-subject performance in this section
    const [subjectBreakdown] = await db.query(
      `SELECT
        r.course_code,
        r.course_name,
        r.semester,
        ROUND(AVG(r.total_marks), 2)                            AS avg_marks,
        MAX(r.total_marks)                                      AS highest,
        MIN(r.total_marks)                                      AS lowest,
        SUM(CASE WHEN r.grade_letter  = 'F' THEN 1 ELSE 0 END) AS fail_count,
        ROUND(
          100.0 * SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS pass_percentage
       FROM results r
       JOIN students s ON r.ht_no = s.ht_no
       ${baseWhere}
       GROUP BY r.course_code, r.course_name, r.semester
       ORDER BY r.semester, r.course_code`,
      params
    );

    // Top 5 students in this section by CGPA/SGPA
    const topQuery = semester
      ? `SELECT r.ht_no,
           ROUND(SUM(r.grade_points * r.credits) / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END),0), 2) AS gpa
         FROM results r JOIN students s ON r.ht_no = s.ht_no
         WHERE s.section = ? AND r.semester = ? AND r.credits > 0
         GROUP BY r.ht_no ORDER BY gpa DESC LIMIT 5`
      : `SELECT r.ht_no,
           ROUND(SUM(r.grade_points * r.credits) / NULLIF(SUM(CASE WHEN r.credits > 0 THEN r.credits ELSE 0 END),0), 2) AS gpa
         FROM results r JOIN students s ON r.ht_no = s.ht_no
         WHERE s.section = ? AND r.credits > 0
         GROUP BY r.ht_no ORDER BY gpa DESC LIMIT 5`;

    const topParams = semester ? [section, parseInt(semester)] : [section];
    const [topStudents] = await db.query(topQuery, topParams);

    res.json({ section, summary, subject_breakdown: subjectBreakdown, top_students: topStudents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/export
// Full CSV dump. Optional: ?section=CSE-1&semester=3&year=2
// ---------------------------------------------------------------------------
router.get('/export', async (req, res) => {
  try {
    const { section, semester, year } = req.query;

    let query = `
      SELECT
        r.ht_no, s.section, s.year, s.branch,
        r.semester, r.course_code, r.course_name,
        r.cie_marks, r.see_marks, r.total_marks,
        r.grade_letter, r.grade_points, r.credits
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE 1=1
    `;
    const params = [];

    if (section)  { query += ' AND s.section = ?';  params.push(section); }
    if (semester) { query += ' AND r.semester = ?';  params.push(parseInt(semester)); }
    if (year)     { query += ' AND s.year = ?';      params.push(parseInt(year)); }

    query += ' ORDER BY r.ht_no, r.semester, r.course_code';

    const [rows] = await db.query(query, params);

    if (rows.length === 0)
      return res.status(404).json({ error: 'No data found for the given filters.' });

    const parser   = new Parser();
    const csv      = parser.parse(rows);
    const filename = `export_${section || 'all'}_sem${semester || 'all'}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;