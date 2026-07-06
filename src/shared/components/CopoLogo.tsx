import { useThemeStore } from '@/shared/store/themeStore'

interface CopoLogoProps {
  /** Alto del logo en píxeles CSS; el ancho se ajusta solo (relación de aspecto). */
  height?: number
  className?: string
}

// Logo con texto — usa la versión blanca en modo noche (legible sobre fondo
// oscuro) y la versión con texto oscuro en modo día. Assets en public/brand/.
export function CopoLogo({ height = 40, className }: CopoLogoProps) {
  const theme = useThemeStore(s => s.theme)
  const src = theme === 'dark' ? '/brand/copo-logo-dark.png' : '/brand/copo-logo-light.png'

  return (
    <img
      src={src}
      alt="Copo"
      style={{ height }}
      className={['w-auto object-contain', className].filter(Boolean).join(' ')}
    />
  )
}
