const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');

function escapeCsvCell(val) {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function saveCSV(data, filename) {
  if (!data || data.length === 0) {
    logger.error('No data provided to save CSV.');
    return;
  }
  try {
    const keys = Object.keys(data[0]);
    const headerRow = keys.map(escapeCsvCell).join(',');
    const dataRows = data.map(row => 
      keys.map(key => escapeCsvCell(row[key])).join(',')
    );
    const csvContent = [headerRow, ...dataRows].join('\n');
    const absolutePath = path.resolve(process.cwd(), filename);
    await fs.writeFile(absolutePath, csvContent, 'utf8');
    logger.success(`Saved CSV to ${absolutePath}`);
  } catch (err) {
    logger.error(`Error saving CSV: ${err.message}`);
  }
}

module.exports = {
  saveCSV
};
