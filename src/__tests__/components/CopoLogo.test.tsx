import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CopoLogo } from '@/shared/components/CopoLogo'
import { useThemeStore } from '@/shared/store/themeStore'

vi.mock('@/shared/store/themeStore', () => ({
  useThemeStore: vi.fn(),
}))

function mockTheme(theme: 'light' | 'dark') {
  vi.mocked(useThemeStore).mockImplementation(
    (selector: (s: { theme: string }) => unknown) => selector({ theme }),
  )
}

describe('CopoLogo', () => {
  it('uses the dark-text logo in light mode', () => {
    mockTheme('light')
    render(<CopoLogo />)
    expect(screen.getByAltText('Copo')).toHaveAttribute('src', '/brand/copo-logo-light.png')
  })

  it('uses the white-text logo in dark mode', () => {
    mockTheme('dark')
    render(<CopoLogo />)
    expect(screen.getByAltText('Copo')).toHaveAttribute('src', '/brand/copo-logo-dark.png')
  })
})
