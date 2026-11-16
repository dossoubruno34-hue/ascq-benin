import carte01 from "./carte_01_registre_alertes.json";
import carte02 from "./carte_02_notification_alerte.json";
import carte03 from "./carte_03_notification_deces.json";
import carte04 from "./carte_04_investigation_evenement.json";
import carte05 from "./carte_05_rapport_hebdomadaire.json";
import { FieldMap } from "../types";

export const CARTE_REGISTRE_ALERTES: FieldMap = carte01 as FieldMap;
export const CARTE_NOTIFICATION_ALERTE: FieldMap = carte02 as FieldMap;
export const CARTE_NOTIFICATION_DECES: FieldMap = carte03 as FieldMap;
export const CARTE_INVESTIGATION_EVENEMENT: FieldMap = carte04 as FieldMap;
export const CARTE_RAPPORT_HEBDOMADAIRE: FieldMap = carte05 as FieldMap;

export const FIELD_MAPS: Record<string, FieldMap> = {
  REG: CARTE_REGISTRE_ALERTES,
  ALR: CARTE_NOTIFICATION_ALERTE,
  DEC: CARTE_NOTIFICATION_DECES,
  INV: CARTE_INVESTIGATION_EVENEMENT,
  RAP: CARTE_RAPPORT_HEBDOMADAIRE
};
