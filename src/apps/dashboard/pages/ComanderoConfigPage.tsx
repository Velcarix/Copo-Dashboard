import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import type { TableConfig } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface WaiterEmployee {
  id: string
  name: string
  active: boolean
}

interface SectionConfig {
  id: string
  branchId: string
  name: string
  tableIds: string[]
  assignedWaiterId: string | null
  assignedWaiterName: string | null
}

// ── Mocks ──────────────────────────────────────────────────────────────────────

const MOCK_TABLES: TableConfig[] = [
  { id: 't1', branchId: 'default', name: 'Mesa 1', capacity: 4, positionX: 0, positionY: 0, status: 'available', sessionId: null, waiterId: null, waiterName: null, mergedWith: [] },
  { id: 't2', branchId: 'default', name: 'Mesa 2', capacity: 4, positionX: 1, positionY: 0, status: 'occupied', sessionId: 's1', waiterId: 'w1', waiterName: 'Ana', mergedWith: [] },
  { id: 't3', branchId: 'default', name: 'Mesa 3', capacity: 2, positionX: 2, positionY: 0, status: 'available', sessionId: null, waiterId: null, waiterName: null, mergedWith: [] },
  { id: 't4', branchId: 'default', name: 'Mesa 4', capacity: 6, positionX: 0, positionY: 1, status: 'available', sessionId: null, waiterId: null, waiterName: null, mergedWith: [] },
  { id: 'b1', branchId: 'default', name: 'Barra 1', capacity: 1, positionX: 0, positionY: 2, status: 'available', sessionId: null, waiterId: null, waiterName: null, mergedWith: [] },
]

const MOCK_WAITERS: WaiterEmployee[] = [
  { id: 'w1', name: 'Ana García', active: true },
  { id: 'w2', name: 'Carlos Ruiz', active: true },
  { id: 'w3', name: 'María López', active: false },
]

