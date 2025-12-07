#!/usr/bin/env node

/**
 * Apple Health to Calcium Tracker Converter - Enhanced Version
 * 
 * Converts Apple Health XML export data to Calcium Tracker backup format
 * Uses CustomFoods.json for intelligent food matching
 * 
 * Usage:
 *   node calcium-converter.js input.xml [CustomFoods.json] [output.json]
 *   node calcium-converter.js export.xml CustomFoods.json calcium-backup.json
 * 
 * If CustomFoods.json is not provided, uses basic conversion logic.
 * If no output file is specified, will create a timestamped file automatically.
 */

const fs = require('fs');
const path = require('path');

class CalciumConverter {
    constructor() {
        this.version = '2.0.0';
        this.customFoods = [];
        this.dailyMatchCounts = {}; // Track matches per day per amount
    }

    /**
     * Main conversion function
     * @param {string} inputFile - Path to Apple Health XML export
     * @param {string} customFoodsFile - Path to CustomFoods.json (optional)
     * @param {string} outputFile - Path for output JSON file (optional)
     */
    async convert(inputFile, customFoodsFile, outputFile) {
        try {
            console.log('🍎 Apple Health → 🥛 Calcium Tracker Converter v' + this.version);
            console.log('================================================\n');

            // Validate input file
            if (!fs.existsSync(inputFile)) {
                throw new Error(`Input file not found: ${inputFile}`);
            }

            // Load custom foods if provided
            if (customFoodsFile && fs.existsSync(customFoodsFile)) {
                console.log(`📚 Loading custom foods: ${customFoodsFile}`);
                this.loadCustomFoods(customFoodsFile);
            } else {
                console.log('📚 No custom foods file provided, using basic conversion');
            }

            console.log(`📖 Reading XML file: ${inputFile}`);
            const xmlData = fs.readFileSync(inputFile, 'utf8');

            console.log('🔍 Extracting calcium records...');
            const records = this.extractCalciumRecords(xmlData);

            if (records.length === 0) {
                throw new Error('No calcium records found in the XML file. Make sure this is a Health export with calcium data.');
            }

            console.log(`✅ Found ${records.length} calcium records`);

            console.log('🔄 Converting to backup format...');
            const backupData = this.createBackupFormat(records);

            // Generate output filename if not provided
            if (!outputFile) {
                const now = new Date();
                const timestamp = now.toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '-');
                outputFile = `calcium-backup-${timestamp}.json`;
            }

            console.log(`💾 Writing backup file: ${outputFile}`);
            fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2), 'utf8');

            // Display statistics
            this.displayStats(records, backupData);

            console.log(`\n🎉 Conversion complete! Backup saved to: ${outputFile}`);
            console.log('\n📱 To restore in Calcium Tracker:');
            console.log('   1. Open the Calcium Tracker app');
            console.log('   2. Go to the hamburger menu (☰)');
            console.log('   3. Select "Restore Backup"');
            console.log('   4. Choose your backup file');

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * Load custom foods from JSON file
     * @param {string} customFoodsFile - Path to CustomFoods.json
     */
    loadCustomFoods(customFoodsFile) {
        try {
            const customFoodsData = JSON.parse(fs.readFileSync(customFoodsFile, 'utf8'));
            this.customFoods = customFoodsData.customFoods || [];
            console.log(`✅ Loaded ${this.customFoods.length} custom foods`);
        } catch (error) {
            console.warn(`⚠️ Failed to load custom foods: ${error.message}`);
            this.customFoods = [];
        }
    }

    /**
     * Extract calcium records from Apple Health XML
     * @param {string} xmlText - Raw XML content
     * @returns {Array} Array of calcium records
     */
    extractCalciumRecords(xmlText) {
        const records = [];
        
        // Find all calcium records using regex
        const recordPattern = /<Record[^>]*type="HKQuantityTypeIdentifierDietaryCalcium"[^>]*>/g;
        let match;

        while ((match = recordPattern.exec(xmlText)) !== null) {
            const recordTag = match[0];
            
            // Extract attributes
            const valueMatch = recordTag.match(/value="([^"]+)"/);
            const startDateMatch = recordTag.match(/startDate="([^"]+)"/);
            const creationDateMatch = recordTag.match(/creationDate="([^"]+)"/);
            
            if (valueMatch && startDateMatch) {
                records.push({
                    value: parseFloat(valueMatch[1]),
                    startDate: startDateMatch[1],
                    creationDate: creationDateMatch ? creationDateMatch[1] : null
                });
            }
        }

        // Sort by date for consistency
        records.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        return records;
    }

    /**
     * Parse serving information from measure string
     * @param {string} measure - Measure string like "1 Cup", "0.75 Cup", "2 Tablespoons"
     * @returns {Object} Object with quantity and unit
     */
    parseServingInfo(measure) {
        if (!measure) return { quantity: 1, unit: "serving" };
        
        // Match patterns like "1 Cup", "0.75 Cup", "2 Tablespoons", "21 Grams"
        const match = measure.match(/^([\d.]+)\s+(.+)$/);
        if (match) {
            return {
                quantity: parseFloat(match[1]),
                unit: match[2]
            };
        }
        
        // If no number found, assume quantity of 1
        return { quantity: 1, unit: measure };
    }

    /**
     * Find matching custom food for a calcium amount
     * @param {number} calciumAmount - Calcium amount to match
     * @param {string} date - Date for tracking daily matches
     * @returns {Object|null} Matching custom food or null
     */
    findMatchingCustomFood(calciumAmount, date) {
        // Special case: 24mg = Flax Seed with serving quantity 2
        if (calciumAmount === 24) {
            const flaxSeed = this.customFoods.find(food => 
                food.name.toLowerCase().includes('flax seed') || food.calcium === 12
            );
            if (flaxSeed) {
                const serving = this.parseServingInfo(flaxSeed.measure);
                return {
                    food: flaxSeed,
                    servingQuantity: 2, // 2 tablespoons instead of 1
                    servingUnit: serving.unit
                };
            }
        }

        // Special case: 31mg = Zucchini
        if (calciumAmount === 31) {
            return {
                food: {
                    id: 999, // Special ID for non-custom food
                    name: "Squash, summer, zucchini, includes skin, cooked, boiled, drained",
                    calcium: 31,
                    measure: "1 Cup",
                    isCustom: false
                },
                servingQuantity: 1,
                servingUnit: "Cup"
            };
        }

        // Special case: 15.5mg = Half serving of Zucchini
        if (calciumAmount === 15.5) {
            return {
                food: {
                    id: 999,
                    name: "Squash, summer, zucchini, includes skin, cooked, boiled, drained",
                    calcium: 31,
                    measure: "1 Cup",
                    isCustom: false
                },
                servingQuantity: 0.5,
                servingUnit: "Cup"
            };
        }

        // Special case: 50mg = Mistakenly entered eggs (should be 28mg)
        if (calciumAmount === 50) {
            return {
                food: {
                    id: 998,
                    name: "Egg, whole",
                    calcium: 28,
                    measure: "1 Large",
                    isCustom: false
                },
                servingQuantity: 1,
                servingUnit: "Large",
                note: "Originally entered as 50mg, corrected to 28mg per egg"
            };
        }

        // Find exact matches in custom foods
        const exactMatches = this.customFoods.filter(food => food.calcium === calciumAmount);
        
        if (exactMatches.length === 0) {
            return null; // No match found
        }

        // Initialize daily tracking for this date and amount
        const trackingKey = `${date}-${calciumAmount}`;
        if (!this.dailyMatchCounts[trackingKey]) {
            this.dailyMatchCounts[trackingKey] = 0;
        }

        // Special logic for 300mg
        if (calciumAmount === 300) {
            const matchIndex = this.dailyMatchCounts[trackingKey];
            this.dailyMatchCounts[trackingKey]++;

            if (matchIndex === 0) {
                // First match: Calcium Supplement
                const supplement = this.customFoods.find(food => food.id === 1);
                if (supplement) {
                    const serving = this.parseServingInfo(supplement.measure);
                    return {
                        food: supplement,
                        servingQuantity: serving.quantity,
                        servingUnit: serving.unit
                    };
                }
                return null;
            } else if (matchIndex === 1) {
                // Second match: Carnation breakfast drink
                const carnation = this.customFoods.find(food => food.id === 7);
                if (carnation) {
                    const serving = this.parseServingInfo(carnation.measure);
                    return {
                        food: carnation,
                        servingQuantity: serving.quantity,
                        servingUnit: serving.unit
                    };
                }
                return null;
            } else {
                // Third+ match: User-entered amount
                return null;
            }
        }

        // For other amounts with multiple matches
        if (exactMatches.length > 1) {
            const matchIndex = this.dailyMatchCounts[trackingKey];
            this.dailyMatchCounts[trackingKey]++;

            if (matchIndex < exactMatches.length) {
                // Sort by ID to ensure consistent ordering
                exactMatches.sort((a, b) => a.id - b.id);
                const selectedFood = exactMatches[matchIndex];
                const serving = this.parseServingInfo(selectedFood.measure);
                return {
                    food: selectedFood,
                    servingQuantity: serving.quantity,
                    servingUnit: serving.unit
                };
            } else {
                // Exceeded available matches: User-entered amount
                return null;
            }
        }

        // Single exact match
        this.dailyMatchCounts[trackingKey]++;
        const serving = this.parseServingInfo(exactMatches[0].measure);
        return {
            food: exactMatches[0],
            servingQuantity: serving.quantity,
            servingUnit: serving.unit
        };
    }

    /**
     * Create Calcium Tracker backup format
     * @param {Array} records - Calcium records from Health export
     * @returns {Object} Backup data in Calcium Tracker format
     */
    createBackupFormat(records) {
        // Start with all custom foods from the JSON file
        const customFoods = [...this.customFoods];
        
        // Add the default "User-entered amount" custom food
        const userEnteredFood = {
            id: this.getNextId(customFoods),
            name: "User-entered amount",
            calcium: 100,
            measure: "measure",
            dateAdded: records.length > 0 ? this.convertToISO(records[0].startDate) : new Date().toISOString(),
            isCustom: true
        };
        customFoods.push(userEnteredFood);

        // Add non-custom foods that might be referenced
        const nonCustomFoods = [
            {
                id: 999,
                name: "Squash, summer, zucchini, includes skin, cooked, boiled, drained",
                calcium: 31,
                measure: "1 Cup",
                isCustom: false
            },
            {
                id: 998,
                name: "Egg, whole",
                calcium: 28,
                measure: "1 Large",
                isCustom: false
            }
        ];

        // Group records by date
        const recordsByDate = this.groupRecordsByDate(records);

        // Convert to journal entries
        const journalEntries = {};
        let matchStats = {
            customMatches: 0,
            userEntered: 0,
            specialCases: 0
        };

        Object.entries(recordsByDate).forEach(([date, dayRecords]) => {
            journalEntries[date] = dayRecords.map(record => {
                const timestamp = this.convertToISO(record.startDate);
                const match = this.findMatchingCustomFood(record.value, date);

                if (match) {
                    if (match.food.isCustom !== false) {
                        matchStats.customMatches++;
                    } else {
                        matchStats.specialCases++;
                    }

                    return {
                        name: match.food.name,
                        calcium: record.value, // Use actual recorded value
                        servingQuantity: match.servingQuantity,
                        servingUnit: match.servingUnit,
                        timestamp: timestamp,
                        isCustom: match.food.isCustom !== false,
                        customFoodId: match.food.isCustom !== false ? match.food.id : undefined,
                        note: match.note || undefined
                    };
                } else {
                    // No match found or exceeded daily limits: use User-entered amount
                    matchStats.userEntered++;
                    return {
                        name: "User-entered amount",
                        calcium: record.value,
                        servingQuantity: 1,
                        servingUnit: "measure",
                        timestamp: timestamp,
                        isCustom: true,
                        customFoodId: userEnteredFood.id
                    };
                }
            });
        });

        console.log(`\n🎯 Matching Statistics:`);
        console.log(`   Custom food matches: ${matchStats.customMatches}`);
        console.log(`   Special case matches: ${matchStats.specialCases}`);
        console.log(`   User-entered amounts: ${matchStats.userEntered}`);

        // Create complete backup structure
        return {
            metadata: {
                version: "1.0",
                createdAt: new Date().toISOString(),
                appVersion: "Daily Calcium Tracker v1.0"
            },
            preferences: {
                dailyGoal: 1500,
                sortSettings: {
                    sortBy: "time",
                    sortOrder: "desc"
                }
            },
            customFoods: customFoods.filter(food => food.isCustom !== false),
            journalEntries: journalEntries
        };
    }

    /**
     * Get next available ID for custom foods
     * @param {Array} customFoods - Existing custom foods
     * @returns {number} Next available ID
     */
    getNextId(customFoods) {
        const maxId = Math.max(...customFoods.map(food => food.id), 0);
        return maxId + 1;
    }

    /**
     * Extract date from datetime string
     * @param {string} dateTimeString - Date string from Health export
     * @returns {string} Date in YYYY-MM-DD format
     */
    extractDate(dateTimeString) {
        return dateTimeString.split(' ')[0];
    }

    /**
     * Convert Health date format to ISO
     * @param {string} dateTimeString - Date string from Health export
     * @returns {string} ISO formatted date string
     */
    convertToISO(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toISOString();
    }

    /**
     * Group records by date
     * @param {Array} records - Array of calcium records
     * @returns {Object} Records grouped by date
     */
    groupRecordsByDate(records) {
        const grouped = {};
        records.forEach(record => {
            const date = this.extractDate(record.startDate);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(record);
        });
        return grouped;
    }

    /**
     * Display conversion statistics
     * @param {Array} records - Original records
     * @param {Object} backupData - Converted backup data
     */
    displayStats(records, backupData) {
        const recordsByDate = this.groupRecordsByDate(records);
        const dates = Object.keys(recordsByDate).sort();
        
        const totalDays = dates.length;
        const totalEntries = records.length;
        const supplementCount = records.filter(r => r.value === 300).length;
        const userEntryCount = records.filter(r => r.value !== 300).length;
        
        let dateRange = "No data";
        if (dates.length > 0) {
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            dateRange = dates.length === 1 ? startDate : `${startDate} to ${endDate}`;
        }

        // Calculate some additional stats
        const avgPerDay = totalEntries / totalDays;
        const totalCalcium = records.reduce((sum, r) => sum + r.value, 0);
        const avgCalciumPerDay = totalCalcium / totalDays;

        console.log('\n📊 Conversion Statistics');
        console.log('========================');
        console.log(`📅 Date Range:           ${dateRange}`);
        console.log(`📆 Days with Data:       ${totalDays}`);
        console.log(`📝 Total Records:        ${totalEntries}`);
        console.log(`💊 Supplements (300mg):  ${supplementCount}`);
        console.log(`📊 Other Amounts:        ${userEntryCount}`);
        console.log(`📈 Average Entries/Day:  ${avgPerDay.toFixed(1)}`);
        console.log(`🥛 Total Calcium:        ${totalCalcium.toLocaleString()}mg`);
        console.log(`📊 Average Calcium/Day:  ${avgCalciumPerDay.toFixed(0)}mg`);
        console.log(`🍽️ Custom Foods Created: ${backupData.customFoods.length}`);
    }

    /**
     * Show usage information
     */
    showUsage() {
        console.log('🍎 Apple Health → 🥛 Calcium Tracker Converter v' + this.version);
        console.log('================================================\n');
        console.log('Usage:');
        console.log('  node calcium-converter.js <input.xml> [CustomFoods.json] [output.json]\n');
        console.log('Examples:');
        console.log('  node calcium-converter.js export.xml');
        console.log('  node calcium-converter.js export.xml CustomFoods.json');
        console.log('  node calcium-converter.js export.xml CustomFoods.json my-backup.json\n');
        console.log('Enhanced Features:');
        console.log('  • Intelligent food matching using CustomFoods.json');
        console.log('  • Smart daily matching logic (1st, 2nd, 3rd+ occurrences)');
        console.log('  • Special handling for common amounts (24mg, 31mg, 50mg)');
        console.log('  • Fallback to user-entered amounts when needed');
        console.log('\nConversion Rules:');
        console.log('  • 300mg: 1st=Supplement, 2nd=Carnation, 3rd+=User-entered');
        console.log('  • 24mg: Flax Seed (2 servings)');
        console.log('  • 31mg: Zucchini (1 Cup)');
        console.log('  • 50mg: Egg (corrected from mistaken entry)');
        console.log('  • Other amounts: Match to CustomFoods.json by calcium value');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        new CalciumConverter().showUsage();
        return;
    }

    if (args.includes('--version') || args.includes('-v')) {
        console.log('2.0.0');
        return;
    }

    const inputFile = args[0];
    let customFoodsFile = null;
    let outputFile = null;

    // Parse arguments - could be:
    // args[1] = CustomFoods.json or output.json
    // args[2] = output.json (if args[1] was CustomFoods.json)
    if (args.length >= 2) {
        if (args[1].toLowerCase().includes('customfoods') || args[1].endsWith('.json') && !args[1].includes('backup')) {
            customFoodsFile = args[1];
            outputFile = args[2] || null;
        } else {
            outputFile = args[1];
        }
    }

    const converter = new CalciumConverter();
    await converter.convert(inputFile, customFoodsFile, outputFile);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = CalciumConverter;