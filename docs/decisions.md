# Décisions d'architecture et questions ouvertes (Projet ASCQ BÉNIN)

Ce document consigne les choix d'architecture validés et les questions soumises à arbitrage.

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

## 2. Modèle de données & Découpage des tables
Les tables sont nommées en français, en minuscules, sans accents, avec tirets bas (`_`).

### A. Référentiel territorial & Tables de référence
- `departements` : les 12 départements du Bénin.
- `zones_sanitaires` : les 34 zones sanitaires (statut de validation : confirmé pour l'Atlantique, à confirmer pour les autres).
- `communes` : les 77 communes du Bénin.
- `arrondissements` : les 546 arrondissements (avec gestion des alias de noms et cas spécifique de Cotonou).
- `villages` : villages et quartiers de ville (alimentés progressivement par commune).
- `structures_sante` : centres de santé communaux, dispensaires et hôpitaux de rattachement.
- `registre_types` : les 15 codes du registre des alertes et rumeurs.
- `alerte_types` : les 20 types d'alertes officielles.
- `symptomes` : les 30 signes et symptômes officiels.
- `cim10_causes` : nomenclature internationale officielle CIM-10 des causes de décès.

### B. Utilisateurs, Profils & Droits
- `utilisateurs` : profil public/commun (nom, prénom, téléphone, poste, statut du compte).
- `ascq_profils` : informations professionnelles de l'ASCQ (source de financement, aire d'intervention, statut annuaire public).
- `ascq_profil_prive` : données sensibles de l'ASCQ (NPI, IFU, documents d'identité).
- `relais_communautaires` : profil des RC rattachés à leur ASCQ (grappe, village, code d'accès temporaire).
- `mandats_territoire` : mandats de représentant communal ou départemental accordés à un utilisateur.

### C. Module de Surveillance épidémiologique
- `registre_alertes_rumeurs` (préfixe `REG-`) : signaux communautaires relevés par le RC ou l'ASCQ.
- `alertes` (préfixe `ALR-`) : fiches d'alerte notifiées.
- `cas_identite_privee` : identité nominative du cas (NPI, nom, contact proche).
- `deces_communautaires` (préfixe `DEC-`) : fiches de déclaration de décès communautaire.
- `deces_identite_privee` : identité nominative du défunt et du proche contact.
- `investigations` (préfixe `INV-`) : rapports d'investigation menés par l'ASCQ.
- `rapports_hebdomadaires` (préfixe `RAP-`) : synthèses hebdomadaires par village et ASCQ.

### D. Activités de l'ASCQ & Rapports périodiques
- `plannings_activites` : plannings mensuels avec signature tactile et export PDF.
- `activites_menees` : fiches d'activités avec superviseurs, liste d'émargement et photos.
- `suivis_groupes_rc` : réunions mensuelles de suivi des RC et inventaire matériel.
- `rapports_mensuels` : rapports d'activité consolidés avec pré-remplissage automatique depuis la surveillance validée.
- `permutations` : demandes et correspondances de permutation d'arrondissements.
- `requetes_support` : requêtes et réclamations des ASCQ et du public.

---

## 3. Géographie et cas particulier de Cotonou
- **Cascade standard** : Département → Zone sanitaire → Commune → Arrondissement → Village.
- **Règle pour Cotonou (13 arrondissements)** :
  - Contrairement aux autres communes où la commune entière appartient à une seule zone sanitaire, la ville de Cotonou est partagée entre 4 zones sanitaires (Cotonou 1-4, Cotonou 2-3, Cotonou 5, Cotonou 6).
  - Dans la base, les 13 arrondissements de Cotonou sont initialement enregistrés avec le statut `A_RATTACHER`.
  - Le rattachement direct arrondissement ↔ zone sanitaire sera configurable depuis l'espace Administrateur dès que Bruno fournira la décision officielle, sans blocage du reste du pays.
- **Variantes et alias de noms** : une colonne `alias` est prévue sur chaque entité géographique pour accepter sans erreur les variations d'écriture (ex: `SÈMÈ-KPODJI` / `SÈMÈ-PODJI`, `DASSA-ZOUMÈ` / `Dassa`).

---

## 4. Modèle des Rôles et Droits d'accès
Pour éviter toute confusion, nous séparons le **poste professionnel de terrain** du **rôle technique de sécurité** dans l'application :

1. **Poste de terrain (métier)** :
   - `ASCQ` (Agent de Santé Communautaire Qualifié)
   - `RC` (Relais Communautaire)
   - `PF_CCLS_TP` (Point Focal CCLS-TP)
   - `RCSE`
   - `CCD_CNLS_TP`
   - `AUTRE` (à préciser)

2. **Rôle technique (sécurité Supabase & RLS)** :
   - `PUBLIC` : Visiteur non connecté (annuaire avec accord, tableau de bord agrégé, conseils santé, formulaire de suggestion).
   - `RELAIS` : Accès restreint uniquement à ses propres fiches (registre, alerte, décès de sa grappe/village).
   - `ASCQ_OPERATEUR` : Accès complet à son espace ASCQ, ses RC, validation des fiches de son aire, plannings, rapports mensuels.
   - `GESTIONNAIRE_PERIMETRE` : Mandat de représentant communal ou départemental permettant de superviser les rapports et fiches des ASCQ de son territoire, sans altérer son statut de base.
   - `ADMINISTRATEUR` : Gestion des utilisateurs, validation des comptes, référentiels, alertes nationales/départementales/communales.

---

## 5. Comptes par téléphone & Authentification sans frais SMS
- **Identifiant de connexion** : le numéro de téléphone béninois (ex: `01XXXXXXXX` ou `+229XXXXXXXX`).
- **Solution technique avec Supabase Auth** :
  - Pour éviter les coûts très élevés des SMS OTP (qui peuvent atteindre plusieurs centaines de milliers de FCFA rapidement), chaque utilisateur choisit un mot de passe à l'inscription.
  - En coulisse, Supabase utilise un e-mail technique transparent (ex: `229XXXXXXXX@ascq-auth.local`), totalement invisible pour l'utilisateur.
  - L'écran de connexion ne demande que le numéro de téléphone et le mot de passe.
- **Workflow d'inscription et activation** :
  - À la création, le compte est au statut `EN_ATTENTE`.
  - L'utilisateur ne peut pas se connecter tant qu'un administrateur (communal ou départemental) n'a pas vérifié son identité et validé son compte.
  - Protection contre les attaques : limitation automatique des tentatives de connexion et intégration de Cloudflare Turnstile (gratuit et invisible).
- **Accès des Relais Communautaires (RC)** :
  - Le RC est enrôlé directement par son ASCQ.
  - L'application génère un code d'accès temporaire à 6 chiffres, affiché une seule fois à l'ASCQ, qui le transmet à son RC.
  - À sa première connexion, le RC choisit son propre mot de passe personnel.

---

## 6. Hébergement Cloudflare et limites du gratuit
- **Solution retenue** : Déploiement sur **Cloudflare Pages**.
- **Avantages majeurs** :
  - Gratuité complète pour le volume d'utilisation d'ASCQ Bénin.
  - Bande passante illimitée (aucun risque de dépassement ou de facturation surprise).
  - Excellentes performances en Afrique de l'Ouest grâce aux nœuds de cache réseau de Cloudflare.
  - Connexion HTTPS sécurisée automatique.
  - Bruno possède déjà un compte Cloudflare actif (`ascqbenin.dossoubruno34.workers.dev`).
- **Limites de l'offre gratuite Cloudflare** :
  - 100 000 requêtes d'exécution par jour (notre application utilise le cache et communique directement avec Supabase, donc largement sous le plafond).
  - 500 déploiements (mises à jour) par mois (très suffisant).
- **Domaine personnalisé** :
  - Déploiement initial sur sous-domaine Cloudflare gratuit.
  - Connexion du domaine `ascqbenin.com` plus tard en quelques clics sans changer d'architecture.

---

## 7. Sauvegardes et continuité de service
- **Code source** : Sauvegardé et versionné sur GitHub (dépôt privé).
- **Base de données Supabase** : 
  - Sauvegardes automatiques quotidiennes incluses dans Supabase.
  - Script d'export mensuel complet (SQL/CSV) téléchargeable par le Super Admin pour conservation locale.
- **Mode Hors Ligne (PWA)** :
  - Stockage local sécurisé sur le smartphone de l'agent (`IndexedDB`).
  - File d'attente des fiches saisies sans réseau avec indicateur visuel « En attente de synchronisation ».
  - Envoi automatique dès que la connexion internet (3G/4G/Wi-Fi) est rétablie.

---

## 8. Questions ouvertes soumises à la validation de Bruno

### Question 1 : Semaine épidémiologique
Le Ministère de la Santé du Bénin fait-il démarrer la semaine épidémiologique le **lundi** ou le **dimanche** ?

### Question 2 : Investigation sans alerte
Lorsqu'un ASCQ ouvre une fiche d'investigation sans être parti d'une fiche d'alerte existante, souhaitez-vous que l'application :
- Option A : Crée automatiquement en coulisse une fiche d'alerte liée pour que les statistiques restent alignées ?
- Option B : Laisse l'investigation exister seule sans créer d'alerte ?

### Question 3 : Rattachement automatique des codes décès du Registre (codes 10 à 14)
Dans le registre, les codes 10 à 14 recouvrent différentes tranches d'âge :
- Code 10 : Décès néonatal (0 à 28 jours)
- Code 11 : Décès infantile (< 1 an, néonatals inclus)
- Code 12 : Décès infanto-juvénile (0 à 5 ans)
- Code 13 : Décès maternel
- Code 14 : Décès ≥ 5 ans (hors maternel)

Pour éviter toute ambiguïté lors de la conversion d'une ligne du registre en fiche de décès officielle :
- Validez-vous que le choix du code de décès soit guidé par **l'âge exact du défunt** (0-28 jours = néonatal ; 29 jours à 11 mois = infantile non néonatal ; 1 an à 5 ans = enfant 1-5 ans ; > 5 ans = adulte/plus de 5 ans), le décès maternel restant une case à cocher prioritaire dédiée ?
