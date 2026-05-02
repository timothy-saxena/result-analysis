const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const baseDir = path.join(__dirname, "../../database/data");
// Extract semester from filename (1R.xlsx → 1)
const getSemester = (filename) => {
    const match = filename.match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
};

// Extract batch from folder name (22_Batch → 22)
const getBatch = (folder) => {
    const match = folder.match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
};

const run = () => {
    const batches = fs.readdirSync(baseDir);

    for (const batchFolder of batches) {
        const batchPath = path.join(baseDir, batchFolder);

        if (!fs.statSync(batchPath).isDirectory()) continue;

        const batch = getBatch(batchFolder);

        console.log(`\n📦 Processing batch: ${batch}`);

        const files = fs.readdirSync(batchPath);

        for (const file of files) {
            if (!file.endsWith(".xlsx")) continue;

            const semester = getSemester(file);
            if (!semester) continue;

            const filePath = path.join(batchPath, file);

            console.log(`📂 ${file} → Sem ${semester}, Batch ${batch}`);

            execSync(
                `node scripts/import.js "${filePath}" ${semester} ${batch}`,
                { stdio: "inherit" },
            );
        }
    }

    console.log("\n🎉 ALL DATA IMPORTED");
};

run();
