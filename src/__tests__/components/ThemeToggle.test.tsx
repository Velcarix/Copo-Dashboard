// frontend/src/__tests__/components/ThemeToggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useThemeStore } from '@/shared/store/themeStore'

vi.mock('@/shared/store/themeStore', () => ({
  useThemeStore: vi.fn(),
}))

const mockToggle = vi.fn()

describe('ThemeToggle', () => {
  it('renders day button active in light mode', () => {
    vi.mocked(useThemeStore).mockReturnValue({ theme: 'light', toggleTheme: mockToggle, setTheme: vi.fn() })
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'Cambiar a modo noche')
  })

  it('renders night button active in dark mode', () => {
    vi.mocked(useThemeStore).mockReturnValue({ theme: 'dark', toggleTheme: mockToggle, setTheme: vi.fn() })
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'Cambiar a modo día')
  })

  it('calls toggleTheme on click', async () => {
    vi.mocked(useThemeStore).mockReturnValue({ theme: 'light', toggleTheme: mockToggle, setTheme: vi.fn() })
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalledOnce()
  })
})
