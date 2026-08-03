'use client';
import { useState } from 'react';
import { Fournisseur, StockArticle } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  fournisseurs: Fournisseur[];
  stocks: StockArticle[];
  onChange: (fournisseurs: Fournisseur[]) => void;
}

export default function Fournisseurs({ fournisseurs, stocks, onChange }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: '', contact: '', zone: '', matieres: [] as string[], role: 'principal' as 'principal' | 'secondaire' });

  const openEdit = (f: Fournisseur) => { setForm({ nom: f.nom, contact: f.contact, zone: f.zone, matieres: f.matieres, role: f.role }); setEditing(f.id); setShowForm(true); };

  const save = () => {
    if (!form.nom) { toast('Nom obligatoire', 'error'); return; }
    if (editing) {
      onChange(fournisseurs.map(f => f.id === editing ? { ...f, ...form } : f));
      toast('Fournisseur modifié');
    } else {
      onChange([...fournisseurs, { id: generateId(), ...form }]);
      toast('Fournisseur ajouté');
    }
    setForm({ nom: '', contact: '', zone: '', matieres: [], role: 'principal' });
    setEditing(null);
    setShowForm(false);
  };

  const remove = (id: string) => { onChange(fournisseurs.filter(f => f.id !== id)); toast('Fournisseur supprimé'); };

  const toggleMatiere = (artId: string) => {
    setForm(f => ({ ...f, matieres: f.matieres.includes(artId) ? f.matieres.filter(m => m !== artId) : [...f.matieres, artId] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Fournisseurs</h2>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ nom: '', contact: '', zone: '', matieres: [], role: 'principal' }); }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouveau fournisseur</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3">{editing ? 'Modifier' : 'Nouveau'} fournisseur</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input placeholder="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Contact (tél/email)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <input placeholder="Zone géographique" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'principal' | 'secondaire' })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
              <option value="principal">Principal</option>
              <option value="secondaire">Secondaire</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 mb-2">Matières fournies :</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {stocks.map(s => (
              <button key={s.id} type="button" onClick={() => toggleMatiere(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${form.matieres.includes(s.id) ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {s.designation}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {fournisseurs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucun fournisseur enregistré.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fournisseurs.map(f => (
            <div key={f.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{f.nom}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.role === 'principal' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{f.role === 'principal' ? '★ Principal' : 'Secondaire'}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">📞 {f.contact}</p>
              <p className="text-sm text-slate-500">📍 {f.zone}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {f.matieres.map(mId => {
                  const art = stocks.find(s => s.id === mId);
                  return art ? <span key={mId} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{art.designation}</span> : null;
                })}
              </div>
              <div className="flex gap-2 mt-3">
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
