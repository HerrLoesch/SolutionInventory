const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

function writeExcelFile(rows, filename = 'export_node.xlsx') {
  const headerOrder = [
    'Category',
    'Question / Aspect',
    'Examples & Options',
    'Technology Used',
    'Status',
    'Comments / Notes'
  ]

  const data = [headerOrder]
  for (const r of rows) {
    data.push(headerOrder.map(h => r[h] || ''))
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')

  const outPath = path.resolve(process.cwd(), filename)
  const wbopts = { bookType: 'xlsx', type: 'buffer' }
  const buffer = XLSX.write(wb, wbopts)
  fs.writeFileSync(outPath, buffer)
  return outPath
}

module.exports = { writeExcelFile }
