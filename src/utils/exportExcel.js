import * as XLSX from 'xlsx'

export function exportToExcel(jsonRows, filename = 'export.xlsx') {
  // Ensure column order and headers match the requested format
  const headerOrder = [
    'Category',
    'Question / Aspect',
    'Examples & Options',
    'Technology Used',
    'Status',
    'Comments / Notes'
  ]

  // Map rows to ordered arrays
  const data = [headerOrder]
  for (const r of jsonRows) {
    data.push(headerOrder.map(h => r[h] || ''))
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
