import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { api, ApiError } from '@/shared/lib/api'
import { pickLicenseFile } from '@/shared/lib/licensePicker'

const LICENSE_STORAGE_KEY = 'copo_license_key'

const ERROR_MESSAGES: Record<string, string> = {
  LICENSE_NOT_FOUND: 'Licencia no encontrada. Verifica el archivo o contacta a Copo.',
  LICENSE_EXPIRED: 'Tu licencia venció. Contacta a Copo para renovar.',
  LICENSE_SUSPENDED: 'Esta licencia está suspendida. Contacta a Copo.',
  LICENSE_INVALID_SIGNATURE: 'El archivo de licencia está dañado o fue modificado.',
  LICENSE_BRANCH_MISMATCH: 'Este archivo no corresponde a esta sucursal.',
}

interface LicenseData {
  branchId: string
  branchName: string
  businessName: string
  plan: string
  expiresAt: string
  daysUntilExpiry: number
}

type PageState = 'checking' | 'entry' | 'inactive' | 'loading'

async function validateLicense(body: { licenseKey: string } | { fileContent: string }): Promise<LicenseData> {
  const res = await api.post<{ data: LicenseData }>(
    '/api/v1/license/validate',
    body,
    { skipAuth: true },
  )
  return res.data
}

function LicenseInactiva({ code }: { code: string }) {
  const message = ERROR_MESSAGES[code] ?? 'Licencia inválida. Contacta a Copo.'
  return (
    <div className="text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto">
        <span className="text-2xl">🔒</span>
      </div>
      <div>
        <p className="text-[var(--color-text-primary)] font-medium">{message}</p>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          Soporte:{' '}
          <a
            href="mailto:soporte@copopos.com"
            className="text-[var(--color-accent)] underline"
          >
            soporte@copopos.com
          </a>
        </p>
      </div>
    </div>
  )
}

export function LicenseGatePage() {
  const navigate = useNavigate()
  const { setLicense } = useAuthStore()
  const [pageState, setPageState] = useState<PageState>('checking')
  const [tab, setTab] = useState<'key' | 'file'>('key')
  const [manualKey, setManualKey] = useState('')
  const [inactiveCode, setInactiveCode] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY)
    if (!stored) {
      setPageState('entry')
      return
    }

    const body = stored.startsWith('file:')
      ? { fileContent: stored.slice(5) }
      : { licenseKey: stored }

    validateLicense(body)
      .then(data => {
        const key = stored.startsWith('file:') ? stored : stored
        setLicense(key, data.branchName, data.businessName)
        navigate('/login', { replace: true })
      })
      .catch((err: unknown) => {
        const code = err instanceof ApiError ? err.code : 'UNKNOWN'
        setInactiveCode(code)
        setPageState('inactive')
      })
  }, [])

  async function handleVerify() {
    setFieldError('')
    setPageState('loading')

    try {
      if (tab === 'key') {
        const key = manualKey.trim()
        if (!key) {
          setFieldError('Ingresa una clave de licencia.')
          setPageState('entry')
          return
        }
        const data = await validateLicense({ licenseKey: key })
        setLicense(key, data.branchName, data.businessName)
        navigate('/login', { replace: true })
      } else {
        const fileContent = await pickLicenseFile()
        if (!fileContent) {
          setPageState('entry')
          return
        }
        const data = await validateLicense({ fileContent })
        const stored = `file:${fileContent}`
        setLicense(stored, data.branchName, data.businessName)
        navigate('/login', { replace: true })
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'UNKNOWN'
      setFieldError(ERROR_MESSAGES[code] ?? 'Error al validar la licencia. Intenta de nuevo.')
      setPageState('entry')
    }
  }

  if (pageState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-text-muted)]">Verificando licencia…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-display font-bold text-[var(--color-accent)] mb-1 text-center">COPO</h1>

        {pageState === 'inactive' ? (
          <div className="mt-8">
            <LicenseInactiva code={inactiveCode} />
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-secondary)] mb-8 text-center">
              Activa tu licencia
            </p>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)] mb-6">
              <button
                onClick={() => { setTab('key'); setFieldError('') }}
                className={[
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  tab === 'key'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]',
                ].join(' ')}
              >
                Clave
              </button>
              <button
                onClick={() => { setTab('file'); setFieldError('') }}
                className={[
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  tab === 'file'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]',
                ].join(' ')}
              >
                Archivo .copo
              </button>
            </div>

            {tab === 'key' ? (
              <input
                type="text"
                value={manualKey}
                onChange={e => setManualKey(e.target.value)}
                placeholder="COPO-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] font-mono text-sm mb-4"
              />
            ) : (
              <div className="mb-4 py-6 rounded-xl border-2 border-dashed border-[var(--color-border)] text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Haz clic en "Verificar" para seleccionar tu archivo de licencia
                </p>
              </div>
            )}

            {fieldError && (
              <p className="text-sm text-[var(--color-danger)] mb-4">{fieldError}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={pageState === 'loading'}
              className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-50"
            >
              {pageState === 'loading' ? '…' : 'Verificar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
