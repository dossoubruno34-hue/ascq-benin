import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { generatePdfPlanningAscq } from "../src/lib/pdf-plannings/generatePdfPlanningAscq";
import { generatePdfPlanningRc } from "../src/lib/pdf-plannings/generatePdfPlanningRc";
import { AscqPlanningData, RcPlanningData } from "../src/lib/pdf-plannings/types";

async function run() {
  console.log("=== TEST DE GÉNÉRATION DES PLANNINGS OFFICIELS TRAIT POUR TRAIT ===");

  const outDir = path.resolve(process.cwd(), "public", "echantillons");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. PLANNING ASCQ (Données identiques au modèle officiel transmis)
  const sampleAscq: AscqPlanningData = {
    departement: "Zou",
    commune: "Ouinhi",
    arrondissement: "Tohouès",
    ascqNom: "ADJOVI Marcellin",
    ascqPhone: "01 97 00 00 00",
    semaine: 47,
    annee: 2026,
    dateDebut: "16/11/2026",
    dateFin: "22/11/2026",
    rcPlanifies: 12,
    rcAttendus: 14,
    motifEcart: "Deux relais communautaires indisponibles cette semaine (obsèques familiales et maladie) ; leurs villages seront couverts par le RC voisin.",
    activitesJours: {
      1: ["Lun", "Mer"],
      2: ["Mar", "Jeu"],
      3: ["Mer", "Ven"],
      4: ["Lun", "Jeu"],
      5: ["Mar", "Mer"],
      6: ["Jeu"],
      7: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
      8: [],
      9: ["Ven"],
      10: ["Sam"],
      11: ["Ven"]
    },
    autreActiviteNom: "Réunion de coordination mensuelle avec le CCLS-TP",
    autreActiviteJours: ["Ven"],
    observations: "Semaine marquée par la poursuite des visites à domicile dans les villages éloignés. Rappel : transmettre le rapport hebdomadaire de surveillance le lundi avant 10 h.",
    statut: "VALIDE",
    dateValidation: "17/11/2026"
  };

  console.log("Génération du PDF Planning ASCQ...");
  const ascqBytes = await generatePdfPlanningAscq(sampleAscq);
  const ascqDoc = await PDFDocument.load(ascqBytes);
  const ascqPages = ascqDoc.getPageCount();
  const ascqPage = ascqDoc.getPage(0);
  const { width: ascqW, height: ascqH } = ascqPage.getSize();

  console.log(`- Pages ASCQ : ${ascqPages} (Attendu: 1)`);
  console.log(`- Format ASCQ : ${ascqW.toFixed(2)} x ${ascqH.toFixed(2)} (A4 Paysage: 841.89 x 595.28)`);

  if (ascqPages !== 1) {
    throw new Error(`ERREUR : Le PDF ASCQ fait ${ascqPages} pages au lieu de 1 !`);
  }

  const ascqPath = path.join(outDir, "BJ_PLANNING_ASCQ_S47_2026.pdf");
  fs.writeFileSync(ascqPath, ascqBytes);
  console.log(`✓ PDF ASCQ enregistré : ${ascqPath}`);

  // 2. PLANNING RC (Données identiques au modèle officiel transmis)
  const sampleRc: RcPlanningData = {
    departement: "Zou",
    zoneSanitaire: "Covè-Zagnanado-Ouinhi",
    commune: "Ouinhi",
    arrondissement: "Tohouès",
    village: "Tohouès (centre)",
    grappe: "G12",
    rcName: "HOUNKPATIN Rosine",
    rcPhone: "01 96 00 00 00",
    semaineNum: 47,
    annee: 2026,
    dateDebutStr: "16/11/2026",
    dateFinStr: "22/11/2026",
    act_vad: [
      {
        date: "17/11/2026",
        heure: "08:00",
        zone: "Centre du village",
        qte: "Nbre VAD : 12\nNbre ménages visités : 10\nTotal ménages en charge : 85",
        observation: "Priorité aux ménages avec\nnourrissons"
      }
    ],
    act_causerie: [
      {
        date: "18/11/2026",
        heure: "16:00",
        zone: "Marché de Ouinhi",
        qte: "Nbre : 1\nThème : Paludisme et usage de la MILD",
        observation: "Avec le chef de village"
      }
    ],
    act_salubrite: [
      {
        date: "20/11/2026",
        heure: "08:00",
        zone: "Centre du village",
        qte: "1",
        observation: "Assainissement du point\nd'eau"
      }
    ],
    act_animale: [
      {
        date: "19/11/2026",
        heure: "09:00",
        zone: "Centre du village",
        qte: "Nombre de site visité : 2"
      }
    ],
    act_sociales: [
      {
        date: "19/11/2026",
        heure: "11:00",
        zone: "Centre du village",
        qte: "Nbre de visite : 1",
        observation: "Visite à une famille\nvulnérable"
      }
    ],
    act_femmes: [
      {
        date: "17/11/2026",
        heure: "14:00",
        zone: "Centre du village",
        qte: "Nbre de femmes enceintes : 4\nSuivi pour CPN : 4\nSuivi pour VAT : 3",
        observation: "Rappel des CPN manquées"
      }
    ],
    act_enfants: [
      {
        date: "18/11/2026",
        heure: "09:00",
        zone: "Centre du village",
        qte: "Nbre enfants 0 à 59 mois : 15\nSuivi pour vaccination : 6\nSuivi pour nutrition : 5",
        observation: "Dépistage de la\nmalnutrition"
      }
    ],
    act_referees: [
      {
        date: "21/11/2026",
        heure: "10:00",
        zone: "Centre du village",
        qte: "2",
        observation: "Vers le centre de santé"
      }
    ],
    act_autres: [
      {
        date: "21/11/2026",
        heure: "16:00",
        zone: "Centre du village",
        qte: "1"
      }
    ],
    autreActiviteLabel: "Autres : Réunion avec le chef de village",
    observations: "Planning hebdomadaire",
    dateSoumissionRc: "17/11/2026",
    luEtApprouveAscq: true,
    ascqName: "ADJOVI Marcellin",
    ascqPhone: "01 97 00 00 00",
    dateValidationAscq: "17/11/2026",
    statut: "VALIDE_ASCQ"
  };

  console.log("Génération du PDF Planning RC...");
  const rcBytes = await generatePdfPlanningRc(sampleRc);
  const rcDoc = await PDFDocument.load(rcBytes);
  const rcPages = rcDoc.getPageCount();
  const rcPage = rcDoc.getPage(0);
  const { width: rcW, height: rcH } = rcPage.getSize();

  console.log(`- Pages RC : ${rcPages} (Attendu: 1)`);
  console.log(`- Format RC : ${rcW.toFixed(2)} x ${rcH.toFixed(2)} (A4 Paysage: 841.89 x 595.28)`);

  if (rcPages !== 1) {
    throw new Error(`ERREUR : Le PDF RC fait ${rcPages} pages au lieu de 1 !`);
  }

  const rcPath = path.join(outDir, "BJ_PLANNING_RC_S47_HONVIE.pdf");
  fs.writeFileSync(rcPath, rcBytes);
  console.log(`✓ PDF RC enregistré : ${rcPath}`);

  console.log("\n=======================================================");
  console.log("SUCCÈS TOTAL : Reproduction trait pour trait sur 1 page A4 !");
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Échec du test :", err);
  process.exit(1);
});
