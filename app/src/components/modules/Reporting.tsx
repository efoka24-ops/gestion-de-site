'use client';
import { useState, useMemo } from 'react';
import { RapportHebdo, ReportType, REPORT_TYPE_LABELS, AppData, UNITE_LABELS, UniteProduction } from '@/lib/types';
import { generateId, getISOWeek } from '@/lib/storage';
import { useToast } from '@/components/Toast';

interface Props {
  rapports: RapportHebdo[];
  data: AppData;
  onChange: (rapports: RapportHebdo[]) => void;
}

const defaultLignes = () => [
  { ligne: 'Arachides', objectif: '', realise: '', ecart: '', tauxPerte: '' },
  { ligne: 'Farine de plantain', objectif: '', realise: '', ecart: '', tauxPerte: '' },
];

const defaultStocksCat = () => [
  { categorie: 'Matières premières (arachides, plantain, sucre)', niveau: '', statut: '' },
  { categorie: 'Emballages', niveau: '', statut: '' },
  { categorie: 'Produits finis', niveau: '', statut: '' },
];

export default function Reporting({ rapports, data, onChange }: Props) {
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>('hebdo_operationnel');
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');
  const [tab, setTab] = useState<'auto' | 'manuel' | 'historique'>('auto');
  const [autoPeriod, setAutoPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
  const [autoDate, setAutoDate] = useState(new Date().toISOString().slice(0, 10));
  const currentWeek = getISOWeek(new Date());

  // Form state
  const [form, setForm] = useState<Partial<RapportHebdo>>({
    semaineISO: currentWeek,
    periode: '',
    redigePar: '',
    lignes: defaultLignes(),
    stocksCategories: defaultStocksCat(),
  });

  const updateForm = (updates: Partial<RapportHebdo>) => setForm(f => ({ ...f, ...updates }));

  const updateLigne = (idx: number, field: string, value: string) => {
    const lignes = [...(form.lignes || defaultLignes())];
    lignes[idx] = { ...lignes[idx], [field]: value };
    // Auto-calc écart
    const obj = Number(lignes[idx].objectif);
    const real = Number(lignes[idx].realise);
    if (obj && real) lignes[idx].ecart = String(real - obj);
    updateForm({ lignes });
  };

  const updateStockCat = (idx: number, field: string, value: string) => {
    const cats = [...(form.stocksCategories || defaultStocksCat())];
    cats[idx] = { ...cats[idx], [field]: value };
    updateForm({ stocksCategories: cats });
  };

  const save = () => {
    const rapport: RapportHebdo = {
      id: generateId(),
      type: selectedType,
      semaineISO: form.semaineISO || currentWeek,
      dateCreation: new Date().toISOString(),
      ...form,
    };
    onChange([...rapports, rapport]);
    setForm({ semaineISO: currentWeek, periode: '', redigePar: '', lignes: defaultLignes(), stocksCategories: defaultStocksCat() });
    toast('Rapport enregistré');
  };

  const remove = (id: string) => { onChange(rapports.filter(r => r.id !== id)); toast('Rapport supprimé'); };

  const printReport = (r: RapportHebdo) => {
    const typeInfo = REPORT_TYPE_LABELS[r.type];
    const w = window.open('', '_blank');
    if (!w) return;

    let content = '';
    if (r.type === 'hebdo_operationnel') {
      content = buildKafarmHTML(r);
    } else {
      content = buildGenericReportHTML(r, typeInfo);
    }
    w.document.write(content);
    w.document.close();
    w.print();
  };

  const sendByEmail = async (r: RapportHebdo) => {
    setSending(r.id);
    const recipient = prompt('Adresse email du destinataire :');
    if (!recipient) { setSending(null); return; }
    const typeInfo = REPORT_TYPE_LABELS[r.type];
    const html = r.type === 'hebdo_operationnel' ? buildKafarmEmailHTML(r) : buildGenericEmailHTML(r, typeInfo);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient, subject: `${typeInfo.label} — KAFARM INDUSTRY — ${r.semaineISO}`, html }),
      });
      if (res.ok) toast('Email envoyé avec succès !');
      else { const d = await res.json(); toast(d.error || 'Erreur envoi email', 'error'); }
    } catch { toast('Erreur réseau', 'error'); }
    setSending(null);
  };

  const filteredRapports = filterType === 'all' ? rapports : rapports.filter(r => r.type === filterType);

  // --- Auto-report computed data ---
  const autoStats = useMemo(() => {
    const filterByPeriod = <T extends { date: string }>(items: T[]) => {
      if (autoPeriod === 'jour') return items.filter(i => i.date === autoDate);
      if (autoPeriod === 'semaine') {
        const d = new Date(autoDate);
        const dow = d.getDay() || 7;
        const start = new Date(d); start.setDate(d.getDate() - dow + 1);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        const s = start.toISOString().slice(0, 10);
        const e = end.toISOString().slice(0, 10);
        return items.filter(i => i.date >= s && i.date <= e);
      }
      return items.filter(i => i.date.startsWith(autoDate.slice(0, 7)));
    };

    const prods = filterByPeriod(data.productions);
    const achats = filterByPeriod(data.achats || []);

    // Production by unit
    const prodByUnite: Record<string, { obj: number; real: number; pertes: number }> = {};
    prods.forEach(p => {
      if (!prodByUnite[p.unite]) prodByUnite[p.unite] = { obj: 0, real: 0, pertes: 0 };
      prodByUnite[p.unite].obj += p.objectif;
      prodByUnite[p.unite].real += p.realise;
      prodByUnite[p.unite].pertes += p.pertes;
    });

    // Production by machine
    const prodByMachine: Record<string, { obj: number; real: number; pertes: number; count: number }> = {};
    prods.forEach(p => {
      if (!p.machine) return;
      if (!prodByMachine[p.machine]) prodByMachine[p.machine] = { obj: 0, real: 0, pertes: 0, count: 0 };
      prodByMachine[p.machine].obj += p.objectif;
      prodByMachine[p.machine].real += p.realise;
      prodByMachine[p.machine].pertes += p.pertes;
      prodByMachine[p.machine].count++;
    });

    const totalProdObj = prods.reduce((s, p) => s + p.objectif, 0);
    const totalProdReal = prods.reduce((s, p) => s + p.realise, 0);
    const totalPertes = prods.reduce((s, p) => s + p.pertes, 0);
    const rendement = totalProdObj > 0 ? Math.round((totalProdReal / totalProdObj) * 100) : 0;

    // Stock summary
    const getStockTotal = (articleId: string) => (data.lots || []).filter(l => l.articleId === articleId).reduce((s, l) => s + l.quantite, 0);
    const alertesStock = data.stocks.filter(s => getStockTotal(s.id) <= s.seuilAlerte);
    const dlcAlerts = (data.lots || []).filter(l => l.quantite > 0 && Math.ceil((new Date(l.dlc).getTime() - Date.now()) / 86400000) <= 30);

    // Achats
    const totalAchats = achats.reduce((s, a) => s + a.montantTotal, 0);
    const achatsByUnite: Record<string, number> = {};
    achats.forEach(a => { achatsByUnite[a.unite] = (achatsByUnite[a.unite] || 0) + a.montantTotal; });

    return { prods, achats, prodByUnite, prodByMachine, totalProdObj, totalProdReal, totalPertes, rendement, alertesStock, dlcAlerts, totalAchats, achatsByUnite, getStockTotal };
  }, [data, autoPeriod, autoDate]);

  const periodLabels: Record<string, string> = { jour: 'Journalier', semaine: 'Hebdomadaire', mois: 'Mensuel' };
  const formatMontant = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div>
      <h2 className="text-2xl font-bold font-heading text-slate-800 mb-6">Reporting</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['auto', 'manuel', 'historique'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'auto' ? '📊 Tableaux auto' : t === 'manuel' ? '✏ Rapport manuel' : '📚 Historique'}
          </button>
        ))}
      </div>

      {/* AUTO REPORTING TAB */}
      {tab === 'auto' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {(['jour', 'semaine', 'mois'] as const).map(p => (
                <button key={p} onClick={() => setAutoPeriod(p)} className={`px-4 py-2 rounded-md text-xs font-medium ${autoPeriod === p ? 'bg-amber-500 text-white' : 'text-slate-600'}`}>{periodLabels[p]}</button>
              ))}
            </div>
            <input type="date" value={autoDate} onChange={e => setAutoDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <span className="text-sm text-slate-500">Reporting {periodLabels[autoPeriod].toLowerCase()} — {autoPeriod === 'jour' ? autoDate : autoPeriod === 'semaine' ? `Semaine du ${autoDate}` : autoDate.slice(0, 7)}</span>
          </div>

          {/* Production Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4">🏭 Production — {periodLabels[autoPeriod]}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <AutoCard label="Objectif total" value={autoStats.totalProdObj} />
              <AutoCard label="Réalisé total" value={autoStats.totalProdReal} />
              <AutoCard label="Rendement" value={`${autoStats.rendement}%`} color={autoStats.rendement >= 100 ? 'green' : autoStats.rendement >= 80 ? 'amber' : 'red'} />
              <AutoCard label="Pertes" value={autoStats.totalPertes} color="red" />
              <AutoCard label="Saisies" value={autoStats.prods.length} />
            </div>

            {/* By unit */}
            {Object.keys(autoStats.prodByUnite).length > 0 && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {Object.entries(autoStats.prodByUnite).map(([unite, d]) => {
                  const r = d.obj > 0 ? Math.round((d.real / d.obj) * 100) : 0;
                  return (
                    <div key={unite} className={`rounded-lg p-4 border ${unite === 'arachide' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <h4 className="font-bold text-sm mb-2">{unite === 'arachide' ? '🥜' : '🍌'} {UNITE_LABELS[unite as UniteProduction]}</h4>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div><p className="text-slate-500">Objectif</p><p className="font-bold text-lg">{d.obj}</p></div>
                        <div><p className="text-slate-500">Réalisé</p><p className="font-bold text-lg">{d.real}</p></div>
                        <div><p className="text-slate-500">Pertes</p><p className="font-bold text-lg text-red-600">{d.pertes}</p></div>
                        <div><p className="text-slate-500">Rendement</p><p className={`font-bold text-lg ${r >= 100 ? 'text-emerald-600' : r >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{r}%</p></div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2"><div className={`h-2.5 rounded-full ${r >= 100 ? 'bg-emerald-500' : r >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, r)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* By machine */}
            {Object.keys(autoStats.prodByMachine).length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-600 mb-2">🔧 Par machine</h4>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50"><tr><th className="text-left px-3 py-2">Machine</th><th className="text-right px-3 py-2">Sessions</th><th className="text-right px-3 py-2">Objectif</th><th className="text-right px-3 py-2">Réalisé</th><th className="text-right px-3 py-2">Pertes</th><th className="text-center px-3 py-2">Rendement</th></tr></thead>
                  <tbody>{Object.entries(autoStats.prodByMachine).map(([m, d]) => {
                    const r = d.obj > 0 ? Math.round((d.real / d.obj) * 100) : 0;
                    return (<tr key={m} className="border-b border-slate-100"><td className="px-3 py-2">{m}</td><td className="px-3 py-2 text-right">{d.count}</td><td className="px-3 py-2 text-right">{d.obj}</td><td className="px-3 py-2 text-right font-bold">{d.real}</td><td className="px-3 py-2 text-right text-red-600">{d.pertes}</td><td className="px-3 py-2 text-center"><span className={`font-bold px-2 py-0.5 rounded-full ${r >= 100 ? 'bg-emerald-100 text-emerald-700' : r >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r}%</span></td></tr>);
                  })}</tbody>
                </table>
              </div>
            )}

            {autoStats.prods.length === 0 && <p className="text-slate-400 text-sm">Aucune donnée de production sur cette période.</p>}
          </div>

          {/* Stock Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4">📦 État des stocks</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <AutoCard label="Articles en stock" value={data.stocks.length} />
              <AutoCard label="Lots actifs" value={(data.lots || []).filter(l => l.quantite > 0).length} />
              <AutoCard label="Alertes stock" value={autoStats.alertesStock.length} color={autoStats.alertesStock.length > 0 ? 'red' : 'green'} />
              <AutoCard label="DLC proches" value={autoStats.dlcAlerts.length} color={autoStats.dlcAlerts.length > 0 ? 'amber' : 'green'} />
            </div>
            {autoStats.alertesStock.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <h4 className="text-sm font-bold text-red-700 mb-1">⚠ Articles en stock critique</h4>
                <ul className="text-xs space-y-0.5">{autoStats.alertesStock.map(s => (
                  <li key={s.id} className="text-red-700">{s.designation} — Stock: {autoStats.getStockTotal(s.id)} / Seuil: {s.seuilAlerte} {s.unite}</li>
                ))}</ul>
              </div>
            )}
          </div>

          {/* Achats Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4">💰 Dépenses achats — {periodLabels[autoPeriod]}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <AutoCard label="Total achats" value={`${formatMontant(autoStats.totalAchats)} FCFA`} color="blue" />
              {Object.entries(autoStats.achatsByUnite).map(([unite, total]) => (
                <AutoCard key={unite} label={unite === 'arachide' ? '🥜 Arachide' : unite === 'plantain' ? '🍌 Plantain' : '📦 Commun'} value={`${formatMontant(total)} FCFA`} />
              ))}
              <AutoCard label="Nb commandes" value={autoStats.achats.length} />
            </div>
            {autoStats.achats.length === 0 && <p className="text-slate-400 text-sm">Aucun achat sur cette période.</p>}
          </div>
        </div>
      )}

      {/* MANUAL REPORT TAB */}
      {tab === 'manuel' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8">
        <h3 className="font-bold text-slate-700 mb-3">Nouveau rapport</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(type => {
            const info = REPORT_TYPE_LABELS[type];
            return (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`text-xs px-3 py-2 rounded-lg border transition font-medium ${selectedType === type ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {info.icon} {info.label}
                <span className="block text-[10px] opacity-70">{info.freq}</span>
              </button>
            );
          })}
        </div>

        {/* Common header fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div><label className="text-xs text-slate-500">Semaine ISO</label><input value={form.semaineISO || ''} onChange={e => updateForm({ semaineISO: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-slate-500">Période</label><input placeholder="du ... au ..." value={form.periode || ''} onChange={e => updateForm({ periode: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-slate-500">Rédigé par</label><input value={form.redigePar || ''} onChange={e => updateForm({ redigePar: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-slate-500">Date transmission</label><input type="date" value={form.dateTransmission || ''} onChange={e => updateForm({ dateTransmission: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
        </div>

        {/* Type-specific fields */}
        {selectedType === 'hebdo_operationnel' && <HebdoForm form={form} updateForm={updateForm} updateLigne={updateLigne} updateStockCat={updateStockCat} />}
        {selectedType === 'synthese_mensuelle' && <SyntheseMensuelleForm form={form} updateForm={updateForm} />}
        {selectedType === 'financier' && <FinancierForm form={form} updateForm={updateForm} />}
        {selectedType === 'qualite_haccp' && <QualiteForm form={form} updateForm={updateForm} />}
        {selectedType === 'rh' && <RHForm form={form} updateForm={updateForm} />}
        {selectedType === 'revue_trimestrielle' && <RevueForm form={form} updateForm={updateForm} />}
        {selectedType === 'alerte_immediate' && <AlerteForm form={form} updateForm={updateForm} />}

        {/* Notes */}
        <div className="mt-4">
          <label className="text-xs text-slate-500">Notes complémentaires</label>
          <textarea rows={2} value={form.notes || ''} onChange={e => updateForm({ notes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <button onClick={save} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Enregistrer le rapport</button>
      </div>
      )}

      {/* HISTORIQUE TAB */}
      {tab === 'historique' && (
      <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-slate-700 text-lg">📚 Historique des rapports</h3>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterType('all')} className={`text-xs px-2 py-1 rounded ${filterType === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>Tous</button>
          {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`text-xs px-2 py-1 rounded ${filterType === t ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{REPORT_TYPE_LABELS[t].icon}</button>
          ))}
        </div>
      </div>

      {filteredRapports.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Aucun rapport enregistré.</div>
      ) : (
        <div className="space-y-4">
          {[...filteredRapports].reverse().map(r => {
            const typeInfo = REPORT_TYPE_LABELS[r.type];
            return (
              <div key={r.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${r.type === 'alerte_immediate' ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <span className="text-lg mr-2">{typeInfo.icon}</span>
                    <span className="font-bold text-slate-800 font-heading">{r.semaineISO}</span>
                    <span className="text-xs text-slate-500 ml-2">{typeInfo.label}</span>
                    {r.redigePar && <span className="text-xs text-slate-400 ml-2">par {r.redigePar}</span>}
                    <span className="text-xs text-slate-400 ml-2">· {new Date(r.dateCreation).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => printReport(r)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-medium">🖨 Imprimer</button>
                    <button onClick={() => sendByEmail(r)} disabled={sending === r.id} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-medium disabled:opacity-50">
                      {sending === r.id ? '⏳...' : '✉ Envoyer'}
                    </button>
                    <button onClick={() => remove(r.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded">Supprimer</button>
                  </div>
                </div>

                {/* Preview content based on type */}
                <ReportPreview report={r} />
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}
    </div>
  );
}

/* --- Sub-forms for each report type --- */
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <textarea rows={2} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
    </div>
  );
}

function HebdoForm({ form, updateForm, updateLigne, updateStockCat }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void; updateLigne: (i: number, f: string, v: string) => void; updateStockCat: (i: number, f: string, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Production totale (kg)" value={form.productionTotale || ''} onChange={v => updateForm({ productionTotale: v })} />
        <Field label="Taux de perte moyen" value={form.tauxPerteMoyen || ''} onChange={v => updateForm({ tauxPerteMoyen: v })} />
        <Field label="Non-conformités ouvertes" value={form.nonConformitesOuvertes || ''} onChange={v => updateForm({ nonConformitesOuvertes: v })} />
        <Field label="Effectifs présents" value={form.effectifsPresents || ''} onChange={v => updateForm({ effectifsPresents: v })} />
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2">Production réalisée par ligne</h4>
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50"><tr>
            <th className="text-left px-3 py-2 text-xs text-slate-600">Ligne</th>
            <th className="px-3 py-2 text-xs text-slate-600">Objectif (kg)</th>
            <th className="px-3 py-2 text-xs text-slate-600">Réalisé (kg)</th>
            <th className="px-3 py-2 text-xs text-slate-600">Écart</th>
            <th className="px-3 py-2 text-xs text-slate-600">Taux de perte</th>
          </tr></thead>
          <tbody>
            {(form.lignes || []).map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{l.ligne}</td>
                <td className="px-1 py-1"><input value={l.objectif} onChange={e => updateLigne(i, 'objectif', e.target.value)} className="w-full border rounded px-2 py-1 text-sm text-center" /></td>
                <td className="px-1 py-1"><input value={l.realise} onChange={e => updateLigne(i, 'realise', e.target.value)} className="w-full border rounded px-2 py-1 text-sm text-center" /></td>
                <td className="px-1 py-1"><input value={l.ecart} readOnly className="w-full border rounded px-2 py-1 text-sm text-center bg-slate-50" /></td>
                <td className="px-1 py-1"><input value={l.tauxPerte} onChange={e => updateLigne(i, 'tauxPerte', e.target.value)} className="w-full border rounded px-2 py-1 text-sm text-center" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2">Stocks — matières premières et produits finis</h4>
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50"><tr>
            <th className="text-left px-3 py-2 text-xs text-slate-600">Catégorie</th>
            <th className="px-3 py-2 text-xs text-slate-600">Niveau / commentaire</th>
            <th className="px-3 py-2 text-xs text-slate-600">Statut</th>
          </tr></thead>
          <tbody>
            {(form.stocksCategories || []).map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs">{c.categorie}</td>
                <td className="px-1 py-1"><input value={c.niveau} onChange={e => updateStockCat(i, 'niveau', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
                <td className="px-1 py-1"><input value={c.statut} onChange={e => updateStockCat(i, 'statut', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TextArea label="Incidents qualité et non-conformités" value={form.incidentsQualite || ''} onChange={v => updateForm({ incidentsQualite: v })} />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Field label="Effectif prévu" value={form.effectifPrevu || ''} onChange={v => updateForm({ effectifPrevu: v })} />
        <Field label="Effectif présent" value={form.effectifPresent || ''} onChange={v => updateForm({ effectifPresent: v })} />
        <Field label="Absences" value={form.absences || ''} onChange={v => updateForm({ absences: v })} />
        <Field label="Coût unit. Arachides" value={form.coutUnitArachides || ''} onChange={v => updateForm({ coutUnitArachides: v })} />
        <Field label="Coût unit. Plantain" value={form.coutUnitPlantain || ''} onChange={v => updateForm({ coutUnitPlantain: v })} />
        <Field label="Variation vs mois -1" value={form.variationVsMois || ''} onChange={v => updateForm({ variationVsMois: v })} />
      </div>
    </div>
  );
}

function SyntheseMensuelleForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <TextArea label="Synthèse production (agrégation 4 semaines)" value={form.syntheseProduction || ''} onChange={v => updateForm({ syntheseProduction: v })} />
    <TextArea label="Coût de revient par ligne" value={form.coutRevientParLigne || ''} onChange={v => updateForm({ coutRevientParLigne: v })} />
    <TextArea label="Rentabilité" value={form.rentabilite || ''} onChange={v => updateForm({ rentabilite: v })} />
    <TextArea label="Tendances qualité" value={form.tendancesQualite || ''} onChange={v => updateForm({ tendancesQualite: v })} />
  </div>);
}

function FinancierForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <TextArea label="Trésorerie" value={form.tresorerie || ''} onChange={v => updateForm({ tresorerie: v })} />
    <TextArea label="Marge par ligne" value={form.margeParLigne || ''} onChange={v => updateForm({ margeParLigne: v })} />
    <TextArea label="Coûts vs budget prévisionnel" value={form.coutsVsBudget || ''} onChange={v => updateForm({ coutsVsBudget: v })} />
  </div>);
}

function QualiteForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <Field label="NC ouvertes" value={form.ncOuvertes || ''} onChange={v => updateForm({ ncOuvertes: v })} />
      <Field label="NC clôturées" value={form.ncCloturees || ''} onChange={v => updateForm({ ncCloturees: v })} />
    </div>
    <TextArea label="Résultats des CCP (points critiques)" value={form.resultatsCCP || ''} onChange={v => updateForm({ resultatsCCP: v })} />
    <TextArea label="Audits internes" value={form.auditsInternes || ''} onChange={v => updateForm({ auditsInternes: v })} />
    <TextArea label="Actions correctives" value={form.actionsCorrectives || ''} onChange={v => updateForm({ actionsCorrectives: v })} />
  </div>);
}

function RHForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Field label="Effectifs total" value={form.effectifsTotal || ''} onChange={v => updateForm({ effectifsTotal: v })} />
      <Field label="Absentéisme (%)" value={form.absenteisme || ''} onChange={v => updateForm({ absenteisme: v })} />
      <Field label="Turnover" value={form.turnover || ''} onChange={v => updateForm({ turnover: v })} />
      <Field label="Recrutements en cours" value={form.recrutementsEnCours || ''} onChange={v => updateForm({ recrutementsEnCours: v })} />
      <Field label="Besoins formation" value={form.besoinsFormation || ''} onChange={v => updateForm({ besoinsFormation: v })} />
    </div>
  </div>);
}

function RevueForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <TextArea label="Objectifs vs réalisé" value={form.objectifsVsRealise || ''} onChange={v => updateForm({ objectifsVsRealise: v })} />
    <TextArea label="Décisions à prendre (recrutement, équipement, marchés)" value={form.decisionsAPrendre || ''} onChange={v => updateForm({ decisionsAPrendre: v })} />
  </div>);
}

function AlerteForm({ form, updateForm }: { form: Partial<RapportHebdo>; updateForm: (u: Partial<RapportHebdo>) => void }) {
  return (<div className="space-y-3">
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2 text-sm text-red-700">🚨 Alerte à envoyer immédiatement — ne pas attendre le cycle hebdomadaire</div>
    <Field label="Type d'incident" value={form.typeIncident || ''} onChange={v => updateForm({ typeIncident: v })} placeholder="Rupture critique, panne majeure, NC grave..." />
    <TextArea label="Description détaillée" value={form.descriptionIncident || ''} onChange={v => updateForm({ descriptionIncident: v })} />
    <TextArea label="Impact estimé" value={form.impactEstime || ''} onChange={v => updateForm({ impactEstime: v })} />
    <TextArea label="Actions immédiates prises" value={form.actionsImmediate || ''} onChange={v => updateForm({ actionsImmediate: v })} />
  </div>);
}

/* --- Report Preview --- */
function ReportPreview({ report: r }: { report: RapportHebdo }) {
  if (r.type === 'hebdo_operationnel') {
    return (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[['Prod. totale', r.productionTotale], ['Taux perte', r.tauxPerteMoyen], ['NC ouvertes', r.nonConformitesOuvertes], ['Effectifs', r.effectifsPresents]].map(([l, v]) => (
            <div key={l as string} className="bg-slate-50 rounded p-2"><span className="text-xs text-slate-500">{l}</span><p className="font-bold">{v || '—'}</p></div>
          ))}
        </div>
        {r.lignes && r.lignes.length > 0 && (
          <table className="w-full text-xs border border-slate-200 rounded">
            <thead className="bg-slate-50"><tr><th className="text-left px-2 py-1">Ligne</th><th className="px-2 py-1">Obj</th><th className="px-2 py-1">Réal</th><th className="px-2 py-1">Écart</th><th className="px-2 py-1">Perte</th></tr></thead>
            <tbody>{r.lignes.map((l, i) => (<tr key={i} className="border-t"><td className="px-2 py-1">{l.ligne}</td><td className="px-2 py-1 text-center">{l.objectif || '—'}</td><td className="px-2 py-1 text-center">{l.realise || '—'}</td><td className="px-2 py-1 text-center">{l.ecart || '—'}</td><td className="px-2 py-1 text-center">{l.tauxPerte || '—'}</td></tr>))}</tbody>
          </table>
        )}
        {r.incidentsQualite && <div className="bg-red-50 rounded p-2 text-xs"><strong>Incidents:</strong> {r.incidentsQualite}</div>}
      </div>
    );
  }

  if (r.type === 'alerte_immediate') {
    return (
      <div className="space-y-2 text-sm">
        {r.typeIncident && <div className="bg-red-50 rounded p-2"><strong className="text-red-700">Type:</strong> {r.typeIncident}</div>}
        {r.descriptionIncident && <div className="bg-slate-50 rounded p-2"><strong>Description:</strong> {r.descriptionIncident}</div>}
        {r.impactEstime && <div className="bg-slate-50 rounded p-2"><strong>Impact:</strong> {r.impactEstime}</div>}
        {r.actionsImmediate && <div className="bg-emerald-50 rounded p-2"><strong>Actions:</strong> {r.actionsImmediate}</div>}
      </div>
    );
  }

  // Generic preview for other types
  const fields: [string, string | undefined][] = [];
  if (r.syntheseProduction) fields.push(['Synthèse production', r.syntheseProduction]);
  if (r.coutRevientParLigne) fields.push(['Coût de revient', r.coutRevientParLigne]);
  if (r.rentabilite) fields.push(['Rentabilité', r.rentabilite]);
  if (r.tresorerie) fields.push(['Trésorerie', r.tresorerie]);
  if (r.margeParLigne) fields.push(['Marge/ligne', r.margeParLigne]);
  if (r.coutsVsBudget) fields.push(['Coûts vs budget', r.coutsVsBudget]);
  if (r.ncOuvertes) fields.push(['NC ouvertes', r.ncOuvertes]);
  if (r.resultatsCCP) fields.push(['CCP', r.resultatsCCP]);
  if (r.effectifsTotal) fields.push(['Effectifs', r.effectifsTotal]);
  if (r.absenteisme) fields.push(['Absentéisme', r.absenteisme]);
  if (r.objectifsVsRealise) fields.push(['Obj vs réalisé', r.objectifsVsRealise]);
  if (r.decisionsAPrendre) fields.push(['Décisions', r.decisionsAPrendre]);
  if (r.notes) fields.push(['Notes', r.notes]);

  return (
    <div className="grid gap-2 md:grid-cols-2 text-sm">
      {fields.map(([label, val]) => (
        <div key={label} className="bg-slate-50 rounded-lg p-3"><strong className="text-slate-600">{label}:</strong> <span className="text-slate-700">{val}</span></div>
      ))}
      {fields.length === 0 && <p className="text-slate-400 col-span-2">Aucun détail renseigné</p>}
    </div>
  );
}

/* --- Print HTML generators --- */
const PRINT_STYLES = `body{font-family:'Inter',sans-serif;max-width:900px;margin:30px auto;padding:20px;color:#1e293b;font-size:13px}
h1{color:#b45309;text-align:center;font-size:20px;margin-bottom:4px}
h2{color:#334155;font-size:14px;border-left:4px solid #d97706;padding-left:10px;margin-top:20px}
.subtitle{text-align:center;color:#64748b;font-size:12px;font-style:italic}
table{width:100%;border-collapse:collapse;margin:8px 0}
th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px}
th{background:#f1f5f9;font-weight:600}
.meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:16px 0}
.meta-box{border:1px solid #e2e8f0;padding:8px;text-align:center}
.meta-box strong{display:block;font-size:14px;margin-top:4px}
.footer{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:2px solid #d97706;padding-top:16px}
.footer div{border:1px solid #e2e8f0;padding:12px;min-height:60px}
.section{background:#f8fafc;padding:12px;border-radius:6px;margin:6px 0;min-height:40px;white-space:pre-wrap}
@media print{body{margin:0;padding:10px}}`;

function buildKafarmHTML(r: RapportHebdo): string {
  return `<!DOCTYPE html><html><head><title>Rapport ${r.semaineISO}</title><style>${PRINT_STYLES}</style></head><body>
    <h1>KAFARM INDUSTRY SARL</h1>
    <h1 style="font-size:18px">RAPPORT HEBDOMADAIRE DE PRODUCTION</h1>
    <p class="subtitle">Lignes Arachides & Farine de plantain — Douala</p>
    <table><tr><th>Semaine n°</th><th>Période</th><th>Rédigé par</th><th>Date transmission</th></tr>
    <tr><td>${r.semaineISO}</td><td>${r.periode || ''}</td><td>${r.redigePar || ''}</td><td>${r.dateTransmission || new Date(r.dateCreation).toLocaleDateString('fr-FR')}</td></tr></table>
    <div class="meta">
      <div class="meta-box">Production totale (kg)<strong>${r.productionTotale || '—'}</strong></div>
      <div class="meta-box">Taux de perte moyen<strong>${r.tauxPerteMoyen || '—'}</strong></div>
      <div class="meta-box">Non-conformités ouvertes<strong>${r.nonConformitesOuvertes || '—'}</strong></div>
      <div class="meta-box">Effectifs présents<strong>${r.effectifsPresents || '—'}</strong></div>
    </div>
    <h2>Production réalisée par ligne</h2>
    <table><tr><th>Ligne</th><th>Objectif (kg)</th><th>Réalisé (kg)</th><th>Écart</th><th>Taux de perte</th></tr>
    ${(r.lignes || []).map(l => `<tr><td>${l.ligne}</td><td>${l.objectif}</td><td>${l.realise}</td><td>${l.ecart}</td><td>${l.tauxPerte}</td></tr>`).join('')}</table>
    <h2>Stocks — matières premières et produits finis</h2>
    <table><tr><th>Catégorie</th><th>Niveau / commentaire</th><th>Statut</th></tr>
    ${(r.stocksCategories || []).map(c => `<tr><td>${c.categorie}</td><td>${c.niveau}</td><td>${c.statut}</td></tr>`).join('')}</table>
    <h2>Incidents qualité et non-conformités</h2>
    <div class="section">${r.incidentsQualite || ''}</div>
    <h2>Effectifs et coût de revient</h2>
    <table><tr><th>Effectif prévu</th><th>Effectif présent</th><th>Absences</th><th>Coût unit. Arachides</th><th>Coût unit. Plantain</th><th>Variation vs mois -1</th></tr>
    <tr><td>${r.effectifPrevu || ''}</td><td>${r.effectifPresent || ''}</td><td>${r.absences || ''}</td><td>${r.coutUnitArachides || ''}</td><td>${r.coutUnitPlantain || ''}</td><td>${r.variationVsMois || ''}</td></tr></table>
    ${r.notes ? `<h2>Notes</h2><div class="section">${r.notes}</div>` : ''}
    <div class="footer"><div><strong>Signature — Gestionnaire de site</strong></div><div><strong>Visa — Direction</strong></div></div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">Page 1/1 · KAFARM INDUSTRY SARL</p>
  </body></html>`;
}

function buildKafarmEmailHTML(r: RapportHebdo): string {
  return buildKafarmHTML(r).replace(/<style>.*?<\/style>/, `<style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#1e293b;font-size:13px}
    h1{color:#b45309;text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}
    th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px}th{background:#f1f5f9}
    h2{color:#334155;border-left:4px solid #d97706;padding-left:10px;font-size:14px;margin-top:16px}
    .section{background:#f8fafc;padding:10px;margin:6px 0}.meta{margin:12px 0}
    .meta-box{display:inline-block;border:1px solid #e2e8f0;padding:8px 16px;margin:4px;text-align:center}
    .footer div{border:1px solid #e2e8f0;padding:12px;display:inline-block;width:45%;margin:4px}
  </style>`);
}

function buildGenericReportHTML(r: RapportHebdo, typeInfo: { label: string }): string {
  const sections: string[] = [];
  const add = (title: string, val?: string) => { if (val) sections.push(`<h2>${title}</h2><div class="section">${val}</div>`); };
  add('Synthèse production', r.syntheseProduction); add('Coût de revient', r.coutRevientParLigne);
  add('Rentabilité', r.rentabilite); add('Tendances qualité', r.tendancesQualite);
  add('Trésorerie', r.tresorerie); add('Marge par ligne', r.margeParLigne);
  add('Coûts vs budget', r.coutsVsBudget);
  add('NC ouvertes', r.ncOuvertes); add('NC clôturées', r.ncCloturees);
  add('Résultats CCP', r.resultatsCCP); add('Audits internes', r.auditsInternes);
  add('Actions correctives', r.actionsCorrectives);
  if (r.effectifsTotal) add('Effectifs / Absentéisme', `Effectifs: ${r.effectifsTotal}, Absentéisme: ${r.absenteisme || '—'}, Turnover: ${r.turnover || '—'}`);
  add('Recrutements en cours', r.recrutementsEnCours); add('Besoins formation', r.besoinsFormation);
  add('Objectifs vs réalisé', r.objectifsVsRealise); add('Décisions à prendre', r.decisionsAPrendre);
  add("Type d'incident", r.typeIncident); add('Description', r.descriptionIncident);
  add('Impact', r.impactEstime); add('Actions immédiates', r.actionsImmediate);
  add('Notes', r.notes);

  return `<!DOCTYPE html><html><head><title>${typeInfo.label} — ${r.semaineISO}</title><style>${PRINT_STYLES}</style></head><body>
    <h1>KAFARM INDUSTRY SARL</h1>
    <h1 style="font-size:16px">${typeInfo.label.toUpperCase()}</h1>
    <p class="subtitle">${r.semaineISO} · ${r.periode || ''} · Rédigé par ${r.redigePar || '—'}</p>
    ${sections.join('')}
    <div class="footer"><div><strong>Signature — Gestionnaire de site</strong></div><div><strong>Visa — Direction</strong></div></div>
  </body></html>`;
}

function buildGenericEmailHTML(r: RapportHebdo, typeInfo: { label: string }): string {
  return buildGenericReportHTML(r, typeInfo);
}

function AutoCard({ label, value, color = 'slate' }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color] || colors.slate}`}>
      <p className="text-xs uppercase tracking-wide font-medium opacity-75">{label}</p>
      <p className="text-xl font-bold font-heading mt-1">{value}</p>
    </div>
  );
}
