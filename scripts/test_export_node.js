// Node script to test Excel export without a browser DOM
// Usage:
//   node scripts/test_export_node.js [input.json] [output.xlsx]
// If input.json is a structured object with `categories` and `entries`, it will be flattened.

const fs = require('fs')
const path = require('path')
const { writeExcelFile } = require('../src/utils/exportExcelNode')

function flattenStructured(input) {
  // input.categories -> [{ title, entries: [{ aspect, examples, technology, status, comments }] }]
  const rows = []
  if (!input || !Array.isArray(input.categories)) return rows
  for (const cat of input.categories) {
    const title = cat.title || cat.id || ''
    const entries = cat.entries || []
    for (const e of entries) {
      rows.push({
        'Category': title,
        'Question / Aspect': e.aspect || '',
        'Examples & Options': e.examples || '',
        'Technology Used': e.technology || '',
        'Status': e.status || '',
        'Comments / Notes': e.comments || ''
      })
    }
  }
  return rows
}

function loadInput(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

const inArg = process.argv[2] || 'data/sample_export.json'
const outArg = process.argv[3] || 'solution_inventory_test.xlsx'

try {
  const absIn = path.resolve(process.cwd(), inArg)
  if (!fs.existsSync(absIn)) throw new Error('Input file not found: ' + absIn)
  const input = loadInput(absIn)

  let rows = []
  if (Array.isArray(input)) {
    // assume already flattened rows with headers
    rows = input
  } else if (input.categories) {
    rows = flattenStructured(input)
  } else if (input.entries && input.title) {
    // single category object
    rows = flattenStructured({ categories: [input] })
  } else {
    throw new Error('Unrecognized JSON structure. Provide an array of rows or an object with `categories`.')
  }

  const outPath = writeExcelFile(rows, outArg)
  console.log('Wrote test Excel to', outPath)
} catch (err) {
  console.error('Export failed:', err.message || err)
  process.exit(1)
}
