import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import type { TableConfig } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'

interface TableForm {
  name: string
  capacity: string
}

const EMPTY_FORM: TableForm = { name: '', capacity: '4' }

const STATUS_LABEL: Record<TableConfig['status'], string> = {
  available: 'Libre',
  occupied:  'Ocupada',
  merging:   'Fusionando',
  merged:    'Fusionada',
}

const STATUS_COLOR: Record<TableConfig['status'], string> = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  occupied:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  merging:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  merged:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export function TablesPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [tables, setTables] = useState<TableConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TableForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { void load() }, [branchId])

  async function load() {
    if (!branchId) { setLoading(false); return }
    setLoading(true)
    try {
      const resp = await api.get<{ data: TableConfig[] }>(`/api/v1/tables?branchId=${branchId}`)
      setTables(resp.data)
    } catch {
      setTables([])
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(t: TableConfig) {
    setEditId(t.id)
    setForm({ name: t.name, capacity: String(t.capacity) })
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSave() {
    const cap = parseInt(form.capacity, 10)
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    if (isNaN(cap) || cap < 1 || cap > 20) { setError('Capacidad debe ser 1–20'); return }

    setSaving(true)
    setError('')
    try {
      if (editId) {
        await api.put(`/api/v1/tables/${editId}`, { name: form.name.trim(), capacity: cap })
        setTables(ts => ts.map(t => t.id === editId ? { ...t, name: form.name.trim(), capacity: cap } : t))
      } else {
        const { data: created } = await api.post<{ data: TableConfig }>('/api/v1/tables', {
          branchId: branchId ?? '',
          name: form.name.trim(),
          capacity: cap,
          positionX: 0,
          positionY: 0,
        })
        setTables(ts => [...ts, created])
      }
      closeForm()
    } catch (err) {
      if (import.meta.env.DEV) {
        if (editId) {
          setTables(ts => ts.map(t => t.id === editId ? { ...t, name: form.name.trim(), capacity: cap } : t))
        } else {
          const mock: TableConfig = {
            id: 'new-' + Date.now(),
            branchId: branchId ?? '',
            name: form.name.trim(),
            capacity: cap,
            positionX: 0,
            positionY: 0,
            status: 'available',
            sessionId: null,
            waiterId: null,
            waiterName: null,
            mergedWith: [],
          }
          setTables(ts => [...ts, mock])
        }
        closeForm()
      } else {
        setError(err instanceof ApiError ? err.message : 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/api/v1/tables/${id}`)
      setTables(ts => ts.filter(t => t.id !== id))
    } catch {
      if (import.meta.env.DEV) {
        setTables(ts => ts.filter(t => t.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">Cargando mesas…</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Mesas</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{tables.length} mesa{tables.length !== 1 ? 's' : ''} configurada{tables.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-sm"
        >
          + Agregar mesa
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {(['available', 'occupied', 'merging'] as const).map(s => {
          const count = tables.filter(t => t.status === s).length
          return (
            <div key={s} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{count}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{STATUS_LABEL[s]}</p>
            </div>
          )
        })}
      </div>

      {/* Table list */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {tables.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)] text-sm">
            Sin mesas. Agrega la primera.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Capacidad</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Mesero</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tables.map(t => (
                <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{t.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t.capacity} personas</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {t.waiterName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="text-xs text-[var(--color-accent)] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id || t.status === 'occupied'}
                        title={t.status === 'occupied' ? 'No se puede borrar una mesa ocupada' : undefined}
                        className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-30"
                      >
                        {deletingId === t.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-[var(--color-text-primary)] mb-4">
              {editId ? 'Editar mesa' : 'Nueva mesa'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nombre</label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Mesa 1, Barra 2, Terraza…"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Capacidad (personas)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-[var(--color-danger)]">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-sm disabled:opacity-40"
              >
                {saving ? '…' : editId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
