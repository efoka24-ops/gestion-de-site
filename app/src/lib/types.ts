export interface FichePoste {
  id: string;
  intitule: string;
  rattachement: string;
  mission: string;
  activites: string;
  competences: string;
  diplome: string;
  horaires: string;
  indicateur: string;
}

export interface ProcedureItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Procedure {
  id: string;
  nom: string;
  date: string;
  type: 'entree' | 'sortie' | 'controle' | 'autre';
  creePar: string;
  items: ProcedureItem[];
  statut: 'en_cours' | 'valide';
  notes: string;
}

export type StockCategorie = 'mp_arachides' | 'mp_plantain' | 'sucre' | 'emballages' | 'pf_nature' | 'pf_caramelisees' | 'pf_farine_plantain';

export const CATEGORIES_LABELS: Record<StockCategorie, string> = {
  mp_arachides: 'MP Arachides',
  mp_plantain: 'MP Plantain',
  sucre: 'Sucre',
  emballages: 'Emballages',
  pf_nature: 'PF Nature',
  pf_caramelisees: 'PF Caramélisées',
  pf_farine_plantain: 'PF Farine de plantain',
};

export interface Lot {
  id: string;
  articleId: string;
  quantite: number;
  dlc: string; // date ISO
  dateEntree: string;
  fournisseurId?: string;
  numero: string; // ex: LOT-2026-001
}

export interface StockArticle {
  id: string;
  reference: string;
  designation: string;
  unite: string;
  categorie: StockCategorie;
  seuilAlerte: number;
  fournisseurPrincipalId?: string;
}

export interface Mouvement {
  id: string;
  articleId: string;
  lotId?: string;
  type: 'entree' | 'sortie';
  quantite: number;
  date: string;
  motif: string;
  dlc?: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
  zone: string;
  matieres: string[]; // article IDs
  role: 'principal' | 'secondaire';
}

export interface Saisonnalite {
  id: string;
  matiere: string;
  periodeHaute: string; // ex: "Sep-Déc"
  periodeBasse: string; // ex: "Avr-Juil"
  recommandation: 'achat_groupe' | 'stock_tampon' | 'aucune';
  notes: string;
}

export interface Candidat {
  id: string;
  posteId: string;
  nom: string;
  contact: string;
  statut: 'besoin_defini' | 'annonce_diffusee' | 'cv_tries' | 'entretiens' | 'recrute';
}

// --- Reporting types ---
export type ReportType = 'hebdo_operationnel' | 'synthese_mensuelle' | 'financier' | 'qualite_haccp' | 'rh' | 'revue_trimestrielle' | 'alerte_immediate';

export const REPORT_TYPE_LABELS: Record<ReportType, { label: string; icon: string; freq: string }> = {
  hebdo_operationnel: { label: 'Rapport hebdomadaire opérationnel', icon: '📋', freq: 'Hebdomadaire' },
  synthese_mensuelle: { label: 'Synthèse mensuelle de gestion', icon: '📊', freq: 'Mensuelle' },
  financier: { label: 'Reporting financier', icon: '💰', freq: 'Mensuelle / Trimestrielle' },
  qualite_haccp: { label: 'Reporting qualité & conformité (HACCP)', icon: '🔬', freq: 'Mensuelle' },
  rh: { label: 'Reporting RH', icon: '👥', freq: 'Mensuelle' },
  revue_trimestrielle: { label: 'Revue stratégique trimestrielle', icon: '🎯', freq: 'Trimestrielle' },
  alerte_immediate: { label: 'Alerte immédiate', icon: '🚨', freq: 'Ad hoc' },
};

export interface RapportHebdo {
  id: string;
  type: ReportType;
  semaineISO: string;
  periode?: string;
  redigePar?: string;
  dateTransmission?: string;
  // Hebdo opérationnel (template KAFARM)
  productionTotale?: string;
  tauxPerteMoyen?: string;
  nonConformitesOuvertes?: string;
  effectifsPresents?: string;
  lignes?: { ligne: string; objectif: string; realise: string; ecart: string; tauxPerte: string }[];
  stocksCategories?: { categorie: string; niveau: string; statut: string }[];
  incidentsQualite?: string;
  effectifPrevu?: string;
  effectifPresent?: string;
  absences?: string;
  coutUnitArachides?: string;
  coutUnitPlantain?: string;
  variationVsMois?: string;
  // Synthèse mensuelle
  coutRevientParLigne?: string;
  rentabilite?: string;
  tendancesQualite?: string;
  syntheseProduction?: string;
  // Financier
  tresorerie?: string;
  margeParLigne?: string;
  coutsVsBudget?: string;
  // Qualité HACCP
  ncOuvertes?: string;
  ncCloturees?: string;
  resultatsCCP?: string;
  auditsInternes?: string;
  actionsCorrectives?: string;
  // RH
  effectifsTotal?: string;
  absenteisme?: string;
  turnover?: string;
  recrutementsEnCours?: string;
  besoinsFormation?: string;
  // Revue trimestrielle
  objectifsVsRealise?: string;
  decisionsAPrendre?: string;
  // Alerte immédiate
  typeIncident?: string;
  descriptionIncident?: string;
  impactEstime?: string;
  actionsImmediate?: string;
  // Commun
  notes?: string;
  dateCreation: string;
}

export interface ProductionJour {
  id: string;
  date: string;
  unite: UniteProduction;
  produit: string;
  conditionnement: string; // ex: "350g", "4kg"
  objectif: number;
  realise: number;
  pertes: number;
  machine: string;
  blocages: string;
}

// --- Unités de production ---
export type UniteProduction = 'arachide' | 'plantain';

export const UNITE_LABELS: Record<UniteProduction, string> = {
  arachide: 'Unité Arachide',
  plantain: 'Unité Plantain (Farine)',
};

export interface ConfigUnite {
  id: UniteProduction;
  label: string;
  produits: { nom: string; conditionnement: string; poids: string }[];
  machines: string[];
}

// --- Inventaire ---
export interface InventaireLigne {
  id: string;
  articleId: string;
  date: string;
  stockSysteme: number;
  stockPhysique: number;
  ecart: number;
  commentaire: string;
}

export interface Inventaire {
  id: string;
  date: string;
  type: 'complet' | 'partiel' | 'tournant';
  statut: 'en_cours' | 'valide' | 'cloture';
  lignes: InventaireLigne[];
  notes: string;
}

// --- Achats ---
export interface Achat {
  id: string;
  date: string;
  fournisseurId: string;
  articleId: string;
  unite: UniteProduction | 'commun';
  quantite: number;
  prixUnitaire: number;
  montantTotal: number;
  devise: string;
  bonCommande: string;
  statut: 'commande' | 'livre' | 'paye';
  notes: string;
}

export interface AbsenceJustification {
  date: string;
  motif: string;
  justifie: boolean;
  preuve: string; // description de la preuve fournie
}

export interface Employe {
  id: string;
  nom: string;
  poste: string;
  presences: Record<string, 'present' | 'absent' | 'conge'>;
  justifications: AbsenceJustification[];
}

export interface AppData {
  fichesPoste: FichePoste[];
  procedures: Procedure[];
  stocks: StockArticle[];
  lots: Lot[];
  mouvements: Mouvement[];
  fournisseurs: Fournisseur[];
  saisonnalites: Saisonnalite[];
  candidats: Candidat[];
  rapports: RapportHebdo[];
  productions: ProductionJour[];
  employes: Employe[];
  inventaires: Inventaire[];
  achats: Achat[];
  configUnites: ConfigUnite[];
}
