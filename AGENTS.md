# AGENTS.md : Projet « ASCQ BÉNIN » (à lire en entier avant toute action)

## A. Qui je suis et comment travailler avec moi

- Je m'appelle Bruno DOSSOU, infirmier et Agent de Santé Communautaire Qualifié (ASCQ) au Bénin. **Je ne suis pas développeur.**
- Le projet est **recommencé de zéro** : il n'existe aucun code, aucune base de données, aucune migration. C'est toi qui fais tout : création du projet, installation des outils, code, base de données, tests, déploiement.
- Parle-moi en **français simple**, sans jargon. Quand une action dépend de moi (créer un compte, cliquer sur un bouton, télécharger un fichier), dis-moi **exactement** quoi faire, étape par étape, avec les mots de l'écran.
- Travaille par **phases** (section 12), **une seule à la fois**. À la fin de chaque phase : explique ce que tu as fait en quelques phrases, dis-moi comment le voir fonctionner (commande ou lien), liste les points à valider, puis **attends ma réponse** avant de continuer.
- L'application doit **toujours se lancer** à la fin de chaque phase. Utilise Git et fais une sauvegarde (commit) à la fin de chaque phase.
- Si une règle est ambiguë, contradictoire, ou si tu vois un risque (sécurité, coût, complexité), **dis-le-moi au lieu de trancher seul**.
- Préfère toujours la solution **la plus simple et la moins coûteuse** qui fonctionne. Pas de technologie compliquée sans raison.
- Tiens à jour deux fichiers : `docs/decisions.md` (décisions prises et questions ouvertes) et `docs/module-surveillance.md` (organisation et règles du module de surveillance).

## B. Projet et pile technique

- Application web **installable (PWA)**, mobile d'abord, pour les ASCQ du Bénin, leurs relais communautaires (RC), les représentants communaux et départementaux et les administrateurs. Interface **entièrement en français**.
- Pile souhaitée : Next.js + TypeScript + Tailwind ; Supabase (PostgreSQL, Authentification, Storage privé, sécurité au niveau des lignes « RLS ») ; pas d'application Android native au départ.
- Hébergement : j'ai déjà un site sur Cloudflare (ascqbenin.dossoubruno34.workers.dev) et je veux à terme le nom de domaine ascqbenin.com. **Gratuit d'abord** ; achat du domaine plus tard. En phase 1, propose l'option la plus simple et fiable pour héberger cette application sur Cloudflare (ou, si c'est nettement plus simple, une autre option gratuite), explique les limites de la formule gratuite, et ne change rien sans mon accord.
- Noms de tables et de colonnes : français, sans accents, en minuscules avec tirets bas (par exemple `alertes`, `deces_communautaires`).
- Évolutif : un pilote dans le département du Zou, puis tout le Bénin.

## C. Sécurité et données

- **Aucun secret dans le chat ni dans le code** : clés et mots de passe vont dans un fichier `.env.local` (jamais publié, ajouté au `.gitignore`). Ne me demande jamais de coller une clé secrète (par exemple `service_role`) dans la conversation ; dis-moi plutôt où la copier moi-même.
- La sécurité RLS est activée sur **toutes** les tables. Aucun accès sans connexion, sauf la partie publique décrite en section 2.
- Le NPI et l'IFU des ASCQ, l'identité des cas et des défunts (NPI, nom, téléphone) sont dans des **tables privées** sous RLS stricte, jamais dans les listes, recherches, tableaux de bord ou exports par défaut.
- Journal d'audit des changements de statut et des modifications sensibles.
- Pendant le développement : **données de test fictives uniquement** (département du Zou : Covè, Zagnanado, Ouinhi). Jamais de vraies données de patients. Avant toute mise en service réelle, les questions de conservation et de protection des données de santé doivent être validées avec la direction départementale de la santé : rappelle-le-moi.
- Des tests de sécurité sont obligatoires à chaque phase qui touche aux données (voir section 11).

## D. Fichiers fournis (dossier `data/`)

