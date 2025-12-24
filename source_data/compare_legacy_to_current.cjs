const fs = require('fs');
const path = require('path');

// Paths
const LEGACY_CSV = path.join(__dirname, 'usda-abridged-pub.csv');
const APP_DB_JS = path.join(__dirname, '../src/lib/data/foodDatabaseData.js');
const UPSTREAM_JSON = path.join(__dirname, 'mastered-nutrient-data.json');

// Normalization function (simplified version of curator)
function normalizeName(originalName) {
    if (!originalName) return "";
    let norm = originalName.toLowerCase();
    norm = norm.replace(/\s+/g, " ")
        .replace(/\s*,\s*/g, ", ")
        .replace(/,+/g, ",")
        .replace(/,\s*$/g, "")
        .replace(/^\s*,/g, "")
        .trim();
    return norm;
}

// 1. Load Legacy Data
console.log('Loading Legacy Data...');
const legacyFoods = [];
const legacyContent = fs.readFileSync(LEGACY_CSV, 'utf-8');
const lines = legacyContent.split(/\r?\n/).filter(l => l.trim().length > 0);
// Skip header
const header = lines[0];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parse (handling quotes)
    const parts = [];
    let current = '';
    let inQuote = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.trim());

    if (parts.length >= 2) {
        const name = parts[1].replace(/^"|"$/g, '');
        const measure = parts[2] ? parts[2].replace(/^"|"$/g, '') : '';
        legacyFoods.push({ name, measure, normName: normalizeName(name) });
    }
}
console.log(`Loaded ${legacyFoods.length} legacy foods.`);

// 2. Load App DB
console.log('Loading App Database...');
const appContent = fs.readFileSync(APP_DB_JS, 'utf-8');
// Extract the JSON array
const jsonMatch = appContent.match(/export const DB = (\[[\s\S]*?\]);/);
if (!jsonMatch) {
    console.error('Failed to parse App DB JS');
    process.exit(1);
}
const appDB = JSON.parse(jsonMatch[1]);
console.log(`Loaded ${appDB.length} app foods.`);

// Create lookup for App DB
// App DB uses minified keys: n (name)
const appLookup = new Set();
appDB.forEach(f => {
    appLookup.add(normalizeName(f.n));
});

// 3. Load Upstream Data
console.log('Loading Upstream Data (this may take a moment)...');
let upstreamDB = [];
try {
    if (fs.existsSync(UPSTREAM_JSON)) {
        const upstreamContent = fs.readFileSync(UPSTREAM_JSON, 'utf-8');
        const upstreamData = JSON.parse(upstreamContent);
        upstreamDB = upstreamData.foods || upstreamData; // structure might vary
        if (!Array.isArray(upstreamDB)) upstreamDB = [];
    } else {
        console.log('Upstream file not found at expected path.');
    }
} catch (e) {
    console.error('Error loading upstream data:', e.message);
}
console.log(`Loaded ${upstreamDB.length} upstream foods.`);

const upstreamLookup = new Map(); // NormName -> FoodObject
upstreamDB.forEach(f => {
    upstreamLookup.set(normalizeName(f.name), f);
});

// 4. Comparison
console.log('\n--- Comparing ---');
const foundInApp = [];
const missingInApp = [];
const missingInAppButFoundUpstream = [];
const trulyMissing = [];

legacyFoods.forEach(lFood => {
    if (appLookup.has(lFood.normName)) {
        foundInApp.push(lFood);
    } else {
        missingInApp.push(lFood);
        if (upstreamLookup.has(lFood.normName)) {
            missingInAppButFoundUpstream.push({
                legacy: lFood,
                upstream: upstreamLookup.get(lFood.normName)
            });
        } else {
            // Try fuzzy match or finding strictly CONTAINED name?
            // Let's try to see if legacy name is a substring of upstream or vice versa?
            // Actually, let's stick to normalized match for now, maybe add partial match later.
            trulyMissing.push(lFood);
        }
    }
});

console.log(`\nSummary:`);
console.log(`Legacy Foods Total: ${legacyFoods.length}`);
console.log(`Found in Current App: ${foundInApp.length}`);
console.log(`Missing in Current App: ${missingInApp.length}`);
console.log(`  -> Found in Upstream (Restorable): ${missingInAppButFoundUpstream.length}`);
console.log(`  -> Not Found in Upstream (Exact Match): ${trulyMissing.length}`);

// Analysis of Restorable
if (missingInAppButFoundUpstream.length > 0) {
    console.log('\n--- Foods Missing in App but Present in Upstream (Examples) ---');
    missingInAppButFoundUpstream.slice(0, 20).forEach(item => {
        console.log(`Legacy: "${item.legacy.name}"`);
        console.log(`  Upstream Match: "${item.upstream.name}" (ID: ${item.upstream.id || item.upstream.appId})`);
    });
    if (missingInAppButFoundUpstream.length > 20) console.log(`... and ${missingInAppButFoundUpstream.length - 20} more.`);
}

// Analysis of Truly Missing
if (trulyMissing.length > 0) {
    console.log('\n--- Foods Not Found in Upstream (Examples of Mismatch) ---');
    trulyMissing.slice(0, 10).forEach(f => {
        console.log(`"${f.name}"`);
    });
}

// Write detailed report
const reportPath = path.join(__dirname, 'legacy_comparison_report.json');
const report = {
    summary: {
        totalLegacy: legacyFoods.length,
        foundInApp: foundInApp.length,
        missingInApp: missingInApp.length,
        restorable: missingInAppButFoundUpstream.length,
        trulyMissing: trulyMissing.length
    },
    restorable: missingInAppButFoundUpstream.map(i => ({ legacy: i.legacy.name, upstream: i.upstream.name })),
    trulyMissing: trulyMissing.map(f => f.name)
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nDetailed report written to ${reportPath}`);
