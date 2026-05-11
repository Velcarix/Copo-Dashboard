/**
 * Camera abstraction — unified API for taking/picking product images.
 *
 * Priority:
 *   1. Electron  → native file picker dialog
 *   2. Capacitor → @capacitor/camera (device camera + photo library)
 *   3. Web       → <input type="file"> fallback
 *
 * Returns a data URL (data:image/jpeg;base64,...) for display/storage.
 */

import { platform } from './index'

export interface PickedImage {
  dataUrl: string
  mimeType: string
}

// ── Electron ──────────────────────────────────────────────────────────────────

async function pickImageElectron(): Promise<PickedImage | null> {
  const result = await window.copoNative!.pickImage()
  if (!result) return null
  return {
    dataUrl: `data:${result.mimeType};base64,${result.base64}`,
    mimeType: result.mimeType,
  }
}

// ── Capacitor ─────────────────────────────────────────────────────────────────

async function pickImageCapacitor(): Promise<PickedImage | null> {
  // Dynamically import to avoid bundling Capacitor in non-native builds
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,   // ask user: camera or photo library
  })
  if (!photo.base64String) return null
  const mimeType = `image/${photo.format}`
  return {
    dataUrl: `data:${mimeType};base64,${photo.base64String}`,
    mimeType,
  }
}

// ── Web fallback ──────────────────────────────────────────────────────────────

function pickImageWeb(): Promise<PickedImage | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ dataUrl: reader.result as string, mimeType: file.type })
      }
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function pickProductImage(): Promise<PickedImage | null> {
  switch (platform.name) {
    case 'electron': return pickImageElectron()
    case 'ios':
    case 'android': return pickImageCapacitor()
    default:        return pickImageWeb()
  }
}
