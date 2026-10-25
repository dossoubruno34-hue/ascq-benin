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

### Phase 3 : Partie publique, inscription, connexion, validation des comptes, annuaire (En cours de validation)
- **Partie publique (`/`)** :
  - Accueil officiel avec bouton d'installation PWA (`InstallPwaButton`).
  - Tableau de bord national consolidé en direct (nombre d'ASCQ, de RC, ménages et personnes suivies).
  - Annuaire officiel interactif « Qui est l'ASCQ de mon milieu ? » avec filtres en cascade (département → commune → arrondissement) et appel direct sécurisé.
  - Espace Conseils santé officiel avec cartes thématiques.
  - Module citoyen « Votre voix compte / Aidez-nous à mieux vous servir » (suggestions, recommandations, réclamations).
  - Coordonnées officielles, e-mail et canaux certifiés (WhatsApp, Facebook, LinkedIn).
- **Inscription (`/inscription`)** :
  - Formulaire professionnel complet par numéro de téléphone et mot de passe (sans SMS OTP).
  - Cascades géographiques dynamiques reliées au référentiel.
  - Gestion des cas particuliers : cumul d'arrondissements, sources de financement, option visibilité annuaire.
  - Compte créé immédiatement au statut `EN_ATTENTE` avec déconnexion forcée de sécurité.
- **Connexion (`/connexion`)** :
  - Connexion par numéro de téléphone et mot de passe.
  - Contrôle du statut administratif : affichage d'un panneau d'information bienveillant si le compte est en attente, redirection selon rôle si validé.
- **Validation des comptes (`/admin/validation-comptes`)** :
  - Interface dédiée pour les administrateurs permettant de visualiser tous les agents en attente, d'examiner leur affectation et de valider ou refuser les accès en un clic.
