import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// columns: [{ key, label }]  rows: [{...}]
export function exportToExcel(rows, columns, filename = 'report.xlsx') {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? '']))
  )
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, filename)
}

export function exportToPDF(rows, columns, { filename = 'report.pdf', title = 'Report' } = {}) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  doc.setFontSize(9)
  doc.text(`House of Sansa, Raipur — Generated ${new Date().toLocaleString('en-IN')}`, 14, 21)
  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [182, 134, 47] },
    margin: { left: 10, right: 10 },
  })
  doc.save(filename)
}

export function printRows(rows, columns, title = 'Report') {
  const win = window.open('', '_blank', 'width=1000,height=700')
  if (!win) return
  const style = `
    <style>
      body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #16181d; }
      h1 { font-size: 18px; margin-bottom: 2px; }
      p.sub { color: #62707f; font-size: 12px; margin-top: 0; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #d4d8dd; padding: 6px 8px; text-align: left; }
      th { background: #f4ead0; }
      tr:nth-child(even) { background: #f6f7f8; }
    </style>
  `
  const head = columns.map((c) => `<th>${c.label}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`)
    .join('')
  win.document.write(`
    <html>
      <head><title>${title}</title>${style}</head>
      <body>
        <h1>House of Sansa — ${title}</h1>
        <p class="sub">Raipur, Chhattisgarh · Generated ${new Date().toLocaleString('en-IN')}</p>
        <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `)
  win.document.close()
}
