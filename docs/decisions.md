# Décisions d'architecture et journal des phases (Projet ASCQ BÉNIN)

Ce document consigne les choix d'architecture validés, les règles métier arbitrées et l'historique des validations par phase.

---

## 1. Principes directeurs et sécurité
- **Utilisateur & porteur du projet** : Bruno DOSSOU, infirmier et ASCQ au Bénin.
- **Approche** : Pas à pas, validation explicite à la fin de chaque phase, langage clair sans jargon.
- **Sécurité et RLS** : 
  - La sécurité au niveau des lignes (Row Level Security - RLS) est activée sur **toutes** les tables de la base Supabase sans exception.
  - Séparation stricte entre les données médicales/statistiques et les données nominatives sensibles : le NPI, l'IFU de l'ASCQ, le nom, prénom et téléphone des malades ou des personnes décédées sont stockés dans des tables privées (`cas_identite_privee`, `deces_identite_privee`, `ascq_profil_prive`).
  - Aucun secret ni clé `service_role` dans le code source ou dans les échanges.
- **Données réelles** : Données de test fictives uniquement (département du Zou : Covè, Zagnanado, Ouinhi). Rappel obligatoire : validation avec la Direction Départementale de la Santé (DDS) avant toute mise en service réelle.

---

## 2. Historique et validation des phases

### Phase 0 : Préparation (Validée le 25/10/2026)
- Vérification de Node.js (v24.22.1) et installation de Git.
- Création du projet Next.js 15, TypeScript, Tailwind CSS.
- Initialisation du dépôt Git local sur la branche `main` (commit initial `f88f62c`).
- Application fonctionnelle sur `http://localhost:3000`.

### Phase 1 : Architecture et décisions (Validée le 25/10/2026)
- Modèle de données validé avec découpage des tables publiques et privées.
- Règles géographiques : cascade département → zone sanitaire → commune → arrondissement → village.
- Règle de Cotonou : 13 arrondissements enregistrés avec statut « À rattacher ».
- Séparation poste métier (ASCQ, RC, etc.) et rôle technique (RLS).
- Connexion gratuite par téléphone sans frais SMS via Supabase Auth.
- 3 arbitrages métier tranchés par Bruno :
  1. Semaine épidémiologique : démarre le **lundi**.
  2. Investigation autonome sans alerte : **Option B** validée.
  3. Codes décès du registre : rattachement par âge exact avec case décès maternel prioritaire.

### Phase 2 : Fondations de la base de données (Validée le 25/10/2026)
- Connexion de l'application à Supabase via `.env.local`.
- Exécution de la migration SQL complète (`supabase/migrations/20261025_phase2_fondations.sql`).
- Référentiel géographique officiel du Bénin importé et vérifié :
  - **12 départements**
  - **34 zones sanitaires** (dont les 4 zones de Cotonou)
  - **77 communes**
  - **546 arrondissements** (dont 13 de Cotonou « À rattacher »)
- Sécurité RLS active sur 100% des tables (0 donnée privée exposée).
- Données d'essai fictives créées dans le Zou (Covè, Zagnanado, Ouinhi).
- Validation réussie par la batterie de tests automatisés (`scripts/test-phase2.js`).

### Phase 3 : Partie publique, inscription, connexion, validation des comptes, annuaire (Validée le 25/10/2026)
- **Refonte visuelle de l'accueil selon la maquette Format 1** :
  - En-tête vert foncé `#005c30` avec logo officiel ASCQ, Ministère de la Santé et liseré tricolore béninois.
  - Typographie manuscrite élégante (`Dancing Script / Caveat`) pour le mot « Bienvenue ».
  - Logo officiel centré sans chevauchement avec la barre d'onglets (Accueil, Connexion, Inscription, Suggestions).
  - Boutons d'action : « Se connecter » (vert plein) et « S'inscrire » (contour).
  - 4 cartes d'indicateurs clés : ASCQ opérationnels, Relais communautaires opérationnels, Ménages touchés, Personnes touchées.
  - Carte Conseils santé avec état par défaut.
  - Annuaire de proximité « Qui est l'ASCQ de mon milieu ? » en cascade avec appel direct.
  - Carte d'écoute citoyenne sur fond vert pâle « Aidez-nous à mieux vous servir » avec bouton d'envoi et email officiel.
  - 4 réseaux sociaux officiels : Facebook, LinkedIn, e-mail, WhatsApp.
  - Retrait du bouton d'administration de la page publique.
