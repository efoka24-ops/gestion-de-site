import { AppData } from './types';

export const defaultData: AppData = {
  fichesPoste: [
    { id: '1', intitule: "Chef d'équipe production", rattachement: 'Directeur de production', mission: "Superviser l'équipe de production et garantir l'atteinte des objectifs journaliers", activites: "Planification des tâches, suivi qualité, gestion des équipes, reporting", competences: "Leadership, gestion d'équipe, connaissance des process agroalimentaires", diplome: "BTS/Licence en agroalimentaire ou équivalent, 3 ans d'expérience", horaires: '06h00 - 14h00 / 14h00 - 22h00', indicateur: "Taux d'atteinte des objectifs de production" },
    { id: '2', intitule: 'Opérateur de production', rattachement: "Chef d'équipe production", mission: 'Assurer les opérations de transformation sur la ligne de production', activites: "Conduite de machines, contrôle visuel, nettoyage, respect des consignes d'hygiène", competences: 'Rigueur, dextérité, connaissance HACCP', diplome: 'CAP/BEP ou expérience en usine agroalimentaire', horaires: '06h00 - 14h00 / 14h00 - 22h00', indicateur: 'Rendement horaire et taux de rebut' },
    { id: '3', intitule: 'Agent de contrôle qualité', rattachement: 'Responsable qualité', mission: 'Contrôler la conformité des matières premières et produits finis', activites: "Prélèvements, analyses, rédaction de rapports, gestion des non-conformités", competences: 'Analyse sensorielle, métrologie, normes ISO/HACCP', diplome: "DUT/Licence en biologie, chimie ou agroalimentaire", horaires: '07h00 - 16h00', indicateur: 'Taux de conformité des lots contrôlés' },
    { id: '4', intitule: 'Magasinier', rattachement: 'Responsable logistique', mission: 'Gérer les entrées/sorties de stock et organiser le magasin', activites: "Réception, rangement, préparation des commandes, inventaire", competences: 'Organisation, maîtrise des outils de gestion de stock', diplome: 'Bac+2 en logistique ou expérience équivalente', horaires: '07h00 - 16h00', indicateur: 'Exactitude des inventaires et délai de préparation' },
    { id: '5', intitule: 'Agent administratif / RH', rattachement: 'Directeur général', mission: "Gérer l'administration du personnel et le suivi RH", activites: "Paie, contrats, absences, recrutement, dossiers du personnel", competences: 'Droit du travail camerounais, Excel, discrétion', diplome: "Licence en GRH, droit ou gestion", horaires: '08h00 - 17h00', indicateur: 'Délai de traitement des dossiers RH' },
    { id: '6', intitule: 'Agent de maintenance', rattachement: 'Responsable technique', mission: 'Assurer la maintenance préventive et curative des équipements', activites: "Diagnostic de pannes, réparations, maintenance préventive, gestion des pièces", competences: 'Électromécanique, pneumatique, lecture de schémas', diplome: "BTS en maintenance industrielle ou électromécanique", horaires: '07h00 - 16h00 + astreintes', indicateur: 'Taux de disponibilité des machines' },
  ],
  procedures: [
    {
      id: 'proc1', nom: 'Réception des matières premières', date: new Date().toISOString().slice(0, 10),
      type: 'entree' as const, creePar: 'Chef de site', statut: 'en_cours' as const, notes: '',
      items: [
        { id: 'p1i1', label: 'Vérifier le bon de livraison', checked: false },
        { id: 'p1i2', label: 'Contrôler la température du camion', checked: false },
        { id: 'p1i3', label: 'Inspecter visuellement les emballages', checked: false },
        { id: 'p1i4', label: 'Prélever un échantillon pour analyse', checked: false },
        { id: 'p1i5', label: 'Peser les marchandises reçues', checked: false },
        { id: 'p1i6', label: 'Enregistrer dans le système de stock', checked: false },
        { id: 'p1i7', label: 'Ranger dans la zone de stockage appropriée', checked: false },
      ]
    },
    {
      id: 'proc2', nom: 'Contrôle qualité', date: new Date().toISOString().slice(0, 10),
      type: 'controle' as const, creePar: 'Chef de site', statut: 'en_cours' as const, notes: '',
      items: [
        { id: 'p2i1', label: 'Prélever les échantillons sur la ligne', checked: false },
        { id: 'p2i2', label: 'Vérifier pH et acidité', checked: false },
        { id: 'p2i3', label: 'Contrôler la texture et la couleur', checked: false },
        { id: 'p2i4', label: 'Test microbiologique rapide', checked: false },
        { id: 'p2i5', label: 'Vérifier les dates et le marquage', checked: false },
        { id: 'p2i6', label: 'Remplir le registre de contrôle', checked: false },
      ]
    },
    {
      id: 'proc3', nom: 'Sortie des produits finis', date: new Date().toISOString().slice(0, 10),
      type: 'sortie' as const, creePar: 'Chef de site', statut: 'en_cours' as const, notes: '',
      items: [
        { id: 'p3i1', label: 'Vérifier le bon de commande', checked: false },
        { id: 'p3i2', label: 'Contrôler les quantités préparées', checked: false },
        { id: 'p3i3', label: "Vérifier l'étiquetage et les DLC", checked: false },
        { id: 'p3i4', label: 'Contrôler la température de stockage', checked: false },
        { id: 'p3i5', label: 'Charger et sceller le véhicule', checked: false },
        { id: 'p3i6', label: 'Émettre le bon de livraison', checked: false },
      ]
    },
  ],
  stocks: [
    { id: 's1', reference: 'MP-ARA-001', designation: 'Arachides crues décortiquées', unite: 'kg', categorie: 'mp_arachides', seuilAlerte: 500 },
    { id: 's2', reference: 'MP-ARA-002', designation: 'Arachides grillées', unite: 'kg', categorie: 'mp_arachides', seuilAlerte: 300 },
    { id: 's3', reference: 'MP-PLA-001', designation: 'Plantain frais', unite: 'kg', categorie: 'mp_plantain', seuilAlerte: 400 },
    { id: 's4', reference: 'MP-PLA-002', designation: 'Chips de plantain séchées', unite: 'kg', categorie: 'mp_plantain', seuilAlerte: 200 },
    { id: 's5', reference: 'MP-SUC-001', designation: 'Sucre cristallisé', unite: 'kg', categorie: 'sucre', seuilAlerte: 200 },
    { id: 's6', reference: 'MP-SUC-002', designation: 'Sucre glace', unite: 'kg', categorie: 'sucre', seuilAlerte: 100 },
    { id: 's7', reference: 'EMB-001', designation: 'Sachets plastique 250g', unite: 'unité', categorie: 'emballages', seuilAlerte: 5000 },
    { id: 's8', reference: 'EMB-002', designation: 'Sachets plastique 500g', unite: 'unité', categorie: 'emballages', seuilAlerte: 5000 },
    { id: 's9', reference: 'EMB-003', designation: 'Cartons 12 unités', unite: 'unité', categorie: 'emballages', seuilAlerte: 1000 },
    { id: 's10', reference: 'PF-NAT-001', designation: 'Pâte d\'arachide nature 250g', unite: 'unité', categorie: 'pf_nature', seuilAlerte: 200 },
    { id: 's11', reference: 'PF-NAT-002', designation: 'Pâte d\'arachide nature 500g', unite: 'unité', categorie: 'pf_nature', seuilAlerte: 150 },
    { id: 's12', reference: 'PF-CAR-001', designation: 'Pâte d\'arachide caramélisée 250g', unite: 'unité', categorie: 'pf_caramelisees', seuilAlerte: 200 },
    { id: 's13', reference: 'PF-FPL-001', designation: 'Farine de plantain 500g', unite: 'unité', categorie: 'pf_farine_plantain', seuilAlerte: 200 },
    { id: 's14', reference: 'PF-FPL-002', designation: 'Farine de plantain 1kg', unite: 'unité', categorie: 'pf_farine_plantain', seuilAlerte: 100 },
  ],
  lots: [
    { id: 'l1', articleId: 's1', quantite: 2500, dlc: '2026-10-15', dateEntree: '2026-07-01', numero: 'LOT-2026-001' },
    { id: 'l2', articleId: 's1', quantite: 1000, dlc: '2026-12-01', dateEntree: '2026-07-15', numero: 'LOT-2026-002' },
    { id: 'l3', articleId: 's5', quantite: 180, dlc: '2027-06-01', dateEntree: '2026-07-10', numero: 'LOT-2026-003' },
    { id: 'l4', articleId: 's3', quantite: 800, dlc: '2026-08-05', dateEntree: '2026-07-20', numero: 'LOT-2026-004' },
    { id: 'l5', articleId: 's7', quantite: 15000, dlc: '2028-01-01', dateEntree: '2026-07-01', numero: 'LOT-2026-005' },
    { id: 'l6', articleId: 's10', quantite: 300, dlc: '2026-08-20', dateEntree: '2026-07-18', numero: 'LOT-2026-006' },
  ],
  mouvements: [],
  fournisseurs: [
    { id: 'f1', nom: 'Coopérative Arachides Maroua', contact: '+237 6XX XX XX XX', zone: 'Extrême-Nord', matieres: ['s1', 's2'], role: 'principal' },
    { id: 'f2', nom: 'Planteurs de Njombé', contact: '+237 6XX XX XX XX', zone: 'Littoral', matieres: ['s3', 's4'], role: 'principal' },
    { id: 'f3', nom: 'SOSUCAM', contact: 'commercial@sosucam.cm', zone: 'Centre', matieres: ['s5', 's6'], role: 'principal' },
    { id: 'f4', nom: 'Plastique Cameroun SA', contact: '+237 6XX XX XX XX', zone: 'Douala', matieres: ['s7', 's8', 's9'], role: 'principal' },
    { id: 'f5', nom: 'Arachides du Nord', contact: '+237 6XX XX XX XX', zone: 'Nord', matieres: ['s1'], role: 'secondaire' },
  ],
  saisonnalites: [
    { id: 'sais1', matiere: 'Arachides', periodeHaute: 'Oct-Jan', periodeBasse: 'Avr-Juil', recommandation: 'achat_groupe', notes: 'Acheter en volume pendant la récolte Oct-Jan, constituer un stock tampon pour la période creuse' },
    { id: 'sais2', matiere: 'Plantain', periodeHaute: 'Sep-Déc', periodeBasse: 'Fév-Mai', recommandation: 'stock_tampon', notes: 'Disponibilité réduite en saison sèche, prévoir du séchage/chips pour lisser la production' },
    { id: 'sais3', matiere: 'Sucre', periodeHaute: 'Toute l\'année', periodeBasse: '—', recommandation: 'aucune', notes: 'Approvisionnement stable via SOSUCAM' },
  ],
  candidats: [],
  rapports: [],
  productions: [],
  inventaires: [],
  achats: [],
  configUnites: [
    {
      id: 'arachide',
      label: 'Unité Arachide',
      produits: [
        { nom: 'Arachide salée', conditionnement: 'Sachet', poids: '350g' },
        { nom: 'Pâte d\'arachide nature', conditionnement: 'Pot', poids: '500g' },
        { nom: 'Pâte d\'arachide caramélisée', conditionnement: 'Pot', poids: '250g' },
      ],
      machines: ['Torréfacteur T1', 'Broyeur B1', 'Conditionneuse C1', 'Scelleuse S1'],
    },
    {
      id: 'plantain',
      label: 'Unité Plantain (Farine)',
      produits: [
        { nom: 'Farine de plantain', conditionnement: 'Sac', poids: '4kg' },
        { nom: 'Farine de plantain', conditionnement: 'Sachet', poids: '1kg' },
        { nom: 'Farine de plantain', conditionnement: 'Sachet', poids: '500g' },
      ],
      machines: ['Éplucheuse E1', 'Séchoir SD1', 'Moulin M1', 'Conditionneuse C2', 'Scelleuse S2'],
    },
  ],
  employes: [
    { id: 'e1', nom: 'Jean-Pierre Mbarga', poste: "Chef d'équipe production", presences: {}, justifications: [] },
    { id: 'e2', nom: 'Marie-Claire Ondoa', poste: 'Opérateur de production', presences: {}, justifications: [] },
    { id: 'e3', nom: 'Paul Nguema', poste: 'Agent de contrôle qualité', presences: {}, justifications: [] },
    { id: 'e4', nom: 'Fatou Diallo', poste: 'Magasinier', presences: {}, justifications: [] },
    { id: 'e5', nom: 'Brigitte Ngo Biyong', poste: 'Agent administratif / RH', presences: {}, justifications: [] },
    { id: 'e6', nom: 'Samuel Ekotto', poste: 'Agent de maintenance', presences: {}, justifications: [] },
  ],
};
