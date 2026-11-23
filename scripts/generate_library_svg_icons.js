/**
 * GÉNÉRATEUR INTÉGRAL DES 56 PICTOGRAMMES VECTORIELS (MODULES 1 À 8)
 * Conforme au référentiel officiel :
 * "Bibliothèque Iconographique Complète — ASCQ Bénin"
 *
 * Spécifications techniques de la Charte Graphique & Grammaire Vectorielle :
 * - Grille & Conteneur : Format carré 1:1 (512 × 512 px), tuile squircle (rx="96") avec marge interne 16 px.
 * - Contours (Ink) : Bleu nuit profond (#112A3A), épaisseur principale 12 à 14 px, terminaisons arrondies.
 * - Palette Chromatique :
 *     Turquoise #0E8A94 · Vert Médical #1D8F5A · Bleu Profond #163A5F
 *     Ocre #E89B2D · Terracotta #D95B38 · Alerte #D63838 · Fond Ivoire #F7F5EE
 * - Signature Culturelle : Frises géométriques périmétriques sobres (chevrons et motifs tissés) sans texte, chiffre ni lettre incrustés.
 * - Badges d'État : Pastille circulaire (r="52") placée en haut à droite (cx="422" cy="94") avec liseré blanc cassé de 10 px.
 */

const fs = require("fs");
const path = require("path");

const INK = "#112A3A";
const TURQUOISE = "#0E8A94";
const VERT = "#1D8F5A";
const BLEU = "#163A5F";
const OCRE = "#E89B2D";
const TERRACOTTA = "#D95B38";
const ALERTE = "#D63838";
const IVOIRE = "#F7F5EE";
const IVOIRE_DARK = "#EAE5D7";
const WHITE = "#FFFFFF";

