'use strict';

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const DEFAULT_DATASET_PATH = path.join(__dirname, '../../datasets/water_potability.csv');

/**
 * Loads and validates the Water Potability CSV dataset.
 * Extracts and maps required water quality fields (ph, Solids -> tds, Turbidity -> turbidity).
 * Filters out incomplete or invalid rows containing missing, empty, or non-numeric values.
 *
 * @param {string} [filePath] - Optional custom path to dataset CSV file.
 * @returns {Promise<Array<Object>>} Resolves to an array of frozen, validated data records.
 */
async function loadDataset(filePath = DEFAULT_DATASET_PATH) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`Dataset file not found at path: ${filePath}`));
    }

    const validRecords = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        const parsedRecord = parseAndValidateRow(row);
        if (parsedRecord) {
          validRecords.push(Object.freeze(parsedRecord));
        }
      })
      .on('end', () => {
        if (validRecords.length === 0) {
          return reject(new Error('Dataset loading failed: No valid records found after parsing and validation.'));
        }
        resolve(validRecords);
      })
      .on('error', (err) => {
        reject(new Error(`CSV parsing error: ${err.message}`));
      });
  });
}

/**
 * Parses and strictly validates a single CSV row.
 * Maps CSV column headers to API_CONTRACT.md schema properties:
 * - ph -> ph
 * - Solids -> tds
 * - Turbidity -> turbidity
 *
 * @param {Object} row - Raw row object from csv-parser.
 * @returns {Object|null} Cleaned record with mapped numerical fields, or null if invalid.
 */
function parseAndValidateRow(row) {
  const fields = [
    { csvKey: 'ph', targetKey: 'ph' },
    { csvKey: 'Solids', targetKey: 'tds' },
    { csvKey: 'Turbidity', targetKey: 'turbidity' }
  ];

  const cleaned = {};

  for (const field of fields) {
    const rawVal = row[field.csvKey];

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      return null; // Reject row if missing or empty
    }

    const numVal = Number(rawVal);
    if (!Number.isFinite(numVal)) {
      return null; // Reject row if not a finite number
    }

    cleaned[field.targetKey] = numVal;
  }

  return cleaned;
}

module.exports = {
  loadDataset
};
