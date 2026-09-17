import { useCallback, useEffect, useState } from 'react'

/**
 * Evento propietario de Chromium (Chrome/Edge/Brave, escritorio y Android).
 * Solo se dispara cuando el navegador considera la página instalable; Safari y
 * Firefox nunca lo disparan, por eso el banner siempre ofrece además los pasos
 * manuales en lugar de depender de este evento.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'chromium-desktop' | 'chromium-android' | 'ios' | 'firefox' | 'other'

const SNOOZE_KEY = 'copo.installBanner.snoozedUntil'
/** "Ahora no" no esconde el banner para siempre: vuelve a la semana. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari no soporta display-mode: standalone y usa navigator.standalone.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia?.('(display-mode: standalone)').matches === true || iosStandalone
}

function isSnoozed(): boolean {
  try {
    const until = localStorage.getItem(SNOOZE_KEY)
    return until !== null && Date.now() < Number(until)
  } catch {
    // Modo incógnito con storage bloqueado: mejor mostrar el banner que romper.
    return false
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS 13+ se anuncia como Mac: se distingue por tener pantalla táctil.
  const isIOS = /iPhone|iPad|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Chrome\/|Chromium\/|Edg\//.test(ua)) {
    return /Android/.test(ua) ? 'chromium-android' : 'chromium-desktop'
  }
  return 'other'
}

/**
 * Estado de instalabilidad del dashboard como app (PWA).
 *
 * `canPrompt` indica que el navegador nos dejó capturar su evento y podemos
 * abrir el diálogo nativo con `install()`. Cuando es false el banner sigue
 * siendo útil: enseña los pasos manuales de `platform`.
 */
export function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [snoozed, setSnoozed] = useState(isSnoozed)
  const [platform] = useState(detectPlatform)

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      // Sin preventDefault Chrome Android muestra su propia mini-barra y deja
      // de avisarnos; con él, el momento de invitar lo decide el banner.
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    function handleInstalled() {
      setInstalled(true)
      setPromptEvent(null)
    }

    const displayMode = window.matchMedia('(display-mode: standalone)')
    function handleDisplayModeChange(e: MediaQueryListEvent) {
      setInstalled(e.matches)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    displayMode.addEventListener('change', handleDisplayModeChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      displayMode.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent) return 'unavailable'
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    // El evento es de un solo uso: Chrome lo vuelve a disparar si sigue instalable.
    setPromptEvent(null)
    if (outcome === 'accepted') setInstalled(true)
    return outcome
  }, [promptEvent])

  const snooze = useCallback(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      // Sin storage el banner reaparece al recargar; se cierra igual por sesión.
    }
    setSnoozed(true)
  }, [])

  // Firefox de escritorio y navegadores sin soporte no pueden instalar nada:
  // ahí el banner solo sería ruido.
  const supported = promptEvent !== null || platform === 'ios' || platform.startsWith('chromium')

  return {
    visible: supported && !installed && !snoozed,
    canPrompt: promptEvent !== null,
    platform,
    install,
    snooze,
  }
}
