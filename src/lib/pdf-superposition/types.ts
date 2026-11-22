export type FieldType =
  | "texte"
  | "nombre"
  | "code"
  | "date"
  | "date_jour"
  | "date_mois"
  | "date_annee"
  | "case_a_cocher"
  | "multiligne";

export type FieldAlign = "l" | "c" | "r" | "left" | "center" | "right";
export type FieldFontWeight = "regular" | "bold";

export interface SlotFieldDefinition {
  id: string;
  x0: number;
  x1: number;
  base: number;
  align: "l" | "c" | "r" | "left" | "center" | "right";
  type?: FieldType;
  y0?: number;
  y1?: number;
  box?: { y0: number; y1: number };
  maxCaracteres?: number;
}

export interface BoxCoords {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface TableColumnSlot {
  id: string;
  x0: number;
  x1: number;
  align: "l" | "c" | "r" | "left" | "center" | "right";
  type?: FieldType;
}

export interface TableRowSlot {
  y0: number;
  y1: number;
  base: number;
}

export interface FieldMap {
  id: string;
  titre: string;
  modelePdf: string;
  format: "A4";
  pageLargeur: number;
  pageHauteur: number;
  champs?: SlotFieldDefinition[];
  casesACocher?: Record<string, BoxCoords>;
  lignesParPage?: number;
  champsEnTete?: SlotFieldDefinition[];
  colonnesTableau?: TableColumnSlot[];
  lignes?: TableRowSlot[];
  colonneValeurs?: { x0: number; x1: number; marge: number };
  tableauxValeurs?: {
    colValeur: { x0: number; x1: number; align: "l" | "c" | "r" };
    lignes: (TableRowSlot & { id: string; type?: FieldType })[];
  };
  lignesPointillees?: {
    x0: number;
    x1: number;
    yBaselines: number[];
  };
  signature?: SlotFieldDefinition;
}

export interface GenerationOptions {
  isVierge?: boolean;
}

export interface GenerationResult {
  pdfBytes: Uint8Array;
  blobUrl: string;
  warnings: string[];
  nbPages: number;
  nomFichier: string;
}

export interface AuditLogEntry {
  fiche_type: "REG" | "ALR" | "DEC" | "INV" | "RAP";
  enregistrement_id?: string;
  utilisateur_id?: string;
  utilisateur_nom?: string;
  commune?: string;
  action: "GENERATION" | "TELECHARGEMENT" | "IMPRESSION";
  date?: string;
}
