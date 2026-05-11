import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
        },
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