function wrapSvg(innerContent, options = {}) {
  const bg = options.bg || IVOIRE;
  const borderColor = options.borderColor || INK;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <rect x="24" y="24" width="464" height="464" rx="96" fill="${bg}" stroke="${borderColor}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  ${innerContent}
</svg>`;
}

function badgeEtat(color, symbolHtml = "") {
  return `
  <g>
    <circle cx="408" cy="104" r="52" fill="${color}" stroke="${IVOIRE}" stroke-width="10"/>
    <circle cx="408" cy="104" r="46" fill="none" stroke="${INK}" stroke-width="8"/>
    ${symbolHtml}
  </g>`;
}

const ICONS = {
  // =========================================================================
  // 2. LES 8 ICÔNES PRINCIPALES (MODULES DE NAVIGATION PRIMAIRE)
  // =========================================================================

  // 1. Soins & Maternité — Poste de santé communautaire à croix médicale verte, chemin d'accès ocre et frise supérieure turquoise
  "public/icons/soins-maternite/sm-module.svg": wrapSvg(`
    <clipPath id="clip-sm">
      <rect x="31" y="31" width="450" height="450" rx="88"/>
    </clipPath>
    <g clip-path="url(#clip-sm)">
      <!-- Frise supérieure turquoise à chevrons sobres -->
      <rect x="24" y="24" width="464" height="58" fill="${TURQUOISE}"/>
      <path d="M36 62 L64 40 L92 62 L120 40 L148 62 L176 40 L204 62 L232 40 L260 62 L288 40 L316 62 L344 40 L372 62 L400 40 L428 62 L456 40 L484 62" stroke="${IVOIRE}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
      <line x1="24" y1="82" x2="488" y2="82" stroke="${INK}" stroke-width="12"/>
      <!-- Sol et chemin d'accès ocre -->
      <rect x="24" y="366" width="464" height="122" fill="${OCRE}"/>
      <line x1="24" y1="366" x2="488" y2="366" stroke="${INK}" stroke-width="12"/>
      <path d="M222 366 L190 488 L322 488 L290 366 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <!-- Murs du poste de santé -->
      <rect x="128" y="218" width="256" height="148" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
      <!-- Porte et fenêtres -->
      <rect x="224" y="276" width="64" height="90" rx="10" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
      <rect x="152" y="256" width="44" height="44" rx="8" fill="${IVOIRE_DARK}" stroke="${INK}" stroke-width="10"/>
      <rect x="316" y="256" width="44" height="44" rx="8" fill="${IVOIRE_DARK}" stroke="${INK}" stroke-width="10"/>
      <!-- Toit terracotta -->
      <path d="M98 220 L256 116 L414 220 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
      <!-- Médaillon croix médicale verte sur le fronton -->
      <circle cx="256" cy="184" r="36" fill="${IVOIRE}" stroke="${INK}" stroke-width="11"/>
      <path d="M256 164 V204 M236 184 H276" stroke="${VERT}" stroke-width="14" stroke-linecap="round"/>
    </g>
  `),

  // 2. Surveillance — Radar épidémiologique bleu profond avec détection de foyers et croix centrale d'alerte sanitaire
  "public/icons/surveillance/surv-module.svg": wrapSvg(`
    <circle cx="256" cy="256" r="176" fill="${BLEU}" stroke="${INK}" stroke-width="13"/>
    <circle cx="256" cy="256" r="132" fill="none" stroke="${TURQUOISE}" stroke-width="8" stroke-dasharray="18 14"/>
    <circle cx="256" cy="256" r="88" fill="none" stroke="${IVOIRE}" stroke-width="7" opacity="0.45"/>
    <!-- Faisceau radar -->
    <path d="M256 256 L380 132 A175 175 0 0 1 430 256 Z" fill="${TURQUOISE}" opacity="0.35"/>
    <!-- Foyers détectés -->
    <circle cx="348" cy="176" r="16" fill="${OCRE}" stroke="${IVOIRE}" stroke-width="5"/>
    <circle cx="172" cy="322" r="14" fill="${TERRACOTTA}" stroke="${IVOIRE}" stroke-width="5"/>
    <!-- Croix centrale d'alerte sanitaire -->
    <circle cx="256" cy="256" r="50" fill="${ALERTE}" stroke="${IVOIRE}" stroke-width="10"/>
    <path d="M256 230 V282 M230 256 H282" stroke="${WHITE}" stroke-width="14" stroke-linecap="round"/>
  `, { bg: BLEU }),

  // 3. Terrain & RC — Relais communautaire en intervention sur sentier villageois bordé d'habitations locales
  "public/icons/terrain-rc/trc-module.svg": wrapSvg(`
    <clipPath id="clip-trc">
      <rect x="31" y="31" width="450" height="450" rx="88"/>
    </clipPath>
    <g clip-path="url(#clip-trc)">
      <!-- Prairie verte en bas -->
      <path d="M24 316 Q160 292 288 314 T488 308 L488 488 L24 488 Z" fill="${VERT}" stroke="${INK}" stroke-width="13"/>
      <!-- Sentier villageois ocre sinueux -->
      <path d="M238 312 Q285 370 218 420 Q175 452 210 488 L306 488 Q272 448 312 410 Q360 362 288 312 Z" fill="${OCRE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <!-- Case traditionnelle à gauche -->
      <rect x="88" y="236" width="98" height="80" fill="${WHITE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <rect x="122" y="266" width="30" height="50" rx="6" fill="${BLEU}" stroke="${INK}" stroke-width="10"/>
      <path d="M72 238 L137 174 L202 238 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <!-- Agent RC à droite -->
      <circle cx="348" cy="194" r="32" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
      <path d="M296 312 C296 262 320 242 348 242 C376 242 400 262 400 312 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    </g>
  `),

  // 4. Rapports SNIS — Tableau de bord statistique institutionnel combinant histogramme multicolore et courbe de progression
  "public/icons/rapports-snis/snis-module.svg": wrapSvg(`
    <rect x="74" y="84" width="364" height="344" rx="44" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Barres d'histogramme multicolores -->
    <rect x="118" y="292" width="44" height="86" rx="8" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <rect x="188" y="246" width="44" height="132" rx="8" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <rect x="258" y="204" width="44" height="174" rx="8" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <rect x="328" y="156" width="44" height="222" rx="8" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
    <!-- Ligne de base -->
    <line x1="104" y1="378" x2="394" y2="378" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <!-- Courbe de progression -->
    <path d="M132 234 L206 186 L276 154 L350 118" stroke="${BLEU}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="350" cy="118" r="14" fill="${OCRE}" stroke="${INK}" stroke-width="9"/>
  `, { bg: BLEU }),

  // 5. Gouvernance — Édifice institutionnel à colonnade et fronton doré symbolisant l'autorité sanitaire nationale
  "public/icons/gouvernance/gov-module.svg": wrapSvg(`
    <!-- Fronton doré ocre -->
    <path d="M92 204 L256 104 L420 204 Z" fill="${OCRE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <path d="M142 184 L256 122 L370 184 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="102" y="204" width="308" height="24" rx="6" fill="${IVOIRE}" stroke="${INK}" stroke-width="11"/>
    <!-- Colonnade (3 colonnes) -->
    <rect x="134" y="228" width="40" height="146" fill="${IVOIRE}" stroke="${INK}" stroke-width="12"/>
    <rect x="236" y="228" width="40" height="146" fill="${IVOIRE}" stroke="${INK}" stroke-width="12"/>
    <rect x="338" y="228" width="40" height="146" fill="${IVOIRE}" stroke="${INK}" stroke-width="12"/>
    <!-- Soubassement à degrés -->
    <rect x="96" y="374" width="320" height="26" rx="6" fill="${IVOIRE}" stroke="${INK}" stroke-width="11"/>
    <rect x="76" y="400" width="360" height="24" rx="6" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
  `, { bg: BLEU }),

  // 6. Outils — Mallette opérationnelle de l'agent communautaire ornée d'une croix sanitaire verte
  "public/icons/outils/out-module.svg": wrapSvg(`
    <!-- Poignée supérieure -->
    <path d="M196 146 V112 C196 96 208 86 224 86 H288 C304 86 316 96 316 112 V146" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <!-- Corps de la mallette -->
    <rect x="76" y="146" width="360" height="272" rx="42" fill="${IVOIRE}" stroke="${INK}" stroke-width="14"/>
    <!-- Rabat supérieur turquoise -->
    <path d="M76 188 C76 164 94 146 118 146 H394 C418 146 436 164 436 188 V234 H76 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="13"/>
    <!-- Bandeau médian ocre -->
    <rect x="76" y="274" width="360" height="36" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <!-- Médaillon central à croix verte -->
    <circle cx="256" cy="292" r="46" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <path d="M256 268 V316 M232 292 H280" stroke="${VERT}" stroke-width="14" stroke-linecap="round"/>
  `, { bg: TURQUOISE }),

  // 7. Synchronisation — Double anneau bidirectionnel de transfert entre terminal mobile et serveur national
  "public/icons/synchronisation/sync-module.svg": wrapSvg(`
    <circle cx="256" cy="256" r="158" fill="${IVOIRE}" stroke="${INK}" stroke-width="13"/>
    <!-- Arc supérieur vert -->
    <path d="M162 226 A98 98 0 0 1 342 204" stroke="${VERT}" stroke-width="16" stroke-linecap="round"/>
    <path d="M348 168 L352 216 L306 208" stroke="${VERT}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Arc inférieur turquoise -->
    <path d="M350 286 A98 98 0 0 1 170 308" stroke="${TURQUOISE}" stroke-width="16" stroke-linecap="round"/>
    <path d="M164 344 L160 296 L206 304" stroke="${TURQUOISE}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  `, { bg: VERT }),

  // 8. Déconnexion — Portail de sortie institutionnel avec flèche terracotta de fermeture de session
  "public/icons/deconnexion/auth-logout-module.svg": wrapSvg(`
    <!-- Cadre de portail ouvert à gauche -->
    <path d="M276 116 H148 C126 116 112 130 112 152 V360 C112 382 126 396 148 396 H276" stroke="${IVOIRE}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Flèche terracotta de sortie vers la droite -->
    <line x1="204" y1="256" x2="396" y2="256" stroke="${TERRACOTTA}" stroke-width="18" stroke-linecap="round"/>
    <path d="M336 192 L404 256 L336 320" stroke="${TERRACOTTA}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  `, { bg: BLEU }),

  // =========================================================================
  // 3. SOUS-ICÔNES — MODULE 1 : SOINS & MATERNITÉ (5 SOUS-ICÔNES)
  // =========================================================================

  // Vue d'ensemble — Grille synoptique à 4 cadrans : soins cliniques, santé maternelle, constantes vitales et croissance infantile
  "public/icons/soins-maternite/sm-vue-ensemble.svg": wrapSvg(`
    <!-- Cadran 1 : Croix médicale verte -->
    <rect x="86" y="86" width="154" height="154" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <circle cx="163" cy="163" r="46" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M163 141 V185 M141 163 H185" stroke="${WHITE}" stroke-width="12" stroke-linecap="round"/>
    <!-- Cadran 2 : Coeur maternité terracotta -->
    <rect x="272" y="86" width="154" height="154" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <path d="M349 204 C349 204 301 174 301 140 C301 122 316 110 331 110 C341 110 349 116 349 124 C349 116 357 110 367 110 C382 110 397 122 397 140 C397 174 349 204 349 204 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <!-- Cadran 3 : Constantes vitales (ECG turquoise) -->
    <rect x="86" y="272" width="154" height="154" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <path d="M108 352 H134 L148 312 L172 388 L190 336 L202 352 H218" stroke="${TURQUOISE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Cadran 4 : Croissance infantile (3 barres) -->
    <rect x="272" y="272" width="154" height="154" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <rect x="304" y="362" width="22" height="36" rx="4" fill="${TURQUOISE}" stroke="${INK}" stroke-width="8"/>
    <rect x="338" y="338" width="22" height="60" rx="4" fill="${OCRE}" stroke="${INK}" stroke-width="8"/>
    <rect x="372" y="310" width="22" height="88" rx="4" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="8"/>
  `),

  // Prise en charge iCCM — Agent de santé communautaire prenant en charge un jeune enfant sous médaillon médical vert
  "public/icons/soins-maternite/sm-iccm.svg": wrapSvg(`
    <!-- Agent ASCQ à gauche -->
    <circle cx="176" cy="196" r="38" fill="${BLEU}" stroke="${INK}" stroke-width="12"/>
    <path d="M106 382 C106 306 136 266 176 266 C216 266 246 306 246 382 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <!-- Croix blanche sur la blouse -->
    <path d="M176 314 V346 M160 330 H192" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>
    <!-- Enfant à droite -->
    <circle cx="332" cy="242" r="30" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <path d="M278 382 C278 326 300 298 332 298 C364 298 386 326 386 382 Z" fill="${OCRE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <!-- Ligne de base -->
    <line x1="88" y1="382" x2="412" y2="382" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <!-- Médaillon médical vert en haut à droite -->
    <circle cx="388" cy="128" r="40" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <path d="M388 108 V148 M368 128 H408" stroke="${WHITE}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Maternité & 1000 Jours — Mère et son nouveau-né protégés au cœur d'un bouclier vert symbolisant les 1000 premiers jours
  "public/icons/soins-maternite/sm-maternite-1000j.svg": wrapSvg(`
    <!-- Anneau bouclier protecteur vert -->
    <circle cx="256" cy="256" r="168" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="256" cy="256" r="144" fill="none" stroke="${VERT}" stroke-width="14"/>
    <!-- Mère -->
    <circle cx="232" cy="184" r="36" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <path d="M164 348 C164 274 196 242 238 242 C278 242 312 274 316 348 Z" fill="${VERT}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <!-- Nouveau-né dans les bras -->
    <circle cx="294" cy="244" r="24" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M242 326 C242 288 268 274 300 278 C328 282 342 304 336 336 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
  `),

  // Perdus de vue — Dossier patient avec tracé de suivi interrompu en pointillés rouges et badge d'alerte
  "public/icons/soins-maternite/sm-perdus-de-vue.svg": wrapSvg(`
    <rect x="108" y="96" width="280" height="328" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Avatar patient ocre -->
    <circle cx="196" cy="196" r="32" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M144 286 C144 250 166 234 196 234 C226 234 248 250 248 286 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
    <!-- Tracé de suivi interrompu en pointillés rouges -->
    <line x1="144" y1="348" x2="236" y2="348" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="258" y1="348" x2="348" y2="348" stroke="${ALERTE}" stroke-width="12" stroke-linecap="round" stroke-dasharray="14 16"/>
    ${badgeEtat(ALERTE, `<path d="M392 88 L424 120 M424 88 L392 120" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>`)}
  `),

  // Références CS/GUPS — Fiche de référence communautaire orientée par une flèche terracotta vers un Centre de Santé
  "public/icons/soins-maternite/sm-references-cs-gups.svg": wrapSvg(`
    <!-- Fiche à gauche -->
    <rect x="78" y="124" width="156" height="248" rx="22" fill="${WHITE}" stroke="${INK}" stroke-width="12"/>
    <line x1="110" y1="178" x2="202" y2="178" stroke="${TURQUOISE}" stroke-width="11" stroke-linecap="round"/>
    <line x1="110" y1="218" x2="186" y2="218" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <!-- Flèche terracotta centrale -->
    <line x1="196" y1="256" x2="296" y2="256" stroke="${TERRACOTTA}" stroke-width="16" stroke-linecap="round"/>
    <path d="M266 222 L304 256 L266 290" stroke="${TERRACOTTA}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Centre de Santé à droite -->
    <rect x="308" y="216" width="128" height="156" fill="${WHITE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M292 218 L372 152 L452 218 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M372 252 V300 M348 276 H396" stroke="${VERT}" stroke-width="13" stroke-linecap="round"/>
  `),

  // =========================================================================
  // 4. SOUS-ICÔNES — MODULE 2 : SURVEILLANCE ÉPIDÉMIOLOGIQUE (9 SOUS-ICÔNES)
  // =========================================================================

  // Guide SIMR & Vaccins — Manuel normatif ouvert associant protocole médical SIMR et seringue de vaccination
  "public/icons/surveillance/surv-guide-simr.svg": wrapSvg(`
    <!-- Livre ouvert -->
    <path d="M84 142 C136 126 204 134 256 158 C308 134 376 126 428 142 V366 C376 350 308 358 256 382 C204 358 136 350 84 366 Z" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="256" y1="158" x2="256" y2="382" stroke="${INK}" stroke-width="12"/>
    <!-- Page gauche : croix médicale verte -->
    <circle cx="170" cy="248" r="36" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M170 228 V268 M150 248 H190" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>
    <!-- Page droite : fiole / seringue turquoise -->
    <rect x="318" y="206" width="48" height="92" rx="10" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <line x1="342" y1="176" x2="342" y2="206" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <line x1="324" y1="176" x2="360" y2="176" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
  `),

  // Fiches Surveillance — Liasse de formulaires épidémiologiques avec critères diagnostiques cochés
  "public/icons/surveillance/surv-fiches.svg": wrapSvg(`
    <rect x="136" y="88" width="268" height="316" rx="28" fill="${IVOIRE_DARK}" stroke="${INK}" stroke-width="11"/>
    <rect x="104" y="116" width="276" height="316" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- En-tête ocre de la fiche -->
    <path d="M104 144 C104 128 116 116 132 116 H352 C368 116 380 128 380 144 V178 H104 Z" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <!-- Lignes et cases cochées -->
    <circle cx="156" cy="236" r="14" fill="${VERT}"/>
    <line x1="192" y1="236" x2="332" y2="236" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="156" cy="296" r="14" fill="${TURQUOISE}"/>
    <line x1="192" y1="296" x2="332" y2="296" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="156" cy="356" r="14" fill="${TERRACOTTA}"/>
    <line x1="192" y1="356" x2="296" y2="356" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Registre des alertes — Registre officiel relié frappé de la cloche de signalement sanitaire
  "public/icons/surveillance/surv-registre-alertes.svg": wrapSvg(`
    <rect x="116" y="84" width="284" height="344" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Reliure terracotta à gauche -->
    <path d="M116 112 C116 96 128 84 144 84 H184 V428 H144 C128 428 116 416 116 400 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <!-- Médaillon cloche / alerte bleu profond -->
    <circle cx="288" cy="204" r="48" fill="${BLEU}" stroke="${INK}" stroke-width="11"/>
    <path d="M288 176 C272 176 264 188 264 206 V220 H312 V206 C312 188 304 176 288 176 Z" fill="${OCRE}"/>
    <!-- Lignes de registre -->
    <line x1="224" y1="298" x2="356" y2="298" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="224" y1="342" x2="356" y2="342" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="224" y1="382" x2="316" y2="382" stroke="${TURQUOISE}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Notifier une alerte — Émetteur d'alerte communautaire diffusant un signal d'urgence immédiat
  "public/icons/surveillance/surv-notifier-alerte.svg": wrapSvg(`
    <!-- Porte-voix / Mégaphone blanc et bleu nuit -->
    <path d="M124 224 H184 L308 148 V364 L184 288 H124 C108 288 96 276 96 260 V252 C96 236 108 224 124 224 Z" fill="${IVOIRE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <path d="M144 288 L164 364 H204 L188 288" fill="${BLEU}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <!-- Ondes sonores d'urgence -->
    <path d="M356 196 A84 84 0 0 1 356 316" stroke="${IVOIRE}" stroke-width="14" stroke-linecap="round"/>
    <path d="M396 162 A132 132 0 0 1 396 350" stroke="${OCRE}" stroke-width="14" stroke-linecap="round"/>
  `, { bg: TERRACOTTA }),

  // Alertes à confirmer — Foyer communautaire et poste de santé avec pastille horloge ambre d'investigation en attente
  "public/icons/surveillance/surv-alertes-a-confirmer.svg": wrapSvg(`
    <!-- Poste / Foyer -->
    <rect x="136" y="232" width="236" height="164" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <path d="M112 234 L254 134 L396 234 Z" fill="${OCRE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <!-- Silhouette foyer à gauche -->
    <circle cx="152" cy="306" r="26" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
    <path d="M108 396 C108 354 126 338 152 338 C178 338 196 354 196 396 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
    ${badgeEtat(OCRE, `<path d="M408 82 V106 L424 116" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`)}
  `),

  // Alertes déjà confirmées — Déclinaison validée du signalement communautaire avec pastille verte de confirmation clinique
  "public/icons/surveillance/surv-alertes-confirmees.svg": wrapSvg(`
    <rect x="136" y="232" width="236" height="164" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <path d="M112 234 L254 134 L396 234 Z" fill="${VERT}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <circle cx="152" cy="306" r="26" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <path d="M108 396 C108 354 126 338 152 338 C178 338 196 354 196 396 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    ${badgeEtat(VERT, `<path d="M390 106 L404 120 L428 92" stroke="${WHITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`)}
  `),

  // Notification de décès — Acte administratif sobre bleu nuit et blanc cassé orné d'une flamme commémorative
  "public/icons/surveillance/surv-notification-deces.svg": wrapSvg(`
    <rect x="116" y="84" width="280" height="344" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Bandeau supérieur bleu nuit sobre -->
    <path d="M116 112 C116 96 128 84 144 84 H368 C384 84 396 96 396 112 V154 H116 Z" fill="${BLEU}" stroke="${INK}" stroke-width="12"/>
    <!-- Flamme commémorative ocre & cierge -->
    <path d="M256 188 C256 188 282 216 282 238 C282 254 270 266 256 266 C242 266 230 254 230 238 C230 216 256 188 256 188 Z" fill="${OCRE}" stroke="${INK}" stroke-width="10"/>
    <rect x="242" y="266" width="28" height="44" rx="4" fill="${IVOIRE_DARK}" stroke="${INK}" stroke-width="10"/>
    <!-- Lignes d'acte -->
    <line x1="164" y1="348" x2="348" y2="348" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="196" y1="384" x2="316" y2="384" stroke="${BLEU}" stroke-width="11" stroke-linecap="round"/>
  `),

  // Fiche d'investigation — Planchette d'enquête épidémiologique inspectée par une loupe à croix sanitaire
  "public/icons/surveillance/surv-fiche-investigation.svg": wrapSvg(`
    <!-- Planchette clipboard -->
    <rect x="104" y="104" width="264" height="316" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <rect x="184" y="82" width="104" height="42" rx="14" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <line x1="148" y1="184" x2="296" y2="184" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <line x1="148" y1="232" x2="264" y2="232" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <line x1="148" y1="280" x2="232" y2="280" stroke="${TURQUOISE}" stroke-width="11" stroke-linecap="round"/>
    <!-- Loupe à croix sanitaire -->
    <circle cx="332" cy="316" r="64" fill="${IVOIRE}" stroke="${INK}" stroke-width="13"/>
    <path d="M332 292 V340 M308 316 H356" stroke="${TERRACOTTA}" stroke-width="13" stroke-linecap="round"/>
    <line x1="378" y1="362" x2="424" y2="408" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
  `),

  // Rapport hebdomadaire — Semainier à 7 colonnes journalières illustrant la synthèse épidémiologique hebdomadaire
  "public/icons/surveillance/surv-rapport-hebdo.svg": wrapSvg(`
    <rect x="76" y="102" width="360" height="312" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Bandeau turquoise supérieur -->
    <path d="M76 134 C76 116 90 102 108 102 H404 C422 102 436 116 436 134 V176 H76 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
    <!-- 7 colonnes journalières -->
    <rect x="110" y="276" width="26" height="96" rx="6" fill="${TURQUOISE}" stroke="${INK}" stroke-width="8"/>
    <rect x="154" y="238" width="26" height="134" rx="6" fill="${VERT}" stroke="${INK}" stroke-width="8"/>
    <rect x="198" y="260" width="26" height="112" rx="6" fill="${OCRE}" stroke="${INK}" stroke-width="8"/>
    <rect x="242" y="216" width="26" height="156" rx="6" fill="${VERT}" stroke="${INK}" stroke-width="8"/>
    <rect x="286" y="248" width="26" height="124" rx="6" fill="${TURQUOISE}" stroke="${INK}" stroke-width="8"/>
    <rect x="330" y="204" width="26" height="168" rx="6" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="8"/>
    <rect x="374" y="232" width="26" height="140" rx="6" fill="${VERT}" stroke="${INK}" stroke-width="8"/>
  `),

  // =========================================================================
  // 5. SOUS-ICÔNES — MODULE 3 : TERRAIN & RC (5 SOUS-ICÔNES)
  // =========================================================================

  // Planning — Agenda mensuel coloré couplé à une horloge de programmation des visites à domicile
  "public/icons/terrain-rc/trc-planning.svg": wrapSvg(`
    <rect x="84" y="108" width="316" height="304" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <path d="M84 140 C84 122 98 108 116 108 H368 C386 108 400 122 400 140 V184 H84 Z" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <!-- Anneaux reliure -->
    <line x1="156" y1="84" x2="156" y2="132" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <line x1="328" y1="84" x2="328" y2="132" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <!-- Grille de jours colorés -->
    <rect x="124" y="216" width="48" height="42" rx="8" fill="${VERT}" stroke="${INK}" stroke-width="9"/>
    <rect x="196" y="216" width="48" height="42" rx="8" fill="${TURQUOISE}" stroke="${INK}" stroke-width="9"/>
    <rect x="268" y="216" width="48" height="42" rx="8" fill="${OCRE}" stroke="${INK}" stroke-width="9"/>
    <rect x="124" y="284" width="48" height="42" rx="8" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="9"/>
    <rect x="196" y="284" width="48" height="42" rx="8" fill="${VERT}" stroke="${INK}" stroke-width="9"/>
    <!-- Horloge en bas à droite -->
    <circle cx="364" cy="364" r="58" fill="${BLEU}" stroke="${INK}" stroke-width="12"/>
    <path d="M364 334 V364 L386 378" stroke="${WHITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Activités — Planchette d'actions communautaires répertoriant les séances de sensibilisation et causeries
  "public/icons/terrain-rc/trc-activites.svg": wrapSvg(`
    <rect x="104" y="96" width="304" height="328" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="164" cy="184" r="18" fill="${VERT}" stroke="${INK}" stroke-width="8"/>
    <line x1="208" y1="184" x2="356" y2="184" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <circle cx="164" cy="256" r="18" fill="${OCRE}" stroke="${INK}" stroke-width="8"/>
    <line x1="208" y1="256" x2="356" y2="256" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <circle cx="164" cy="328" r="18" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="8"/>
    <line x1="208" y1="328" x2="316" y2="328" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <!-- Coche verte en bas à droite -->
    <path d="M332 372 L350 390 L382 354" stroke="${VERT}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Suivis groupés des RC — Médaillon collectif réunissant trois relais communautaires encadrés en session groupée
  "public/icons/terrain-rc/trc-suivis-groupes.svg": wrapSvg(`
    <circle cx="256" cy="256" r="168" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="256" cy="256" r="144" fill="none" stroke="${TURQUOISE}" stroke-width="10"/>
    <!-- RC Gauche -->
    <circle cx="172" cy="236" r="26" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M126 336 C126 296 144 278 172 278 C200 278 218 296 218 336 Z" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <!-- RC Droite -->
    <circle cx="340" cy="236" r="26" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
    <path d="M294 336 C294 296 312 278 340 278 C368 278 386 296 386 336 Z" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <!-- RC Central au premier plan -->
    <circle cx="256" cy="212" r="32" fill="${BLEU}" stroke="${INK}" stroke-width="12"/>
    <path d="M196 346 C196 292 220 266 256 266 C292 266 316 292 316 346 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
  `),

  // Mes Relais — Carte d'accréditation nominative d'un Relais Communautaire avec insigne sanitaire vert
  "public/icons/terrain-rc/trc-mes-relais.svg": wrapSvg(`
    <rect x="76" y="128" width="360" height="256" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <!-- Avatar RC -->
    <circle cx="168" cy="222" r="32" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M116 322 C116 280 138 264 168 264 C198 264 220 280 220 322 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <!-- Insigne sanitaire vert & lignes nominatives -->
    <circle cx="332" cy="204" r="24" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <line x1="256" y1="268" x2="384" y2="268" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="256" y1="308" x2="352" y2="308" stroke="${TURQUOISE}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Validations d'inscription — Profil d'un nouvel agent communautaire accompagné du sceau circulaire vert d'approbation
  "public/icons/terrain-rc/trc-validations-inscription.svg": wrapSvg(`
    <circle cx="236" cy="184" r="52" fill="${OCRE}" stroke="${INK}" stroke-width="13"/>
    <path d="M128 384 C128 296 172 256 236 256 C300 256 344 296 344 384 Z" fill="${BLEU}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <!-- Sceau circulaire vert d'approbation -->
    <circle cx="356" cy="336" r="56" fill="${VERT}" stroke="${IVOIRE}" stroke-width="10"/>
    <circle cx="356" cy="336" r="50" fill="none" stroke="${INK}" stroke-width="11"/>
    <path d="M332 336 L350 354 L382 318" stroke="${WHITE}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Ménages à réassigner — Habitation communautaire avec flèche de réaffectation entre deux relais
  "public/icons/terrain-rc/trc-menages-reassigner.svg": wrapSvg(`
    <rect x="116" y="216" width="184" height="156" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <path d="M92 220 L208 124 L324 220 Z" fill="${OCRE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <rect x="182" y="286" width="52" height="86" rx="8" fill="${BLEU}" stroke="${INK}" stroke-width="10"/>
    <!-- Flèche de réaffectation terracotta -->
    <circle cx="364" cy="308" r="64" fill="${TERRACOTTA}" stroke="${IVOIRE}" stroke-width="10"/>
    <circle cx="364" cy="308" r="58" fill="none" stroke="${INK}" stroke-width="10"/>
    <path d="M334 296 H392 M372 276 L394 296 L372 316" stroke="${WHITE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M394 328 H336 M356 308 L334 328 L356 348" stroke="${WHITE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Campagnes (MIILD, CPS, ONCHO) — Moustiquaire / bouclier de campagne de santé publique
  "public/icons/terrain-rc/trc-campagnes.svg": wrapSvg(`
    <path d="M256 96 L404 376 H108 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="256" y1="96" x2="256" y2="376" stroke="${IVOIRE}" stroke-width="8" stroke-dasharray="12 12"/>
    <circle cx="256" cy="264" r="54" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M256 238 V290 M230 264 H282" stroke="${WHITE}" stroke-width="13" stroke-linecap="round"/>
  `),

  // =========================================================================
  // 6. SOUS-ICÔNES — MODULE 4 : RAPPORTS SNIS (4 SOUS-ICÔNES)
  // =========================================================================

  // Suivi PNSC — Jauge circulaire d'atteinte des objectifs communautaires PNSC avec coche centrale de performance
  "public/icons/rapports-snis/snis-suivi-pnsc.svg": wrapSvg(`
    <circle cx="256" cy="256" r="156" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <path d="M256 124 A132 132 0 1 1 136 312" stroke="${TURQUOISE}" stroke-width="20" stroke-linecap="round"/>
    <path d="M256 124 A132 132 0 0 1 388 256" stroke="${VERT}" stroke-width="20" stroke-linecap="round"/>
    <path d="M208 256 L242 290 L312 216" stroke="${VERT}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Rapport mensuel — Document de synthèse périodique intégrant un diagramme sectoriel et des tableaux récapitulatifs
  "public/icons/rapports-snis/snis-rapport-mensuel.svg": wrapSvg(`
    <rect x="96" y="84" width="320" height="344" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <path d="M96 116 C96 98 110 84 128 84 H384 C402 84 416 98 416 116 V158 H96 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <!-- Diagramme sectoriel -->
    <circle cx="192" cy="264" r="52" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <path d="M192 264 L192 212 A52 52 0 0 1 244 264 Z" fill="${OCRE}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
    <!-- Lignes de tableau -->
    <line x1="276" y1="236" x2="368" y2="236" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="276" y1="276" x2="368" y2="276" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="144" y1="358" x2="368" y2="358" stroke="${VERT}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Synthèse communale — Carte polygonale subdivisée en arrondissements avec point de convergence sanitaire communal
  "public/icons/rapports-snis/snis-synthese-communale.svg": wrapSvg(`
    <polygon points="256,88 404,172 376,364 164,404 104,224" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="256" y1="88" x2="256" y2="256" stroke="${TURQUOISE}" stroke-width="10"/>
    <line x1="104" y1="224" x2="256" y2="256" stroke="${TURQUOISE}" stroke-width="10"/>
    <line x1="376" y1="364" x2="256" y2="256" stroke="${TURQUOISE}" stroke-width="10"/>
    <circle cx="256" cy="256" r="28" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
  `),

  // Exports — Feuille de données structurées avec flèche ascendante d'extraction vers les plateformes nationales
  "public/icons/rapports-snis/snis-exports.svg": wrapSvg(`
    <rect x="108" y="96" width="296" height="320" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <line x1="256" y1="324" x2="256" y2="168" stroke="${VERT}" stroke-width="18" stroke-linecap="round"/>
    <path d="M196 224 L256 162 L316 224" stroke="${VERT}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="168" y1="360" x2="344" y2="360" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
  `),

  // =========================================================================
  // 7. SOUS-ICÔNES — MODULE 5 : GOUVERNANCE & ADMINISTRATION (7 SOUS-ICÔNES)
  // =========================================================================

  // Périmètre — Zone géographique délimitée par quatre bornes territoriales et un repère central de ressort
  "public/icons/gouvernance/gov-perimetre.svg": wrapSvg(`
    <rect x="116" y="116" width="280" height="280" fill="none" stroke="${TURQUOISE}" stroke-width="11" stroke-dasharray="18 14"/>
    <!-- 4 bornes territoriales -->
    <circle cx="116" cy="116" r="18" fill="${BLEU}" stroke="${INK}" stroke-width="9"/>
    <circle cx="396" cy="116" r="18" fill="${BLEU}" stroke="${INK}" stroke-width="9"/>
    <circle cx="116" cy="396" r="18" fill="${BLEU}" stroke="${INK}" stroke-width="9"/>
    <circle cx="396" cy="396" r="18" fill="${BLEU}" stroke="${INK}" stroke-width="9"/>
    <!-- Repère central de ressort -->
    <path d="M256 342 C256 342 324 274 324 222 C324 184 294 154 256 154 C218 154 188 184 188 222 C188 274 256 342 256 342 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <circle cx="256" cy="220" r="22" fill="${IVOIRE}" stroke="${INK}" stroke-width="10"/>
  `),

  // Représentants nommés — Responsable institutionnel distingué par une cocarde officielle à ruban d'accréditation
  "public/icons/gouvernance/gov-representants-nommes.svg": wrapSvg(`
    <circle cx="216" cy="184" r="46" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <path d="M116 376 C116 298 156 260 216 260 C276 260 316 298 316 376 Z" fill="${BLEU}" stroke="${INK}" stroke-width="12"/>
    <!-- Cocarde officielle à ruban -->
    <path d="M352 292 L336 376 L364 358 L392 376 L376 292" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
    <circle cx="364" cy="272" r="42" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
  `),

  // Cadres pour leur ressort — Organigramme hiérarchique reliant un cadre superviseur aux trois unités de son ressort
  "public/icons/gouvernance/gov-cadres-ressort.svg": wrapSvg(`
    <!-- Cadre superviseur en haut -->
    <circle cx="256" cy="136" r="28" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M204 224 C204 188 224 172 256 172 C288 172 308 188 308 224 Z" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <!-- Lignes d'organigramme -->
    <line x1="256" y1="224" x2="256" y2="288" stroke="${INK}" stroke-width="12"/>
    <line x1="136" y1="288" x2="376" y2="288" stroke="${INK}" stroke-width="12"/>
    <line x1="136" y1="288" x2="136" y2="332" stroke="${INK}" stroke-width="12"/>
    <line x1="256" y1="288" x2="256" y2="332" stroke="${INK}" stroke-width="12"/>
    <line x1="376" y1="288" x2="376" y2="332" stroke="${INK}" stroke-width="12"/>
    <!-- 3 unités du ressort -->
    <rect x="96" y="332" width="80" height="56" rx="12" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <rect x="216" y="332" width="80" height="56" rx="12" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <rect x="336" y="332" width="80" height="56" rx="12" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
  `),

  // Administration — Bouclier sécurisé bleu nuit intégrant un engrenage de paramétrage système
  "public/icons/gouvernance/gov-administration.svg": wrapSvg(`
    <path d="M256 84 L404 140 V252 C404 344 336 404 256 432 C176 404 108 344 108 252 V140 Z" fill="${BLEU}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <circle cx="256" cy="252" r="56" fill="${OCRE}" stroke="${IVOIRE}" stroke-width="12"/>
    <circle cx="256" cy="252" r="22" fill="${BLEU}" stroke="${INK}" stroke-width="10"/>
  `),

  // Comptes et validations — Badge d'identité utilisateur certifié par un cachet vert de validation des accès
  "public/icons/gouvernance/gov-comptes-validations.svg": wrapSvg(`
    <rect x="84" y="116" width="344" height="280" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="176" cy="216" r="32" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <path d="M124 316 C124 274 146 258 176 258 C206 258 228 274 228 316 Z" fill="${BLEU}" stroke="${INK}" stroke-width="11"/>
    <line x1="264" y1="196" x2="372" y2="196" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="264" y1="242" x2="348" y2="242" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="348" cy="322" r="36" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M332 322 L344 334 L368 308" stroke="${WHITE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Journal d'audit — Registre chronologique des opérations horodatées avec sceau de contrôle et traçabilité
  "public/icons/gouvernance/gov-journal-audit.svg": wrapSvg(`
    <rect x="104" y="88" width="304" height="336" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="164" cy="176" r="12" fill="${TURQUOISE}"/>
    <line x1="196" y1="176" x2="344" y2="176" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="164" cy="236" r="12" fill="${OCRE}"/>
    <line x1="196" y1="236" x2="344" y2="236" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="164" cy="296" r="12" fill="${VERT}"/>
    <line x1="196" y1="296" x2="288" y2="296" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="332" cy="342" r="42" fill="${BLEU}" stroke="${INK}" stroke-width="11"/>
    <path d="M316 342 L328 354 L352 328" stroke="${OCRE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Demandes d'export du ministère — Dossier officiel scellé d'un cachet doré ministériel avec flux de transmission sécurisé
  "public/icons/gouvernance/gov-demandes-export-ministere.svg": wrapSvg(`
    <path d="M88 156 C88 138 102 124 120 124 H216 L248 160 H392 C410 160 424 174 424 192 V368 C424 386 410 400 392 400 H120 C102 400 88 386 88 368 Z" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <circle cx="256" cy="256" r="44" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <line x1="256" y1="364" x2="256" y2="312" stroke="${VERT}" stroke-width="14" stroke-linecap="round"/>
    <path d="M232 332 L256 306 L280 332" stroke="${VERT}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // =========================================================================
  // 8. SOUS-ICÔNES — MODULE 6 : OUTILS & RESSOURCES (6 SOUS-ICÔNES)
  // =========================================================================

  // Guide utilisateur — Manuel pratique relié portant un repère d'assistance et de prise en main de l'application
  "public/icons/outils/out-guide-utilisateur.svg": wrapSvg(`
    <rect x="116" y="84" width="280" height="344" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <path d="M116 112 C116 96 128 84 144 84 H180 V428 H144 C128 428 116 416 116 400 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
    <circle cx="284" cy="224" r="52" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <circle cx="284" cy="224" r="18" fill="${BLEU}"/>
    <line x1="224" y1="336" x2="344" y2="336" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Formation — Agente de santé en apprentissage continu devant un ouvrage pédagogique ouvert
  "public/icons/outils/out-formation.svg": wrapSvg(`
    <circle cx="256" cy="156" r="42" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <path d="M176 284 C176 234 208 210 256 210 C304 210 336 234 336 284 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
    <!-- Ouvrage pédagogique ouvert au premier plan -->
    <path d="M108 276 C156 262 212 270 256 292 C300 270 356 262 404 276 V396 C356 382 300 390 256 412 C212 390 156 382 108 396 Z" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="256" y1="292" x2="256" y2="412" stroke="${INK}" stroke-width="12"/>
  `),

  // Bibliothèque — Rayonnage de protocoles nationaux, guides cliniques et référentiels de santé publique
  "public/icons/outils/out-bibliotheque.svg": wrapSvg(`
    <rect x="108" y="136" width="68" height="236" rx="10" fill="${TURQUOISE}" stroke="${INK}" stroke-width="12"/>
    <rect x="184" y="116" width="68" height="256" rx="10" fill="${VERT}" stroke="${INK}" stroke-width="12"/>
    <rect x="260" y="148" width="68" height="224" rx="10" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <rect x="336" y="126" width="68" height="246" rx="10" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="12"/>
    <line x1="76" y1="372" x2="436" y2="372" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  `),

  // Permutations — Double flèche bidirectionnelle d'échange d'affectation entre deux agents de terrain
  "public/icons/outils/out-permutations.svg": wrapSvg(`
    <!-- Agent 1 en haut à gauche -->
    <circle cx="152" cy="176" r="28" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <path d="M106 264 C106 228 124 214 152 214 C180 214 198 228 198 264 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <!-- Flèche vers la droite -->
    <line x1="236" y1="184" x2="384" y2="184" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <path d="M348 152 L388 184 L348 216" stroke="${INK}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Agent 2 en bas à droite -->
    <circle cx="360" cy="296" r="28" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <path d="M314 384 C314 348 332 334 360 334 C388 334 406 348 406 384 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="11"/>
    <!-- Flèche vers la gauche -->
    <line x1="276" y1="336" x2="128" y2="336" stroke="${TERRACOTTA}" stroke-width="13" stroke-linecap="round"/>
    <path d="M164 304 L124 336 L164 368" stroke="${TERRACOTTA}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Requêtes — Bulle de dialogue structurée représentant l'envoi de demandes d'assistance et de tickets
  "public/icons/outils/out-requetes.svg": wrapSvg(`
    <path d="M96 156 C96 128 118 108 144 108 H368 C394 108 416 128 416 156 V296 C416 324 394 344 368 344 H224 L144 408 V344 H144 C118 344 96 324 96 296 Z" fill="${WHITE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="156" y1="188" x2="356" y2="188" stroke="${TURQUOISE}" stroke-width="13" stroke-linecap="round"/>
    <line x1="156" y1="236" x2="356" y2="236" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="156" y1="284" x2="276" y2="284" stroke="${OCRE}" stroke-width="12" stroke-linecap="round"/>
  `),

  // Présentation Conseils — Écran de présentation pédagogique illustré d'une croix de prévention pour les causeries éducatives
  "public/icons/outils/out-presentation-conseils.svg": wrapSvg(`
    <rect x="84" y="108" width="344" height="224" rx="22" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="184" cy="220" r="44" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M184 198 V242 M162 220 H206" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>
    <line x1="264" y1="196" x2="372" y2="196" stroke="${TURQUOISE}" stroke-width="13" stroke-linecap="round"/>
    <line x1="264" y1="244" x2="352" y2="244" stroke="${OCRE}" stroke-width="13" stroke-linecap="round"/>
    <!-- Pied de l'écran -->
    <line x1="256" y1="332" x2="256" y2="404" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <line x1="184" y1="404" x2="328" y2="404" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
  `),

  // =========================================================================
  // 9. SOUS-ICÔNES — MODULE 7 : SYNCHRONISATION & HORS-LIGNE (7 SOUS-ICÔNES)
  // =========================================================================

  // État réseau — Barres graduées d'intensité du signal cellulaire avec témoin de disponibilité réseau
  "public/icons/synchronisation/sync-etat-reseau.svg": wrapSvg(`
    <rect x="108" y="316" width="48" height="76" rx="10" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <rect x="184" y="264" width="48" height="128" rx="10" fill="${TURQUOISE}" stroke="${INK}" stroke-width="11"/>
    <rect x="260" y="204" width="48" height="188" rx="10" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <rect x="336" y="144" width="48" height="248" rx="10" fill="${VERT}" stroke="${INK}" stroke-width="11"/>
    <circle cx="388" cy="104" r="32" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M374 104 L384 114 L404 94" stroke="${WHITE}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // File outbox — Boîte d'envoi locale contenant les fiches en attente d'expédition vers le serveur
  "public/icons/synchronisation/sync-file-outbox.svg": wrapSvg(`
    <path d="M96 248 H184 C184 284 212 308 256 308 C300 308 328 284 328 248 H416 V376 C416 394 402 408 384 408 H128 C110 408 96 394 96 376 Z" fill="${OCRE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <line x1="256" y1="244" x2="256" y2="112" stroke="${TERRACOTTA}" stroke-width="16" stroke-linecap="round"/>
    <path d="M204 162 L256 108 L308 162" stroke="${TERRACOTTA}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Synchroniser maintenant — Impulsion d'exécution immédiate au centre d'un anneau de synchronisation active
  "public/icons/synchronisation/sync-maintenant.svg": wrapSvg(`
    <circle cx="256" cy="256" r="152" fill="${WHITE}" stroke="${VERT}" stroke-width="16"/>
    <polygon points="272,124 184,268 252,268 236,388 328,244 260,244" fill="${OCRE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  `),

  // Journal d'erreurs — Registre technique de diagnostic couplé à un triangle rouge d'anomalie de transfert
  "public/icons/synchronisation/sync-journal-erreurs.svg": wrapSvg(`
    <rect x="104" y="96" width="276" height="320" rx="28" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <line x1="152" y1="176" x2="324" y2="176" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <line x1="152" y1="232" x2="288" y2="232" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <polygon points="348,264 424,396 272,396" fill="${ALERTE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <line x1="348" y1="312" x2="348" y2="352" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="348" cy="374" r="6" fill="${WHITE}"/>
  `),

  // Wi-Fi uniquement — Arcs concentriques d'onde sans fil restreignant la synchronisation aux réseaux Wi-Fi
  "public/icons/synchronisation/sync-wifi-uniquement.svg": wrapSvg(`
    <path d="M104 204 A216 216 0 0 1 408 204" stroke="${BLEU}" stroke-width="16" stroke-linecap="round"/>
    <path d="M152 256 A148 148 0 0 1 360 256" stroke="${TURQUOISE}" stroke-width="16" stroke-linecap="round"/>
    <path d="M202 308 A78 78 0 0 1 310 308" stroke="${VERT}" stroke-width="16" stroke-linecap="round"/>
    <circle cx="256" cy="364" r="24" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
  `),

  // Taille du cache — Cylindre de stockage local segmenté illustrant l'occupation de la mémoire hors-ligne
  "public/icons/synchronisation/sync-taille-cache.svg": wrapSvg(`
    <path d="M136 156 C136 128 190 108 256 108 C322 108 376 128 376 156 V356 C376 384 322 404 256 404 C190 404 136 384 136 356 Z" fill="${BLEU}" stroke="${INK}" stroke-width="13"/>
    <path d="M136 224 C136 252 190 272 256 272 C322 272 376 252 376 224 V296 C376 324 322 344 256 344 C190 344 136 324 136 296 Z" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <ellipse cx="256" cy="156" rx="120" ry="44" fill="${IVOIRE}" stroke="${INK}" stroke-width="12"/>
  `),

  // Purge des éléments sensibles synchronisés — Bouclier de confidentialité médicale avec balai d'effacement sécurisé après synchronisation validée
  "public/icons/synchronisation/sync-purge-sensibles.svg": wrapSvg(`
    <path d="M256 88 L392 140 V248 C392 332 328 392 256 420 C184 392 120 332 120 248 V140 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <polygon points="256,176 204,296 308,296" fill="${OCRE}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
    <circle cx="356" cy="356" r="40" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <path d="M340 356 L352 368 L374 344" stroke="${WHITE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // =========================================================================
  // 10. SOUS-ICÔNES — MODULE 8 : DÉCONNEXION & SÉCURITÉ DE SESSION (5 SOUS-ICÔNES)
  // =========================================================================

  // Confirmation de déconnexion — Boîte de dialogue de validation explicite avant sortie de l'espace de travail
  "public/icons/deconnexion/auth-confirmation.svg": wrapSvg(`
    <rect x="88" y="116" width="336" height="280" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="256" cy="212" r="40" fill="${OCRE}" stroke="${INK}" stroke-width="11"/>
    <rect x="136" y="308" width="104" height="44" rx="12" fill="${VERT}" stroke="${INK}" stroke-width="10"/>
    <rect x="272" y="308" width="104" height="44" rx="12" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="10"/>
  `),

  // Éléments non synchronisés — Triangle d'avertissement ambre alertant sur la présence de fiches locales non sauvegardées
  "public/icons/deconnexion/auth-non-synchronises.svg": wrapSvg(`
    <polygon points="256,96 424,392 88,392" fill="${OCRE}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <line x1="256" y1="196" x2="256" y2="296" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
    <circle cx="256" cy="342" r="12" fill="${INK}"/>
  `),

  // Appareil partagé — Smartphone communautaire affichant plusieurs profils utilisateurs distincts sur le même terminal
  "public/icons/deconnexion/auth-appareil-partage.svg": wrapSvg(`
    <rect x="148" y="76" width="216" height="360" rx="32" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <circle cx="222" cy="216" r="24" fill="${TURQUOISE}" stroke="${INK}" stroke-width="10"/>
    <path d="M184 288 C184 258 198 246 222 246 C246 246 260 258 260 288 Z" fill="${TURQUOISE}" stroke="${INK}" stroke-width="10"/>
    <circle cx="292" cy="216" r="24" fill="${OCRE}" stroke="${INK}" stroke-width="10"/>
    <path d="M254 288 C254 258 268 246 292 246 C316 246 330 258 330 288 Z" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="10"/>
    <circle cx="256" cy="388" r="12" fill="${INK}"/>
  `),

  // Purge de session et des caches — Cadenas fermé terracotta marqué d'une croix d'effacement intégral des jetons et caches locaux
  "public/icons/deconnexion/auth-purge-session.svg": wrapSvg(`
    <path d="M184 216 V156 C184 116 216 88 256 88 C296 88 328 116 328 156 V216" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <rect x="124" y="216" width="264" height="196" rx="32" fill="${TERRACOTTA}" stroke="${INK}" stroke-width="13"/>
    <path d="M224 282 L288 346 M288 282 L224 346" stroke="${WHITE}" stroke-width="14" stroke-linecap="round"/>
  `),

  // Déconnexion automatique après inactivité — Horloge de temporisation associée à un cadenas de verrouillage automatique de sécurité
  "public/icons/deconnexion/auth-auto-inactivite.svg": wrapSvg(`
    <circle cx="244" cy="248" r="144" fill="${WHITE}" stroke="${INK}" stroke-width="13"/>
    <path d="M244 156 V248 L304 284" stroke="${TURQUOISE}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="316" y="316" width="92" height="80" rx="16" fill="${OCRE}" stroke="${INK}" stroke-width="12"/>
    <path d="M338 316 V292 C338 276 348 266 362 266 C376 266 386 276 386 292 V316" stroke="${INK}" stroke-width="11"/>
  `)
};

let createdCount = 0;
for (const [relPath, svgContent] of Object.entries(ICONS)) {
  const fullPath = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, svgContent.trim() + "\n", "utf8");
  createdCount++;
}

console.log(`Generated ${createdCount} official vector SVG icons in public/icons/`);
