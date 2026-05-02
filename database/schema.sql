-- ============================================================
-- Result Analysis System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS result_analysis;
USE result_analysis;

-- Students table (populated from import script)
CREATE TABLE IF NOT EXISTS students (
    ht_no       VARCHAR(20)  PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    branch      VARCHAR(20),
    year        TINYINT,
    section     VARCHAR(10)
);

-- Faculty accounts (created manually by admin)
CREATE TABLE IF NOT EXISTS faculty (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100),
    course_code   VARCHAR(20)
);

-- Admin accounts
CREATE TABLE IF NOT EXISTS admins (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Core results table (one row = one student-subject entry)
CREATE TABLE IF NOT EXISTS results (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    ht_no        VARCHAR(20)   NOT NULL,
    semester     TINYINT       NOT NULL,
    course_code  VARCHAR(20)   NOT NULL,
    course_name  VARCHAR(100),
    cie_marks    INT,
    see_marks    INT           NULL,
    total_marks  INT,
    grade_letter VARCHAR(5),
    grade_points DECIMAL(3,1),
    credits      INT           DEFAULT 0,
    FOREIGN KEY (ht_no) REFERENCES students(ht_no),
    UNIQUE KEY uq_result (ht_no, semester, course_code)
);

-- Indexes for common queries
CREATE INDEX idx_results_semester  ON results(semester);
CREATE INDEX idx_results_course    ON results(course_code);
CREATE INDEX idx_students_section  ON students(section);
CREATE INDEX idx_students_year     ON students(year);

-- Default admin account (password: admin@123)
-- Replace this hash after first login
INSERT IGNORE INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
