import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranchStore, Branch } from '@/shared/store/branchStore'

export function BranchesPage() {
  const { branches, addBranch, updateBranch } = useBranchStore()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [newBranch, setNewBranch] = useState({ name: '', city: '', address: '' })
  const [editBranch, setEditBranch] = useState<Branch | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranch.name || !newBranch.city) return
    addBranch(newBranch)
    setNewBranch({ name: '', city: '', address: '' })
    setShowModal(false)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBranch) return
    updateBranch(editBranch.id, { name: editBranch.name, city: editBranch.city, address: editBranch.address })
    setEditBranch(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Sucursales</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-bold text-sm shadow-lg shadow-[var(--color-accent)]/20 active:scale-95 transition-transform"
        >
          <span>+</span>
          Agregar Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch, idx) => (
          <div
            key={branch.id}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3 relative overflow-hidden"
          >
            {/* Color accent bar */}
            <div
              className="absolute top-0 left-0 w-full h-1"
              style={{ background: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][idx % 5] }}
            />
            
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[var(--color-text-primary)]">{branch.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{branch.city}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                branch.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {branch.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{branch.address || 'Sin dirección'}</span>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] flex gap-2">
              <button
                onClick={() => setEditBranch(branch)}
                className="flex-1 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] rounded-lg transition-colors border border-[var(--color-border)]"
              >
                Configurar
              </button>
              <button
                onClick={() => navigate('/dashboard/reports')}
                className="px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] rounded-lg transition-colors border border-[var(--color-border)]"
              >
                Ver reporte
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Nueva Sucursal</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Nombre</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newBranch.name}
                    onChange={e => setNewBranch(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Sucursal Norte"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={newBranch.city}
                    onChange={e => setNewBranch(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ej. Mérida"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Dirección</label>
                  <input
                    type="text"
                    value={newBranch.address}
                    onChange={e => setNewBranch(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Ej. Calle 60 x 57 Centro"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 font-bold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 font-bold text-white bg-[var(--color-accent)] rounded-xl shadow-lg shadow-[var(--color-accent)]/20 active:scale-95 transition-transform"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit branch modal */}
      {editBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Configurar Sucursal</h2>
                <button onClick={() => setEditBranch(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Nombre</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={editBranch.name}
                    onChange={e => setEditBranch(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={editBranch.city}
                    onChange={e => setEditBranch(prev => prev ? { ...prev, city: e.target.value } : prev)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Dirección</label>
                  <input
                    type="text"
                    value={editBranch.address ?? ''}
                    onChange={e => setEditBranch(prev => prev ? { ...prev, address: e.target.value } : prev)}
                    placeholder="Ej. Calle 60 x 57 Centro"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditBranch(null)}
                    className="flex-1 py-3 font-bold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 font-bold text-white bg-[var(--color-accent)] rounded-xl shadow-lg shadow-[var(--color-accent)]/20 active:scale-95 transition-transform"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