- `data/referentiel_geographique_benin.csv` : une ligne par arrondissement (546 lignes), colonnes DÉPARTEMENT, ZONE SANITAIRE, COMMUNE, ARRONDISSEMENT, STATUT ARRONDISSEMENT, STATUT ZONE SANITAIRE.
- `data/referentiel_geographique_benin.xlsx` : mêmes données, avec les onglets Référentiel, Communes (77), Zones sanitaires (34, dont les 4 zones de Cotonou), Contrôles et Notes. **Lis l'onglet Notes avant d'importer.**
- Chiffres attendus après import : **12 départements, 34 zones sanitaires, 77 communes, 546 arrondissements.**
- **Si ces fichiers ne sont pas dans le dossier `data/`**, demande-les-moi et explique-moi comment les y placer (créer le dossier `data`, y glisser les deux fichiers).
- Règles du référentiel :
  - Chaque commune hors Cotonou est rattachée à une seule zone sanitaire (colonne ZONE SANITAIRE).
  - **Cotonou** (13 arrondissements) n'a pas de rattachement : le lien à la zone sanitaire se fait **au niveau de l'arrondissement**, modifiable par un administrateur. Les 13 arrondissements restent « à rattacher » aux 4 zones (Cotonou 1-4, 2-3, 5, 6) jusqu'à ma décision ; **n'invente pas ce rattachement**.
  - Seul le découpage de l'Atlantique est confirmé par un document ; les autres zones sanitaires sont « à confirmer ». Conserve les colonnes de statut sous forme d'un champ de vérification modifiable par les administrateurs.
  - Prévois une colonne d'alias pour les variantes de noms (par exemple SÈMÈ-KPODJI / SÈMÈ-PODJI, DOGBO-TOTA / DOGBO, DASSA-ZOUMÈ / Dassa).
  - Les **villages** ne sont pas fournis : table vide au départ, import par CSV commune par commune, et écran administrateur pour ajouter ou corriger.
  - L'import doit pouvoir être relancé sans créer de doublons.
- Cascade de sélection partout dans l'application : département → zone sanitaire → commune → arrondissement → village.

## 1. Profils et droits d'accès

