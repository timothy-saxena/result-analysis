const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
/* app.use(cors({ origin: 'http://localhost:5173' })); // Vite default port
 */
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://result-analysis-timothy-saxenas-projects.vercel.app",
            "https://result-analysis-three.vercel.app",
        ],
    }),
);
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/student", require("./routes/student"));
app.use("/api/faculty", require("./routes/faculty"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/", (req, res) => res.json({ status: "Result Analysis API running" }));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`),
);
