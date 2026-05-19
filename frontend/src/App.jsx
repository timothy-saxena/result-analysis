// src/App.jsx
// Minimal client-side router — no external routing library needed

import Login from "./pages/Login";
import StudentDashboard from "./pages/student/StudentDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { getToken, getUser } from "./utils/api";

function getPage() {
    const path = window.location.pathname;
    if (path.startsWith("/student")) return "student";
    if (path.startsWith("/faculty")) return "faculty";
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/login")) return "login";
    return "home";
}

function requireAuth(role) {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
        window.location.href = `/login?role=${role}`;
        return false;
    }
    if (user.role !== role) {
        window.location.href = `/login?role=${role}`;
        return false;
    }
    return true;
}

export default function App() {
    const page = getPage();

    if (page === "student") {
        if (!requireAuth("student")) return null;
        return <StudentDashboard />;
    }

    if (page === "faculty") {
        /*         if (!requireAuth("faculty")) return null;
        return <FacultyDashboard />;
         */
        window.location.href = "/login?role=student";
        return null;
    }

    if (page === "admin") {
        if (!requireAuth("admin")) return null;
        return <AdminDashboard />;
    }
    if (page === "login") {
        return <Login />;
    }

    // Home — redirect to login role selector
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0d0f14",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'JetBrains Mono', monospace",
                gap: "1rem",
            }}
        >
            <div
                style={{
                    color: "#e0e0e0",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    letterSpacing: "0.05em",
                }}
            >
                MGIT Result Analysis
            </div>
            <div
                style={{
                    color: "#444",
                    fontSize: "0.75rem",
                    letterSpacing: "0.1em",
                    marginBottom: "1rem",
                }}
            >
                SELECT YOUR ROLE TO CONTINUE
            </div>
            {[
                { role: "student", label: "Student Portal", accent: "#00e5a0" },
                { role: "faculty", label: "Faculty Portal", accent: "#f5a623" },
                { role: "admin", label: "Admin Portal", accent: "#7c6af7" },
            ].map(({ role, label, accent }) => (
                <a
                    key={role}
                    href={`/login?role=${role}`}
                    style={{
                        display: "block",
                        padding: "0.7rem 2rem",
                        background: `${accent}18`,
                        border: `1px solid ${accent}44`,
                        color: accent,
                        borderRadius: "5px",
                        textDecoration: "none",
                        fontSize: "0.8rem",
                        letterSpacing: "0.08em",
                        width: "220px",
                        textAlign: "center",
                    }}
                >
                    {label}
                </a>
            ))}
        </div>
    );
}
