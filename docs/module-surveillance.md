# Organisation et règles du module de surveillance épidémiologique

Ce document consigne l'organisation détaillée, les formulaires, les règles de calcul et les enchaînements du module de surveillance communautaire d'ASCQ Bénin.

---

## 1. Vue d'ensemble des 5 fiches
1. **Registre des alertes et rumeurs** (Code préfixe `REG-`) : Saisie par le RC ou l'ASCQ pour lui (15 types de signaux).
2. **Notification d'alerte** (Code préfixe `ALR-`) : Fiche officielle BJ « Notification des alertes en communauté » (20 types d'alertes).
3. **Notification de décès** (Code préfixe `DEC-`) : Fiche officielle BJ « Notification des décès en communauté » (5 types de décès).
4. **Investigation d'un événement** (Code préfixe `INV-`) : Fiche d'investigation menée par l'ASCQ suite à une alerte ou de façon autonome.
5. **Rapport hebdomadaire** (Code préfixe `RAP-`) : Synthèse hebdomadaire par village et ASCQ, pré-remplie depuis les alertes et décès validés.

---

## 2. Règles temporelles & Semaine épidémiologique
- **Début de semaine** : La semaine épidémiologique commence strictement le **LUNDI** à 00h00 et se termine le dimanche à 23h59 (norme officielle du Ministère de la Santé du Bénin).
- **Calcul automatique** : Toute date saisie calcule automatiquement l'année épidémiologique, le numéro de semaine épidémiologique (ISO 8601) et le mois correspondant.

---

## 3. Règles d'investigation
- **Lien avec les alertes** : Lorsqu'une alerte est sélectionnée pour être investiguée, les données de base (village, localisation, événement) sont pré-remplies.
- **Investigation autonome (Arbitrage du 25/10/2026)** : Un ASCQ peut créer une fiche d'investigation directement sans alerte préalable (Option B). L'application n'invente pas d'alerte fictive.
- **Mise à jour automatique** : Si l'investigation est liée à une alerte :
  - Le statut de l'alerte passe à `Investiguée`.
  - Le statut de vérification (« Avérée » ou « Non avérée ») est mis à jour selon la conclusion de l'investigateur.

---

## 4. Règles de correspondance pour les décès
- **Âge exact et code de décès** :
  - `0 à 28 jours` : Code 10 (Néonatal) ➔ Type officiel 2 (Bébé de 0 à 28 jours).
  - `29 jours à moins de 1 an` : Code 11 (Infantile) ➔ Type officiel 3 (Enfant de 1 mois à moins d'1 an).
  - `1 an à 5 ans` : Code 12 (Infanto-juvénile) ➔ Type officiel 4 (Enfant de 1 à 5 ans).
  - `Plus de 5 ans` : Code 14 (Personne ≥ 5 ans) ➔ Type officiel 5.
- **Décès maternel (Code 13 / Type 1)** :
  - Sélection manuelle prioritaire.
  - Contrôle bloquant : sexe obligatoirement féminin et circonstance liée à la grossesse, accouchement ou suites de couches (dans les 42 jours).
  - Exclu du comptage des décès généraux de plus de 5 ans pour éviter les doublons statistiques.

---

## 5. Confidentialité des données (Sécurité RLS)
- L'identité nominative (NPI, nom, prénom, téléphone) des cas et des défunts est isolée dans les tables privées `cas_identite_privee` et `deces_identite_privee`.
- Les listes, synthèses hebdomadaires et rapports mensuels n'affichent que les données agrégées et épidémiologiques anonymisées.

---

## 6. Moteur de notification d'alerte (Fiche Pilote Phase 6)
- **Table principale** : `alertes_communautaires` (numérotation unique `ALR-AAAA-XXXXXX`).
- **Table privée sous RLS** : `cas_identite_privee` (NPI, nom, prénom, téléphone, adresse du cas index).
- **Types d'alertes officiels (20 types)** :
  - Prioritaires (notification d'urgence requise) : Rougeole, Choléra, Méningite, PFA, Lassa, Ebola, Fièvre Jaune, Rage.
  - Autres alertes humaines : Dengue, Shigellose, COVID-19, Mpox, Morsure de serpent.
  - Alertes animales / zoonoses : Anthrax, Grippe aviaire, Morsure de chien, Morsure d'autres animaux, Animaux malades (épizootie), Mortalité inhabituelle d'animaux.
  - Événement inhabituel : Saisie libre obligatoire.
- **Référentiel des signes et symptômes (30 signes)** :
  - Répartis en 8 catégories : Général, Cutané, Digestif, Neurologique, Hémorragique, Respiratoire, Urinaire, Autre.
- **Cycle de vie et vérification par l'ASCQ** :
  - Statuts : `NOTIFIEE` ➔ `RECUE` ➔ `VERIFIEE` ➔ `INVESTIGUEE` ➔ `CLOTUREE` (ou `REJETEE`).
  - L'ASCQ superviseur peut vérifier toute alerte transmise par ses relais ou saisie par lui-même, et la marquer comme `AVEREE` ou `NON_AVEREE` avec horodatage et observations.