const MOCK_SECTIONS: SectionConfig[] = [
  { id: 'sec1', branchId: 'default', name: 'Sección A', tableIds: ['t1', 't2'], assignedWaiterId: 'w1', assignedWaiterName: 'Ana García' },
  { id: 'sec2', branchId: 'default', name: 'Barra', tableIds: ['b1'], assignedWaiterId: null, assignedWaiterName: null },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function ComanderoConfigPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [tables, setTables] = useState<TableConfig[]>([])
  const [waiters, setWaiters] = useState<WaiterEmployee[]>([])
  const [sections, setSections] = useState<SectionConfig[]>([])
  const [loading, setLoading] = useState(true)

  // Section form state
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formTableIds, setFormTableIds] = useState<string[]>([])
  const [formWaiterId, setFormWaiterId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { void loadAll() }, [branchId])

  async function loadAll() {
    if (!branchId) return
    setLoading(true)
    try {
      const [fetchedTables, fetchedWaiters, fetchedSections] = await Promise.all([
        api.get<TableConfig[]>(`/api/v1/tables?branchId=${branchId}`),
        api.get<WaiterEmployee[]>(`/api/v1/employees?branchId=${branchId}&role=WAITER`),
        api.get<SectionConfig[]>(`/api/v1/sections?branchId=${branchId}`),
      ])
      setTables(fetchedTables)
      setWaiters(fetchedWaiters)
      setSections(fetchedSections)
    } catch {
      setTables(MOCK_TABLES)
      setWaiters(MOCK_WAITERS)
      setSections(MOCK_SECTIONS)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditId(null)
    setFormName('')
    setFormTableIds([])
    setFormWaiterId('')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(s: SectionConfig) {
    setEditId(s.id)
    setFormName(s.name)
    setFormTableIds([...s.tableIds])
    setFormWaiterId(s.assignedWaiterId ?? '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setFormError('')
  }

  function toggleTable(id: string) {
    setFormTableIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('El nombre es requerido'); return }

    const waiter = waiters.find(w => w.id === formWaiterId) ?? null
    const body = {
      branchId: branchId ?? '',
      name: formName.trim(),
      tableIds: formTableIds,
      assignedWaiterId: formWaiterId || null,
    }

    setSaving(true)
    setFormError('')
    try {
      if (editId) {
        await api.put(`/api/v1/sections/${editId}`, body)
        setSections(ss => ss.map(s => s.id === editId
          ? { ...s, ...body, assignedWaiterName: waiter?.name ?? null }
          : s))
      } else {
        const created = await api.post<SectionConfig>('/api/v1/sections', body)
        setSections(ss => [...ss, created])
      }
      closeForm()
    } catch (err) {
      if (import.meta.env.DEV) {
        if (editId) {
          setSections(ss => ss.map(s => s.id === editId
            ? { ...s, ...body, assignedWaiterName: waiter?.name ?? null }
            : s))
        } else {
          setSections(ss => [...ss, {
            id: 'sec-' + Date.now(),
            branchId: branchId ?? '',
            name: formName.trim(),
            tableIds: formTableIds,
            assignedWaiterId: formWaiterId || null,
            assignedWaiterName: waiter?.name ?? null,
          }])
        }
        closeForm()
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSection(id: string) {
    try {
      await api.delete(`/api/v1/sections/${id}`)
    } catch {
      if (!import.meta.env.DEV) return
    }
    setSections(ss => ss.filter(s => s.id !== id))
  }

  // Quick waiter assignment directly from table card
  async function handleAssignWaiter(tableId: string, waiterId: string) {
    const waiter = waiters.find(w => w.id === waiterId) ?? null
    try {
      await api.put(`/api/v1/tables/${tableId}`, { waiterId: waiterId || null })
    } catch {
      if (!import.meta.env.DEV) return
    }
    setTables(ts => ts.map(t => t.id === tableId
      ? { ...t, waiterId: waiterId || null, waiterName: waiter?.name ?? null }
      : t))
  }

  // Tables not yet assigned to any section
  const assignedTableIds = new Set(sections.flatMap(s => s.tableIds))
  const unassignedTables = tables.filter(t => !assignedTableIds.has(t.id))

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">Cargando configuración…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Comandero</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Secciones, asignación de meseros y configuración de mesas</p>
      </div>

      {/* ── Waiter assignment per table ── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm">Mesero por mesa</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Asignación rápida — también se puede hacer desde la tablet del mesero</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {tables.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t.capacity} personas</p>
              </div>
              <select
                value={t.waiterId ?? ''}
                onChange={e => handleAssignWaiter(t.id, e.target.value)}
                className="text-sm px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] min-w-[140px]"
              >
                <option value="">Sin asignar</option>
                {waiters.filter(w => w.active).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-text-primary)]">Secciones</h2>
          <button
            type="button"
            onClick={openCreate}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-semibold"
          >
            + Sección
          </button>
        </div>

        {sections.length === 0 && unassignedTables.length === 0 ? null : null}

        {sections.map(sec => {
          const secTables = tables.filter(t => sec.tableIds.includes(t.id))
          return (
            <div key={sec.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">{sec.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {sec.assignedWaiterName ? `👤 ${sec.assignedWaiterName}` : 'Sin mesero asignado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(sec)} className="text-xs text-[var(--color-accent)] hover:underline">Editar</button>
                  <button type="button" onClick={() => handleDeleteSection(sec.id)} className="text-xs text-[var(--color-danger)] hover:underline">Eliminar</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {secTables.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)]">Sin mesas asignadas</span>
                ) : secTables.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-secondary)]">
                    🪑 {t.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}

        {unassignedTables.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">Sin sección asignada</p>
            <div className="flex flex-wrap gap-2">
              {unassignedTables.map(t => (
                <span key={t.id} className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {sections.length === 0 && (
          <div className="text-center py-10 text-[var(--color-text-muted)] text-sm">
            Sin secciones configuradas. Crea una para agrupar mesas por zona.
          </div>
        )}
      </div>

      {/* ── Active waiters list ── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm">Meseros activos</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Para agregar o editar meseros ve a Empleados</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {waiters.filter(w => w.active).map(w => {
            const assignedTables = tables.filter(t => t.waiterId === w.id)
            return (
              <div key={w.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">👤 {w.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {assignedTables.length > 0
                    ? assignedTables.map(t => t.name).join(', ')
                    : 'Sin mesas asignadas'}
                </p>
              </div>
            )
          })}
          {waiters.filter(w => w.active).length === 0 && (
            <p className="px-4 py-4 text-sm text-[var(--color-text-muted)]">Sin meseros activos. Agrega empleados con rol Mesero.</p>
          )}
        </div>
      </div>

      {/* ── Section form modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-[var(--color-text-primary)] mb-4">
              {editId ? 'Editar sección' : 'Nueva sección'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nombre de la sección</label>
                <input
                  autoFocus
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Terraza, Barra, Interior…"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Mesero asignado</label>
                <select
                  value={formWaiterId}
                  onChange={e => setFormWaiterId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="">Sin asignar</option>
                  {waiters.filter(w => w.active).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Mesas en esta sección</label>
                <div className="flex flex-wrap gap-2">
                  {tables.map(t => {
                    const selected = formTableIds.includes(t.id)
                    // Disable if assigned to another section (not being edited)
                    const otherSection = sections.find(s => s.id !== editId && s.tableIds.includes(t.id))
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => !otherSection && toggleTable(t.id)}
                        disabled={!!otherSection}
                        title={otherSection ? `Ya asignada a ${otherSection.name}` : undefined}
                        className={[
                          'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                          selected
                            ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                            : otherSection
                              ? 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] opacity-40 cursor-not-allowed'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]',
                        ].join(' ')}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {formError && <p className="mt-3 text-xs text-[var(--color-danger)]">{formError}</p>}

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
