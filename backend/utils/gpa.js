/**
 * GPA Utility Functions
 * Single source of truth — used by student routes AND admin analytics
 */

/**
 * Calculate SGPA for a single semester's results
 * @param {Array} results - rows from results table for one semester
 * @returns {number} SGPA rounded to 2 decimal places, or 0 if no valid credits
 */
const calculateSGPA = (results) => {
  let totalWeighted = 0;
  let totalCredits  = 0;

  for (const row of results) {
    if (row.credits > 0) {
      totalWeighted += row.grade_points * row.credits;
      totalCredits  += row.credits;
    }
  }

  if (totalCredits === 0) return 0;
  return parseFloat((totalWeighted / totalCredits).toFixed(2));
};

/**
 * Calculate CGPA across all semesters
 * @param {Array} allResults - all result rows for a student (multiple semesters)
 * @returns {number} CGPA rounded to 2 decimal places
 */
const calculateCGPA = (allResults) => {
  // Reuse same logic as SGPA — just pass all rows together
  return calculateSGPA(allResults);
};

/**
 * Group results by semester
 * @param {Array} allResults
 * @returns {Object} { semesterNumber: [rows] }
 */
const groupBySemester = (allResults) => {
  return allResults.reduce((acc, row) => {
    const sem = row.semester;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(row);
    return acc;
  }, {});
};

/**
 * Get SGPA per semester for a student
 * @param {Array} allResults
 * @returns {Array} [{ semester, sgpa }, ...]
 */
const getSGPAPerSemester = (allResults) => {
  const grouped = groupBySemester(allResults);
  return Object.entries(grouped)
    .map(([sem, rows]) => ({
      semester: parseInt(sem),
      sgpa: calculateSGPA(rows),
    }))
    .sort((a, b) => a.semester - b.semester);
};

/**
 * Check if a student has failed subjects
 * @param {Array} results
 * @returns {Array} failed subject rows
 */
const getFailedSubjects = (results) => {
  return results.filter(r => r.grade_letter === 'F');
};

module.exports = { calculateSGPA, calculateCGPA, getSGPAPerSemester, getFailedSubjects, groupBySemester };