- **Référentiel géographique nettoyé** : Noms des 12 départements, 34 zones, 77 communes et 546 arrondissements en MAJUSCULES SANS ACCENT.

### Phase 4 : Enrôlement et accès des Relais Communautaires (RC) (Validée le 25/10/2026)
- **Table `relais_communautaires` & Sécurité RLS** :
  - RLS activée : Un ASCQ ne peut voir, ajouter, modifier et supprimer que ses propres RC (`ascq_id = auth.uid()`).
  - Un RC connecté ne peut voir que sa propre fiche (`user_id = auth.uid()`).
  - Sécurisation anti-récursion des politiques de la table `utilisateurs`.
- **Enrôlement d'un RC par son ASCQ (`/espace-ascq/relais`)** :
  - Formulaire : Nom, Prénoms, Téléphone, Village de rattachement (avec sélection ou ajout libre), Numéro de grappe, Nom de grappe.
  - Génération automatique d'un code d'accès temporaire aléatoire à 6 chiffres via la fonction RPC `enroler_relais_communautaire`.
  - Modale d'alerte haute priorité : affichage géant du code temporaire **une seule fois**, avec boutons de copie et de partage direct via WhatsApp au RC.
  - Gestion des RC : tableau de bord de l'ASCQ avec badges de statut (Code en attente vs Compte actif).
  - Fonctionnalité de réinitialisation du code d'accès (`reinitialiser_code_acces_rc`) en cas d'oubli ou de perte d'accès.
- **Accès et première connexion du RC (`/relais/premiere-connexion`)** :
  - Le RC se connecte avec son numéro et son code temporaire.
  - Obligation immédiate de définir un mot de passe personnel d'au moins 6 caractères via la fonction RPC `definir_mot_de_passe_rc`.
  - Le code temporaire est marqué comme utilisé (`code_temporaire_utilise = TRUE`) et le mot de passe est enregistré.
