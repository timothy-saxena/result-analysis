// src/pages/admin/AdminDashboard.jsx

import { useState, useEffect } from "react";
import { api, logout } from "../../utils/api";

const ACCENT = "#7c6af7";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [dashboard, setDashboard] = useState(null);
    const [toppers, setToppers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [cgpaDist, setCgpaDist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [semFilter, setSemFilter] = useState("");
    const [sectionFilter, setSectionFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [exportLoading, setExportLoad] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);
    useEffect(() => {
        if (activeTab === "toppers") loadToppers();
        if (activeTab === "subjects") loadSubjects();
        if (activeTab === "cgpa") loadCgpaDist();
    }, [activeTab, semFilter, sectionFilter, yearFilter]);

    async function loadDashboard() {
        setLoading(true);
        setError("");
        try {
            const data = await api.get("/admin/dashboard");
            setDashboard(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadToppers() {
        setLoading(true);
        setError("");
        try {
            let q = "/admin/toppers?limit=20";
            if (semFilter) q += `&semester=${semFilter}`;
            if (sectionFilter) q += `&section=${sectionFilter}`;
            if (yearFilter) q += `&year=${yearFilter}`;
            const data = await api.get(q);
            setToppers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadSubjects() {
        setLoading(true);
        setError("");
        try {
            let q = "/admin/subject-analysis";
            if (semFilter) q += `?semester=${semFilter}`;
            const data = await api.get(q);
            setSubjects(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadCgpaDist() {
        setLoading(true);
        setError("");
        try {
            let q = "/admin/cgpa-distribution";
            const qs = [];
            if (sectionFilter) qs.push(`section=${sectionFilter}`);
            if (yearFilter) qs.push(`year=${yearFilter}`);
            if (qs.length) q += "?" + qs.join("&");
            const data = await api.get(q);
            setCgpaDist(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function exportCSV() {
        setExportLoad(true);
        try {
            let q = "/admin/export";
            const qs = [];
            if (semFilter) qs.push(`semester=${semFilter}`);
            if (sectionFilter) qs.push(`section=${sectionFilter}`);
            if (yearFilter) qs.push(`year=${yearFilter}`);
            if (qs.length) q += "?" + qs.join("&");
            const res = await api.blob(q);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "admin_export.csv";
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Export failed: " + err.message);
        } finally {
            setExportLoad(false);
        }
    }

    // Derive unique sections/semesters/years from dashboard data
    const sections = dashboard?.section_summary?.map((s) => s.section) || [];
    const semesters = dashboard?.semester_summary?.map((s) => s.semester) || [];

    return (
        <div style={S.shell}>
            {/* ── Sidebar ── */}
            <aside style={S.sidebar}>
                <div style={S.logo}>
                    <span style={{ color: ACCENT }}>◆</span> MGIT Results Portal
                </div>
                <div
                    style={{
                        color: "#555",
                        fontSize: "0.65rem",
                        letterSpacing: "0.12em",
                        padding: "0 1.2rem",
                        marginBottom: "2rem",
                    }}
                >
                    ADMIN
                </div>

                {[
                    { id: "dashboard", label: "Dashboard" },
                    { id: "toppers", label: "Toppers / Ranklist" },
                    { id: "subjects", label: "Subject Analysis" },
                    { id: "cgpa", label: "CGPA Distribution" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={S.navBtn(activeTab === tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Filters */}
                <div
                    style={{
                        padding: "1.2rem 1.2rem 0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                    }}
                >
                    <div style={S.filterLabel}>FILTERS</div>
                    <select
                        value={semFilter}
                        onChange={(e) => setSemFilter(e.target.value)}
                        style={S.select}
                    >
                        <option value="">All Semesters</option>
                        {semesters.map((s) => (
                            <option key={s} value={s}>
                                Semester {s}
                            </option>
                        ))}
                    </select>
                    <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        style={S.select}
                    >
                        <option value="">All Sections</option>
                        {sections.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        style={S.select}
                    >
                        <option value="">All Years</option>
                        {[1, 2, 3, 4].map((y) => (
                            <option key={y} value={y}>
                                Year {y}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ padding: "1rem 1.2rem", marginTop: "0.5rem" }}>
                    <button
                        onClick={exportCSV}
                        disabled={exportLoading}
                        style={{ ...S.exportBtn, width: "100%" }}
                    >
                        {exportLoading ? "Exporting..." : "Export CSV ↓"}
                    </button>
                </div>

                <button
                    onClick={logout}
                    style={{
                        ...S.navBtn(false),
                        marginTop: "auto",
                        color: "#ff6060",
                    }}
                >
                    Sign Out
                </button>
            </aside>

            {/* ── Main ── */}
            <main style={S.main}>
                {error && <div style={S.errorBox}>{error}</div>}
                {loading && <div style={S.loadText}>Loading...</div>}

                {/* ── DASHBOARD ── */}
                {!loading && activeTab === "dashboard" && dashboard && (
                    <section>
                        <h2 style={S.h2}>Department Overview</h2>

                        {/* Top stat cards */}
                        <div style={S.cardRow}>
                            {[
                                {
                                    label: "Total Students",
                                    value: dashboard.totals.total_students,
                                },
                                {
                                    label: "Total Results",
                                    value: dashboard.totals.total_result_rows,
                                },
                                {
                                    label: "Total Pass",
                                    value: dashboard.totals.total_pass,
                                    color: "#00e5a0",
                                },
                                {
                                    label: "Total Fail",
                                    value: dashboard.totals.total_fail,
                                    color: "#ff5252",
                                },
                            ].map((c) => (
                                <div key={c.label} style={S.statCard}>
                                    <div
                                        style={{
                                            color: "#555",
                                            fontSize: "0.62rem",
                                            letterSpacing: "0.12em",
                                        }}
                                    >
                                        {c.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "1.6rem",
                                            fontWeight: "700",
                                            color: c.color || ACCENT,
                                        }}
                                    >
                                        {c.value ?? "—"}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Section breakdown */}
                        <div style={{ marginTop: "2rem" }}>
                            <div style={S.sectionLabel}>SECTION BREAKDOWN</div>
                            <div style={S.tableWrap}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            {[
                                                "Section",
                                                "Students",
                                                "Avg Marks",
                                                "Pass",
                                                "Fail",
                                                "Pass %",
                                            ].map((h) => (
                                                <th key={h} style={S.th}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboard.section_summary.map(
                                            (s, i) => (
                                                <tr key={i} style={S.row}>
                                                    <td style={S.td}>
                                                        <span
                                                            style={{
                                                                color: ACCENT,
                                                            }}
                                                        >
                                                            {s.section}
                                                        </span>
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.students}
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.avg_marks}
                                                    </td>
                                                    <td
                                                        style={{
                                                            ...S.tdNum,
                                                            color: "#00e5a0",
                                                        }}
                                                    >
                                                        {s.pass_count}
                                                    </td>
                                                    <td
                                                        style={{
                                                            ...S.tdNum,
                                                            color: "#ff5252",
                                                        }}
                                                    >
                                                        {s.fail_count}
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.pass_count +
                                                            s.fail_count >
                                                        0
                                                            ? `${((s.pass_count / (s.pass_count + s.fail_count)) * 100).toFixed(1)}%`
                                                            : "—"}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Semester breakdown */}
                        <div style={{ marginTop: "2rem" }}>
                            <div style={S.sectionLabel}>
                                SEMESTER-WISE PERFORMANCE
                            </div>
                            <div style={S.tableWrap}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            {[
                                                "Semester",
                                                "Students",
                                                "Avg Marks",
                                                "Pass",
                                                "Fail",
                                                "Pass %",
                                            ].map((h) => (
                                                <th key={h} style={S.th}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboard.semester_summary.map(
                                            (s, i) => (
                                                <tr key={i} style={S.row}>
                                                    <td style={S.td}>
                                                        <span
                                                            style={{
                                                                color: ACCENT,
                                                            }}
                                                        >
                                                            Sem {s.semester}
                                                        </span>
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.students}
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.avg_marks}
                                                    </td>
                                                    <td
                                                        style={{
                                                            ...S.tdNum,
                                                            color: "#00e5a0",
                                                        }}
                                                    >
                                                        {s.pass_count}
                                                    </td>
                                                    <td
                                                        style={{
                                                            ...S.tdNum,
                                                            color: "#ff5252",
                                                        }}
                                                    >
                                                        {s.fail_count}
                                                    </td>
                                                    <td style={S.tdNum}>
                                                        {s.pass_percentage}%
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── TOPPERS ── */}
                {!loading && activeTab === "toppers" && (
                    <section>
                        <h2 style={S.h2}>
                            {semFilter
                                ? `Semester ${semFilter} Ranklist`
                                : "Overall CGPA Ranklist"}
                            {sectionFilter && ` — ${sectionFilter}`}
                        </h2>
                        <div style={S.tableWrap}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        {[
                                            "Rank",
                                            "HT No",
                                            "Section",
                                            "Year",
                                            semFilter ? "SGPA" : "CGPA",
                                            "Failed Subjects",
                                        ].map((h) => (
                                            <th key={h} style={S.th}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {toppers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                style={{
                                                    ...S.td,
                                                    textAlign: "center",
                                                    color: "#444",
                                                    padding: "2rem",
                                                }}
                                            >
                                                No data — apply filters and
                                                switch tabs
                                            </td>
                                        </tr>
                                    ) : (
                                        toppers.map((t, i) => (
                                            <tr key={i} style={S.row}>
                                                <td style={S.td}>
                                                    <span
                                                        style={{
                                                            color:
                                                                t.rank <= 3
                                                                    ? ACCENT
                                                                    : "#555",
                                                            fontWeight:
                                                                t.rank <= 3
                                                                    ? "700"
                                                                    : "400",
                                                        }}
                                                    >
                                                        #{t.rank}
                                                    </span>
                                                </td>
                                                <td style={S.td}>
                                                    <code
                                                        style={{
                                                            color: ACCENT,
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        {t.ht_no}
                                                    </code>
                                                </td>
                                                <td style={S.td}>
                                                    {t.section}
                                                </td>
                                                <td style={S.tdNum}>
                                                    {t.year}
                                                </td>
                                                <td style={S.tdNum}>
                                                    <strong
                                                        style={{
                                                            color: ACCENT,
                                                        }}
                                                    >
                                                        {t.sgpa ?? t.cgpa}
                                                    </strong>
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.tdNum,
                                                        color:
                                                            t.failed_subjects >
                                                            0
                                                                ? "#ff5252"
                                                                : "#00e5a0",
                                                    }}
                                                >
                                                    {t.failed_subjects}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── SUBJECT ANALYSIS ── */}
                {!loading && activeTab === "subjects" && (
                    <section>
                        <h2 style={S.h2}>
                            Subject Analysis{" "}
                            {semFilter && `— Semester ${semFilter}`}
                        </h2>
                        <div style={S.tableWrap}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        {[
                                            "Code",
                                            "Subject",
                                            "Sem",
                                            "Students",
                                            "Avg",
                                            "Highest",
                                            "Lowest",
                                            "Pass",
                                            "Fail",
                                            "Pass %",
                                        ].map((h) => (
                                            <th key={h} style={S.th}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                style={{
                                                    ...S.td,
                                                    textAlign: "center",
                                                    color: "#444",
                                                    padding: "2rem",
                                                }}
                                            >
                                                No data
                                            </td>
                                        </tr>
                                    ) : (
                                        subjects.map((s, i) => (
                                            <tr key={i} style={S.row}>
                                                <td style={S.td}>
                                                    <code
                                                        style={{
                                                            color: ACCENT,
                                                            fontSize: "0.72rem",
                                                        }}
                                                    >
                                                        {s.course_code}
                                                    </code>
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.td,
                                                        maxWidth: "180px",
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                    }}
                                                >
                                                    {s.course_name}
                                                </td>
                                                <td style={S.tdNum}>
                                                    {s.semester}
                                                </td>
                                                <td style={S.tdNum}>
                                                    {s.total_students}
                                                </td>
                                                <td style={S.tdNum}>
                                                    {s.avg_marks}
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.tdNum,
                                                        color: "#00e5a0",
                                                    }}
                                                >
                                                    {s.highest_marks}
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.tdNum,
                                                        color: "#ff5252",
                                                    }}
                                                >
                                                    {s.lowest_marks}
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.tdNum,
                                                        color: "#00e5a0",
                                                    }}
                                                >
                                                    {s.pass_count}
                                                </td>
                                                <td
                                                    style={{
                                                        ...S.tdNum,
                                                        color: "#ff5252",
                                                    }}
                                                >
                                                    {s.fail_count}
                                                </td>
                                                <td style={S.tdNum}>
                                                    {s.pass_percentage}%
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── CGPA DISTRIBUTION ── */}
                {!loading && activeTab === "cgpa" && cgpaDist && (
                    <section>
                        <h2 style={S.h2}>
                            CGPA Distribution — {cgpaDist.total_students}{" "}
                            Students
                        </h2>
                        <div style={{ marginTop: "1.5rem" }}>
                            {(() => {
                                const max = Math.max(
                                    ...cgpaDist.distribution.map(
                                        (d) => d.count,
                                    ),
                                    1,
                                );
                                return cgpaDist.distribution
                                    .filter((d) => d.count > 0 || true)
                                    .map(({ range, count }) => {
                                        const pct = Math.round(
                                            (count / max) * 100,
                                        );
                                        return (
                                            <div
                                                key={range}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.8rem",
                                                    marginBottom: "0.4rem",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "72px",
                                                        textAlign: "right",
                                                        color: "#555",
                                                        fontSize: "0.68rem",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {range}
                                                </div>
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        background: "#13161e",
                                                        borderRadius: "3px",
                                                        height: "18px",
                                                        position: "relative",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: `${pct}%`,
                                                            height: "100%",
                                                            background:
                                                                count === 0
                                                                    ? "transparent"
                                                                    : `${ACCENT}88`,
                                                            borderRadius: "3px",
                                                            transition:
                                                                "width 0.3s ease",
                                                            minWidth:
                                                                count > 0
                                                                    ? "4px"
                                                                    : "0",
                                                        }}
                                                    />
                                                </div>
                                                <div
                                                    style={{
                                                        width: "28px",
                                                        color:
                                                            count > 0
                                                                ? ACCENT
                                                                : "#333",
                                                        fontSize: "0.72rem",
                                                        fontWeight: "600",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {count}
                                                </div>
                                            </div>
                                        );
                                    });
                            })()}
                        </div>

                        {/* Summary buckets */}
                        <div style={{ ...S.cardRow, marginTop: "2rem" }}>
                            {[
                                {
                                    label: "9.0 – 10.0",
                                    range: ["9.0-9.5", "9.5-10.0"],
                                    color: "#00e5a0",
                                },
                                {
                                    label: "8.0 – 9.0",
                                    range: ["8.0-8.5", "8.5-9.0"],
                                    color: "#4fc3f7",
                                },
                                {
                                    label: "7.0 – 8.0",
                                    range: ["7.0-7.5", "7.5-8.0"],
                                    color: ACCENT,
                                },
                                {
                                    label: "Below 7.0",
                                    range: null,
                                    color: "#ff5252",
                                },
                            ].map((bucket) => {
                                let count;
                                if (bucket.range) {
                                    count = cgpaDist.distribution
                                        .filter((d) =>
                                            bucket.range.includes(d.range),
                                        )
                                        .reduce((a, d) => a + d.count, 0);
                                } else {
                                    const above7 = cgpaDist.distribution
                                        .filter(
                                            (d) => parseFloat(d.range) >= 7.0,
                                        )
                                        .reduce((a, d) => a + d.count, 0);
                                    count = cgpaDist.total_students - above7;
                                }
                                return (
                                    <div key={bucket.label} style={S.statCard}>
                                        <div
                                            style={{
                                                color: "#555",
                                                fontSize: "0.62rem",
                                                letterSpacing: "0.1em",
                                            }}
                                        >
                                            {bucket.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "1.5rem",
                                                fontWeight: "700",
                                                color: bucket.color,
                                            }}
                                        >
                                            {count}
                                        </div>
                                        <div
                                            style={{
                                                color: "#444",
                                                fontSize: "0.62rem",
                                            }}
                                        >
                                            {cgpaDist.total_students > 0
                                                ? `${((count / cgpaDist.total_students) * 100).toFixed(1)}%`
                                                : "—"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const S = {
    shell: {
        display: "flex",
        minHeight: "100vh",
        background: "#0d0f14",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#c8c8c8",
    },
    sidebar: {
        width: "230px",
        minHeight: "100vh",
        background: "#10131a",
        borderRight: "1px solid #1e2130",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 0",
        flexShrink: 0,
    },
    logo: {
        fontSize: "0.85rem",
        fontWeight: "700",
        padding: "0 1.2rem",
        marginBottom: "1.5rem",
        letterSpacing: "0.05em",
    },
    navBtn: (active) => ({
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "0.65rem 1.2rem",
        background: active ? `${ACCENT}18` : "transparent",
        border: "none",
        borderLeft: active ? `2px solid ${ACCENT}` : "2px solid transparent",
        color: active ? ACCENT : "#555",
        fontSize: "0.75rem",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        letterSpacing: "0.05em",
    }),
    select: {
        width: "100%",
        background: "#1a1d24",
        border: "1px solid #2a2d36",
        color: "#aaa",
        padding: "0.35rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.72rem",
        fontFamily: "inherit",
        cursor: "pointer",
    },
    filterLabel: {
        color: "#333",
        fontSize: "0.62rem",
        letterSpacing: "0.14em",
        marginBottom: "0.2rem",
    },
    exportBtn: {
        padding: "0.4rem 0.9rem",
        background: `${ACCENT}22`,
        border: `1px solid ${ACCENT}55`,
        color: ACCENT,
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "0.72rem",
        fontFamily: "inherit",
    },
    main: { flex: 1, padding: "2rem 2.5rem", overflowY: "auto" },
    h2: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#e0e0e0",
        letterSpacing: "0.05em",
        margin: "0 0 1.2rem 0",
    },
    loadText: { color: "#333", fontSize: "0.8rem", padding: "2rem" },
    errorBox: {
        background: "#ff4d4d18",
        border: "1px solid #ff4d4d44",
        color: "#ff7070",
        borderRadius: "4px",
        padding: "0.6rem 0.8rem",
        fontSize: "0.78rem",
        marginBottom: "1rem",
    },
    cardRow: {
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        marginTop: "0.5rem",
    },
    statCard: {
        background: "#13161e",
        border: "1px solid #1e2130",
        borderRadius: "6px",
        padding: "0.8rem 1.2rem",
        minWidth: "100px",
    },
    tableWrap: {
        overflowX: "auto",
        borderRadius: "6px",
        border: "1px solid #1e2130",
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
    th: {
        background: "#13161e",
        color: "#555",
        padding: "0.6rem 0.8rem",
        textAlign: "left",
        fontWeight: "500",
        letterSpacing: "0.08em",
        fontSize: "0.67rem",
        whiteSpace: "nowrap",
        borderBottom: "1px solid #1e2130",
    },
    td: {
        padding: "0.55rem 0.8rem",
        borderBottom: "1px solid #181b22",
        color: "#bbb",
        whiteSpace: "nowrap",
    },
    tdNum: {
        padding: "0.55rem 0.8rem",
        borderBottom: "1px solid #181b22",
        color: "#bbb",
        textAlign: "right",
        whiteSpace: "nowrap",
    },
    row: { background: "transparent" },
    sectionLabel: {
        color: "#444",
        fontSize: "0.65rem",
        letterSpacing: "0.14em",
        marginBottom: "0.8rem",
    },
};
