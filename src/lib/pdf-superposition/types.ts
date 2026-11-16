export type FieldType =
  | "texte"
  | "nombre"
  | "date_jour"
  | "date_mois"
  | "date_annee"
  | "case_a_cocher"
  | "multiligne";

export type FieldAlign = "left" | "center" | "right";
export type FieldFontWeight = "regular" | "bold";

export interface FieldDefinition {
  id: string;
  page: number;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  police?: FieldFontWeight;
  taille?: number;
  alignement?: FieldAlign;
  type: FieldType;
  maxCaracteres?: number;
}

export interface TableColumnDefinition {
  id: string;
  x: number;
  largeur: number;
  alignement: FieldAlign;
  police?: FieldFontWeight;
  taille?: number;
  type: FieldType;
  maxCaracteres?: number;
}

export interface DottedLinesDefinition {
  xDebut: number;
  largeur: number;
  hauteurLigne: number;
  yBaselines: number[];
  maxLignes: number;
}

export interface FieldMap {
  id: string;
  titre: string;
  modelePdf: string;
  format: "A4";
  pageLargeur: number;
  pageHauteur: number;
  champs?: FieldDefinition[];
  lignesParPage?: number;
  champsEnTete?: FieldDefinition[];
  colonnesTableau?: TableColumnDefinition[];
  yRangées?: number[];
  lignesPointillees?: DottedLinesDefinition;
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
