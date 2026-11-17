/**
 * TYPES OFFICIELS - PLANNINGS HEBDOMADAIRES ASCQ & RELAIS COMMUNAUTAIRES (RC)
 * Conformes aux normes CNLS-TP & Ministère de la Santé du Bénin
 */

export interface AscqPlanningData {
  id?: string;
  departement: string;
  commune: string;
  arrondissement: string;
  ascqNom: string;
  ascqPhone: string;
  semaine: number;
  annee: number;
  dateDebut: string; // Ex: "16/11/2026" ou "2026-11-16"
  dateFin: string;   // Ex: "22/11/2026" ou "2026-11-22"
  periodeLabel?: string; // Ex: "Du 16/11/2026 au 22/11/2026"
  rcPlanifies: number;
  rcAttendus: number;
  motifEcart?: string | null;
  activitesJours: Record<number, string[]>; // 1..10 -> ["Lun", "Mer"]
  autreActiviteNom?: string;
  autreActiviteJours?: string[];
  observations?: string;
  signatureTactile?: string | null; // Data URL Base64 PNG
  dateValidation?: string | null;
  statut?: string; // "VALIDE" | "BROUILLON"
}

export interface RcPlanningSlot {
  date: string;       // JJ/MM/AAAA ou YYYY-MM-DD
  heure?: string;     // Ex: "08:00" ou "08h00 - 10h00"
  zone: string;      // Ex: "Centre du village"
  qte: number | string; // Ex: 5 ou "Nbre VAD : 12\nNbre ménages visités : 10\nTotal ménages en charge : 85"
  observation?: string; // Ex: "Priorité aux ménages avec nourrissons"
  obs?: string;
}

export interface RcPlanningData {
  id?: string;
  relaisId?: string;
  departement: string;
  zoneSanitaire: string;
  commune: string;
  arrondissement: string;
  village: string;
  grappe: string | number;
  rcName: string;
  rcPhone: string;
  semaineNum: number;
  annee: number;
  dateDebutStr: string;
  dateFinStr: string;
  // Les activités officielles du Relais
  act_vad?: RcPlanningSlot[];
  act_causerie?: RcPlanningSlot[];
  act_salubrite?: RcPlanningSlot[];
  act_animale?: RcPlanningSlot[];
  act_sociales?: RcPlanningSlot[];
  act_femmes?: RcPlanningSlot[];
  act_enfants?: RcPlanningSlot[];
  act_referees?: RcPlanningSlot[];
  act_autres?: RcPlanningSlot[];
  autreActiviteLabel?: string;
  observations?: string;
  signatureRc?: string | null;
  dateSoumissionRc?: string | null;
  // Validation officielle par l'ASCQ
  luEtApprouveAscq?: boolean;
  ascqName?: string;
  ascqPhone?: string;
  dateValidationAscq?: string | null;
  signatureAscq?: string | null;
  observationsAscq?: string | null;
  statut?: string; // "BROUILLON" | "SOUMIS" | "VALIDE" | "VALIDE_ASCQ" | "REJETE"
}
