'use client';
import { useState } from 'react';
import { FichePoste } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  fiches: FichePoste[];
  onChange: (fiches: FichePoste[]) => void;
}

const emptyFiche: Omit<FichePoste, 'id'> = { intitule: '', rattachement: '', mission: '', activites: '', competences: '', diplome: '', horaires: '', indicateur: '' };

export default function FichesPoste({ fiches, onChange }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<FichePoste | null>(null);
  const [form, setForm] = useState(emptyFiche);

  const openNew = () => { setForm(emptyFiche); setEditing({ id: '__new__', ...emptyFiche }); };
  const openEdit = (f: FichePoste) => { setForm(f); setEditing(f); };

  const save = () => {
    if (!form.intitule.trim()) { toast('Intitulé obligatoire', 'error'); return; }
    if (editing?.id === '__new__') {
      onChange([...fiches, { ...form, id: generateId() }]);
      toast('Fiche créée');
    } else {
      onChange(fiches.map(f => f.id === editing?.id ? { ...form, id: f.id } : f));
      toast('Fiche modifiée');
    }
    setEditing(null);
  };

  const remove = (id: string) => { onChange(fiches.filter(f => f.id !== id)); toast('Fiche supprimée'); };

  const fields: { key: keyof Omit<FichePoste, 'id'>; label: string; multi?: boolean }[] = [
    { key: 'intitule', label: 'Intitulé du poste' },
    { key: 'rattachement', label: 'Rattachement hiérarchique' },
    { key: 'mission', label: 'Mission principale', multi: true },
    { key: 'activites', label: 'Activités principales', multi: true },
    { key: 'competences', label: 'Compétences requises', multi: true },
    { key: 'diplome', label: 'Diplôme / Expérience' },
    { key: 'horaires', label: 'Horaires de travail' },
    { key: 'indicateur', label: 'Indicateur de performance' },
  ];

  if (editing) {
    return (
      <div>
        <h2 className="text-2xl font-bold font-heading text-slate-800 mb-6">
          {editing.id === '__new__' ? 'Nouvelle fiche de poste' : 'Modifier la fiche'}
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 max-w-2xl">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              {f.multi ? (
                <textarea rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" value={(form as Record<string, string>)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" value={(form as Record<string, string>)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={save} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
            <button onClick={() => setEditing(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium">Annuler</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Fiches de poste</h2>
        <button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvelle fiche</button>
      </div>
      {fiches.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune fiche de poste. Cliquez sur &quot;+ Nouvelle fiche&quot; pour commencer.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fiches.map(f => (
            <div key={f.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
              <h3 className="font-bold text-slate-800 text-lg">{f.intitule}</h3>
              <p className="text-xs text-amber-600 mt-1">↳ {f.rattachement}</p>
              <p className="text-sm text-slate-600 mt-3">{f.mission}</p>
              <div className="mt-3 text-xs text-slate-500">🕐 {f.horaires} · 📊 {f.indicateur}</div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(f)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded">Modifier</button>
                <button onClick={() => remove(f.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
