import fs from 'node:fs';
import path from 'node:path';

// --- ARGS PARSING ---
const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('Error: Missing arguments.');
    console.log('Usage: node update_nutrients.mjs <input_json_file> <input_csv_file> <output_json_file>');
    console.log('Example: node update_nutrients.mjs tracker.json protein_data.csv updated_tracker.json');
    process.exit(1);
}

const [INPUT_JSON_FILE, INPUT_CSV_FILE, OUTPUT_JSON_FILE] = args;

/**
 * Parses a standard CSV string into an array of objects.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    // Remove BOM if present
    if (lines[0].charCodeAt(0) === 0xFEFF) {
        lines[0] = lines[0].slice(1);
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = [];
        let currentVal = '';
        let inQuotes = false;

        // Handle quoted CSV values (e.g., "Yogurt, plain")
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal.trim());
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim());

        // Map headers to values
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}

try {
    console.log(`Reading JSON: ${INPUT_JSON_FILE}`);
    console.log(`Reading CSV:  ${INPUT_CSV_FILE}`);

    if (!fs.existsSync(INPUT_JSON_FILE)) {
        throw new Error(`Input JSON file not found: ${INPUT_JSON_FILE}`);
    }
    if (!fs.existsSync(INPUT_CSV_FILE)) {
        throw new Error(`Input CSV file not found: ${INPUT_CSV_FILE}`);
    }

    const rawJson = fs.readFileSync(INPUT_JSON_FILE, 'utf8');
    const rawCsv = fs.readFileSync(INPUT_CSV_FILE, 'utf8');

    const jsonData = JSON.parse(rawJson);
    const csvData = parseCSV(rawCsv);

    // Create a Lookup Map for protein: ID -> Protein per 1 serving unit
    const proteinMap = new Map();
    
    csvData.forEach(row => {
        const id = parseInt(row.id, 10);
        const protein = parseFloat(row.protein);
        
        // Only map if ID is valid and Protein is a number (not empty string or NaN)
        if (!isNaN(id) && !isNaN(protein)) {
            proteinMap.set(id, protein);
        }
    });

    console.log(`Loaded protein data for ${proteinMap.size} unique custom foods.`);

    // 1. Update Custom Food Definitions (The reference list)
    let definitionsUpdated = 0;
    if (jsonData.customFoods && Array.isArray(jsonData.customFoods)) {
        jsonData.customFoods.forEach(food => {
            if (proteinMap.has(food.id)) {
                if (!food.nutrients) food.nutrients = {};
                // Update the base definition
                food.nutrients.protein = proteinMap.get(food.id);
                definitionsUpdated++;
            }
        });
    }

    // 2. Update Journal Entries (The daily logs)
    let entriesUpdated = 0;
    if (jsonData.journalEntries) {
        // Iterate over every date key
        for (const dateKey in jsonData.journalEntries) {
            const dayEntries = jsonData.journalEntries[dateKey];
            
            if (Array.isArray(dayEntries)) {
                dayEntries.forEach(entry => {
                    // Check if entry uses a custom food ID that we have data for
                    if (entry.isCustom && entry.customFoodId && proteinMap.has(entry.customFoodId)) {
                        const proteinPerUnit = proteinMap.get(entry.customFoodId);
                        const qty = parseFloat(entry.servingQuantity) || 1;
                        
                        if (!entry.nutrients) entry.nutrients = {};
                        
                        // Calculate total protein for this entry: (Base Value * Quantity)
                        // Math.round to 2 decimals to avoid floating point math errors
                        entry.nutrients.protein = Math.round((proteinPerUnit * qty) * 100) / 100;
                        
                        entriesUpdated++;
                    }
                });
            }
        }
    }

    // Write output
    fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(jsonData, null, 2));

    console.log('------------------------------------------------');
    console.log('Update Complete.');
    console.log(`Custom Food Definitions updated: ${definitionsUpdated}`);
    console.log(`Journal Entries updated:         ${entriesUpdated}`);
    console.log(`Saved to:                        ${OUTPUT_JSON_FILE}`);
    console.log('------------------------------------------------');

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}