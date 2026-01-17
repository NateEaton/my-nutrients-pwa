import fs from 'fs/promises';
import path from 'path';

const RESTORE_FILE = 'migration/nutrients-restore-2025-12-24-cleaned-2026-01-07.json';
const BACKUP_FILE = 'migration/calcium-tracker-backup-2025-12-24-merged-clean.json';
const OUTPUT_FILE = 'migration/calcium-comparison-report.md';

async function loadJson(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}

function normalizeEntries(entries, fileType) {
    // Returns a map of Date -> Array of Entries
    // Entry format: { name, calcium, originalEntry }
    const normalized = new Map();

    for (const [date, items] of Object.entries(entries)) {
        const dayItems = items.map(item => {
            let calcium = 0;
            let name = item.name;
            let serving = item.servingQuantity + ' ' + item.servingUnit;

            if (fileType === 'restore') {
                // Restore file has nested nutrients
                calcium = item.nutrients?.calcium || 0;
            } else {
                // Backup file has direct calcium property
                calcium = item.calcium || 0;
            }

            // Round calcium to match backup file precision (usually integer)
            calcium = Math.round(calcium);

            return {
                name,
                calcium,
                serving,
                original: item
            };
        });

        // Sort for easier comparison
        dayItems.sort((a, b) => b.calcium - a.calcium || a.name.localeCompare(b.name));

        normalized.set(date, dayItems);
    }
    return normalized;
}

function generateSideBySide(date, newItems, oldItems) {
    let rows = [];
    const maxRows = Math.max(newItems.length, oldItems.length);

    rows.push(`\n#### Date: ${date}`);
    rows.push(`| New (Restore) | Ca | Old (Backup) | Ca |`);
    rows.push(`|---|---|---|---|`);

    // Simple matching strategy: Greedily match by exact Calcium + Name, then Calcium
    // Remaining items are unmatched

    const newPool = [...newItems];
    const oldPool = [...oldItems];
    const pairs = [];

    // 1. Exact Match (Name & Calcium)
    for (let i = 0; i < newPool.length; i++) {
        const item = newPool[i];
        const matchIndex = oldPool.findIndex(o => o.calcium === item.calcium && o.name === item.name);
        if (matchIndex !== -1) {
            pairs.push({ new: item, old: oldPool[matchIndex] });
            newPool[i] = null;
            oldPool.splice(matchIndex, 1);
        }
    }

    // 2. Loose Match (Calcium only) - useful for renamed items
    for (let i = 0; i < newPool.length; i++) {
        const item = newPool[i];
        if (!item) continue;
        const matchIndex = oldPool.findIndex(o => o.calcium === item.calcium);
        if (matchIndex !== -1) {
            pairs.push({ new: item, old: oldPool[matchIndex] });
            newPool[i] = null;
            oldPool.splice(matchIndex, 1);
        }
    }

    // Collect remaining
    const remainingNew = newPool.filter(i => i !== null);

    // Sort matched pairs by calcium desc
    pairs.sort((a, b) => (b.new?.calcium || 0) - (a.new?.calcium || 0));

    // Print Pairs
    for (const pair of pairs) {
        rows.push(`| ${pair.new.name} (${pair.new.serving}) | ${pair.new.calcium} | ${pair.old.name} (${pair.old.serving}) | ${pair.old.calcium} |`);
    }

    // Print Mismatches (Remaining)
    const maxRemaining = Math.max(remainingNew.length, oldPool.length);
    for (let i = 0; i < maxRemaining; i++) {
        const n = remainingNew[i];
        const o = oldPool[i];
        const nStr = n ? `${n.name} (${n.serving})` : '';
        const nCa = n ? n.calcium : '';
        const oStr = o ? `${o.name} (${o.serving})` : '';
        const oCa = o ? o.calcium : '';
        rows.push(`| **${nStr}** | **${nCa}** | **${oStr}** | **${oCa}** |`);
    }

    return rows.join('\n');
}

async function main() {
    console.log('Loading files...');
    const restoreData = await loadJson(RESTORE_FILE);
    const backupData = await loadJson(BACKUP_FILE);

    console.log('Normalizing data...');
    const newMap = normalizeEntries(restoreData.journalEntries, 'restore');
    const oldMap = normalizeEntries(backupData.journalEntries, 'backup');

    const allDates = new Set([...newMap.keys(), ...oldMap.keys()]);
    const sortedDates = Array.from(allDates).sort();

    let summaryRows = [];
    let detailedSections = [];
    let matchCount = 0;
    let mismatchCount = 0;

    summaryRows.push(`# Calcium Data Comparison Report`);
    summaryRows.push(`Generated: ${new Date().toLocaleString()}`);
    summaryRows.push(`\n## Summary\n`);
    summaryRows.push(`| Date | Status | New Total | Old Total | Diff |`);
    summaryRows.push(`|---|---|---|---|---|`);

    for (const date of sortedDates) {
        const newItems = newMap.get(date) || [];
        const oldItems = oldMap.get(date) || [];

        const newTotal = newItems.reduce((sum, item) => sum + item.calcium, 0);
        const oldTotal = oldItems.reduce((sum, item) => sum + item.calcium, 0);
        const diff = newTotal - oldTotal;

        // Check strict equality of contents (bag of items check)
        // We can just check if newTotal == oldTotal for a loose check, but user asked for "basically match"
        // Let's stick strict first: if totals match, it's likely a match because we round integers.
        // However, user specifically asked: "summary of all the dates that basically match... For dates with differences, that's really where I want to see what things look like side-by-side"

        let status = 'MATCH';
        if (diff !== 0) {
            status = 'MISMATCH';
        } else {
            // Double check items match
            if (newItems.length !== oldItems.length) {
                status = 'COUNT_MISMATCH'; // Total same, but different item count? Rare but possible
            }
        }

        if (status === 'MATCH') {
            matchCount++;
            // Optional: Commented out to reduce noise, but can be enabled
            // summaryRows.push(`| ${date} | ✅ Match | ${newTotal} | ${oldTotal} | 0 |`);
        } else {
            mismatchCount++;
            summaryRows.push(`| ${date} | ❌ **${status}** | ${newTotal} | ${oldTotal} | ${diff > 0 ? '+' + diff : diff} |`);
            detailedSections.push(generateSideBySide(date, newItems, oldItems));
        }
    }

    summaryRows.push(`\n**Matches:** ${matchCount} | **Mismatches:** ${mismatchCount}`);

    const reportContent = [
        ...summaryRows,
        '\n## Detailed Differences (Mismatches Only)',
        ...detailedSections
    ].join('\n');

    await fs.writeFile(OUTPUT_FILE, reportContent);
    console.log(`Report generated at: ${OUTPUT_FILE}`);
}

main().catch(console.error);
