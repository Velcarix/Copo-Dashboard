/**
 * Printer abstraction — ESC/POS ticket printing.
 *
 * Electron: sends ESC/POS commands to a USB/network printer via IPC
 *           (backend: node-escpos or node-thermal-printer)
 * Web/PWA:  uses window.print() with a styled receipt iframe
 * Capacitor: via a BT/WiFi printer plugin (future implementation)
 *
 * For now this is a stub — the kitchen display and shift close screens
 * will call printReceipt() when ready.
 */

import { platform } from './index'

export interface ReceiptLine {
  type: 'header' | 'item' | 'divider' | 'total' | 'footer' | 'text'
  content?: string
  qty?: number
  price?: string
  bold?: boolean
}

export interface ReceiptData {
  businessName: string
  orderNumber: string
  lines: ReceiptLine[]
  footer?: string
}

async function printElectron(data: ReceiptData): Promise<void> {
  // TODO: implement via IPC → main process → node-escpos
  // For now, fall back to web print
  await printWeb(data)
}

async function printWeb(data: ReceiptData): Promise<void> {
  const html = buildReceiptHtml(data)
  const printWindow = window.open('', '_blank', 'width=320,height=600')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

function buildReceiptHtml(data: ReceiptData): string {
  const lines = data.lines.map(line => {
    if (line.type === 'divider') return '<hr style="border-top:1px dashed #000;margin:4px 0">'
    if (line.type === 'item') {
      return `<div style="display:flex;justify-content:space-between">
        <span>${line.qty ?? 1}x ${line.content}</span>
        <span>${line.price ?? ''}</span>
      </div>`
    }
    const weight = line.bold ? 'bold' : 'normal'
    return `<p style="margin:2px 0;font-weight:${weight}">${line.content ?? ''}</p>`
  }).join('')

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <style>
      body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
      @media print { @page { margin: 4mm; } }
    </style>
  </head><body>
    <h2 style="text-align:center;margin:0 0 4px">${data.businessName}</h2>
    <p style="text-align:center;margin:0 0 8px">Orden #${data.orderNumber}</p>
    ${lines}
    ${data.footer ? `<p style="text-align:center;margin-top:8px">${data.footer}</p>` : ''}
  </body></html>`
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  switch (platform.name) {
    case 'electron': return printElectron(data)
    case 'ios':
    case 'android':
    case 'web':
    default:
      return printWeb(data)
  }
}
