import xlsx from 'xlsx';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDatabase } from '../src/config/database.js';
import * as Pantone from '../src/models/pantone.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPREADSHEET_PATH = join(__dirname, '../../Roland VS300 Pantone COATED Library.xlsx');

// Check for --yes flag to skip confirmations
const AUTO_CONFIRM = process.argv.includes('--yes') || process.argv.includes('-y');

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Parse an Excel date value (serial number or string)
 * Returns YYYY-MM-DD string or null
 */
function parseExcelDate(value) {
  if (!value) return null;

  // If it's already a string in YYYY-MM-DD format
  if (typeof value === 'string') {
    const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return value.split('T')[0]; // Remove time component if present

    // Try MM/DD/YYYY format
    const usMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // If it's an Excel serial date (number)
  if (typeof value === 'number') {
    // Excel dates are days since 1900-01-01 (with a leap year bug)
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Validate a date and return validation result
 */
function validateDate(color) {
  if (!color.match_date) return { valid: true };

  const year = parseInt(color.match_date.split('-')[0]);
  const currentYear = new Date().getFullYear();

  // Future date
  if (year > currentYear) {
    return { valid: false, issue: 'future', year };
  }

  // Too old (< 2020) - likely a typo
  if (year < 2020) {
    // Suggest adding 20 years for 2000-2009 dates (e.g., 2002 -> 2022)
    const suggestion = year < 2010 ? year + 20 : null;
    return { valid: false, issue: 'too_old', year, suggestion };
  }

  return { valid: true };
}

/**
 * Parse a single sheet and extract color data
 */
function parseSheet(sheet, sheetName) {
  console.log(`  Processing sheet: ${sheetName}`);

  // Convert sheet to JSON (array of arrays)
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (data.length === 0) {
    console.log(`    ⚠️  Sheet is empty, skipping`);
    return [];
  }

  const colors = [];
  let skipped = 0;

  // Start from row 2 (skip header rows 0 and 1)
  // Row 0: BRANDPACK header
  // Row 1: Column headers (PAGE, PANTONE Name, CBW, TRANSFERFOLIE, SYDNEY)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];

    // Skip completely empty rows
    if (!row || row.every(cell => !cell)) continue;

    // Color name is in column 1 (second column)
    const name = row[1]?.toString().trim();

    // Skip if no name or doesn't look like a Pantone color
    if (!name || !name.toUpperCase().includes('PANTONE')) {
      skipped++;
      continue;
    }

    // Look for first date in columns 2, 3, 4 (CBW, TRANSFERFOLIE, SYDNEY)
    // These are Excel serial dates (numbers like 44705)
    let firstDate = null;
    let dateSource = null;
    const locations = ['CBW', 'TRANSFERFOLIE', 'SYDNEY'];

    for (let col = 2; col <= 4; col++) {
      if (row[col]) {
        firstDate = parseExcelDate(row[col]);
        if (firstDate) {
          dateSource = locations[col - 2];
          break;
        }
      }
    }

    const color = {
      name,
      color_data: {
        sheet: sheetName,
        original_date: firstDate,
        date_source: dateSource // Track which location had the date
      },
      status: firstDate ? 'matched' : 'not_matched',
      match_date: firstDate
    };

    colors.push(color);
  }

  console.log(`    ✓ Extracted ${colors.length} colors (skipped ${skipped} invalid rows)`);
  return colors;
}

/**
 * Group suspicious dates by issue type
 */
function groupSuspiciousDates(suspiciousDates) {
  const groups = {
    future: [],
    too_old_with_suggestion: [],
    too_old_no_suggestion: []
  };

  for (const item of suspiciousDates) {
    const { issue, year, suggestion } = item.validation;
    if (issue === 'future') {
      groups.future.push(item);
    } else if (issue === 'too_old') {
      if (suggestion) {
        groups.too_old_with_suggestion.push(item);
      } else {
        groups.too_old_no_suggestion.push(item);
      }
    }
  }

  return groups;
}

/**
 * Interactive confirmation for suspicious dates
 */
async function confirmSuspiciousDates(suspiciousDates, allColors) {
  console.log(`\n⚠️  Found ${suspiciousDates.length} dates that need review:`);

  const groups = groupSuspiciousDates(suspiciousDates);

  // Handle future dates
  if (groups.future.length > 0) {
    console.log(`\n❌ Future dates (${groups.future.length} colors):`);
    groups.future.slice(0, 5).forEach(({ color }) => {
      console.log(`   - ${color.name}: ${color.match_date}`);
    });
    if (groups.future.length > 5) {
      console.log(`   ... and ${groups.future.length - 5} more`);
    }

    const answer = AUTO_CONFIRM ? 'y' : await question('\nMark these as "not_matched" (remove dates)? (y/n): ');
    if (AUTO_CONFIRM) console.log('y (auto-confirmed)');
    if (answer.toLowerCase() === 'y') {
      groups.future.forEach(({ color }) => {
        color.status = 'not_matched';
        color.match_date = null;
      });
      console.log('   ✓ Dates removed');
    }
  }

  // Handle old dates with auto-correction suggestions
  if (groups.too_old_with_suggestion.length > 0) {
    console.log(`\n📅 Dates before 2010 (${groups.too_old_with_suggestion.length} colors):`);
    console.log('   These might be typos (e.g., 2002 instead of 2022)');

    groups.too_old_with_suggestion.slice(0, 5).forEach(({ color, validation }) => {
      console.log(`   - ${color.name}: ${color.match_date} → ${validation.suggestion}-${color.match_date.slice(5)}`);
    });
    if (groups.too_old_with_suggestion.length > 5) {
      console.log(`   ... and ${groups.too_old_with_suggestion.length - 5} more`);
    }

    const answer = AUTO_CONFIRM ? 'y' : await question('\nAuto-correct by adding 20 years (2002→2022, 2009→2029)? (y/n/review): ');
    if (AUTO_CONFIRM) console.log('y (auto-confirmed)');
    if (answer.toLowerCase() === 'y') {
      groups.too_old_with_suggestion.forEach(({ color, validation }) => {
        const [year, month, day] = color.match_date.split('-');
        color.match_date = `${validation.suggestion}-${month}-${day}`;
        color.color_data.corrected = true;
      });
      console.log('   ✓ Dates corrected');
    } else if (answer.toLowerCase() === 'review') {
      console.log('\n   Individual review:');
      for (const { color, validation } of groups.too_old_with_suggestion) {
        const ans = await question(`   ${color.name}: ${color.match_date} → ${validation.suggestion}-${color.match_date.slice(5)}? (y/n/skip): `);
        if (ans.toLowerCase() === 'y') {
          const [year, month, day] = color.match_date.split('-');
          color.match_date = `${validation.suggestion}-${month}-${day}`;
          color.color_data.corrected = true;
        } else if (ans.toLowerCase() === 'skip') {
          color.status = 'not_matched';
          color.match_date = null;
        }
      }
    }
  }

  // Handle old dates (2010-2019)
  if (groups.too_old_no_suggestion.length > 0) {
    console.log(`\n📅 Dates from 2010-2019 (${groups.too_old_no_suggestion.length} colors):`);

    groups.too_old_no_suggestion.slice(0, 5).forEach(({ color }) => {
      console.log(`   - ${color.name}: ${color.match_date}`);
    });
    if (groups.too_old_no_suggestion.length > 5) {
      console.log(`   ... and ${groups.too_old_no_suggestion.length - 5} more`);
    }

    const answer = AUTO_CONFIRM ? 'y' : await question('\nKeep these dates as-is? (y/n to remove): ');
    if (AUTO_CONFIRM) console.log('y (auto-confirmed - keeping dates)');
    if (answer.toLowerCase() === 'n') {
      groups.too_old_no_suggestion.forEach(({ color }) => {
        color.status = 'not_matched';
        color.match_date = null;
      });
      console.log('   ✓ Dates removed');
    } else {
      console.log('   ✓ Dates kept');
    }
  }
}

/**
 * Import colors directly to database
 */
async function importColors(colors) {
  console.log(`\n🚀 Importing ${colors.length} colors to database...`);

  try {
    const db = await getDatabase();
    const result = await Pantone.bulkCreateColors(db, colors);
    return result;
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊  Pantone Spreadsheet Import Tool');
  console.log('═══════════════════════════════════════════════════\n');

  // Check if file exists
  if (!fs.existsSync(SPREADSHEET_PATH)) {
    console.error(`❌ File not found: ${SPREADSHEET_PATH}`);
    rl.close();
    process.exit(1);
  }

  console.log(`📁 Reading spreadsheet: ${SPREADSHEET_PATH}\n`);

  // Read Excel file
  let workbook;
  try {
    workbook = xlsx.readFile(SPREADSHEET_PATH);
  } catch (error) {
    console.error(`❌ Failed to read Excel file: ${error.message}`);
    rl.close();
    process.exit(1);
  }

  const sheetNames = workbook.SheetNames;
  console.log(`📋 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}\n`);

  // Parse all sheets
  const allColors = [];
  for (const sheetName of sheetNames) {
    const colors = parseSheet(workbook.Sheets[sheetName], sheetName);
    allColors.push(...colors);
  }

  console.log(`\n✓ Extracted ${allColors.length} total colors from all sheets`);

  // Count matched vs not matched
  const matched = allColors.filter(c => c.status === 'matched').length;
  const notMatched = allColors.filter(c => c.status === 'not_matched').length;
  console.log(`  - Matched: ${matched}`);
  console.log(`  - Not matched: ${notMatched}`);

  // Validate dates
  const suspiciousDates = [];
  for (const color of allColors) {
    const validation = validateDate(color);
    if (!validation.valid) {
      suspiciousDates.push({ color, validation });
    }
  }

  // User confirmation for suspicious dates
  if (suspiciousDates.length > 0) {
    await confirmSuspiciousDates(suspiciousDates, allColors);
  } else {
    console.log('\n✓ All dates look valid!');
  }

  // Final confirmation before import
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 Import Summary:');
  console.log(`   Total colors: ${allColors.length}`);
  console.log(`   Matched: ${allColors.filter(c => c.status === 'matched').length}`);
  console.log(`   Not matched: ${allColors.filter(c => c.status === 'not_matched').length}`);
  console.log('═══════════════════════════════════════════════════\n');

  const proceed = AUTO_CONFIRM ? 'y' : await question('Proceed with import? (y/n): ');
  if (AUTO_CONFIRM) console.log('Proceeding with import (auto-confirmed)...');
  if (proceed.toLowerCase() !== 'y') {
    console.log('\n❌ Import cancelled');
    rl.close();
    return;
  }

  // Import via API
  try {
    const result = await importColors(allColors);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Import Complete!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Total imported: ${result.count}`);
    console.log(`   Duplicates skipped: ${result.duplicates || 0}`);
    console.log(`   Errors: ${result.errors || 0}`);

    // Save import report
    const report = {
      timestamp: new Date().toISOString(),
      spreadsheet: SPREADSHEET_PATH,
      sheets: sheetNames,
      total_colors: allColors.length,
      matched: allColors.filter(c => c.status === 'matched').length,
      not_matched: allColors.filter(c => c.status === 'not_matched').length,
      suspicious_dates_found: suspiciousDates.length,
      result
    };

    const reportPath = join(__dirname, 'pantone-import-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Import report saved to: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  }

  rl.close();
}

// Run the import
main().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
