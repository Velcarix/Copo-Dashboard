import { useEffect, useState } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import { api, ApiError } from '@/shared/lib/api'

const CHECK_INTERVAL_MS = 30 * 60 * 1000

const WARNING_MESSAGES: Record<string, string> = {
  LICENSE_EXPIRED: 'Tu licencia está vencida. Contacta a nuestro equipo para procesar el pago y reactivar el servicio.',
  LICENSE_SUSPENDED: 'Tu licencia fue suspendida. Contacta a nuestro equipo para más información.',
}

export function LicenseStatusBanner() {
  const licenseKey = useAuthStore(s => s.licenseKey)
  const [warningCode, setWarningCode] = useState<string | null>(null)

  useEffect(() => {
    if (!licenseKey) return

    let cancelled = false

    async function checkLicense() {
      try {
        await api.post('/api/v1/license/validate', { licenseKey }, { skipAuth: true })
        if (!cancelled) setWarningCode(null)
      } catch (err) {
        if (cancelled) return
        const code = err instanceof ApiError ? err.code : null
        setWarningCode(code && code in WARNING_MESSAGES ? code : null)
      }
    }

    checkLicense()
    const interval = setInterval(checkLicense, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [licenseKey])

  if (!warningCode) return null

  return (
    <div
      role="alert"
      className="bg-[var(--color-warning)] text-[#78350F] text-center text-xs font-bold py-1.5 px-4 tracking-wide"
    >
      ⚠ {WARNING_MESSAGES[warningCode]}{' '}
      <a href="mailto:soporte@copopos.com" className="underline">
        soporte@copopos.com
      </a>
    </div>
  )
}