- **Public (sans compte)** : partie publique uniquement.
- **RC (relais communautaire)** : notifications de son ASCQ ; fiches de surveillance à renseigner (registre, notification d'alerte, notification de décès) ; ses propres saisies seulement.
- **ASCQ** : tous les modules de l'ASCQ, enrôlement de ses RC, suivi et validation des fiches de ses RC.
- **Autres postes** (PF CCLS-TP, RCSE, CCD CNLS-TP, autre) : lecture selon le poste et le territoire.
- **Représentant communal / départemental** : module Périmètre.
- **Administrateur** : module Administration. Niveaux d'administration souhaités à l'origine : SUPER_ADMIN, ADMIN_NATIONAL, ADMIN_DEPARTEMENTAL, ADMIN_COMMUNAL, ADMIN_STRUCTURE. Hiérarchie territoriale : national → département → zone sanitaire → commune → arrondissement → village, avec les structures de santé (centres de santé) auxquelles les ASCQ sont rattachés.
- Propose en phase 1 un modèle de rôles et de permissions simple qui sépare le **poste** (ASCQ, PF CCLS-TP, RCSE, CCD CNLS-TP, autre) du **rôle technique**, avec les représentants communaux et départementaux comme mandats portés par un compte.

## 2. Partie publique (sans connexion)

- **Accueil** : « Bienvenue sur l'application officielle des ASCQ », bouton « Installer l'application » quand le site est ouvert dans un navigateur compatible, boutons « Se connecter » et « S'inscrire ».
- **Tableau de bord national** : nombre d'ASCQ, de RC, de ménages touchés dans l'année, de personnes touchées dans l'année, calculés à partir des rapports validés, strictement agrégés.
- **Espace conseil santé** : messages publiés par les administrateurs.
- **Annuaire « Qui est l'ASCQ de mon milieu ? »** : filtres département, commune, arrondissement ; affiche le nom et le téléphone de l'ASCQ seulement si l'ASCQ a coché l'option.
- **« Aidez-nous à mieux vous servir »** (suggestion, recommandation, réclamation ; « Votre voix compte ») : objet, message, nom et téléphone facultatifs (pour le suivi), département, commune.
- **Contact** : ascqbenin@gmail.com ; icônes Facebook (https://www.facebook.com/profile.php?id=61595028870500), LinkedIn (https://www.linkedin.com/company/ascq-benin/), e-mail, WhatsApp (https://whatsapp.com/channel/0029VbE6MZcHbFV2YFxXoe05).

## 3. Inscription et comptes

- **ASCQ et autres postes** : numéro de téléphone (identifiant), mot de passe, nom, prénoms ; poste (ASCQ, PF CCLS-TP, RCSE, CCD CNLS-TP, autre à préciser) ; département (tous) ; zone sanitaire (ASCQ, PF CCLS-TP, RCSE) ; commune (ASCQ, PF CCLS-TP) ; arrondissement (ASCQ seulement) ; listes filtrées en cascade à partir du référentiel ; case « Je cumule deux arrondissements » qui ouvre un second arrondissement ; source de financement (LLF ; LLF et FADEC Santé communautaire ; SRHR ; autre à préciser) ; nombre de RC en charge ; case « Afficher mon numéro dans l'annuaire public ».
- **Pas de confirmation par e-mail ni SMS.** Le compte est créé « en attente » et activé après validation par un administrateur. Propose une solution simple avec l'authentification de Supabase (par exemple un e-mail technique dérivé du numéro de téléphone) et des protections contre les inscriptions frauduleuses (limitation des tentatives).
- **Enrôlement d'un RC par l'ASCQ** : nom, prénoms, téléphone, village, grappe (nombre), nom de la grappe (facultatif). Le RC se connecte avec son numéro et un **code d'accès généré par l'application**, affiché une seule fois à l'ASCQ, à changer à la première connexion. Réinitialisation du code par l'ASCQ.
- Accès perdu d'un ASCQ : réinitialisation par un administrateur.

## 4. Navigation

- **Barre du haut** : Enrôler un RC (ASCQ), Notifications, Mon compte (photo, données personnelles).
- **Barre du bas** : les modules de l'ASCQ.
- Le **RC** voit seulement : Notifications, Mes fiches, Mon compte.

## 5. Modules de l'ASCQ

- **Mon espace** : ma situation (zone d'intervention, RC en charge, source de financement) ; seuls le téléphone, la source de financement et le nombre de RC sont modifiables par l'ASCQ, tout le reste sur demande à l'administrateur ; suivi de mes requêtes ; **permutation** (demande par département, commune et arrondissement souhaités ; permutations disponibles).
- **Planning** : activités multiples (activité, période, personnes impliquées), signature tactile, validation, téléchargement en PDF bien mis en forme.
- **Activité menée** : superviseur facultatif (nom et prénoms), autres acteurs présents (nom, prénoms, fonction ; ajout multiple), activités, jour ou période, lieu, liste de présence datée et signée, photo facultative (caméra ou galerie), commentaires.
- **Suivi groupé des RC** : date, lieu, objectif, RC attendus et présents (cases à cocher à partir de la liste de ses RC), inventaire du matériel (nom, état, recommandations).
- **Rapport mensuel** : échéance le 3 du mois suivant, notification de retard ; contenu :
  - effectifs : RC en charge, RC actifs ;
  - ménages : en charge, visités, personnes touchées au total, avec eau potable, avec WC, avec MILD non déchirée ;
  - enfants de 0 à 5 ans suivis ; femmes enceintes suivies ; enfants sous-vaccinés orientés vers le centre de santé ;
  - maladies prises en charge en communauté (tableau dynamique) : diarrhée, IRA, malnutrition, paludisme (TDR positif ou négatif), tuberculose suivie, HTA suivie, diabète suivi ;
  - surveillance à base communautaire (nombre de cas) : anthrax, COVID-19, choléra, dengue, fièvre jaune, grippe aviaire, hantavirus, fièvre hémorragique, méningite, mpox, Ebola, PFA, rage, rougeole, shigellose, décès maternel, décès néonatal. **Ces lignes sont pré-remplies depuis les fiches de surveillance validées** pour éviter la double saisie ;
  - santé animale : chiens, chats, singes et nombre vaccinés par espèce ; morsures par espèce ; troupeaux identifiés ;
  - cas référés au centre de santé, cas référés au GUPS, cas pris en charge ;
  - autres activités (activité, période, résultats ; ajout multiple) ; difficultés (difficulté, impact, solution proposée) ; recommandations avec leurs cibles ;
  - signature, validation, **version imprimable soignée** servant de rapport mensuel d'activité. Le modèle est ajustable par les administrateurs.
- **Bibliothèque** : liens cliquables vers des documents Drive déposés par les administrateurs.
- **Requêtes** : requêtes, suggestions, problèmes techniques, avec suivi des réponses.

## 6. Module de surveillance épidémiologique

### 6.1 Organisation

- Un seul module : bouton « Nouvelle fiche » → écran de choix avec 5 grandes cartes (registre, notification d'alerte, notification de décès, investigation, rapport hebdomadaire), puis formulaire en étapes adapté à la fiche. N'affiche que les fiches autorisées pour le rôle.
- Un registre de fiches (fichier `fiches.ts`) et un moteur de formulaire commun (étapes, champs conditionnels, validations, brouillons) avec des composants partagés : localisation en cascade pré-remplie depuis l'affectation, dates avec **semaine épidémiologique calculée** (demande-moi si la semaine commence le lundi ou le dimanche), GPS du téléphone modifiable, notificateur repris du compte, signature tactile. Les règles propres à chaque fiche restent codées par fiche, hors du moteur. N'essaie pas de tout rendre « configurable ».
- Une table par fiche, avec des colonnes communes (village, commune, structure, notificateur, dates, synchronisation, statut).
- « Mes fiches » : liste unique avec filtres (type, statut, période). Numéros automatiques par type (REG-, ALR-, DEC-, INV-, RAP-). Liens visibles entre fiches.
- Enchaînement : le RC note au registre → l'ASCQ vérifie → alerte ou décès → investigation → rapport hebdomadaire → lignes de surveillance du rapport mensuel.

### 6.2 Registre des alertes et rumeurs (RC ; l'ASCQ peut saisir pour lui)

- Table de référence `registre_types` (15 codes) : 1 Fièvre ou notion de fièvre ; 2 Éruption cutanée ; 3 Diarrhée ; 4 Raideur de la nuque ; 5 Paralysie flasque aiguë (PFA) ; 6 Saignements inexpliqués ; 7 Yeux jaunes ; 8 Vomissements importants ; 9 Douleurs abdominales ; 10 Décès néonatal (0-28 jours) ; 11 Décès infantile (< 1 an, néonatals inclus) ; 12 Décès infanto-juvénile (0-5 ans) ; 13 Décès maternel ; 14 Décès ≥ 5 ans, sauf décès maternel ; 15 Autres (à préciser). Ne les fusionne pas avec les 20 types d'alerte.
- Table `registre_alertes_rumeurs` : numéro de ligne, village, centre de santé de référence, relais, saisi par, mois et année (calculés), code du type, précision (si 15), date de survenue, lieu de détection (Communauté ou Commune), nombre de personnes touchées, nombre de personnes décédées (entiers ≥ 0, sans plafond), mesure prise, statut (Enregistrée, Transformée en alerte, Classée sans suite), liens vers l'alerte et le décès créés.
- Boutons « Transformer en alerte » et « Notifier le décès » (codes 10 à 14 : 10 → décès type 2 ; 11 → 2 ou 3 ; 12 → 2, 3 ou 4 ; 13 → 1 ; 14 → 5). Les codes 10 à 14 se recouvrent : propose-moi la règle de rattachement avant de la figer.
- Avertissements : nombre de décès = 0 pour un code 10 à 14 ; décès supérieurs aux personnes touchées. Contrôle de complétude mensuelle par village, avec confirmation explicite « aucune alerte ce mois-ci ».
- Saisie ultra simple : gros boutons, icônes, peu de texte, utilisable hors ligne.

### 6.3 Notification d'une alerte (RC ou ASCQ), fiche officielle « BJ_FORMULAIRE DE NOTIFICATION DES ALERTES EN COMMUNAUTE »

- Champs : année, semaine épidémiologique et mois (calculés), NPI du cas, numéro d'alerte (généré), département, zone sanitaire, commune, arrondissement, village, numéro de grappe, adresse du cas ou des parents, nom et prénoms du cas (1er cas si plusieurs), sexe, téléphone du cas ou d'un parent, date de naissance ou âge (ans, mois ou jours), GPS du domicile.
- **Type d'alerte (20 valeurs)** : 1 Rougeole, 2 Choléra, 3 Méningite, 4 PFA, 5 FHV Lassa, 6 FHV Ebola, 7 Fièvre jaune, 8 Dengue, 9 Anthrax, 10 Shigellose, 11 Grippes aviaires, 12 Rage, 13 COVID-19, 14 Mpox, 15 Morsure de chien, 16 Morsure de serpent, 17 Morsure d'autres animaux, 18 Animaux malades, 19 Animaux morts, 20 Autre événement inhabituel (précision obligatoire). Les champs s'adaptent au type (par exemple, les types animaux).
- Dates : début de la maladie, notification, saisie (par défaut : aujourd'hui).
- **Signes et symptômes** (cases à cocher, table de référence de 30) : fièvre, bouton sur le corps, diarrhée aqueuse, vomissement, selles avec du sang, maux de tête, saignements inexpliqués, raideur de la nuque, altération de la conscience, bombement de la fontanelle, peur de la lumière, peur de l'eau ou des bruits de l'eau, convulsions, yeux jaunes, fatigue intense, nausée, maux de gorge, toux, douleurs abdominales, manque d'appétit, paralysie ou difficultés à marcher ou à se tenir debout, courbatures ou fatigues, douleurs musculaires ou articulaires, présence de sang dans les urines, irritabilité ou agressivité, gonflement des ganglions, crachats teintés de sang, lésions cutanées, difficultés respiratoires, autres à préciser.
- Chiffres (entiers ≥ 0, **sans plafond**) : personnes touchées, personnes mortes, animaux malades, animaux morts ; événement en cours (oui/non).
- Notificateur : nom, titre, centre de santé rattaché au relais, téléphone, signature.
- Compléments issus de la fiche de notification de l'ASCQ : heure de survenue, date et heure de détection, mesures prises, animaux impliqués (oui/non), point focal (repris du compte). Délai détection → notification calculé.
- Statuts : Notifiée, Reçue, Vérifiée, Investiguée, Clôturée ou Rejetée ; résultat de la vérification (en attente, avérée, non avérée) ; date de vérification.
- NPI et identité du cas dans une table privée protégée par RLS.

### 6.4 Notification d'un décès (RC ou ASCQ), fiche « BJ_FORMULAIRE DE NOTIFICATION DES DECES EN COMMUNAUTE »

- Champs : année, semaine, mois (calculés), NPI du défunt, numéro de décès (généré), localisation complète, grappe, adresse, nom et prénoms du défunt, nom et téléphone d'un parent ou proche, date de naissance ou âge (ans, mois, jours), sexe, GPS.
- **Type de décès** : 1 Décès maternel (pendant la grossesse, lors de l'accouchement ou dans les 42 jours après) ; 2 Bébé de 0 à 28 jours ; 3 Enfant de 1 mois à moins d'1 an ; 4 Enfant de 1 à 5 ans ; 5 Personne de plus de 5 ans. Proposition automatique selon l'âge : 0-28 jours → 2 ; 29 jours à moins de 12 mois → 3 ; 1 à 5 ans → 4 ; plus de 5 ans → 5 ; le type 1 est choisi manuellement ; l'utilisateur peut modifier, avec avertissement en cas d'incohérence. Les définitions de la fiche ont des trous (29-30 jours, exactement 5 ans) : applique cette règle, documente-la et signale-la-moi.
- Dates : décès, notification, saisie. Lieu du décès : 1 Centre de santé, 2 Domicile, 3 Accoucheuse, 4 Lieu de culte, 5 Au cours du transport, 6 À l'étranger avec transport du corps au Bénin (pays obligatoire), 7 Autres (à préciser). Circonstances selon les parents : 1 Grossesse/Avortement/Accouchement/Suites de couches, 2 Maladie, 3 Accident de route, 4 Accident domestique, 5 Mort subite, 6 Violence (agression, arme à feu, suicide…), 7 Autres (à préciser).
- Cause probable après autopsie verbale par l'ASCQ sous la supervision du médecin coordonnateur de commune : **code CIM-10** avec recherche par code ou libellé. Charge la liste depuis une source officielle ; ne la saisis pas de mémoire. Notificateur : nom, titre, structure, téléphone, signature.
- Statuts : Notifié, Autopsie verbale en attente, Cause renseignée, Validé, Clôturé. La validation de la cause est réservée à l'ADMIN_COMMUNAL (ou à un rôle dédié si tu le recommandes), avec journal.
- Contrôles : date du décès ≤ notification ≤ saisie ; au moins un champ d'âge ou la date de naissance ; décès maternel = sexe féminin ; avertissement si type 1 sans circonstances 1 (et inversement) ; détection de doublons. Délai de notification calculé. Identité du défunt dans une table privée sous RLS stricte.

### 6.5 Investigation d'un événement (ASCQ), fiche « 10_BJ_Fiche d'investigation des événements de santé par les ASCQ » (V14.11.2025)

- Liée à une alerte (bouton « Investiguer », fiche pré-remplie) ; possible aussi sans alerte (demande-moi s'il faut alors créer une alerte automatiquement).
- Champs : département et zone sanitaire de notification ; commune, arrondissement, village concernés ; relais (nom, téléphone) ; ASCQ (repris du compte) ; GPS ; événement avéré (oui/non) ; source d'information (propose-moi une liste simple et attends ma validation) ; maladie ou événement (mêmes 20 types) ; description de l'événement (signes, symptômes, date de début, personnes touchées) ; description des circonstances (démarrage, notion de voyage…) ; dates de survenue, de notification et d'investigation.
- Nombre total de cas et nombre total de décès : chacun en 8 tranches (0-11 mois, 1 à 5 ans, 6 à 15 ans, plus de 15 ans, chacune masculin et féminin), totaux calculés. Synthèse des actions menées. Investigateurs (plusieurs : nom, titre, signature). Pas de données nominatives des patients.
- Contrôles : décès ≤ cas par tranche ; dates dans l'ordre ; avertissement si écart avec les chiffres de l'alerte liée.
- À la soumission : l'alerte passe à « Investiguée » ; « événement avéré » met à jour le résultat de vérification de l'alerte ; la date d'investigation alimente la date de vérification si elle est vide. Signale-moi tout conflit avec le flux de vérification.

### 6.6 Rapport hebdomadaire de surveillance communautaire (ASCQ), fiche « BJ_RAPPORT HEBDOMADAIRE DE LA SURVEILLANCE A BASE COMMUNAUTAIRE » (V29.05.2025)

- Un rapport par ASCQ, village, année et semaine. Champs : localisation, semaine et dates ; **synthèse des alertes** (alertes détectées, personnes touchées, personnes décédées, alertes vérifiées en 24 à 48 h, alertes avérées) ; **synthèse des décès communautaires** (maternel, néonatal 0-28 jours, infantile < 1 an néonatals inclus, infanto-juvénile 0-5 ans, 5 ans et plus) ; actions menées ; nom et signature du rapporteur ; statuts Brouillon, Soumis, Validé.
- Pré-remplissage : alertes depuis les fiches d'alerte (vérifiées en 24-48 h = date de vérification − date de notification ≤ 48 h ; avérées = événement avéré) ; décès : maternel = type 1, néonatal = type 2, infantile = types 2+3, infanto-juvénile = types 2+3+4, 5 ans et plus = type 5 avec décès maternel exclu (comme le précise le registre ; dis-moi où tu l'appliques, je le ferai confirmer). Valeurs modifiables, avec avertissement visible en cas d'écart avec le calcul automatique.
- Contrôles bloquants : néonatal ≤ infantile ≤ infanto-juvénile ; avérées ≤ vérifiées ≤ détectées ; décédées ≤ touchées ; un rapport « zéro » (tout à 0) doit être confirmé explicitement.

### 6.7 Règles transversales

- Notification immédiate aux responsables du périmètre pour les alertes prioritaires (choléra, Ebola, Lassa, rage, méningite, PFA, rougeole, fièvre jaune) et pour tout décès maternel ou néonatal (solution gratuite d'abord).
- Tableaux de bord : alertes par type, semaine et commune ; délais détection → notification → investigation ; alertes non investiguées ; décès par type et délai de notification ; décès avec cause renseignée ; signaux du registre transformés en alertes ; complétude et ponctualité des rapports hebdomadaires. Exports Excel/CSV sans identité par défaut.

## 7. Espace du RC

Notifications de son ASCQ ; Mes fiches (registre, notification d'alerte, notification de décès ; investigation, rapport hebdomadaire et rapport mensuel réservés à l'ASCQ) ; Mon compte. Les saisies du RC arrivent chez son ASCQ, qui peut les compléter, les valider ou les transformer. Le RC ne voit jamais les saisies d'un autre RC. Interface très simple, utilisable hors ligne.

## 8. Périmètre (représentants communaux et départementaux)

Gérer les rapports des ASCQ de sa commune ou de son département ; modifier ou alerter un ASCQ ; demander des activités aux ASCQ ; consulter les fiches de surveillance de son périmètre et leur complétude.

## 9. Administration

Valider les comptes et réinitialiser les accès ; chercher et corriger la fiche d'un ASCQ ; valider les demandes de permutation ; nommer ou retirer un représentant communal ou départemental ; gérer et répondre aux requêtes ; suivre les suggestions et réclamations du public ; envoyer des alertes aux ASCQ ; modifier le modèle de rapport mensuel ; exporter la liste des ASCQ (et importer une liste initiale au format CSV) ; publier les conseils santé et les documents de la bibliothèque ; gérer les référentiels (zones sanitaires, communes, arrondissements, villages, statuts de vérification, rattachement des arrondissements de Cotonou, types d'alerte, symptômes, CIM-10).

## 10. Notifications

Notifications dans l'application et notifications push de la PWA ; SMS ou WhatsApp en option, solution gratuite d'abord. Prévues : alertes des administrateurs aux ASCQ ; messages de l'ASCQ à tout ou partie de ses RC ; rappel et retard du rapport mensuel (échéance le 3) ; rapport hebdomadaire manquant ; validation de compte ; suite d'une permutation ou d'une requête ; alertes de surveillance prioritaires.

## 11. Hors ligne et tests

- **Hors ligne** : une seule file d'envoi pour toutes les fiches (stockage local du téléphone), brouillons, gestion des doublons et conflits, indicateur visible « en attente d'envoi ».
- **Tests de sécurité obligatoires** : un ASCQ ne voit pas les données d'un autre ; un RC ne voit que ses propres saisies ; un ADMIN_COMMUNAL ne voit pas une autre commune ; aucun accès sans connexion ; l'identité d'un cas ou d'un défunt n'est lisible que par les rôles autorisés ; le téléphone de l'annuaire public n'est exposé qu'avec l'accord de l'ASCQ ; les pré-remplissages (rapport hebdomadaire, rapport mensuel) correspondent aux fiches sources.
- **Tests du référentiel** : après import, 12 départements, 34 zones sanitaires, 77 communes, 546 arrondissements ; chaque commune hors Cotonou a exactement une zone sanitaire ; les 13 arrondissements de Cotonou sont signalés « à rattacher » ; l'import peut être relancé sans créer de doublons.

## 12. Phases de travail

0. **Préparation.** Vérifie ce qui est installé sur mon ordinateur (Node.js, Git). S'il manque quelque chose, dis-moi comment l'installer, pas à pas. Crée le dossier du projet, un projet vide qui s'affiche dans le navigateur, et le dépôt Git. Liste-moi les comptes à créer moi-même (Supabase, GitHub, et mon compte Cloudflare existant) avec la marche à suivre. **Aucune fonctionnalité à cette phase.**
1. **Architecture et décisions** (aucun code d'application). Rends-moi une note courte en français simple : modèle de données, géographie (dont Cotonou), rôles, comptes par téléphone et protections, hébergement sur Cloudflare et limites du gratuit, sauvegardes, risques, et toutes les questions ouvertes. Attends ma validation.
2. **Fondations de la base de données** : projet Supabase, référentiel géographique (import des fichiers de `data/`), rôles et permissions, profils, comptes « en attente », table des RC, données de test fictives, tests de sécurité et tests du référentiel.
3. **Partie publique, inscription, connexion, validation des comptes, annuaire.**
4. **Enrôlement et accès des RC.**
5. **Mon espace, permutation, requêtes, bibliothèque.**
6. **Moteur de formulaire commun et fiche pilote : notification d'alerte.**
7. **Autres fiches de surveillance** : registre, décès, investigation, rapport hebdomadaire, une par une.
8. **Planning, activité menée, suivi groupé des RC.**
9. **Rapport mensuel** avec pré-remplissage de la surveillance et version imprimable.
10. **Périmètre, administration, notifications, tableaux de bord, exports.**
11. **Mise en ligne** : déploiement, PWA installable, sauvegardes, revue de sécurité finale, rappel des validations à faire avec la direction départementale de la santé.

**Commence maintenant par la phase 0 uniquement, puis attends ma réponse.**
