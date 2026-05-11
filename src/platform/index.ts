/**
 * Platform detection and abstraction layer.
 *
 * Detects the runtime environment and exposes a unified API for
 * platform-specific features: camera, filesystem, printer, notifications.
 *
 * Usage:
 *   import { platform } from '@/platform'
 *   platform.name  // 'web' | 'electron' | 'ios' | 'android'
 */

// window.copoNative is injected by electron/preload.cjs
declare global {
  interface Window {
    copoNative?: {
      platform: 'electron'
      pickImage: () => Promise<{ base64: string; mimeType: string } | null>
      saveFile: (opts: { filename: string; base64: string; subdir?: string }) => Promise<string>
      readFile: (opts: { filePath: string }) => Promise<string | null>
      setKiosk: (enabled: boolean) => Promise<void>
      openExternal: (url: string) => Promise<void>
    }
  }
}

// Capacitor is loaded via <script> tag in Capacitor builds
// We check for the Capacitor global to detect mobile runtime
declare global {
  interface Window {
    Capacitor?: { getPlatform: () => 'ios' | 'android' | 'web' }
  }
}

export type PlatformName = 'web' | 'electron' | 'ios' | 'android'

function detectPlatform(): PlatformName {
  if (window.copoNative?.platform === 'electron') return 'electron'
  if (window.Capacitor) {
    const cap = window.Capacitor.getPlatform()
    if (cap === 'ios') return 'ios'
    if (cap === 'android') return 'android'
  }
  return 'web'
}

export const platform = {
  get name(): PlatformName { return detectPlatform() },
  get isNative(): boolean { return detectPlatform() !== 'web' },
  get isElectron(): boolean { return detectPlatform() === 'electron' },
  get isMobile(): boolean { const p = detectPlatform(); return p === 'ios' || p === 'android' },
  get isWeb(): boolean { return detectPlatform() === 'web' },
}
