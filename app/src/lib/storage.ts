'use client';
import { AppData } from './types';
import { defaultData } from './data';

const STORAGE_KEY = 'gestion-usine-data';

export function loadData(): AppData {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    // Merge with defaults to handle new fields
    return { ...defaultData, ...parsed };
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Auto-backup: save timestamp of last modification
  localStorage.setItem(STORAGE_KEY + '-lastmod', new Date().toISOString());
}

// --- Backup / Restore JSON ---
export function exportBackupJSON(data: AppData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kafarm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<AppData>;
        resolve({ ...defaultData, ...parsed });
      } catch { reject(new Error('Fichier JSON invalide')); }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture'));
    reader.readAsText(file);
  });
}

export function getISOWeek(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function exportToExcel(data: AppData): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheets: { name: string; rows: any[] }[] = [
    { name: 'Fiches de poste', rows: data.fichesPoste },
    { name: 'Stocks', rows: data.stocks },
    { name: 'Lots', rows: data.lots || [] },
    { name: 'Mouvements', rows: data.mouvements },
    { name: 'Fournisseurs', rows: (data.fournisseurs || []).map(f => ({ ...f, matieres: f.matieres.join(', ') })) },
    { name: 'Saisonnalites', rows: data.saisonnalites || [] },
    { name: 'Candidats', rows: data.candidats },
    { name: 'Rapports', rows: (data.rapports || []).map(r => ({ ...r, lignes: JSON.stringify(r.lignes || []), stocksCategories: JSON.stringify(r.stocksCategories || []) })) },
    { name: 'Production', rows: data.productions },
    { name: 'Inventaires', rows: (data.inventaires || []).map(i => ({ ...i, lignes: JSON.stringify(i.lignes || []) })) },
    { name: 'Achats', rows: data.achats || [] },
    { name: 'Employes', rows: data.employes.map(e => ({ ...e, presences: JSON.stringify(e.presences) })) },
  ];

  let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';

  for (const sheet of sheets) {
    xml += `<Worksheet ss:Name="${sheet.name}"><Table>`;
    if (sheet.rows.length > 0) {
      const keys = Object.keys(sheet.rows[0]);
      xml += '<Row>' + keys.map(k => `<Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell>`).join('') + '</Row>';
      for (const row of sheet.rows) {
        xml += '<Row>' + keys.map(k => {
          const v = (row as Record<string, unknown>)[k];
          const t = typeof v === 'number' ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${t}">${escapeXml(String(v ?? ''))}</Data></Cell>`;
        }).join('') + '</Row>';
      }
    }
    xml += '</Table></Worksheet>';
  }
  xml += '</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gestion-usine-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
