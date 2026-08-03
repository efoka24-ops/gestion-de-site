'use client';
import { useState } from 'react';
import { Candidat, FichePoste } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  candidats: Candidat[];
  fiches: FichePoste[];
  onChange: (candidats: Candidat[]) => void;
}

const PIPELINE: { key: Candidat['statut']; label: string; color: string }[] = [
  { key: 'besoin_defini', label: 'Besoin défini', color: 'bg-slate-200 text-slate-700' },
  { key: 'annonce_diffusee', label: 'Annonce diffusée', color: 'bg-blue-100 text-blue-700' },
  { key: 'cv_tries', label: 'CV triés', color: 'bg-purple-100 text-purple-700' },
  { key: 'entretiens', label: 'Entretiens', color: 'bg-amber-100 text-amber-700' },
  { key: 'recrute', label: 'Recruté', color: 'bg-emerald-100 text-emerald-700' },
];

export default function Recrutement({ candidats, fiches, onChange }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({ nom: '', contact: '', posteId: '', statut: 'besoin_defini' as Candidat['statut'] });
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!form.nom || !form.posteId) { toast('Nom et poste obligatoires', 'error'); return; }
    onChange([...candidats, { id: generateId(), ...form }]);
    setForm({ nom: '', contact: '', posteId: '', statut: 'besoin_defini' });
    setShowForm(false);
    toast('Candidat ajouté');
  };

  const updateStatut = (id: string, statut: Candidat['statut']) => {
    onChange(candidats.map(c => c.id === id ? { ...c, statut } : c));
    toast('Statut mis à jour');
  };

  const remove = (id: string) => { onChange(candidats.filter(c => c.id !== id)); toast('Candidat supprimé'); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Recrutement</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouveau candidat</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-wrap gap-3 items-end">
          <input placeholder="Nom complet" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:ring-2 focus:ring-amber-400 outline-none" />
          <input placeholder="Contact (tél/email)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:ring-2 focus:ring-amber-400 outline-none" />
          <select value={form.posteId} onChange={e => setForm({ ...form, posteId: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
            <option value="">— Poste —</option>
            {fiches.map(f => <option key={f.id} value={f.id}>{f.intitule}</option>)}
          </select>
          <button onClick={add} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ajouter</button>
        </div>
      )}

      {/* Pipeline view by poste */}
      {fiches.map(fiche => {
        const posteCandidats = candidats.filter(c => c.posteId === fiche.id);
        if (posteCandidats.length === 0) return null;
        return (
          <div key={fiche.id} className="mb-8">
            <h3 className="font-bold text-slate-700 text-lg mb-3">📋 {fiche.intitule}</h3>
            <div className="flex gap-2 mb-3 flex-wrap">
              {PIPELINE.map(stage => {
                const count = posteCandidats.filter(c => c.statut === stage.key).length;
                return <span key={stage.key} className={`text-xs px-3 py-1 rounded-full font-medium ${stage.color}`}>{stage.label}: {count}</span>;
              })}
            </div>
            <div className="space-y-2">
              {posteCandidats.map(c => (
                <div key={c.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-slate-800">{c.nom}</p>
                    <p className="text-xs text-slate-500">{c.contact}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={c.statut} onChange={e => updateStatut(c.id, e.target.value as Candidat['statut'])} className="text-xs border border-slate-300 rounded px-2 py-1">
                      {PIPELINE.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button onClick={() => remove(c.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {candidats.length === 0 && (
        <div className="text-center py-16 text-slate-400">Aucun candidat en cours. Cliquez sur &quot;+ Nouveau candidat&quot; pour démarrer un recrutement.</div>
      )}
    </div>
  );
}
