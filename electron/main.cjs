/**
 * Copo POS — Electron main process
 *
 * This wraps the React app for Windows / macOS desktop use.
 * Targets: POS mostrador, Cocina fija, Comandero desktop
 * NOT used for Dashboard — the dashboard is web/PWA only.
 */

'use strict'

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// ── Constants ─────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const DEV_SERVER_URL = 'http://localhost:5173'

// ── Window management ─────────────────────────────────────────────────────────

/** @type {BrowserWindow | null} */
let mainWindow = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 600,
    title: 'Copo POS',
    backgroundColor: '#F7F9FC',
    // Hide title bar on macOS for a cleaner look
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,   // security: renderer cannot access Node APIs directly
      nodeIntegration: false,   // security: never enable this
      sandbox: false,           // needed for preload to work
    },
    // Start maximized on desktop POS stations
    show: false,  // show after ready-to-show to avoid white flash
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window only when ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // Maximize on first open for POS stations
    mainWindow.maximize()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── App menu ──────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    // macOS app menu
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Ventana',
      submenu: [
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Recargar', role: 'reload' },
        ...(isDev ? [{ label: 'DevTools', role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { label: 'Cerrar', role: 'close' },
      ],
    },
  ]

  // In production: minimal menu (no Edit, no View clutter)
  if (!isDev) {
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  } else {
    // Dev: keep default menu for easier debugging
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }
}

// ── IPC handlers (called from renderer via preload) ───────────────────────────

/**
 * Open native file picker for product image selection.
 * Returns: { canceled, filePath, base64 } | null
 */
ipcMain.handle('camera:pickImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar imagen del producto',
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths.length) return null
  const filePath = result.filePaths[0]
  const buffer = fs.readFileSync(filePath)
  const base64 = buffer.toString('base64')
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return { filePath, base64, mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}` }
})

/**
 * Save a file to the user's data directory.
 * Used for product images, receipts, etc.
 */
ipcMain.handle('fs:save', async (_event, { filename, base64, subdir = '' }) => {
  const dir = path.join(app.getPath('userData'), 'copo', subdir)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return filePath
})

/**
 * Read a file from the user's data directory.
 */
ipcMain.handle('fs:read', async (_event, { filePath }) => {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath).toString('base64')
})

/**
 * Enable kiosk mode (for dedicated POS/Kitchen terminals).
 * Called from renderer when the device is configured as a dedicated station.
 */
ipcMain.handle('window:setKiosk', async (_event, enabled) => {
  if (mainWindow) mainWindow.setKiosk(enabled)
})

/**
 * Open external links in the system browser (not in Electron).
 */
ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url)
})

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu()
  createMainWindow()

  // macOS: re-create window if dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  // On macOS, apps stay running until explicitly quit
  if (process.platform !== 'darwin') app.quit()
})

// Security: prevent navigation to external URLs in Electron
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    const allowed = [
      'localhost',
      'capacitor',
      'file:',
    ]
    const isAllowed = allowed.some(h => parsedUrl.hostname === h || parsedUrl.protocol === h)
    if (!isAllowed) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
})
