'use client';
import { useState, useMemo } from 'react';
import { Achat, StockArticle, Fournisseur, UniteProduction, UNITE_LABELS } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  achats: Achat[];
  stocks: StockArticle[];
  fournisseurs: Fournisseur[];
  onChange: (achats: Achat[]) => void;
}

export default function Achats({ achats, stocks, fournisseurs, onChange }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [showForm, setShowForm] = useState(false);
  const [filterUnite, setFilterUnite] = useState<UniteProduction | 'commun' | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'jour' | 'semaine' | 'mois' | 'all'>('mois');
  const [filterDate, setFilterDate] = useState(today);
  const [filterStatut, setFilterStatut] = useState<'all' | 'commande' | 'livre' | 'paye'>('all');

  const [form, setForm] = useState({
    date: today, fournisseurId: '', articleId: '', unite: 'commun' as UniteProduction | 'commun',
    quantite: '', prixUnitaire: '', devise: 'FCFA', bonCommande: '', statut: 'commande' as Achat['statut'], notes: '',
  });

  const save = () => {
    if (!form.fournisseurId || !form.articleId || !form.quantite || !form.prixUnitaire) {
      toast('Fournisseur, article, quantité et prix obligatoires', 'error'); return;
    }
    const qty = Number(form.quantite);
    const prix = Number(form.prixUnitaire);
    const achat: Achat = {
      id: generateId(), date: form.date, fournisseurId: form.fournisseurId, articleId: form.articleId,
      unite: form.unite, quantite: qty, prixUnitaire: prix, montantTotal: qty * prix,
      devise: form.devise, bonCommande: form.bonCommande, statut: form.statut, notes: form.notes,
    };
    onChange([...achats, achat]);
    setForm({ date: today, fournisseurId: '', articleId: '', unite: 'commun', quantite: '', prixUnitaire: '', devise: 'FCFA', bonCommande: '', statut: 'commande', notes: '' });
    setShowForm(false);
    toast('Achat enregistré');
  };

  const updateStatut = (id: string, statut: Achat['statut']) => {
    onChange(achats.map(a => a.id === id ? { ...a, statut } : a));
    toast(`Statut mis à jour: ${statutLabels[statut].label}`);
  };

  const remove = (id: string) => { onChange(achats.filter(a => a.id !== id)); toast('Achat supprimé'); };

  const filtered = useMemo(() => {
    let list = achats;
    if (filterUnite !== 'all') list = list.filter(a => a.unite === filterUnite);
    if (filterStatut !== 'all') list = list.filter(a => a.statut === filterStatut);
    if (filterPeriod === 'jour') {
      list = list.filter(a => a.date === filterDate);
    } else if (filterPeriod === 'semaine') {
      const d = new Date(filterDate);
      const dayOfWeek = d.getDay() || 7;
      const start = new Date(d); start.setDate(d.getDate() - dayOfWeek + 1);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      list = list.filter(a => a.date >= start.toISOString().slice(0, 10) && a.date <= end.toISOString().slice(0, 10));
    } else if (filterPeriod === 'mois') {
      list = list.filter(a => a.date.startsWith(filterDate.slice(0, 7)));
    }
    return list;
  }, [achats, filterUnite, filterStatut, filterPeriod, filterDate]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, a) => s + a.montantTotal, 0);
    const byUnite = new Map<string, number>();
    filtered.forEach(a => byUnite.set(a.unite, (byUnite.get(a.unite) || 0) + a.montantTotal));
    const byFournisseur = new Map<string, number>();
    filtered.forEach(a => byFournisseur.set(a.fournisseurId, (byFournisseur.get(a.fournisseurId) || 0) + a.montantTotal));
    const commandes = filtered.filter(a => a.statut === 'commande').length;
    const livres = filtered.filter(a => a.statut === 'livre').length;
    const payes = filtered.filter(a => a.statut === 'paye').length;
    return { total, byUnite, byFournisseur, commandes, livres, payes };
  }, [filtered]);

  const statutLabels: Record<string, { label: string; cls: string }> = {
    commande: { label: 'Commandé', cls: 'bg-blue-100 text-blue-700' },
    livre: { label: 'Livré', cls: 'bg-amber-100 text-amber-700' },
    paye: { label: 'Payé', cls: 'bg-emerald-100 text-emerald-700' },
  };

  const formatMontant = (n: number) => n.toLocaleString('fr-FR');
  const periodLabels: Record<string, string> = { jour: 'Jour', semaine: 'Semaine', mois: 'Mois', all: 'Tout' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold font-heading text-slate-800">💰 Achats & Dépenses</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvel achat</button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 uppercase">Total dépenses</p>
          <p className="text-xl font-bold text-blue-700">{formatMontant(stats.total)} FCFA</p>
        </div>
        {Array.from(stats.byUnite.entries()).map(([unite, total]) => (
          <div key={unite} className={`border rounded-xl p-4 text-center ${unite === 'arachide' ? 'bg-orange-50 border-orange-200' : unite === 'plantain' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-xs uppercase">{unite === 'arachide' ? '🥜 Arachide' : unite === 'plantain' ? '🍌 Plantain' : '📦 Commun'}</p>
            <p className="text-lg font-bold">{formatMontant(total)} FCFA</p>
          </div>
        ))}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase">Commandes</p>
          <div className="flex justify-center gap-2 mt-1 text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{stats.commandes} cmd</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{stats.livres} liv</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{stats.payes} payé</span>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3">Nouvel achat</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Fournisseur</label>
              <select value={form.fournisseurId} onChange={e => setForm({ ...form, fournisseurId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— Choisir —</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500">Article</label>
              <select value={form.articleId} onChange={e => setForm({ ...form, articleId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— Choisir —</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.designation} ({s.reference})</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500">Unité rattachée</label>
              <select value={form.unite} onChange={e => setForm({ ...form, unite: e.target.value as typeof form.unite })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="commun">Commun</option>
                <option value="arachide">🥜 Unité Arachide</option>
                <option value="plantain">🍌 Unité Plantain</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><label className="text-xs text-slate-500">Quantité</label><input type="number" value={form.quantite} onChange={e => setForm({ ...form, quantite: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Prix unitaire</label><input type="number" value={form.prixUnitaire} onChange={e => setForm({ ...form, prixUnitaire: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Montant total</label><input readOnly value={Number(form.quantite || 0) * Number(form.prixUnitaire || 0)} className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 font-bold" /></div>
            <div><label className="text-xs text-slate-500">N° bon commande</label><input value={form.bonCommande} onChange={e => setForm({ ...form, bonCommande: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Statut</label>
              <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value as Achat['statut'] })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="commande">Commandé</option>
                <option value="livre">Livré</option>
                <option value="paye">Payé</option>
              </select>
            </div>
          </div>
          <div className="mt-3"><label className="text-xs text-slate-500">Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <button onClick={save} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['jour', 'semaine', 'mois', 'all'] as const).map(p => (
            <button key={p} onClick={() => setFilterPeriod(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filterPeriod === p ? 'bg-amber-500 text-white' : 'text-slate-600'}`}>{periodLabels[p]}</button>
          ))}
        </div>
        {filterPeriod !== 'all' && <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />}
        <div className="flex gap-1">
          <button onClick={() => setFilterUnite('all')} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>Toutes</button>
          <button onClick={() => setFilterUnite('arachide')} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === 'arachide' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>🥜 Arachide</button>
          <button onClick={() => setFilterUnite('plantain')} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === 'plantain' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>🍌 Plantain</button>
          <button onClick={() => setFilterUnite('commun')} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === 'commun' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>📦 Commun</button>
        </div>
        <div className="flex gap-1">
          {(['all', 'commande', 'livre', 'paye'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatut(s)} className={`text-xs px-2 py-1.5 rounded-lg ${filterStatut === s ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {s === 'all' ? 'Tous' : statutLabels[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucun achat sur cette période.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Fournisseur</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Article</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unité</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Qté</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">PU</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(a => {
                const fourn = fournisseurs.find(f => f.id === a.fournisseurId);
                const article = stocks.find(s => s.id === a.articleId);
                const statut = statutLabels[a.statut];
                return (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{a.date}</td>
                    <td className="px-4 py-3 text-sm">{fourn?.nom || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{article?.designation || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${a.unite === 'arachide' ? 'bg-orange-100 text-orange-700' : a.unite === 'plantain' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {a.unite === 'arachide' ? '🥜' : a.unite === 'plantain' ? '🍌' : '📦'} {a.unite}
                    </span></td>
                    <td className="px-4 py-3 text-right">{a.quantite}</td>
                    <td className="px-4 py-3 text-right">{formatMontant(a.prixUnitaire)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMontant(a.montantTotal)} {a.devise}</td>
                    <td className="px-4 py-3 text-center">
                      <select value={a.statut} onChange={e => updateStatut(a.id, e.target.value as Achat['statut'])}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statut.cls}`}>
                        <option value="commande">Commandé</option>
                        <option value="livre">Livré</option>
                        <option value="paye">Payé</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right font-bold text-slate-600">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-lg text-slate-800">{formatMontant(filtered.reduce((s, a) => s + a.montantTotal, 0))} FCFA</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Top fournisseurs */}
      {stats.byFournisseur.size > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
          <h3 className="font-bold text-slate-700 mb-3">🏪 Dépenses par fournisseur</h3>
          <div className="space-y-2">
            {Array.from(stats.byFournisseur.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([fId, total]) => {
                const fourn = fournisseurs.find(f => f.id === fId);
                const pct = stats.total > 0 ? Math.round((total / stats.total) * 100) : 0;
                return (
                  <div key={fId} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-48 truncate">{fourn?.nom || fId}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4">
                      <div className="bg-amber-500 h-4 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold w-36 text-right">{formatMontant(total)} FCFA</span>
                    <span className="text-xs text-slate-500 w-10">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
