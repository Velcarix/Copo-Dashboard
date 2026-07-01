import { platform } from '@/platform'

export async function pickLicenseFile(): Promise<string | null> {
  if (platform.isElectron) {
    return window.copoNative?.openLicenseFile() ?? null
  }

  // Web and Capacitor (Capacitor WebView supports standard file input)
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.copo'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return resolve(null)
      const buffer = await file.arrayBuffer()
      const hex = Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      resolve(hex)
    }
    input.click()
  })
}
