'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData } from '@/lib/types';
import { loadData, saveData, exportToExcel, exportBackupJSON, importBackupJSON } from '@/lib/storage';
import { ToastProvider, useToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/modules/Dashboard';
import FichesPoste from '@/components/modules/FichesPoste';
import Procedures from '@/components/modules/Procedures';
import Stocks from '@/components/modules/Stocks';
import Fournisseurs from '@/components/modules/Fournisseurs';
import SaisonnaliteModule from '@/components/modules/Saisonnalite';
import Recrutement from '@/components/modules/Recrutement';
import Reporting from '@/components/modules/Reporting';
import Production from '@/components/modules/Production';
import AdminRH from '@/components/modules/AdminRH';
import InventaireModule from '@/components/modules/Inventaire';
import Achats from '@/components/modules/Achats';

function AppContent() {
  const [data, setData] = useState<AppData | null>(null);
  const [active, setActive] = useState('dashboard');
  const { toast } = useToast();

  useEffect(() => { setData(loadData()); }, []);

  const update = useCallback((partial: Partial<AppData>) => {
    setData(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      saveData(next);
      return next;
    });
  }, []);

  if (!data) return <div className="flex items-center justify-center h-screen text-slate-400">Chargement...</div>;

  const handleExport = () => { exportToExcel(data); toast('Fichier Excel téléchargé'); };
  const handleExportJSON = () => { exportBackupJSON(data); toast('Sauvegarde JSON téléchargée'); };
  const handleImportJSON = async (file: File) => {
    try {
      const imported = await importBackupJSON(file);
      setData(imported);
      saveData(imported);
      toast('Données restaurées avec succès !');
    } catch { toast('Erreur: fichier invalide', 'error'); }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar active={active} onNavigate={setActive} onExportExcel={handleExport} onExportJSON={handleExportJSON} onImportJSON={handleImportJSON} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {active === 'dashboard' && <Dashboard data={data} onNavigate={setActive} />}
        {active === 'fiches' && <FichesPoste fiches={data.fichesPoste} onChange={f => update({ fichesPoste: f })} />}
        {active === 'procedures' && <Procedures procedures={data.procedures} onChange={p => update({ procedures: p })} />}
        {active === 'stocks' && <Stocks stocks={data.stocks} lots={data.lots || []} mouvements={data.mouvements} fournisseurs={data.fournisseurs || []} onChangeStocks={s => update({ stocks: s })} onChangeLots={l => update({ lots: l })} onChangeMouvements={m => update({ mouvements: m })} />}
        {active === 'fournisseurs' && <Fournisseurs fournisseurs={data.fournisseurs || []} stocks={data.stocks} onChange={f => update({ fournisseurs: f })} />}
        {active === 'saisonnalite' && <SaisonnaliteModule saisonnalites={data.saisonnalites || []} onChange={s => update({ saisonnalites: s })} />}
        {active === 'recrutement' && <Recrutement candidats={data.candidats} fiches={data.fichesPoste} onChange={c => update({ candidats: c })} />}
        {active === 'reporting' && <Reporting rapports={data.rapports} data={data} onChange={r => update({ rapports: r })} />}
        {active === 'production' && <Production productions={data.productions} configUnites={data.configUnites || []} onChange={p => update({ productions: p })} onChangeConfig={c => update({ configUnites: c })} />}
        {active === 'rh' && <AdminRH employes={data.employes} onChange={e => update({ employes: e })} />}
        {active === 'inventaire' && <InventaireModule inventaires={data.inventaires || []} stocks={data.stocks} lots={data.lots || []} onChange={i => update({ inventaires: i })} />}
        {active === 'achats' && <Achats achats={data.achats || []} stocks={data.stocks} fournisseurs={data.fournisseurs || []} onChange={a => update({ achats: a })} />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
