'use client';
import { AppData, UNITE_LABELS, UniteProduction } from '@/lib/types';

interface Props { data: AppData; onNavigate: (id: string) => void; }

export default function Dashboard({ data, onNavigate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  // Stock alerts (based on lots)
  const getStockTotal = (articleId: string) => (data.lots || []).filter(l => l.articleId === articleId).reduce((s, l) => s + l.quantite, 0);
  const alertesStock = data.stocks.filter(s => getStockTotal(s.id) <= s.seuilAlerte);

  // DLC alerts (≤ 30 days)
  const dlcAlerts = (data.lots || []).filter(l => {
    if (l.quantite <= 0) return false;
    const days = Math.ceil((new Date(l.dlc).getTime() - Date.now()) / 86400000);
    return days <= 30;
  });

  // Production today
  const prodToday = data.productions.filter(p => p.date === today);
  const totalObj = prodToday.reduce((s, p) => s + p.objectif, 0);
  const totalReal = prodToday.reduce((s, p) => s + p.realise, 0);

  // Production by unit today
  const prodByUnite: Record<string, { obj: number; real: number; pertes: number }> = {};
  prodToday.forEach(p => {
    if (!prodByUnite[p.unite]) prodByUnite[p.unite] = { obj: 0, real: 0, pertes: 0 };
    prodByUnite[p.unite].obj += p.objectif;
    prodByUnite[p.unite].real += p.realise;
    prodByUnite[p.unite].pertes += p.pertes;
  });

  // Achats du mois
  const achatsMonth = (data.achats || []).filter(a => a.date.startsWith(currentMonth));
  const totalAchatsMois = achatsMonth.reduce((s, a) => s + a.montantTotal, 0);

  // Recrutement
  const recruEnCours = data.candidats.filter(c => c.statut !== 'recrute').length;

  // Last report
  const lastReport = data.rapports.length > 0 ? data.rapports[data.rapports.length - 1] : null;

  // Absences today
  const absToday = data.employes.filter(e => e.presences[today] === 'absent').length;

  // Inventaires en cours
  const invEnCours = (data.inventaires || []).filter(i => i.statut === 'en_cours').length;

  // Priorities
  const priorities: string[] = [];
  if (alertesStock.length > 0) priorities.push(`⚠️ ${alertesStock.length} article(s) en stock critique — réapprovisionner`);
  if (dlcAlerts.length > 0) priorities.push(`⏰ ${dlcAlerts.length} lot(s) à DLC proche (≤ 30 jours) — écouler en priorité (FEFO)`);
  if (totalObj > 0 && totalReal < totalObj * 0.8) priorities.push('🔴 Production du jour en retard (< 80% objectif)');
  if (recruEnCours > 0) priorities.push(`👥 ${recruEnCours} candidature(s) en cours de traitement`);
  if (absToday > 0) priorities.push(`🏠 ${absToday} absence(s) aujourd'hui`);
  if (invEnCours > 0) priorities.push(`📋 ${invEnCours} inventaire(s) en cours à compléter`);
  if (priorities.length === 0) priorities.push('✅ Tout est en ordre. Bonne journée !');

  const formatMontant = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div>
      <h2 className="text-2xl font-bold font-heading text-slate-800 mb-6">Tableau de bord</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card title="Alertes stock" value={alertesStock.length} color={alertesStock.length > 0 ? 'red' : 'green'} sub={alertesStock.length > 0 ? alertesStock.slice(0, 3).map(a => a.designation).join(', ') : 'Niveaux OK'} onClick={() => onNavigate('stocks')} />
        <Card title="DLC proches" value={dlcAlerts.length} color={dlcAlerts.length > 0 ? 'amber' : 'green'} sub={dlcAlerts.length > 0 ? `${dlcAlerts.length} lot(s) à écouler` : 'Aucune DLC critique'} onClick={() => onNavigate('stocks')} />
        <Card title="Production du jour" value={totalObj > 0 ? `${Math.round((totalReal / totalObj) * 100)}%` : '—'} color={totalObj > 0 && totalReal >= totalObj * 0.8 ? 'green' : totalObj > 0 ? 'red' : 'slate'} sub={totalObj > 0 ? `${totalReal} / ${totalObj}` : 'Aucune saisie'} onClick={() => onNavigate('production')} />
        <Card title="Achats du mois" value={`${formatMontant(totalAchatsMois)}`} color="blue" sub={`${achatsMonth.length} commande(s) — FCFA`} onClick={() => onNavigate('achats')} />
      </div>

      {/* Production par unité */}
      {Object.keys(prodByUnite).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {Object.entries(prodByUnite).map(([unite, d]) => {
            const r = d.obj > 0 ? Math.round((d.real / d.obj) * 100) : 0;
            return (
              <button key={unite} onClick={() => onNavigate('production')} className={`text-left rounded-xl border p-4 shadow-sm hover:shadow-md transition ${unite === 'arachide' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-medium opacity-75">{unite === 'arachide' ? '🥜' : '🍌'} {UNITE_LABELS[unite as UniteProduction]}</p>
                    <p className="text-2xl font-bold font-heading mt-1">{r}%</p>
                    <p className="text-xs mt-1 opacity-70">{d.real} / {d.obj} — Pertes: {d.pertes}</p>
                  </div>
                  <div className="w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={r >= 100 ? '#10b981' : r >= 80 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${Math.min(100, r)}, 100`} />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card title="Recrutement" value={recruEnCours} color={recruEnCours > 0 ? 'amber' : 'green'} sub={recruEnCours > 0 ? 'en cours' : 'Aucun'} onClick={() => onNavigate('recrutement')} />
        <Card title="Effectifs présents" value={data.employes.filter(e => e.presences[today] === 'present').length} color="green" sub={`sur ${data.employes.length} employés`} onClick={() => onNavigate('rh')} />
        <Card title="Articles en stock" value={data.stocks.length} color="blue" sub={`${(data.lots || []).filter(l => l.quantite > 0).length} lots actifs`} onClick={() => onNavigate('stocks')} />
        <Card title="Dernier rapport" value={lastReport ? lastReport.semaineISO : '—'} color="blue" sub={lastReport ? `${lastReport.type.replace(/_/g, ' ')}` : 'Aucun rapport'} onClick={() => onNavigate('reporting')} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold font-heading text-slate-700 mb-4">🎯 Priorités du jour</h3>
        <ul className="space-y-2">
          {priorities.map((p, i) => (
            <li key={i} className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3">{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ title, value, color, sub, onClick }: { title: string; value: string | number; color: string; sub: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    red: 'border-red-400 bg-red-50 text-red-700',
    green: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-400 bg-amber-50 text-amber-700',
    blue: 'border-blue-400 bg-blue-50 text-blue-700',
    slate: 'border-slate-300 bg-slate-50 text-slate-600',
  };
  return (
    <button onClick={onClick} className={`text-left rounded-xl border-l-4 p-5 shadow-sm transition hover:shadow-md ${colors[color] || colors.slate}`}>
      <p className="text-xs uppercase tracking-wide font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold font-heading mt-1">{value}</p>
      <p className="text-xs mt-2 opacity-70">{sub}</p>
    </button>
  );
}
