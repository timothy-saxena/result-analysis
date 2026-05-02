# Result Analysis System

Academic result analysis platform for MGIT CSE Department.
Three-role system: Student, Faculty, Admin — built with Node.js, Express, MySQL, React.

---

## Tech Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Backend   | Node.js, Express.js           |
| Database  | MySQL                         |
| Frontend  | React + Vite + Tailwind CSS   |
| Auth      | JWT (role-based)              |
| PDF       | Puppeteer                     |
| Charts    | Chart.js                      |
| CSV Export| json2csv                      |

---

## Project Structure

```
result-analysis/
├── backend/
│   ├── config/db.js           # MySQL connection pool
│   ├── middleware/auth.js     # JWT verify + role check
│   ├── routes/                # auth, student, faculty, admin
│   ├── utils/gpa.js           # SGPA/CGPA calculation (shared)
│   ├── utils/pdf.js           # Puppeteer marksheet generator
│   ├── scripts/import.js      # One-time Excel → MySQL importer
│   ├── .env.example
│   └── app.js
├── frontend/                  # React app (to be set up)
├── database/schema.sql        # All CREATE TABLE statements
└── README.md
```

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/result-analysis.git
cd result-analysis/backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a JWT secret
```

### 3. Setup Database

```bash
mysql -u root -p < ../database/schema.sql
```

### 4. Import Excel Data

```bash
# Usage: node scripts/import.js <path-to-excel> <semester-number>
node scripts/import.js ../data/CSE_SEM3.xlsx 3
```

Run this once per semester file. Idempotent — safe to re-run.

### 5. Start Backend

```bash
npm run dev   # development (nodemon)
npm start     # production
```

---

## API Overview

### Auth
| Method | Route                     | Access  |
|--------|---------------------------|---------|
| POST   | /api/auth/student-login   | Public  |
| POST   | /api/auth/faculty-login   | Public  |
| POST   | /api/auth/admin-login     | Public  |

### Student (JWT required, role: student)
| Method | Route                           | Description               |
|--------|---------------------------------|---------------------------|
| GET    | /api/student/results?semester=  | Marks (all or per semester)|
| GET    | /api/student/sgpa               | SGPA per semester          |
| GET    | /api/student/cgpa               | Overall CGPA               |
| GET    | /api/student/failed             | Failed subjects            |
| GET    | /api/student/marksheet/:semester| PDF download               |

### Faculty (JWT required, role: faculty)
| Method | Route                    | Description            |
|--------|--------------------------|------------------------|
| GET    | /api/faculty/class-results| All students in subject|
| POST   | /api/faculty/update-marks | Update student marks   |
| GET    | /api/faculty/analytics   | Avg, pass/fail, toppers |
| GET    | /api/faculty/export      | CSV export             |

### Admin (JWT required, role: admin)
| Method | Route                          | Description              |
|--------|--------------------------------|--------------------------|
| GET    | /api/admin/dashboard           | Dept-level summary       |
| GET    | /api/admin/toppers             | Ranklist                 |
| GET    | /api/admin/subject-analysis    | Per-subject stats        |
| GET    | /api/admin/cgpa-distribution   | CGPA bucket distribution |
| GET    | /api/admin/section/:section    | Section-level breakdown  |
| GET    | /api/admin/export              | Full CSV export          |

---

## Default Credentials

- **Student login**: HT Number + `<HTNO>@123` (e.g. `24261A0501@123`)
- **Admin login**: `admin` / `admin@123` ← **Change after first login**

---

## Git Workflow

```
main        ← stable only, no direct pushes
dev         ← integration branch
feature/xxx ← branch off dev for each feature
```

Steps:
1. `git checkout dev && git pull`
2. `git checkout -b feature/your-feature`
3. Work, commit, push
4. Open PR into `dev`
5. Teammate reviews → merge
6. Periodically merge `dev` → `main`

---

## GPA Calculation

- **SGPA** = Σ(grade_points × credits) / Σ(credits) — credits > 0 only
- **CGPA** = Same formula across all semesters combined
- Subjects with `credits = 0` are excluded from GPA

---

## Team

| Member | Role |
|--------|------|
| TBD    | Backend |
| TBD    | Frontend |
