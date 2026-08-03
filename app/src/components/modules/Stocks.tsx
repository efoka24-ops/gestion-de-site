'use client';
import { useState } from 'react';
import { StockArticle, Lot, Mouvement, Fournisseur, CATEGORIES_LABELS, StockCategorie } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  stocks: StockArticle[];
  lots: Lot[];
  mouvements: Mouvement[];
  fournisseurs: Fournisseur[];
  onChangeStocks: (stocks: StockArticle[]) => void;
  onChangeLots: (lots: Lot[]) => void;
  onChangeMouvements: (mouvements: Mouvement[]) => void;
}

export default function Stocks({ stocks, lots, mouvements, fournisseurs, onChangeStocks, onChangeLots, onChangeMouvements }: Props) {
  const { toast } = useToast();
  const [selectedCat, setSelectedCat] = useState<StockCategorie | 'all'>('all');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [showEntree, setShowEntree] = useState<string | null>(null);
  const [showSortie, setShowSortie] = useState<string | null>(null);
  const [showNewArticle, setShowNewArticle] = useState(false);
  const [entreeForm, setEntreeForm] = useState({ quantite: '', dlc: '', fournisseurId: '', numero: '' });
  const [sortieForm, setSortieForm] = useState({ quantite: '', motif: '' });
  const [articleForm, setArticleForm] = useState({ reference: '', designation: '', unite: 'kg', categorie: 'mp_arachides' as StockCategorie, seuilAlerte: '' });

  const today = new Date().toISOString().slice(0, 10);

  const getStockTotal = (articleId: string) => lots.filter(l => l.articleId === articleId).reduce((s, l) => s + l.quantite, 0);
  const getArticleLots = (articleId: string) => lots.filter(l => l.articleId === articleId && l.quantite > 0).sort((a, b) => a.dlc.localeCompare(b.dlc));
  const getDlcProche = (articleId: string) => {
    const ls = getArticleLots(articleId);
    if (ls.length === 0) return null;
    const days = Math.ceil((new Date(ls[0].dlc).getTime() - Date.now()) / 86400000);
    return days;
  };

  const filtered = selectedCat === 'all' ? stocks : stocks.filter(s => s.categorie === selectedCat);

  const addArticle = () => {
    if (!articleForm.reference || !articleForm.designation) { toast('Référence et désignation obligatoires', 'error'); return; }
    onChangeStocks([...stocks, { id: generateId(), ...articleForm, seuilAlerte: Number(articleForm.seuilAlerte) || 0 }]);
    setArticleForm({ reference: '', designation: '', unite: 'kg', categorie: 'mp_arachides', seuilAlerte: '' });
    setShowNewArticle(false);
    toast('Article ajouté');
  };

  const addEntree = (articleId: string) => {
    const qty = Number(entreeForm.quantite);
    if (!qty || qty <= 0 || !entreeForm.dlc) { toast('Quantité et DLC obligatoires', 'error'); return; }
    const newLot: Lot = { id: generateId(), articleId, quantite: qty, dlc: entreeForm.dlc, dateEntree: today, fournisseurId: entreeForm.fournisseurId || undefined, numero: entreeForm.numero || `LOT-${Date.now().toString(36).toUpperCase()}` };
    onChangeLots([...lots, newLot]);
    onChangeMouvements([...mouvements, { id: generateId(), articleId, lotId: newLot.id, type: 'entree', quantite: qty, date: new Date().toISOString(), motif: `Entrée lot ${newLot.numero}`, dlc: entreeForm.dlc }]);
    setEntreeForm({ quantite: '', dlc: '', fournisseurId: '', numero: '' });
    setShowEntree(null);
    toast(`Entrée enregistrée — lot ${newLot.numero}`);
  };

  const addSortie = (articleId: string) => {
    let qty = Number(sortieForm.quantite);
    if (!qty || qty <= 0) { toast('Quantité invalide', 'error'); return; }
    const total = getStockTotal(articleId);
    if (qty > total) { toast(`Stock insuffisant ! Disponible: ${total}`, 'error'); return; }

    // FEFO: prélever sur les lots à DLC la plus proche
    const articleLots = getArticleLots(articleId);
    const updatedLots = [...lots];
    let remaining = qty;
    const affectedLots: string[] = [];

    for (const lot of articleLots) {
      if (remaining <= 0) break;
      const idx = updatedLots.findIndex(l => l.id === lot.id);
      const take = Math.min(remaining, updatedLots[idx].quantite);
      updatedLots[idx] = { ...updatedLots[idx], quantite: updatedLots[idx].quantite - take };
      remaining -= take;
      affectedLots.push(`${lot.numero} (-${take})`);
    }

    onChangeLots(updatedLots);
    onChangeMouvements([...mouvements, { id: generateId(), articleId, type: 'sortie', quantite: qty, date: new Date().toISOString(), motif: sortieForm.motif || 'Sortie FEFO' }]);
    setSortieForm({ quantite: '', motif: '' });
    setShowSortie(null);
    toast(`Sortie FEFO: ${affectedLots.join(', ')}`);
  };

  const removeArticle = (id: string) => {
    onChangeStocks(stocks.filter(s => s.id !== id));
    onChangeLots(lots.filter(l => l.articleId !== id));
    toast('Article supprimé');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Suivi des stocks</h2>
        <button onClick={() => setShowNewArticle(!showNewArticle)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvel article</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setSelectedCat('all')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${selectedCat === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Tous</button>
        {(Object.keys(CATEGORIES_LABELS) as StockCategorie[]).map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${selectedCat === cat ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{CATEGORIES_LABELS[cat]}</button>
        ))}
      </div>

      {/* Alert: DLC proche */}
      {(() => {
        const dlcAlerts = stocks.filter(s => { const d = getDlcProche(s.id); return d !== null && d <= 30; });
        if (dlcAlerts.length === 0) return null;
        return (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-orange-700 text-sm mb-2">⏰ Lots à DLC proche (≤ 30 jours)</h3>
            <ul className="space-y-1">
              {dlcAlerts.map(s => {
                const days = getDlcProche(s.id)!;
                const firstLot = getArticleLots(s.id)[0];
                return <li key={s.id} className="text-sm text-orange-800">
                  <strong>{s.designation}</strong> — Lot {firstLot.numero} : DLC {firstLot.dlc} ({days <= 0 ? <span className="text-red-700 font-bold">EXPIRÉ</span> : <span>{days}j restants</span>})
                </li>;
              })}
            </ul>
          </div>
        );
      })()}

      {showNewArticle && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3">Nouvel article</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input placeholder="Référence" value={articleForm.reference} onChange={e => setArticleForm({ ...articleForm, reference: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Désignation" value={articleForm.designation} onChange={e => setArticleForm({ ...articleForm, designation: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Unité" value={articleForm.unite} onChange={e => setArticleForm({ ...articleForm, unite: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <select value={articleForm.categorie} onChange={e => setArticleForm({ ...articleForm, categorie: e.target.value as StockCategorie })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
              {(Object.keys(CATEGORIES_LABELS) as StockCategorie[]).map(c => <option key={c} value={c}>{CATEGORIES_LABELS[c]}</option>)}
            </select>
            <input type="number" placeholder="Seuil alerte" value={articleForm.seuilAlerte} onChange={e => setArticleForm({ ...articleForm, seuilAlerte: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
          </div>
          <button onClick={addArticle} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ajouter</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucun article dans cette catégorie.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const total = getStockTotal(s.id);
            const isAlert = total <= s.seuilAlerte;
            const dlcDays = getDlcProche(s.id);
            const isDlcAlert = dlcDays !== null && dlcDays <= 30;
            const pct = s.seuilAlerte > 0 ? Math.min(100, Math.round((total / (s.seuilAlerte * 3)) * 100)) : 50;
            const articleLots = getArticleLots(s.id);
            const isExpanded = expandedArticle === s.id;

            return (
              <div key={s.id} className={`bg-white rounded-xl shadow-sm border p-5 ${isAlert ? 'border-red-300 bg-red-50/30' : isDlcAlert ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedArticle(isExpanded ? null : s.id)}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{s.reference}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{CATEGORIES_LABELS[s.categorie]}</span>
                      <h3 className="font-bold text-slate-800">{s.designation}</h3>
                      {isAlert && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">⚠ STOCK BAS</span>}
                      {isDlcAlert && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⏰ DLC {dlcDays! <= 0 ? 'EXPIRÉE' : `${dlcDays}j`}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Seuil: {s.seuilAlerte} {s.unite} · {articleLots.length} lot(s) actif(s)</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold font-heading ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>{total}</p>
                    <p className="text-xs text-slate-500">{s.unite}</p>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
                  <div className={`h-2.5 rounded-full transition-all ${isAlert ? 'bg-red-500' : pct > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); setShowEntree(s.id); setEntreeForm({ quantite: '', dlc: '', fournisseurId: '', numero: '' }); }} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded font-medium">+ Entrée (nouveau lot)</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowSortie(s.id); setSortieForm({ quantite: '', motif: '' }); }} className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-medium">− Sortie FEFO</button>
                  <button onClick={(e) => { e.stopPropagation(); setExpandedArticle(isExpanded ? null : s.id); }} className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded font-medium ml-auto">{isExpanded ? '▲ Masquer lots' : '▼ Voir lots'}</button>
                  <button onClick={(e) => { e.stopPropagation(); removeArticle(s.id); }} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded">Supprimer</button>
                </div>

                {/* Entrée form */}
                {showEntree === s.id && (
                  <div className="mt-3 bg-emerald-50 p-4 rounded-lg" onClick={e => e.stopPropagation()}>
                    <h4 className="text-sm font-bold text-emerald-800 mb-2">Nouvelle entrée — Lot</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input placeholder="N° lot (auto si vide)" value={entreeForm.numero} onChange={e => setEntreeForm({ ...entreeForm, numero: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
                      <input type="number" placeholder="Quantité" value={entreeForm.quantite} onChange={e => setEntreeForm({ ...entreeForm, quantite: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
                      <div><label className="text-xs text-slate-500">DLC</label><input type="date" value={entreeForm.dlc} onChange={e => setEntreeForm({ ...entreeForm, dlc: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-full" /></div>
                      <select value={entreeForm.fournisseurId} onChange={e => setEntreeForm({ ...entreeForm, fournisseurId: e.target.value })} className="border rounded px-2 py-1.5 text-sm">
                        <option value="">— Fournisseur —</option>
                        {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => addEntree(s.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm font-medium">Valider entrée</button>
                      <button onClick={() => setShowEntree(null)} className="text-slate-500 text-sm">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Sortie form */}
                {showSortie === s.id && (
                  <div className="mt-3 bg-orange-50 p-4 rounded-lg" onClick={e => e.stopPropagation()}>
                    <h4 className="text-sm font-bold text-orange-800 mb-2">Sortie FEFO — prélèvement automatique sur le lot à DLC la plus proche</h4>
                    <div className="flex gap-2 items-end">
                      <input type="number" placeholder="Quantité" value={sortieForm.quantite} onChange={e => setSortieForm({ ...sortieForm, quantite: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-28" />
                      <input placeholder="Motif" value={sortieForm.motif} onChange={e => setSortieForm({ ...sortieForm, motif: e.target.value })} className="border rounded px-2 py-1.5 text-sm flex-1" />
                      <button onClick={() => addSortie(s.id)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm font-medium">Valider sortie</button>
                      <button onClick={() => setShowSortie(null)} className="text-slate-500 text-sm">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Lots detail */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Lots (triés par DLC — FEFO)</h4>
                    {articleLots.length === 0 ? (
                      <p className="text-sm text-slate-400">Aucun lot en stock</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="text-slate-500 border-b">
                          <th className="text-left py-1 px-2">N° Lot</th>
                          <th className="text-right py-1 px-2">Quantité</th>
                          <th className="text-center py-1 px-2">DLC</th>
                          <th className="text-center py-1 px-2">Jours restants</th>
                          <th className="text-left py-1 px-2">Entrée le</th>
                          <th className="text-left py-1 px-2">Fournisseur</th>
                        </tr></thead>
                        <tbody>
                          {articleLots.map(lot => {
                            const days = Math.ceil((new Date(lot.dlc).getTime() - Date.now()) / 86400000);
                            const fourn = fournisseurs.find(f => f.id === lot.fournisseurId);
                            return (
                              <tr key={lot.id} className={`border-b border-slate-100 ${days <= 0 ? 'bg-red-50' : days <= 30 ? 'bg-orange-50' : ''}`}>
                                <td className="py-2 px-2 font-mono">{lot.numero}</td>
                                <td className="py-2 px-2 text-right font-bold">{lot.quantite}</td>
                                <td className="py-2 px-2 text-center">{lot.dlc}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${days <= 0 ? 'bg-red-200 text-red-800' : days <= 30 ? 'bg-orange-200 text-orange-800' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {days <= 0 ? 'EXPIRÉ' : `${days}j`}
                                  </span>
                                </td>
                                <td className="py-2 px-2">{lot.dateEntree}</td>
                                <td className="py-2 px-2">{fourn?.nom || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
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
