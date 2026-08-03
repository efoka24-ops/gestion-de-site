'use client';
import { useState, useMemo } from 'react';
import { Inventaire, InventaireLigne, StockArticle, Lot, CATEGORIES_LABELS, StockCategorie } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  inventaires: Inventaire[];
  stocks: StockArticle[];
  lots: Lot[];
  onChange: (inventaires: Inventaire[]) => void;
}

export default function InventaireModule({ inventaires, stocks, lots, onChange }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<'complet' | 'partiel' | 'tournant'>('complet');
  const [selectedCat, setSelectedCat] = useState<StockCategorie | 'all'>('all');
  const [expandedInv, setExpandedInv] = useState<string | null>(null);

  const getStockTotal = (articleId: string) => lots.filter(l => l.articleId === articleId).reduce((s, l) => s + l.quantite, 0);

  const startInventaire = () => {
    const articlesToCount = selectedCat === 'all' ? stocks : stocks.filter(s => s.categorie === selectedCat);
    if (articlesToCount.length === 0) { toast('Aucun article à inventorier', 'error'); return; }

    const lignes: InventaireLigne[] = articlesToCount.map(a => ({
      id: generateId(),
      articleId: a.id,
      date: today,
      stockSysteme: getStockTotal(a.id),
      stockPhysique: 0,
      ecart: 0 - getStockTotal(a.id),
      commentaire: '',
    }));

    const inv: Inventaire = {
      id: generateId(),
      date: today,
      type: newType,
      statut: 'en_cours',
      lignes,
      notes: '',
    };

    onChange([...inventaires, inv]);
    setShowNew(false);
    setExpandedInv(inv.id);
    toast('Inventaire créé — saisissez les comptages physiques');
  };

  const updateLigne = (invId: string, ligneId: string, stockPhysique: number, commentaire?: string) => {
    const updated = inventaires.map(inv => {
      if (inv.id !== invId) return inv;
      return {
        ...inv,
        lignes: inv.lignes.map(l => {
          if (l.id !== ligneId) return l;
          return { ...l, stockPhysique, ecart: stockPhysique - l.stockSysteme, commentaire: commentaire ?? l.commentaire };
        }),
      };
    });
    onChange(updated);
  };

  const updateCommentaire = (invId: string, ligneId: string, commentaire: string) => {
    const updated = inventaires.map(inv => {
      if (inv.id !== invId) return inv;
      return {
        ...inv,
        lignes: inv.lignes.map(l => l.id === ligneId ? { ...l, commentaire } : l),
      };
    });
    onChange(updated);
  };

  const validerInventaire = (invId: string) => {
    const updated = inventaires.map(inv => inv.id === invId ? { ...inv, statut: 'valide' as const } : inv);
    onChange(updated);
    toast('Inventaire validé');
  };

  const cloturerInventaire = (invId: string) => {
    const updated = inventaires.map(inv => inv.id === invId ? { ...inv, statut: 'cloture' as const } : inv);
    onChange(updated);
    toast('Inventaire clôturé');
  };

  const removeInventaire = (id: string) => { onChange(inventaires.filter(i => i.id !== id)); toast('Inventaire supprimé'); };

  const updateNotes = (invId: string, notes: string) => {
    const updated = inventaires.map(inv => inv.id === invId ? { ...inv, notes } : inv);
    onChange(updated);
  };

  // Stats for an inventory
  const getInvStats = (inv: Inventaire) => {
    const totalLignes = inv.lignes.length;
    const ecarts = inv.lignes.filter(l => l.ecart !== 0);
    const ecartPositif = inv.lignes.filter(l => l.ecart > 0).reduce((s, l) => s + l.ecart, 0);
    const ecartNegatif = inv.lignes.filter(l => l.ecart < 0).reduce((s, l) => s + l.ecart, 0);
    const fiabilite = totalLignes > 0 ? Math.round(((totalLignes - ecarts.length) / totalLignes) * 100) : 100;
    return { totalLignes, ecartsCount: ecarts.length, ecartPositif, ecartNegatif, fiabilite };
  };

  const typeLabels: Record<string, string> = { complet: 'Complet', partiel: 'Partiel', tournant: 'Tournant' };
  const statutLabels: Record<string, { label: string; cls: string }> = {
    en_cours: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
    valide: { label: 'Validé', cls: 'bg-amber-100 text-amber-700' },
    cloture: { label: 'Clôturé', cls: 'bg-emerald-100 text-emerald-700' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold font-heading text-slate-800">📋 Inventaire</h2>
        <button onClick={() => setShowNew(!showNew)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvel inventaire</button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3">Lancer un inventaire</h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-xs text-slate-500">Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as typeof newType)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="complet">Complet</option>
                <option value="partiel">Partiel (par catégorie)</option>
                <option value="tournant">Tournant</option>
              </select>
            </div>
            {newType === 'partiel' && (
              <div>
                <label className="text-xs text-slate-500">Catégorie</label>
                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value as StockCategorie | 'all')} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Toutes</option>
                  {(Object.keys(CATEGORIES_LABELS) as StockCategorie[]).map(c => <option key={c} value={c}>{CATEGORIES_LABELS[c]}</option>)}
                </select>
              </div>
            )}
            <button onClick={startInventaire} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Démarrer</button>
          </div>
        </div>
      )}

      {/* Inventaires list */}
      {inventaires.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucun inventaire réalisé.</div>
      ) : (
        <div className="space-y-4">
          {[...inventaires].reverse().map(inv => {
            const isExpanded = expandedInv === inv.id;
            const stats = getInvStats(inv);
            const statut = statutLabels[inv.statut];

            return (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 cursor-pointer" onClick={() => setExpandedInv(isExpanded ? null : inv.id)}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800 font-heading">{inv.date}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{typeLabels[inv.type]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statut.cls}`}>{statut.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center"><p className="text-xs text-slate-500">Articles</p><p className="font-bold">{stats.totalLignes}</p></div>
                      <div className="text-center"><p className="text-xs text-slate-500">Écarts</p><p className={`font-bold ${stats.ecartsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.ecartsCount}</p></div>
                      <div className="text-center"><p className="text-xs text-slate-500">Fiabilité</p><p className={`font-bold ${stats.fiabilite >= 95 ? 'text-emerald-600' : stats.fiabilite >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{stats.fiabilite}%</p></div>
                      <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-5">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600">Surplus (+)</p>
                        <p className="text-lg font-bold text-blue-700">+{stats.ecartPositif}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-red-600">Manquants (−)</p>
                        <p className="text-lg font-bold text-red-700">{stats.ecartNegatif}</p>
                      </div>
                      <div className={`border rounded-lg p-3 text-center ${stats.fiabilite >= 95 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        <p className="text-xs text-slate-600">Fiabilité stock</p>
                        <p className="text-lg font-bold">{stats.fiabilite}%</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600">Lignes comptées</p>
                        <p className="text-lg font-bold">{stats.totalLignes}</p>
                      </div>
                    </div>

                    {/* Lines table */}
                    <table className="w-full text-sm mb-4">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Article</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Stock système</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Stock physique</th>
                          <th className="text-center px-4 py-2 font-medium text-slate-600">Écart</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Commentaire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.lignes.map(l => {
                          const article = stocks.find(s => s.id === l.articleId);
                          return (
                            <tr key={l.id} className={`border-b border-slate-100 ${l.ecart !== 0 ? 'bg-red-50/50' : ''}`}>
                              <td className="px-4 py-2">
                                <span className="font-mono text-xs text-slate-400 mr-2">{article?.reference}</span>
                                <span className="font-medium">{article?.designation || l.articleId}</span>
                              </td>
                              <td className="px-4 py-2 text-right text-slate-600">{l.stockSysteme}</td>
                              <td className="px-4 py-2 text-right">
                                {inv.statut === 'en_cours' ? (
                                  <input type="number" value={l.stockPhysique || ''} onChange={e => updateLigne(inv.id, l.id, Number(e.target.value) || 0)}
                                    className="w-20 border rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-amber-400 outline-none" />
                                ) : <span className="font-bold">{l.stockPhysique}</span>}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.ecart === 0 ? 'bg-emerald-100 text-emerald-700' : l.ecart > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                  {l.ecart > 0 ? `+${l.ecart}` : l.ecart}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {inv.statut === 'en_cours' ? (
                                  <input value={l.commentaire} onChange={e => updateCommentaire(inv.id, l.id, e.target.value)}
                                    placeholder="Commentaire..." className="w-full border rounded px-2 py-1 text-xs" />
                                ) : <span className="text-xs text-slate-500">{l.commentaire || '—'}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="text-xs text-slate-500">Notes générales</label>
                      <textarea rows={2} value={inv.notes} onChange={e => updateNotes(inv.id, e.target.value)}
                        disabled={inv.statut === 'cloture'}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {inv.statut === 'en_cours' && (
                        <button onClick={() => validerInventaire(inv.id)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">✓ Valider</button>
                      )}
                      {inv.statut === 'valide' && (
                        <button onClick={() => cloturerInventaire(inv.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">🔒 Clôturer</button>
                      )}
                      <button onClick={() => removeInventaire(inv.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">Supprimer</button>
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
