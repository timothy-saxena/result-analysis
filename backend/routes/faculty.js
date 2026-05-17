const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { Parser } = require("json2csv");

// All faculty routes require a valid faculty JWT
router.use(verifyToken, requireRole(["faculty"]));

// ---------------------------------------------------------------------------
// GET /api/faculty/class-results
// Returns all student results for the faculty's assigned course_code
// Optionally filter by semester: ?semester=3
// ---------------------------------------------------------------------------
router.get("/class-results", async (req, res) => {
    try {
        const course_code = req.user.course_code;
        const semester = req.query.semester;

        let query = `
      SELECT
        r.ht_no,
        s.section,
        s.year,
        r.semester,
        r.course_code,
        r.course_name,
        r.cie_marks,
        r.see_marks,
        r.total_marks,
        r.grade_letter,
        r.grade_points,
        r.credits
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE r.course_code = ?
    `;
        const params = [course_code];

        if (semester) {
            query += " AND r.semester = ?";
            params.push(parseInt(semester));
        }

        query += " ORDER BY r.ht_no";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/faculty/update-marks
// Body: { ht_no, semester, cie_marks, see_marks }
// Recalculates total_marks, grade_letter, grade_points from the new values
// Only allowed for faculty's own course_code
// ---------------------------------------------------------------------------
router.post("/update-marks", async (req, res) => {
    try {
        const course_code = req.user.course_code;
        const { ht_no, semester, cie_marks, see_marks } = req.body;

        // Validate required fields
        if (!ht_no || !semester || cie_marks === undefined) {
            return res.status(400).json({
                error: "ht_no, semester, and cie_marks are required.",
            });
        }

        // Confirm the result row exists and belongs to this faculty's course
        const [existing] = await db.query(
            "SELECT * FROM results WHERE ht_no = ? AND semester = ? AND course_code = ?",
            [ht_no, parseInt(semester), course_code],
        );

        if (existing.length === 0) {
            return res.status(404).json({
                error: "Result not found for this student and course.",
            });
        }

        const row = existing[0];
        const credits = row.credits;
        const cie = parseInt(cie_marks);
        const see =
            see_marks !== undefined && see_marks !== null
                ? parseInt(see_marks)
                : null;

        // Recompute total
        const total = see !== null ? cie + see : cie;

        // Derive grade from total marks (standard 100-mark grading scale)
        const { letter, points } = deriveGrade(total, credits);

        await db.query(
            `UPDATE results
       SET cie_marks = ?, see_marks = ?, total_marks = ?, grade_letter = ?, grade_points = ?
       WHERE ht_no = ? AND semester = ? AND course_code = ?`,
            [
                cie,
                see,
                total,
                letter,
                points,
                ht_no,
                parseInt(semester),
                course_code,
            ],
        );

        res.json({
            message: "Marks updated successfully.",
            ht_no,
            course_code,
            cie_marks: cie,
            see_marks: see,
            total_marks: total,
            grade_letter: letter,
            grade_points: points,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/faculty/analytics
// Returns subject-level analytics for the faculty's course
// Optional: ?semester=3
// ---------------------------------------------------------------------------
router.get("/analytics", async (req, res) => {
    try {
        const course_code = req.user.course_code;
        const semester = req.query.semester;

        let baseWhere = "WHERE r.course_code = ?";
        const params = [course_code];

        if (semester) {
            baseWhere += " AND r.semester = ?";
            params.push(parseInt(semester));
        }

        // Summary stats — one query
        const [summary] = await db.query(
            `SELECT
        COUNT(DISTINCT r.ht_no)                          AS total_students,
        ROUND(AVG(r.total_marks), 2)                     AS avg_marks,
        MAX(r.total_marks)                               AS highest_marks,
        MIN(r.total_marks)                               AS lowest_marks,
        SUM(CASE WHEN r.grade_letter = 'F' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) AS pass_count,
        r.course_name
       FROM results r
       ${baseWhere}
       GROUP BY r.course_name`,
            params,
        );

        // Top 5 performers
        const [toppers] = await db.query(
            `SELECT r.ht_no, s.section, r.total_marks, r.grade_letter, r.semester
       FROM results r
       JOIN students s ON r.ht_no = s.ht_no
       ${baseWhere}
       ORDER BY r.total_marks DESC
       LIMIT 5`,
            params,
        );

        // Grade distribution (count per grade letter)
        const [gradeDistribution] = await db.query(
            `SELECT grade_letter, COUNT(*) AS count, MAX(grade_points) AS grade_points
   FROM results r
   ${baseWhere}
   GROUP BY grade_letter
   ORDER BY MAX(grade_points) DESC`,
            params,
        );
        // Pass percentage per section
        const [sectionBreakdown] = await db.query(
            `SELECT
        s.section,
        COUNT(DISTINCT r.ht_no)                               AS students,
        ROUND(AVG(r.total_marks), 2)                          AS avg_marks,
        SUM(CASE WHEN r.grade_letter != 'F' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN r.grade_letter  = 'F' THEN 1 ELSE 0 END) AS fail_count
       FROM results r
       JOIN students s ON r.ht_no = s.ht_no
       ${baseWhere}
       GROUP BY s.section
       ORDER BY s.section`,
            params,
        );

        res.json({
            summary: summary[0] || {},
            top_performers: toppers,
            grade_distribution: gradeDistribution,
            section_breakdown: sectionBreakdown,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/faculty/export
// Downloads a CSV of all student results for the faculty's subject
// Optional: ?semester=3
// ---------------------------------------------------------------------------
router.get("/export", async (req, res) => {
    try {
        const course_code = req.user.course_code;
        const semester = req.query.semester;

        let query = `
      SELECT
        r.ht_no, s.section, r.semester,
        r.course_code, r.course_name,
        r.cie_marks, r.see_marks, r.total_marks,
        r.grade_letter, r.grade_points, r.credits
      FROM results r
      JOIN students s ON r.ht_no = s.ht_no
      WHERE r.course_code = ?
    `;
        const params = [course_code];

        if (semester) {
            query += " AND r.semester = ?";
            params.push(parseInt(semester));
        }

        query += " ORDER BY r.ht_no";

        const [rows] = await db.query(query, params);

        if (rows.length === 0)
            return res.status(404).json({ error: "No data found for export." });

        const parser = new Parser();
        const csv = parser.parse(rows);

        const filename = semester
            ? `results_${course_code}_sem${semester}.csv`
            : `results_${course_code}_all.csv`;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`,
        );
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Helper: derive grade letter + points from total marks
// Matches standard JNTUH grading pattern used in the dataset
// ---------------------------------------------------------------------------
function deriveGrade(total, credits) {
    // For zero-credit subjects, pass/fail only
    if (credits === 0) {
        return total >= 35
            ? { letter: "P", points: 0 }
            : { letter: "F", points: 0 };
    }

    if (total >= 90) return { letter: "O", points: 10 };
    if (total >= 80) return { letter: "A+", points: 9 };
    if (total >= 70) return { letter: "A", points: 8 };
    if (total >= 60) return { letter: "B+", points: 7 };
    if (total >= 55) return { letter: "B", points: 6 };
    if (total >= 50) return { letter: "C", points: 5 };
    if (total >= 45) return { letter: "D", points: 4 };
    if (total >= 40) return { letter: "E", points: 3 };
    return { letter: "F", points: 0 };
}

module.exports = router;
