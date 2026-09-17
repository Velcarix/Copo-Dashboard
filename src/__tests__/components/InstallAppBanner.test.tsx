import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallAppBanner } from '@/shared/components/InstallAppBanner'

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

function mockDisplayMode(standalone: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(display-mode: standalone)' ? standalone : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

/** Imita el evento de Chromium, que no existe en jsdom. */
function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome: 'accepted' as const })
  act(() => { window.dispatchEvent(event) })
  return event
}

describe('InstallAppBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { ...navigator, userAgent: CHROME_UA, maxTouchPoints: 0 })
    mockDisplayMode(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ofrece los pasos manuales cuando el navegador no da el diálogo nativo', async () => {
    render(<InstallAppBanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Ver cómo' }))
    expect(screen.getByText(/Instalar página como aplicación/)).toBeInTheDocument()
  })

  it('abre el diálogo nativo cuando Chrome lo permite', async () => {
    render(<InstallAppBanner />)
    const event = fireBeforeInstallPrompt()

    const button = await screen.findByRole('button', { name: 'Instalar' })
    await userEvent.click(button)

    expect(event.prompt).toHaveBeenCalled()
  })

  it('no se muestra cuando el dashboard ya corre instalado', () => {
    mockDisplayMode(true)
    const { container } = render(<InstallAppBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('"Ahora no" lo silencia y deja constancia para las próximas visitas', async () => {
    const { container } = render(<InstallAppBanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar el aviso de instalación' }))

    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(localStorage.getItem('copo.installBanner.snoozedUntil')).not.toBeNull()
  })
})
