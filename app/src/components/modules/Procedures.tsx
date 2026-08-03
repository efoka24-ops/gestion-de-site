'use client';
import { useState } from 'react';
import { Procedure, ProcedureItem } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  procedures: Procedure[];
  onChange: (procedures: Procedure[]) => void;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  entree: { label: 'Entrée', icon: '📥' },
  sortie: { label: 'Sortie', icon: '📤' },
  controle: { label: 'Contrôle', icon: '🔍' },
  autre: { label: 'Autre', icon: '📋' },
};

const DEFAULT_CHECKLISTS: Record<string, { nom: string; items: string[] }> = {
  entree: {
    nom: 'Réception des matières premières',
    items: [
      'Vérifier le bon de livraison vs commande',
      "Contrôler l'état des emballages",
      'Vérifier les dates de péremption',
      'Peser / compter les quantités reçues',
      'Prélever un échantillon pour le contrôle qualité',
      'Enregistrer la réception dans le stock',
      'Ranger selon la règle FIFO',
    ],
  },
  controle: {
    nom: 'Contrôle qualité',
    items: [
      'Prélever les échantillons du lot',
      'Contrôle visuel (aspect, corps étrangers)',
      'Mesures physico-chimiques (pH, humidité...)',
      "Vérifier l'étiquetage et la traçabilité",
      'Enregistrer les résultats',
      'Statuer : conforme / non conforme',
      'Bloquer et isoler les lots non conformes',
    ],
  },
  sortie: {
    nom: 'Sortie des produits finis',
    items: [
      'Vérifier le bon de commande client',
      'Contrôler la conformité des produits finis',
      'Vérifier les quantités et les dates',
      'Enregistrer la sortie dans le stock',
      'Éditer le bon de livraison',
      'Charger et vérifier le transport',
    ],
  },
  autre: {
    nom: '',
    items: [],
  },
};

