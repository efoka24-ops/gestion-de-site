'use client';
import { useState, useMemo } from 'react';
import { Employe, AbsenceJustification } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  employes: Employe[];
  onChange: (employes: Employe[]) => void;
}

type Presence = 'present' | 'absent' | 'conge';

const presColors: Record<Presence, string> = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  absent: 'bg-red-100 text-red-700 border-red-300',
  conge: 'bg-blue-100 text-blue-700 border-blue-300',
};

const presLabels: Record<Presence, string> = { present: 'P', absent: 'A', conge: 'C' };
const presLabelsFull: Record<Presence, string> = { present: 'Présent', absent: 'Absent', conge: 'Congé' };
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getWeekDates(refDate: string): string[] {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=dimanche
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return JOURS.map((_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

export default function AdminRH({ employes, onChange }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', poste: '' });
  const [weekRef, setWeekRef] = useState(today);
  const [tab, setTab] = useState<'semaine' | 'justifications'>('semaine');
  const [justifForm, setJustifForm] = useState<{ employeId: string; date: string; motif: string; preuve: string } | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);

  const add = () => {
    if (!form.nom || !form.poste) { toast('Nom et poste obligatoires', 'error'); return; }
    onChange([...employes, { id: generateId(), nom: form.nom, poste: form.poste, presences: {}, justifications: [] }]);
    setForm({ nom: '', poste: '' });
    setShowForm(false);
    toast('Employé ajouté');
  };

  const setPresence = (id: string, date: string, status: Presence) => {
    onChange(employes.map(e => e.id === id ? { ...e, presences: { ...e.presences, [date]: status } } : e));
  };

  const remove = (id: string) => { onChange(employes.filter(e => e.id !== id)); toast('Employé supprimé'); };

  const addJustification = () => {
    if (!justifForm || !justifForm.motif) { toast('Motif obligatoire', 'error'); return; }
    const justif: AbsenceJustification = {
      date: justifForm.date, motif: justifForm.motif, justifie: true, preuve: justifForm.preuve,
    };
    onChange(employes.map(e => e.id === justifForm.employeId ? { ...e, justifications: [...(e.justifications || []), justif] } : e));
    setJustifForm(null);
    toast('Justification enregistrée');
  };

  const countAbsences = (e: Employe) => Object.values(e.presences).filter(v => v === 'absent').length;
  const countAbsencesNonJustifiees = (e: Employe) => {
    const absDates = Object.entries(e.presences).filter(([, v]) => v === 'absent').map(([d]) => d);
    const justifDates = new Set((e.justifications || []).map(j => j.date));
    return absDates.filter(d => !justifDates.has(d)).length;
  };

  const stats = {
    present: employes.filter(e => e.presences[today] === 'present').length,
    absent: employes.filter(e => e.presences[today] === 'absent').length,
    conge: employes.filter(e => e.presences[today] === 'conge').length,
    nonMarque: employes.filter(e => !e.presences[today]).length,
  };

  const navigateWeek = (delta: number) => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + delta * 7);
    setWeekRef(d.toISOString().slice(0, 10));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold font-heading text-slate-800">Administration RH</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvel employé</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
          <p className="text-xs text-emerald-600">Présents aujourd&apos;hui</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
          <p className="text-xs text-red-600">Absents</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.conge}</p>
          <p className="text-xs text-blue-600">En congé</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.nonMarque}</p>
          <p className="text-xs text-slate-500">Non marqués</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 flex gap-3 items-end flex-wrap">
          <input placeholder="Nom complet" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
          <input placeholder="Poste" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
          <button onClick={add} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ajouter</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('semaine')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'semaine' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>📅 Vue semaine</button>
        <button onClick={() => setTab('justifications')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'justifications' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>📝 Justifications</button>
      </div>

      {tab === 'semaine' && (
        <>
          {/* Week navigation */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigateWeek(-1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm">← Sem. préc.</button>
            <span className="text-sm font-medium text-slate-700">Semaine du {weekDates[0]} au {weekDates[5]}</span>
            <button onClick={() => navigateWeek(1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm">Sem. suiv. →</button>
            <button onClick={() => setWeekRef(today)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs font-medium">Aujourd&apos;hui</button>
          </div>

          {employes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">Aucun employé enregistré.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[180px]">Employé</th>
                    {JOURS.map((jour, i) => (
                      <th key={i} className={`px-2 py-3 font-medium text-center min-w-[90px] ${weekDates[i] === today ? 'bg-amber-50 text-amber-700' : 'text-slate-600'}`}>
                        <div>{jour}</div>
                        <div className="text-[10px] font-normal">{weekDates[i]}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-medium text-slate-600">Abs.</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {employes.map(e => {
                    const absTotal = countAbsences(e);
                    const absNonJust = countAbsencesNonJustifiees(e);
                    return (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 sticky left-0 bg-white">
                          <p className="font-medium text-slate-800 text-sm">{e.nom}</p>
                          <p className="text-xs text-slate-400">{e.poste}</p>
                        </td>
                        {weekDates.map((date, i) => {
                          const pres = e.presences[date] as Presence | undefined;
                          const isToday = date === today;
                          const hasJustif = (e.justifications || []).some(j => j.date === date);
                          return (
                            <td key={i} className={`px-1 py-2 text-center ${isToday ? 'bg-amber-50/50' : ''}`}>
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-0.5">
                                  {(['present', 'absent', 'conge'] as Presence[]).map(s => (
                                    <button key={s} onClick={() => setPresence(e.id, date, s)}
                                      className={`text-[10px] w-7 h-7 rounded font-bold transition ${pres === s ? presColors[s] : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                      {presLabels[s]}
                                    </button>
                                  ))}
                                </div>
                                {pres === 'absent' && !hasJustif && (
                                  <button onClick={() => setJustifForm({ employeId: e.id, date, motif: '', preuve: '' })}
                                    className="text-[9px] text-red-500 hover:text-red-700 underline">justifier</button>
                                )}
                                {pres === 'absent' && hasJustif && (
                                  <span className="text-[9px] text-emerald-600">✓ justifié</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold ${absTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{absTotal}</span>
                            {absNonJust > 0 && <span className="text-[9px] text-red-500">{absNonJust} non just.</span>}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => remove(e.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Justification modal */}
      {justifForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setJustifForm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-1">📝 Justification d&apos;absence</h3>
            <p className="text-xs text-slate-500 mb-4">{employes.find(e => e.id === justifForm.employeId)?.nom} — {justifForm.date}</p>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500">Motif de l&apos;absence</label>
                <input value={justifForm.motif} onChange={e => setJustifForm({ ...justifForm, motif: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Maladie, urgence familiale..." />
              </div>
              <div><label className="text-xs text-slate-500">Preuve / Justificatif fourni</label>
                <input value={justifForm.preuve} onChange={e => setJustifForm({ ...justifForm, preuve: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Certificat médical, document..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addJustification} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Enregistrer</button>
              <button onClick={() => setJustifForm(null)} className="text-slate-500 text-sm">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Justifications tab */}
      {tab === 'justifications' && (
        <div className="space-y-4">
          {employes.filter(e => countAbsences(e) > 0).length === 0 ? (
            <div className="text-center py-16 text-slate-400">Aucune absence enregistrée.</div>
          ) : (
            employes.filter(e => countAbsences(e) > 0).map(e => {
              const isExpanded = expandedEmployee === e.id;
              const absDates = Object.entries(e.presences).filter(([, v]) => v === 'absent').map(([d]) => d).sort().reverse();
              const justifDates = new Set((e.justifications || []).map(j => j.date));
              return (
                <div key={e.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedEmployee(isExpanded ? null : e.id)}>
                    <div>
                      <p className="font-medium text-slate-800">{e.nom}</p>
                      <p className="text-xs text-slate-500">{e.poste}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">{absDates.length} absence(s)</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${countAbsencesNonJustifiees(e) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {countAbsencesNonJustifiees(e) > 0 ? `${countAbsencesNonJustifiees(e)} non justifié(s)` : 'Toutes justifiées'}
                      </span>
                      <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 space-y-2">
                      {absDates.map(date => {
                        const justif = (e.justifications || []).find(j => j.date === date);
                        return (
                          <div key={date} className={`flex items-center justify-between p-3 rounded-lg text-sm ${justif ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                            <div>
                              <span className="font-mono text-xs text-slate-500 mr-3">{date}</span>
                              {justif ? (
                                <span className="text-emerald-700">✓ {justif.motif} {justif.preuve && <span className="text-xs text-slate-500">— Preuve: {justif.preuve}</span>}</span>
                              ) : (
                                <span className="text-red-600">✗ Non justifié</span>
                              )}
                            </div>
                            {!justif && (
                              <button onClick={() => setJustifForm({ employeId: e.id, date, motif: '', preuve: '' })}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded font-medium">Justifier</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
