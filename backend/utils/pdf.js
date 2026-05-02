const puppeteer = require('puppeteer');
const { calculateSGPA, getFailedSubjects } = require('./gpa');

/**
 * Generates a PDF marksheet for a student's semester results
 * @param {Object} data - { ht_no, semester, results }
 * @returns {Buffer} PDF buffer
 */
const generateMarksheet = async ({ ht_no, semester, results }) => {
  const sgpa   = calculateSGPA(results);
  const failed = getFailedSubjects(results);

  const tableRows = results.map(r => `
    <tr class="${r.grade_letter === 'F' ? 'fail-row' : ''}">
      <td>${r.course_code}</td>
      <td>${r.course_name}</td>
      <td>${r.credits}</td>
      <td>${r.cie_marks ?? '-'}</td>
      <td>${r.see_marks ?? '-'}</td>
      <td><strong>${r.total_marks}</strong></td>
      <td>${r.grade_letter}</td>
      <td>${r.grade_points}</td>
    </tr>
  `).join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; }
      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
      .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
      .header h2 { font-size: 15px; font-weight: normal; margin-top: 4px; }
      .header h3 { font-size: 13px; font-weight: normal; margin-top: 2px; color: #555; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
      .meta div { line-height: 1.8; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #1e3a5f; color: white; padding: 8px 6px; text-align: center; }
      td { padding: 7px 6px; border-bottom: 1px solid #ddd; text-align: center; }
      .fail-row td { color: #cc0000; background: #fff5f5; }
      .summary { margin-top: 24px; display: flex; justify-content: space-between; font-size: 13px; }
      .summary .box { border: 1px solid #ccc; padding: 12px 20px; border-radius: 6px; text-align: center; }
      .summary .box .label { font-size: 11px; color: #666; }
      .summary .box .value { font-size: 22px; font-weight: bold; color: #1e3a5f; margin-top: 4px; }
      .status-bar { margin-top: 20px; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; text-align: center; }
      .status-pass { background: #d4edda; color: #155724; }
      .status-fail { background: #f8d7da; color: #721c24; }
      .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>MAHATMA GANDHI INSTITUTE OF TECHNOLOGY</h1>
      <h2>Department of Computer Science & Engineering</h2>
      <h3>Academic Result — Semester ${semester}</h3>
    </div>

    <div class="meta">
      <div>
        <strong>HT Number:</strong> ${ht_no}<br>
        <strong>Branch:</strong> CSE<br>
        <strong>Semester:</strong> ${semester}
      </div>
      <div>
        <strong>Academic Year:</strong> 2024–2025<br>
        <strong>Issued On:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Course Code</th>
          <th>Course Name</th>
          <th>Credits</th>
          <th>CIE</th>
          <th>SEE</th>
          <th>Total</th>
          <th>Grade</th>
          <th>Grade Points</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="summary">
      <div class="box">
        <div class="label">SGPA</div>
        <div class="value">${sgpa}</div>
      </div>
      <div class="box">
        <div class="label">Subjects Appeared</div>
        <div class="value">${results.length}</div>
      </div>
      <div class="box">
        <div class="label">Subjects Passed</div>
        <div class="value">${results.length - failed.length}</div>
      </div>
      <div class="box">
        <div class="label">Subjects Failed</div>
        <div class="value" style="color: ${failed.length > 0 ? '#cc0000' : 'inherit'}">${failed.length}</div>
      </div>
    </div>

    <div class="status-bar ${failed.length === 0 ? 'status-pass' : 'status-fail'}">
      ${failed.length === 0 ? '✅ PASS — Promoted to next semester' : `❌ DETAINED — ${failed.length} subject(s) failed`}
    </div>

    <div class="footer">
      <span>This is a computer-generated document.</span>
      <span>Result Analysis System — MGIT CSE</span>
    </div>
  </body>
  </html>
  `;

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page    = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
  await browser.close();

  return pdfBuffer;
};

module.exports = { generateMarksheet };
