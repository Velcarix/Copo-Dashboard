/**
 * Copo POS — Electron preload script
 *
 * Exposes a safe, typed bridge (contextBridge) so the React renderer
 * can call native features without nodeIntegration.
 *
 * The renderer accesses these via: window.copoNative.*
 */

'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('copoNative', {
  /** Platform identifier — renderer uses this for feature branching */
  platform: 'electron',

  /** Open native image picker; returns { base64, mimeType } or null */
  pickImage: () => ipcRenderer.invoke('camera:pickImage'),

  /** Save a file to user data directory */
  saveFile: (opts) => ipcRenderer.invoke('fs:save', opts),

  /** Read a file from user data directory (returns base64) */
  readFile: (opts) => ipcRenderer.invoke('fs:read', opts),

  /** Enable/disable kiosk mode */
  setKiosk: (enabled) => ipcRenderer.invoke('window:setKiosk', enabled),

  /** Open a URL in the system browser */
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
})