export default function Procedures({ procedures, onChange }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nom: DEFAULT_CHECKLISTS.entree.nom, type: 'entree' as Procedure['type'], creePar: '' });
  const [newItems, setNewItems] = useState<{ label: string; selected: boolean }[]>(
    DEFAULT_CHECKLISTS.entree.items.map(label => ({ label, selected: true }))
  );
  const [customItem, setCustomItem] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const changeType = (type: Procedure['type']) => {
    const defaults = DEFAULT_CHECKLISTS[type];
    setNewForm(f => ({ ...f, type, nom: defaults.nom || f.nom }));
    setNewItems(defaults.items.map(label => ({ label, selected: true })));
    setCustomItem('');
  };

  const toggleNewItem = (idx: number) => {
    setNewItems(items => items.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    setNewItems(items => [...items, { label: customItem.trim(), selected: true }]);
    setCustomItem('');
  };

  const toggleItem = (procId: string, itemId: string) => {
    const updated = procedures.map(p => {
      if (p.id !== procId) return p;
      return { ...p, items: p.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) };
    });
    onChange(updated);
  };

  const addProcedure = () => {
    const selectedItems = newItems.filter(i => i.selected);
    if (!newForm.nom || selectedItems.length === 0) { toast('Nom et au moins une étape obligatoires', 'error'); return; }
    const items: ProcedureItem[] = selectedItems.map((item, i) => ({
      id: generateId() + i, label: item.label, checked: false,
    }));
    const proc: Procedure = {
      id: generateId(), nom: newForm.nom, date: today, type: newForm.type,
      creePar: newForm.creePar || 'Chef de site', items, statut: 'en_cours', notes: '',
    };
    onChange([...procedures, proc]);
    setNewForm({ nom: DEFAULT_CHECKLISTS.entree.nom, type: 'entree', creePar: '' });
    setNewItems(DEFAULT_CHECKLISTS.entree.items.map(label => ({ label, selected: true })));
    setShowNew(false);
    toast('Procédure créée');
  };

  const addItem = (procId: string, label: string) => {
    if (!label.trim()) return;
    const updated = procedures.map(p => {
      if (p.id !== procId) return p;
      return { ...p, items: [...p.items, { id: generateId(), label: label.trim(), checked: false }] };
    });
    onChange(updated);
    toast('Étape ajoutée');
  };

  const removeItem = (procId: string, itemId: string) => {
    const updated = procedures.map(p => {
      if (p.id !== procId) return p;
      return { ...p, items: p.items.filter(i => i.id !== itemId) };
    });
    onChange(updated);
  };

  const validerProcedure = (procId: string) => {
    const updated = procedures.map(p => p.id === procId ? { ...p, statut: 'valide' as const } : p);
    onChange(updated);
    toast('Procédure validée ✓');
  };

  const resetProcedure = (procId: string) => {
    const updated = procedures.map(p => p.id === procId ? { ...p, statut: 'en_cours' as const, date: today, items: p.items.map(i => ({ ...i, checked: false })) } : p);
    onChange(updated);
    toast('Procédure réinitialisée');
  };

  const updateNotes = (procId: string, notes: string) => {
    onChange(procedures.map(p => p.id === procId ? { ...p, notes } : p));
  };

  const removeProcedure = (id: string) => { onChange(procedures.filter(p => p.id !== id)); toast('Procédure supprimée'); };

  const exportPDF = (proc: Procedure) => {
    const done = proc.items.filter(i => i.checked).length;
    const total = proc.items.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const typeInfo = TYPE_LABELS[proc.type] || TYPE_LABELS.autre;

    const html = `<!DOCTYPE html><html><head><title>Procédure — ${proc.nom}</title>
    <style>
      body{font-family:'Inter',Arial,sans-serif;max-width:800px;margin:30px auto;padding:20px;color:#1e293b;font-size:13px}
      h1{color:#b45309;text-align:center;font-size:20px;margin-bottom:4px}
      h2{color:#334155;font-size:14px;border-left:4px solid #d97706;padding-left:10px;margin-top:20px}
      .subtitle{text-align:center;color:#64748b;font-size:12px;font-style:italic}
      .meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:16px 0}
      .meta-box{border:1px solid #e2e8f0;padding:8px;text-align:center;border-radius:6px}
      .meta-box strong{display:block;font-size:14px;margin-top:4px}
      .checklist{list-style:none;padding:0;margin:16px 0}
      .checklist li{padding:8px 12px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px}
      .check{width:18px;height:18px;border:2px solid #cbd5e1;border-radius:4px;display:inline-block;text-align:center;line-height:18px;font-size:12px}
      .check.done{background:#10b981;border-color:#10b981;color:white}
      .notes{background:#f8fafc;padding:12px;border-radius:6px;margin:12px 0;min-height:40px;white-space:pre-wrap}
      .progress-bar{width:100%;height:10px;background:#e2e8f0;border-radius:5px;margin:12px 0}
      .progress-fill{height:10px;border-radius:5px}
      .footer{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:2px solid #d97706;padding-top:16px}
      .footer div{border:1px solid #e2e8f0;padding:16px;min-height:60px;border-radius:6px}
      @media print{body{margin:0;padding:10px}}
    </style></head><body>
      <h1>KAFARM INDUSTRY SARL</h1>
      <h1 style="font-size:16px">PROCÉDURE — ${proc.nom.toUpperCase()}</h1>
      <p class="subtitle">${typeInfo.icon} ${typeInfo.label}</p>
      <div class="meta">
        <div class="meta-box">Date<strong>${proc.date}</strong></div>
        <div class="meta-box">Créé par<strong>${proc.creePar || '—'}</strong></div>
        <div class="meta-box">Statut<strong>${proc.statut === 'valide' ? '✅ Validé' : '⏳ En cours'}</strong></div>
        <div class="meta-box">Avancement<strong>${pct}% (${done}/${total})</strong></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? '#10b981' : '#f59e0b'}"></div></div>
      <h2>Checklist</h2>
      <ul class="checklist">
        ${proc.items.map((item, i) => `<li><span class="check ${item.checked ? 'done' : ''}">${item.checked ? '✓' : ''}</span> <strong>${i + 1}.</strong> ${item.label}</li>`).join('')}
      </ul>
      ${proc.notes ? `<h2>Notes / Observations</h2><div class="notes">${proc.notes}</div>` : ''}
      <div class="footer">
        <div><strong>Signature — Chef de site</strong></div>
        <div><strong>Visa — Direction</strong></div>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">KAFARM INDUSTRY SARL — Procédure ${proc.nom}</p>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-800">Procédures</h2>
          <p className="text-sm text-slate-500">Le chef de site initialise les procédures de conformité pour les entrées et sorties</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvelle procédure</button>
      </div>

      {/* New procedure form */}
      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3">Créer une procédure</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div><label className="text-xs text-slate-500">Nom de la procédure</label><input value={newForm.nom} onChange={e => setNewForm({ ...newForm, nom: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Réception arachides" /></div>
            <div><label className="text-xs text-slate-500">Type</label>
              <select value={newForm.type} onChange={e => changeType(e.target.value as Procedure['type'])} className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500">Créé par</label><input value={newForm.creePar} onChange={e => setNewForm({ ...newForm, creePar: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Chef de site" /></div>
          </div>

          {/* Checklist items with checkboxes */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-2 block">Étapes à inclure <span className="text-slate-400">(décochez celles à retirer, ajoutez des personnalisées)</span></label>
            <div className="space-y-1.5 bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              {newItems.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={item.selected} onChange={() => toggleNewItem(i)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400" />
                  <span className={`text-sm ${item.selected ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{item.label}</span>
                  {i >= (DEFAULT_CHECKLISTS[newForm.type]?.items.length || 0) && (
                    <button onClick={() => setNewItems(items => items.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 ml-auto">✕</button>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input placeholder="Ajouter une étape personnalisée..." value={customItem} onChange={e => setCustomItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={addCustomItem} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm">+ Ajouter</button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{newItems.filter(i => i.selected).length} étape(s) sélectionnée(s)</p>
          </div>
          <button onClick={addProcedure} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Créer</button>
        </div>
      )}

      {procedures.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune procédure. Le chef de site peut en créer une.</div>
      ) : (
        <div className="space-y-4">
          {procedures.map(proc => {
            const done = proc.items.filter(i => i.checked).length;
            const total = proc.items.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isExpanded = expandedId === proc.id;
            const typeInfo = TYPE_LABELS[proc.type] || TYPE_LABELS.autre;

            return (
              <div key={proc.id} className={`bg-white rounded-xl shadow-sm border p-5 ${proc.statut === 'valide' ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : proc.id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-800">{proc.nom}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{proc.date}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{typeInfo.label}</span>
                        {proc.creePar && <span className="text-xs text-slate-400">par {proc.creePar}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proc.statut === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{proc.statut === 'valide' ? '✅ Validé' : '⏳ En cours'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${pct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{done}/{total} — {pct}%</span>
                    <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>

                {isExpanded && (
                  <div>
                    <ul className="space-y-2 mb-4">
                      {proc.items.map(item => (
                        <li key={item.id} className="flex items-center justify-between group">
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input type="checkbox" checked={item.checked} onChange={() => toggleItem(proc.id, item.id)} disabled={proc.statut === 'valide'}
                              className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                            <span className={`text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
                          </label>
                          {proc.statut !== 'valide' && <button onClick={() => removeItem(proc.id, item.id)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">✕</button>}
                        </li>
                      ))}
                    </ul>

                    {/* Add item */}
                    {proc.statut !== 'valide' && (
                      <div className="flex gap-2 mb-4">
                        <input placeholder="Ajouter une étape..." value={newItemText[proc.id] || ''} onChange={e => setNewItemText({ ...newItemText, [proc.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { addItem(proc.id, newItemText[proc.id] || ''); setNewItemText({ ...newItemText, [proc.id]: '' }); } }}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                        <button onClick={() => { addItem(proc.id, newItemText[proc.id] || ''); setNewItemText({ ...newItemText, [proc.id]: '' }); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm">+ Ajouter</button>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="text-xs text-slate-500">Notes / Observations</label>
                      <textarea rows={2} value={proc.notes || ''} onChange={e => updateNotes(proc.id, e.target.value)} disabled={proc.statut === 'valide'}
                        className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Observations du chef de site..." />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {proc.statut === 'en_cours' && (
                        <button onClick={() => validerProcedure(proc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">✓ Valider la procédure</button>
                      )}
                      {proc.statut === 'valide' && (
                        <button onClick={() => resetProcedure(proc.id)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">↻ Réinitialiser</button>
                      )}
                      <button onClick={() => exportPDF(proc)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">📄 Télécharger PDF</button>
                      <button onClick={() => removeProcedure(proc.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">Supprimer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
