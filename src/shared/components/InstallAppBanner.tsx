import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallApp, type InstallPlatform } from '@/shared/hooks/useInstallApp'

/** Pasos manuales, por si el navegador no nos deja abrir el diálogo nativo
 *  (Safari/iOS siempre, y Chrome mientras no considere la página instalable). */
const MANUAL_STEPS: Record<InstallPlatform, string[]> = {
  'chromium-desktop': [
    'Abre el menú de Chrome (los tres puntos de arriba a la derecha).',
    'Entra a «Enviar, guardar y compartir».',
    'Elige «Instalar página como aplicación…».',
  ],
  'chromium-android': [
    'Abre el menú de Chrome (los tres puntos de arriba a la derecha).',
    'Toca «Instalar app» o «Agregar a la pantalla principal».',
    'Confirma con «Instalar».',
  ],
  ios: [
    'Toca el botón Compartir de Safari (el cuadro con la flecha).',
    'Desliza y elige «Agregar a inicio».',
    'Confirma con «Agregar».',
  ],
  firefox: ['Abre el panel en Chrome o Edge para poder instalarlo.'],
  other: ['Abre el panel en Chrome o Edge para poder instalarlo.'],
}

const PITCH: Record<InstallPlatform, string> = {
  'chromium-desktop': 'Instálalo como app y ábrelo desde el escritorio, sin buscar la pestaña.',
  'chromium-android': 'Instálalo como app y ábrelo desde tu pantalla de inicio, sin buscar la pestaña.',
  ios: 'Agrégalo a tu pantalla de inicio y ábrelo como app, sin buscar la pestaña.',
  firefox: 'Instálalo como app para abrirlo con un solo toque.',
  other: 'Instálalo como app para abrirlo con un solo toque.',
}

/**
 * Invitación a instalar el dashboard como app. Se oculta sola cuando ya está
 * instalado (la ventana corre en modo standalone) y "Ahora no" la calla una
 * semana — ver useInstallApp.
 */
export function InstallAppBanner({ variant = 'bar' }: { variant?: 'bar' | 'card' }) {
  const { visible, canPrompt, platform, install, snooze } = useInstallApp()
  const [showSteps, setShowSteps] = useState(false)

  if (!visible) return null

  async function handleInstall() {
    // Si el diálogo nativo no está disponible caemos a los pasos manuales en
    // vez de dejar al usuario con un botón que no hace nada.
    const outcome = await install()
    if (outcome === 'unavailable') setShowSteps(true)
  }

  const steps = (
    <ol className="mt-2 space-y-1 text-xs text-[var(--color-text-secondary)] list-decimal list-inside">
      {MANUAL_STEPS[platform].map(step => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  )

  if (variant === 'card') {
    return (
      <section
        aria-label="Instalar el panel como aplicación"
        className="mt-6 p-3 rounded-xl bg-[var(--color-accent-subtle)] border border-[var(--color-border)] animate-[fadeIn_200ms_ease-out]"
      >
        <div className="flex items-start gap-3">
          <Download size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight">
              Instala Copo Dashboard
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-snug mt-0.5">
              {PITCH[platform]}
            </p>
            {showSteps && steps}
            <div className="flex items-center gap-3 mt-2">
              {canPrompt ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Instalar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSteps(s => !s)}
                  aria-expanded={showSteps}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  {showSteps ? 'Ocultar pasos' : 'Ver cómo'}
                </button>
              )}
              <button
                type="button"
                onClick={snooze}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Instalar el panel como aplicación"
      className="bg-[var(--color-accent-subtle)] border-b border-[var(--color-border)] px-4 py-2 animate-[slideDown_200ms_ease-out]"
    >
      <div className="flex items-center gap-3">
        <Download size={15} className="shrink-0 text-[var(--color-accent)]" />
        <p className="flex-1 min-w-0 text-xs text-[var(--color-text-secondary)] leading-snug">
          <span className="font-semibold text-[var(--color-text-primary)]">Instala Copo Dashboard.</span>{' '}
          <span className="hidden sm:inline">{PITCH[platform]}</span>
        </p>
        {canPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Instalar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowSteps(s => !s)}
            aria-expanded={showSteps}
            className="shrink-0 px-3 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-bold hover:bg-[var(--color-border)] transition-colors"
          >
            {showSteps ? 'Ocultar' : 'Ver cómo'}
          </button>
        )}
        <button
          type="button"
          onClick={snooze}
          aria-label="Ocultar el aviso de instalación"
          title="Ahora no"
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      {showSteps && <div className="pl-6 pb-1">{steps}</div>}
    </section>
  )
}
