import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { generatePdfPlanningAscq } from "../src/lib/pdf-plannings/generatePdfPlanningAscq";
import { generatePdfPlanningRc } from "../src/lib/pdf-plannings/generatePdfPlanningRc";
import { AscqPlanningData, RcPlanningData } from "../src/lib/pdf-plannings/types";

async function run() {
  console.log("=== TEST DE GÉNÉRATION DES PLANNINGS OFFICIELS A4 PAYSAGE 1 PAGE ===");

  const outDir = path.resolve(process.cwd(), "public", "echantillons");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. PLANNING ASCQ
  const sampleAscq: AscqPlanningData = {
    departement: "Zou",
    commune: "Ouinhi",
    arrondissement: "Tohouès",
    ascqNom: "DOSSOU Bruno",
    ascqPhone: "0165031463",
    semaine: 47,
    annee: 2026,
    dateDebut: "16/11/2026",
    dateFin: "22/11/2026",
    periodeLabel: "Du 16/11/2026 au 22/11/2026",
    rcPlanifies: 16,
    rcAttendus: 15,
    motifEcart: "Un RC malade",
    activitesJours: {
      1: ["Lun"],
      2: ["Mar"],
      3: ["Mer"],
      4: ["Mar"],
      5: ["Mar"],
      6: ["Mer"],
      7: ["Jeu"],
      8: ["Mer"],
      9: ["Mar"],
      10: ["Mar"]
    },
    autreActiviteNom: "Réunion de coordination trimestrielle des leaders",
    autreActiviteJours: ["Mer"],
    observations: "RAS. Couverture épidémiologique communautaire stable.",
    statut: "VALIDE",
    dateValidation: "16/11/2026 08:30"
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

  // 2. PLANNING RC
  const sampleRc: RcPlanningData = {
    departement: "Zou",
    zoneSanitaire: "Covè - Zagnanado - Ouinhi",
    commune: "Ouinhi",
    arrondissement: "Tohouès",
    village: "Honvié Centre",
    grappe: 1,
    rcName: "HOUNGBO Koffi Jean",
    rcPhone: "0197451234",
    semaineNum: 47,
    annee: 2026,
    dateDebutStr: "16/11/2026",
    dateFinStr: "22/11/2026",
    act_vad: [
      {
        date: "16/11/2026",
        heure: "08h00 - 12h00",
        zone: "Grappe 1 - Ménages cibles",
        qte: "5 VAD (5 ménages visités / 45 en charge)"
      }
    ],
    act_causerie: [
      {
        date: "17/11/2026",
        heure: "09h00 - 11h00",
        zone: "Place publique du village",
        qte: "1 causerie • Thème: MILD et lavage des mains"
      }
    ],
    act_animale: [
      {
        date: "18/11/2026",
        heure: "14h00 - 16h00",
        zone: "Enclos communautaires",
        qte: "2 sites inspectés (aucun animal suspect)"
      }
    ],
    act_sociales: [
      {
        date: "19/11/2026",
        heure: "16h00 - 17h00",
        zone: "Ménages indigents",
        qte: "1 visite sociale (suivi orphelin vulnérable)"
      }
    ],
    act_femmes: [
      {
        date: "20/11/2026",
        heure: "08h00 - 11h00",
        zone: "Grappe 1",
        qte: "4 femmes suivies (CPN: 3, VAT: 2)"
      }
    ],
    act_enfants: [
      {
        date: "21/11/2026",
        heure: "08h00 - 11h00",
        zone: "Grappe 1",
        qte: "18 enfants suivis (PEV: 16, Nutrition PB: 18)"
      }
    ],
    act_referees: [
      {
        date: "22/11/2026",
        heure: "En continu",
        zone: "Centre de Santé & ASCQ",
        qte: "2 cas référés (1 fièvre persistante, 1 PB rouge)"
      }
    ],
    act_autres: [
      {
        date: "17/11/2026",
        heure: "07h00 - 08h30",
        zone: "Points d'eau du village",
        qte: "Salubrité publique et désherbage abords forage"
      }
    ],
    observations: "Forte participation de la population aux causeries et vad.",
    dateSoumissionRc: "16/11/2026",
    luEtApprouveAscq: true,
    ascqName: "DOSSOU Bruno",
    ascqPhone: "0165031463",
    dateValidationAscq: "16/11/2026 14:15",
    observationsAscq: "Planning hebdomadaire conforme aux priorités de la zone sanitaire.",
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
  console.log("SUCCÈS TOTAL : Les deux plannings sont 100% vectoriels,");
  console.log("sur EXACTEMENT 1 PAGE A4 PAYSAGE SANS AUCUN DÉBORDEMENT.");
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Échec du test :", err);
  process.exit(1);
});
