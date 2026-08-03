'use client';
import { useState, useMemo } from 'react';
import { ProductionJour, ConfigUnite, UniteProduction, UNITE_LABELS } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  productions: ProductionJour[];
  configUnites: ConfigUnite[];
  onChange: (productions: ProductionJour[]) => void;
  onChangeConfig: (config: ConfigUnite[]) => void;
}

export default function Production({ productions, configUnites, onChange, onChangeConfig }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedUnite, setSelectedUnite] = useState<UniteProduction>('arachide');
  const [filterUnite, setFilterUnite] = useState<UniteProduction | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
  const [filterDate, setFilterDate] = useState(today);
  const [showConfig, setShowConfig] = useState(false);
  const [tab, setTab] = useState<'saisie' | 'historique' | 'rendement'>('saisie');

  const currentConfig = configUnites.find(c => c.id === selectedUnite);
  const [form, setForm] = useState({
    date: today, produit: '', conditionnement: '', objectif: '', realise: '', pertes: '', machine: '', blocages: ''
  });

  const [newProduit, setNewProduit] = useState({ nom: '', conditionnement: '', poids: '' });
  const [newMachine, setNewMachine] = useState('');

  const save = () => {
    if (!form.produit || !form.objectif) { toast('Produit et objectif obligatoires', 'error'); return; }
    const entry: ProductionJour = {
      id: generateId(), date: form.date, unite: selectedUnite,
      produit: form.produit, conditionnement: form.conditionnement,
      objectif: Number(form.objectif), realise: Number(form.realise) || 0,
      pertes: Number(form.pertes) || 0, machine: form.machine, blocages: form.blocages,
    };
    onChange([...productions, entry]);
    setForm({ date: today, produit: '', conditionnement: '', objectif: '', realise: '', pertes: '', machine: '', blocages: '' });
    toast('Production enregistrée');
  };

  const remove = (id: string) => { onChange(productions.filter(p => p.id !== id)); toast('Entrée supprimée'); };

  const filtered = useMemo(() => {
    let list = filterUnite === 'all' ? productions : productions.filter(p => p.unite === filterUnite);
    if (filterPeriod === 'jour') {
      list = list.filter(p => p.date === filterDate);
    } else if (filterPeriod === 'semaine') {
      const d = new Date(filterDate);
      const dayOfWeek = d.getDay() || 7;
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      list = list.filter(p => p.date >= s && p.date <= e);
    } else {
      const month = filterDate.slice(0, 7);
      list = list.filter(p => p.date.startsWith(month));
    }
    return list;
  }, [productions, filterUnite, filterPeriod, filterDate]);

  const stats = useMemo(() => {
    const totalObj = filtered.reduce((s, p) => s + p.objectif, 0);
    const totalReal = filtered.reduce((s, p) => s + p.realise, 0);
    const totalPertes = filtered.reduce((s, p) => s + p.pertes, 0);
    const rendement = totalObj > 0 ? Math.round((totalReal / totalObj) * 100) : 0;
    const tauxPerte = totalReal > 0 ? ((totalPertes / (totalReal + totalPertes)) * 100).toFixed(1) : '0';

    const machineMap = new Map<string, { obj: number; real: number; pertes: number; count: number }>();
    filtered.forEach(p => {
      if (!p.machine) return;
      const m = machineMap.get(p.machine) || { obj: 0, real: 0, pertes: 0, count: 0 };
      m.obj += p.objectif; m.real += p.realise; m.pertes += p.pertes; m.count++;
      machineMap.set(p.machine, m);
    });

    const uniteMap = new Map<UniteProduction, { obj: number; real: number; pertes: number }>();
    filtered.forEach(p => {
      const u = uniteMap.get(p.unite) || { obj: 0, real: 0, pertes: 0 };
      u.obj += p.objectif; u.real += p.realise; u.pertes += p.pertes;
      uniteMap.set(p.unite, u);
    });

    return { totalObj, totalReal, totalPertes, rendement, tauxPerte, machineMap, uniteMap };
  }, [filtered]);

  const ecartBadge = (obj: number, real: number) => {
    if (obj === 0) return { text: '—', cls: 'bg-slate-100 text-slate-500' };
    const pct = Math.round((real / obj) * 100);
    const diff = real - obj;
    if (pct >= 100) return { text: `+${diff} (${pct}%)`, cls: 'bg-emerald-100 text-emerald-700' };
    if (pct >= 80) return { text: `${diff} (${pct}%)`, cls: 'bg-amber-100 text-amber-700' };
    return { text: `${diff} (${pct}%)`, cls: 'bg-red-100 text-red-700' };
  };

  const addProduitConfig = () => {
    if (!newProduit.nom || !newProduit.poids) return;
    const updated = configUnites.map(c => c.id === selectedUnite ? { ...c, produits: [...c.produits, { ...newProduit }] } : c);
    onChangeConfig(updated);
    setNewProduit({ nom: '', conditionnement: '', poids: '' });
    toast('Produit ajouté à la configuration');
  };

  const removeProduitConfig = (idx: number) => {
    const updated = configUnites.map(c => c.id === selectedUnite ? { ...c, produits: c.produits.filter((_, i) => i !== idx) } : c);
    onChangeConfig(updated);
  };

  const addMachineConfig = () => {
    if (!newMachine) return;
    const updated = configUnites.map(c => c.id === selectedUnite ? { ...c, machines: [...c.machines, newMachine] } : c);
    onChangeConfig(updated);
    setNewMachine('');
    toast('Machine ajoutée');
  };

  const removeMachineConfig = (idx: number) => {
    const updated = configUnites.map(c => c.id === selectedUnite ? { ...c, machines: c.machines.filter((_, i) => i !== idx) } : c);
    onChangeConfig(updated);
  };

  const periodLabels: Record<string, string> = { jour: 'Journalier', semaine: 'Hebdomadaire', mois: 'Mensuel' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Production</h2>
        <button onClick={() => setShowConfig(!showConfig)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium">⚙ Configuration</button>
      </div>

      {/* Unit selector */}
      <div className="flex gap-2 mb-4">
        {configUnites.map(u => (
          <button key={u.id} onClick={() => setSelectedUnite(u.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedUnite === u.id ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {u.id === 'arachide' ? '🥜' : '🍌'} {u.label}
          </button>
        ))}
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-4">⚙ Configuration — {UNITE_LABELS[selectedUnite]}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold text-slate-600 mb-2">Produits & conditionnements</h4>
              <div className="space-y-1 mb-3">
                {currentConfig?.produits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                    <span>{p.nom} — {p.conditionnement} {p.poids}</span>
                    <button onClick={() => removeProduitConfig(i)} className="text-red-500 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Nom produit" value={newProduit.nom} onChange={e => setNewProduit({ ...newProduit, nom: e.target.value })} className="border rounded px-2 py-1.5 text-sm flex-1" />
                <input placeholder="Conditionnement" value={newProduit.conditionnement} onChange={e => setNewProduit({ ...newProduit, conditionnement: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-28" />
                <input placeholder="Poids" value={newProduit.poids} onChange={e => setNewProduit({ ...newProduit, poids: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-20" />
                <button onClick={addProduitConfig} className="bg-amber-500 text-white px-3 py-1.5 rounded text-sm">+</button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-600 mb-2">Machines</h4>
              <div className="space-y-1 mb-3">
                {currentConfig?.machines.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                    <span>🔧 {m}</span>
                    <button onClick={() => removeMachineConfig(i)} className="text-red-500 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Nom machine" value={newMachine} onChange={e => setNewMachine(e.target.value)} className="border rounded px-2 py-1.5 text-sm flex-1" />
                <button onClick={addMachineConfig} className="bg-amber-500 text-white px-3 py-1.5 rounded text-sm">+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['saisie', 'historique', 'rendement'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'saisie' ? '✏ Saisie' : t === 'historique' ? '📋 Historique' : '📊 Rendement'}
          </button>
        ))}
      </div>

      {/* Saisie tab */}
      {tab === 'saisie' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8">
          <h3 className="font-bold text-slate-700 mb-4">Nouvelle saisie — {UNITE_LABELS[selectedUnite]}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" /></div>
            <div><label className="text-xs text-slate-500">Produit</label>
              <select value={form.produit} onChange={e => {
                const p = currentConfig?.produits.find(pr => `${pr.nom} ${pr.poids}` === e.target.value);
                setForm({ ...form, produit: e.target.value, conditionnement: p?.poids || '' });
              }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                <option value="">— Choisir —</option>
                {currentConfig?.produits.map((p, i) => (<option key={i} value={`${p.nom} ${p.poids}`}>{p.nom} — {p.conditionnement} {p.poids}</option>))}
              </select>
            </div>
            <div><label className="text-xs text-slate-500">Machine</label>
              <select value={form.machine} onChange={e => setForm({ ...form, machine: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                <option value="">— Machine —</option>
                {currentConfig?.machines.map((m, i) => (<option key={i} value={m}>{m}</option>))}
              </select>
            </div>
            <div><label className="text-xs text-slate-500">Conditionnement</label><input value={form.conditionnement} onChange={e => setForm({ ...form, conditionnement: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" placeholder="ex: 350g, 4kg" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-slate-500">Objectif (unités)</label><input type="number" value={form.objectif} onChange={e => setForm({ ...form, objectif: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" /></div>
            <div><label className="text-xs text-slate-500">Réalisé (unités)</label><input type="number" value={form.realise} onChange={e => setForm({ ...form, realise: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" /></div>
            <div><label className="text-xs text-slate-500">Pertes / Rebuts</label><input type="number" value={form.pertes} onChange={e => setForm({ ...form, pertes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" /></div>
            <div><label className="text-xs text-slate-500">Blocages</label><input value={form.blocages} onChange={e => setForm({ ...form, blocages: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" /></div>
          </div>
          <button onClick={save} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
        </div>
      )}

      {/* Filter bar for historique & rendement */}
      {tab !== 'saisie' && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {(['jour', 'semaine', 'mois'] as const).map(p => (
              <button key={p} onClick={() => setFilterPeriod(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filterPeriod === p ? 'bg-amber-500 text-white' : 'text-slate-600'}`}>{periodLabels[p]}</button>
            ))}
          </div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
          <div className="flex gap-1">
            <button onClick={() => setFilterUnite('all')} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>Toutes</button>
            {configUnites.map(u => (
              <button key={u.id} onClick={() => setFilterUnite(u.id)} className={`text-xs px-3 py-1.5 rounded-lg ${filterUnite === u.id ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{u.id === 'arachide' ? '🥜' : '🍌'} {u.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Historique tab */}
      {tab === 'historique' && (
        filtered.length === 0 ? <div className="text-center py-16 text-slate-400">Aucune saisie sur cette période.</div> : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unité</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Produit</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Machine</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Objectif</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Réalisé</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Pertes</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Rendement</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Blocages</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map(p => {
                  const badge = ecartBadge(p.objectif, p.realise);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{p.date}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.unite === 'arachide' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.unite === 'arachide' ? '🥜 Arachide' : '🍌 Plantain'}</span></td>
                      <td className="px-4 py-3 font-medium">{p.produit} <span className="text-xs text-slate-400">{p.conditionnement}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.machine || '—'}</td>
                      <td className="px-4 py-3 text-right">{p.objectif}</td>
                      <td className="px-4 py-3 text-right font-bold">{p.realise}</td>
                      <td className="px-4 py-3 text-right text-red-600">{p.pertes || 0}</td>
                      <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.cls}`}>{badge.text}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{p.blocages || '—'}</td>
                      <td className="px-4 py-3"><button onClick={() => remove(p.id)} className="text-xs text-red-500 hover:text-red-700">✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Rendement tab */}
      {tab === 'rendement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Production totale" value={stats.totalReal} color="blue" />
            <StatCard label="Objectif total" value={stats.totalObj} color="slate" />
            <StatCard label="Rendement global" value={`${stats.rendement}%`} color={stats.rendement >= 100 ? 'green' : stats.rendement >= 80 ? 'amber' : 'red'} />
            <StatCard label="Pertes totales" value={stats.totalPertes} color="red" />
            <StatCard label="Taux de perte" value={`${stats.tauxPerte}%`} color={Number(stats.tauxPerte) <= 2 ? 'green' : 'red'} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4">📊 Rendement par unité</h3>
            {stats.uniteMap.size === 0 ? <p className="text-slate-400 text-sm">Aucune donnée</p> : (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from(stats.uniteMap.entries()).map(([unite, d]) => {
                  const rendement = d.obj > 0 ? Math.round((d.real / d.obj) * 100) : 0;
                  return (
                    <div key={unite} className={`rounded-lg p-4 border ${unite === 'arachide' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <h4 className="font-bold text-sm mb-2">{unite === 'arachide' ? '🥜' : '🍌'} {UNITE_LABELS[unite]}</h4>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div><p className="text-slate-500">Objectif</p><p className="font-bold text-lg">{d.obj}</p></div>
                        <div><p className="text-slate-500">Réalisé</p><p className="font-bold text-lg">{d.real}</p></div>
                        <div><p className="text-slate-500">Pertes</p><p className="font-bold text-lg text-red-600">{d.pertes}</p></div>
                        <div><p className="text-slate-500">Rendement</p><p className={`font-bold text-lg ${rendement >= 100 ? 'text-emerald-600' : rendement >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{rendement}%</p></div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 mt-3">
                        <div className={`h-3 rounded-full ${rendement >= 100 ? 'bg-emerald-500' : rendement >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, rendement)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4">🔧 Rendement par machine</h3>
            {stats.machineMap.size === 0 ? <p className="text-slate-400 text-sm">Aucune donnée machine</p> : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Machine</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600">Sessions</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600">Objectif</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600">Réalisé</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600">Pertes</th>
                    <th className="text-center px-4 py-2 font-medium text-slate-600">Rendement</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(stats.machineMap.entries()).map(([machine, d]) => {
                    const rendement = d.obj > 0 ? Math.round((d.real / d.obj) * 100) : 0;
                    return (
                      <tr key={machine} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium">🔧 {machine}</td>
                        <td className="px-4 py-3 text-right">{d.count}</td>
                        <td className="px-4 py-3 text-right">{d.obj}</td>
                        <td className="px-4 py-3 text-right font-bold">{d.real}</td>
                        <td className="px-4 py-3 text-right text-red-600">{d.pertes}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-1 rounded-full ${rendement >= 100 ? 'bg-emerald-100 text-emerald-700' : rendement >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rendement}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color] || colors.slate}`}>
      <p className="text-xs uppercase tracking-wide font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold font-heading mt-1">{value}</p>
    </div>
  );
}
