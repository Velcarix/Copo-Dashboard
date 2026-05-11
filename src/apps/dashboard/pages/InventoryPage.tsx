import { useEffect, useState } from 'react'
import React from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/authStore'

interface InventoryItem {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  isLow: boolean
  lastUpdated: string
}

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Vainilla', unit: 'grams', currentStock: 800, minStock: 1000, isLow: true, lastUpdated: '2026-03-26T10:00:00Z' },
  { id: 'i2', name: 'Chocolate', unit: 'grams', currentStock: 3200, minStock: 1000, isLow: false, lastUpdated: '2026-03-26T09:00:00Z' },
  { id: 'i3', name: 'Leche entera', unit: 'liters', currentStock: 3, minStock: 10, isLow: true, lastUpdated: '2026-03-26T08:00:00Z' },
  { id: 'i4', name: 'Fresa', unit: 'grams', currentStock: 5400, minStock: 1000, isLow: false, lastUpdated: '2026-03-25T18:00:00Z' },
  { id: 'i5', name: 'Café molido', unit: 'grams', currentStock: 2100, minStock: 500, isLow: false, lastUpdated: '2026-03-25T17:00:00Z' },
]

const UNIT_OPTIONS = ['grams', 'kilograms', 'liters', 'milliliters', 'units']
const UNIT_LABELS: Record<string, string> = {
  grams: 'Gramos (g)', kilograms: 'Kilogramos (kg)',
  liters: 'Litros (L)', milliliters: 'Mililitros (ml)', units: 'Piezas (pza)',
}

export function InventoryPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')

  // New item form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', unit: 'grams', currentStock: '', minStock: '' })
  const [newItemError, setNewItemError] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  useEffect(() => {
    if (!branchId) { setLoading(false); return }
    api.get<{ data: InventoryItem[] }>(`/api/v1/inventory?branchId=${branchId}`)
      .then(res => setItems(res.data))
      .catch(() => { if (import.meta.env.DEV) setItems(MOCK_INVENTORY) })
      .finally(() => setLoading(false))
  }, [branchId])

  async function handleAdjust(item: InventoryItem) {
    const qty = parseFloat(adjustQty)
    if (isNaN(qty) || qty === 0 || !adjustReason.trim()) return
    setAdjustError('')
    try {
      await api.post(`/api/v1/inventory/${item.id}/adjust`, { quantity: qty, reason: adjustReason })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentStock: i.currentStock + qty } : i))
      setAdjustId(null)
      setAdjustQty('')
      setAdjustReason('')
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.message : 'Error al ajustar')
    }
  }

  async function handleSaveNew() {
    if (!newItem.name.trim()) { setNewItemError('El nombre es obligatorio'); return }
    const stock = parseFloat(newItem.currentStock)
    const min = parseFloat(newItem.minStock)
    if (isNaN(stock) || stock < 0) { setNewItemError('Stock inicial inválido'); return }
    if (isNaN(min) || min < 0) { setNewItemError('Stock mínimo inválido'); return }
    setSavingNew(true)
    setNewItemError('')
    try {
      // await api.post('/api/v1/inventory', { ...newItem, currentStock: stock, minStock: min, branchId: 'default' })
      await new Promise(r => setTimeout(r, 350))
      const created: InventoryItem = {
        id: `i-${Date.now()}`, name: newItem.name, unit: newItem.unit,
        currentStock: stock, minStock: min,
        isLow: stock < min, lastUpdated: new Date().toISOString(),
      }
      setItems(prev => [...prev, created])
      setNewItem({ name: '', unit: 'grams', currentStock: '', minStock: '' })
      setShowNewForm(false)
    } catch (err) {
      setNewItemError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSavingNew(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">Cargando…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Inventario</h1>
        <button
          type="button"
          onClick={() => { setShowNewForm(v => !v); setNewItemError('') }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Nuevo insumo
        </button>
      </div>

      {showNewForm && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nuevo insumo</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Nombre *</label>
              <input
                type="text"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Vainilla"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Unidad *</label>
              <select
                value={newItem.unit}
                onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Stock inicial</label>
              <input
                type="number"
                value={newItem.currentStock}
                onChange={e => setNewItem(p => ({ ...p, currentStock: e.target.value }))}
                onFocus={e => e.target.select()}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Stock mínimo (alerta)</label>
              <input
                type="number"
                value={newItem.minStock}
                onChange={e => setNewItem(p => ({ ...p, minStock: e.target.value }))}
                onFocus={e => e.target.select()}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          {newItemError && <p className="text-xs text-[var(--color-danger)]">{newItemError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors">Cancelar</button>
            <button type="button" onClick={handleSaveNew} disabled={savingNew} className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold disabled:opacity-50">
              {savingNew ? 'Guardando…' : 'Guardar insumo'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {['Insumo', 'Stock actual', 'Mínimo', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <React.Fragment key={item.id}>
                <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{item.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{item.currentStock} {item.unit}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{item.minStock} {item.unit}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      item.isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
                    ].join(' ')}>
                      {item.isLow ? 'Stock bajo' : 'OK'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setAdjustId(adjustId === item.id ? null : item.id)}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
                {adjustId === item.id && (
                  <tr className="bg-[var(--color-bg)]">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          value={adjustQty}
                          onChange={e => setAdjustQty(e.target.value)}
                          placeholder="Cantidad (+/-)"
                          className="w-32 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={e => setAdjustReason(e.target.value)}
                          placeholder="Motivo"
                          className="flex-1 min-w-[140px] px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjust(item)}
                          disabled={!adjustQty || !adjustReason.trim()}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold disabled:opacity-40"
                        >
                          Confirmar
                        </button>
                        {adjustError && <p className="text-xs text-[var(--color-danger)]">{adjustError}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
