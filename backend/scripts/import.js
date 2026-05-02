/**
 * Import Script — Excel/CSV → MySQL
 * Usage: node scripts/import.js <path-to-excel-file> <semester-number>
 * Example: node scripts/import.js "../data/CSE_2_SEM3.xlsx" 3
 *
 * Convention: semester number is passed as argument (derived from filename context)
 */

const XLSX   = require('xlsx');
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
require('dotenv').config();

const filePath = process.argv[2];
const semester = parseInt(process.argv[3]);

if (!filePath || isNaN(semester)) {
  console.error('Usage: node scripts/import.js <excel-file> <semester-number>');
  process.exit(1);
}

// Infer branch, year, section from HT number
// MGIT format: 24261A0501 → year=24, branch=CS(05), roll=01
// Adjust this logic if your HT_NO format differs
const inferStudentMeta = (ht_no) => {
  // Section: last 2 digits of HT_NO grouped into sections of ~60
  // This is a rough heuristic — update once you know your section mapping
  const roll    = parseInt(ht_no.slice(-2));
  const section = roll <= 60 ? 'CSE-1' : roll <= 120 ? 'CSE-2' : roll <= 180 ? 'CSE-3' : 'CSE-4';
  return {
    branch:  'CSE',
    year:    Math.ceil(semester / 2),  // Sem 1-2 → Year 1, Sem 3-4 → Year 2, etc.
    section,
  };
};

const run = async () => {
  try {
    console.log(`📂 Reading file: ${filePath}`);
    const workbook  = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📊 Found ${rows.length} rows in sheet: ${sheetName}`);

    let inserted  = 0;
    let skipped   = 0;
    let newStudents = 0;

    for (const row of rows) {
      const ht_no       = String(row['HT_NO'] || '').trim();
      const course_code = String(row['COURSE_CODE'] || '').trim();

      if (!ht_no || !course_code) { skipped++; continue; }

      // Insert student if not exists
      const [existing] = await db.query('SELECT ht_no FROM students WHERE ht_no = ?', [ht_no]);
      if (existing.length === 0) {
        const defaultPassword = `${ht_no}@123`;
        const hash = await bcrypt.hash(defaultPassword, 10);
        const meta = inferStudentMeta(ht_no);
        await db.query(
          'INSERT INTO students (ht_no, password_hash, branch, year, section) VALUES (?, ?, ?, ?, ?)',
          [ht_no, hash, meta.branch, meta.year, meta.section]
        );
        newStudents++;
      }

      // Insert or update result
      await db.query(
        `INSERT INTO results
          (ht_no, semester, course_code, course_name, cie_marks, see_marks, total_marks, grade_letter, grade_points, credits)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          course_name = VALUES(course_name),
          cie_marks   = VALUES(cie_marks),
          see_marks   = VALUES(see_marks),
          total_marks = VALUES(total_marks),
          grade_letter = VALUES(grade_letter),
          grade_points = VALUES(grade_points),
          credits      = VALUES(credits)`,
        [
          ht_no,
          semester,
          course_code,
          String(row['COURSE_NAME'] || '').trim(),
          row['CIE_MARKS'] ?? null,
          row['SEE_MARKS'] ?? null,
          row['TOTAL_MARKS'] ?? null,
          String(row['GRADE_LETTER'] || '').trim(),
          parseFloat(row['GRADE_POINTS']) || 0,
          parseInt(row['CREDITS']) || 0,
        ]
      );
      inserted++;
    }

    console.log(`✅ Done!`);
    console.log(`   → Rows processed : ${inserted}`);
    console.log(`   → Rows skipped   : ${skipped}`);
    console.log(`   → New students   : ${newStudents}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
};

run();
