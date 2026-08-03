'use client';
import { useState } from 'react';

const modules = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
  { id: 'fiches', label: 'Fiches de poste', icon: '📋' },
  { id: 'procedures', label: 'Procédures', icon: '✅' },
  { id: 'stocks', label: 'Articles & stocks', icon: '📦' },
  { id: 'inventaire', label: 'Inventaire', icon: '🔍' },
  { id: 'achats', label: 'Achats & Dépenses', icon: '💰' },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: '🏪' },
  { id: 'saisonnalite', label: 'Saisonnalité', icon: '🌿' },
  { id: 'recrutement', label: 'Recrutement', icon: '👥' },
  { id: 'reporting', label: 'Reporting', icon: '📈' },
  { id: 'production', label: 'Production', icon: '🏭' },
  { id: 'rh', label: 'Administration RH', icon: '🧑‍💼' },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
  onExportExcel: () => void;
}

export default function Sidebar({ active, onNavigate, onExportExcel }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 bg-slate-800 text-amber-400 p-2 rounded-lg shadow-lg"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 h-full w-64 bg-slate-900 text-white z-40 flex flex-col transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-lg font-bold font-heading text-amber-400">🏭 KAFARM INDUSTRY</h1>
          <p className="text-xs text-slate-400 mt-1">Gestion de production — Douala</p>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => { onNavigate(m.id); setMobileOpen(false); }}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 text-sm transition-colors ${
                active === m.id
                  ? 'bg-amber-500/20 text-amber-400 border-r-2 border-amber-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <button
            onClick={onExportExcel}
            className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 rounded text-sm font-medium transition-colors"
          >
            ⬇ Exporter Excel
          </button>
          <button
            onClick={() => window.print()}
            className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
          >
            🖨 Imprimer
          </button>
        </div>
      </aside>
    </>
  );
}