- **Espace dédié du Relais Communautaire (`/espace-rc`)** :
  - En-tête personnalisé avec le nom du RC.
  - 3 onglets conformes à AGENTS.md :
    1. **Mes fiches** (Registre communautaire, Notification d'alerte, Notification de décès).
    2. **Notifications** (consignes et alertes de son superviseur ASCQ).
    3. **Mon compte** (fiche d'identification, village, grappe, coordonnées de son superviseur ASCQ avec bouton d'appel direct, changement de mot de passe, déconnexion).

### Phase 5 : Mon espace, permutation, requêtes, bibliothèque (Réalisée le 25/10/2026)
- **Navigation unifiée de l'ASCQ (`AscqNav`)** :
  - En-tête vert foncé avec logo officiel, identité de l'agent, bouton « Enrôler un RC », notifications et déconnexion.
  - Barre d'onglets pour tous les modules de l'ASCQ : *Mon espace*, *Mes Relais*, *Permutations*, *Requêtes*, *Bibliothèque*.
- **Mon Espace (`/espace-ascq`)** :
  - Synthèse de « Ma situation » : Zone d'intervention complète (département, zone sanitaire, commune, arrondissement, cumul, structure de santé rattachée).
  - Modification directe des 3 champs autorisés : téléphone, source de financement et nombre de RC en charge via la fonction RPC `mettre_a_jour_mon_espace`.
  - Verrouillage sécurisé des données administratives et territoriales avec cadenas et renvoi vers les requêtes.
- **Permutations (`/espace-ascq/permutations`)** :
  - Table `permutations` et sécurité RLS.
  - Bourse des permutations disponibles avec visualisation du poste actuel de départ et de la destination souhaitée.
  - Fonctionnalité « Proposer une permutation » via `proposer_permutation`.
  - Formulaire de publication d'une demande avec sélection géographique en cascade (département → commune → arrondissement) et motif via `publier_demande_permutation`.
  - Onglet « Ma demande active » pour suivre le statut de son offre.
- **Requêtes administratives & techniques (`/espace-ascq/requetes`)** :
  - Table `requetes_ascq` avec statuts (`ENVOYEE`, `EN_COURS`, `RESOLUE`, `REJETEE`) et priorités (`NORMALE`, `URGENTE`).
  - Formulaire de création de requête par type (modification d'affectation, administrative, technique, suggestion, autre).
  - Suivi des réponses formulées par l'administration avec horodatage et affichage distinctif.
- **Bibliothèque officielle (`/espace-ascq/bibliotheque`)** :
  - Table `bibliotheque_documents` avec catégories officielles (Guides cliniques, Surveillance épidémiologique, Outils de gestion, Textes réglementaires, Formation).
  - Seed initial de 5 documents officiels du Ministère de la Santé du Bénin (iCCM / PCIME-C, directives de surveillance SBC, politique nationale de santé communautaire, outils de rapportage RMA, formation RC).
  - Boutons d'accès direct « Consulter sur Google Drive » et recherche instantanée par mot-clé.

### Phase 6 : Moteur de formulaire commun et fiche pilote : notification d'alerte (Réalisée le 25/10/2026)
- **Moteur de fiches et architecture (`src/lib/fiches.ts`)** :
  - Définition des 20 types d'alertes officiels (avec drapeaux `estPrioritaire` et `concerneAnimaux`).
  - Référentiel des 30 signes et symptômes de référence classés par catégorie clinique.
  - Calcul dynamique et automatique de la semaine épidémiologique ISO 8601 (la semaine débute strictement le **lundi**, norme Bénin validée en Phase 1).
  - Calcul dynamique du délai détection → notification en heures décimales.
  - Moteur de brouillons hors-ligne (`localStorage`) avec détection automatique sur l'appareil.
- **Composant partagé de signature tactile (`src/components/SignatureCanvas.tsx`)** :
  - Canevas interactif HTML5 compatible mobile (toucher / stylet) et ordinateur (souris).
  - Bouton « Effacer », indicateur visuel de validation et export en Base64 PNG.
- **Base de données et sécurité RLS (`supabase/migrations/20261025_phase6_surveillance_alertes.sql`)** :
  - Table `alertes_communautaires` avec temporalité épidémiologique, cascade géographique, bilan d'impact sans plafond ($\ge 0$), identification du notificateur et statuts (`NOTIFIEE`, `RECUE`, `VERIFIEE`, `INVESTIGUEE`, `CLOTUREE`, `REJETEE`).
  - Table privée `cas_identite_privee` : isolation stricte sous RLS du NPI, nom, prénom, téléphone et adresse du patient (visibles uniquement par le notificateur et son ASCQ superviseur).
  - Tables de référence `types_alertes_reference` (20 types) et `symptomes_reference` (30 symptômes).
  - Fonctions RPC sécurisées : `creer_notification_alerte`, `lister_mes_alertes`, `obtenir_detail_alerte`, `verifier_alerte`.
- **Écrans et parcours utilisateur** :
  - `/fiches` : Page centrale « Mes fiches » avec onglets de filtrage par code (`ALR`, `REG`, `DEC`, `INV`, `RAP`), recherche instantanée, filtres d'alerte prioritaire et badges d'état.
  - `/fiches/nouvelle` : Sélecteur visuel avec les 5 fiches officielles du Bénin (Fiche alerte active, autres signalées pour la Phase 7).
  - `/fiches/alerte/nouvelle` : Formulaire guidé en 4 étapes réactives (1. Lieu & Cas index, 2. Maladie & Signes avec bandeau d'alerte prioritaire, 3. Bilan d'impact & Délais, 4. Notificateur & Signature tactile).
  - `/fiches/alerte/[id]` : Consultation détaillée et bloc d'action de vérification officielle (`AVEREE` / `NON_AVEREE`) réservé à l'ASCQ superviseur avec commentaire d'enquête.
- **Navigation connectée** :
  - Onglet « Surveillance » intégré dans la barre principale `AscqNav`.
  - Bouton actif « Notifier une alerte » intégré dans l'Espace Relais Communautaire (`/espace-rc`).
