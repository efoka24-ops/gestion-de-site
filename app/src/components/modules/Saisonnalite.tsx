'use client';
import { useState } from 'react';
import { Saisonnalite } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  saisonnalites: Saisonnalite[];
  onChange: (saisonnalites: Saisonnalite[]) => void;
}

const RECOMMANDATIONS = {
  achat_groupe: { label: 'Achat groupé en saison haute', color: 'bg-blue-100 text-blue-700', icon: '📦' },
  stock_tampon: { label: 'Stock tampon recommandé', color: 'bg-amber-100 text-amber-700', icon: '🏗️' },
  aucune: { label: 'Approvisionnement stable', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
};

export default function SaisonnaliteModule({ saisonnalites, onChange }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ matiere: '', periodeHaute: '', periodeBasse: '', recommandation: 'aucune' as Saisonnalite['recommandation'], notes: '' });

  const save = () => {
    if (!form.matiere) { toast('Matière obligatoire', 'error'); return; }
    onChange([...saisonnalites, { id: generateId(), ...form }]);
    setForm({ matiere: '', periodeHaute: '', periodeBasse: '', recommandation: 'aucune', notes: '' });
    setShowForm(false);
    toast('Saisonnalité enregistrée');
  };

  const remove = (id: string) => { onChange(saisonnalites.filter(s => s.id !== id)); toast('Entrée supprimée'); };

  // Determine current month to highlight active season
  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Saisonnalité des matières</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Ajouter</button>
      </div>

      <p className="text-sm text-slate-500 mb-6">📅 Mois en cours : <strong>{currentMonth}</strong> — Identifiez les périodes de haute et basse disponibilité pour anticiper vos achats.</p>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input placeholder="Matière" value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Période haute (ex: Sep-Déc)" value={form.periodeHaute} onChange={e => setForm({ ...form, periodeHaute: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Période basse (ex: Avr-Juil)" value={form.periodeBasse} onChange={e => setForm({ ...form, periodeBasse: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <select value={form.recommandation} onChange={e => setForm({ ...form, recommandation: e.target.value as Saisonnalite['recommandation'] })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
              <option value="achat_groupe">Achat groupé</option>
              <option value="stock_tampon">Stock tampon</option>
              <option value="aucune">Stable</option>
            </select>
          </div>
          <textarea rows={2} placeholder="Notes et recommandations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none mb-3" />
          <button onClick={save} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
        </div>
      )}

      {saisonnalites.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune donnée de saisonnalité.</div>
      ) : (
        <div className="space-y-4">
          {saisonnalites.map(s => {
            const rec = RECOMMANDATIONS[s.recommandation];
            return (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{s.matiere}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${rec.color}`}>{rec.icon} {rec.label}</span>
                  </div>
                  <button onClick={() => remove(s.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded">Supprimer</button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-medium">📈 Haute disponibilité</p>
                    <p className="text-sm font-bold text-emerald-800 mt-1">{s.periodeHaute || '—'}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium">📉 Basse disponibilité</p>
                    <p className="text-sm font-bold text-red-800 mt-1">{s.periodeBasse || '—'}</p>
                  </div>
                </div>
                {s.notes && <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-3">{s.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
