# Organisation et règles du module de surveillance épidémiologique

Ce document synthétise les règles, fiches et enchaînements du module de surveillance communautaire.

## 1. Vue d'ensemble des fiches
Le module s'articule autour de 5 grandes fiches :
1. **Registre des alertes et rumeurs** (Code préfixe `REG-`) : Saisie par le RC ou l'ASCQ pour lui (15 types de signaux).
2. **Notification d'alerte** (Code préfixe `ALR-`) : Fiche officielle BJ « Notification des alertes en communauté » (20 types d'alertes).
3. **Notification de décès** (Code préfixe `DEC-`) : Fiche officielle BJ « Notification des décès en communauté » (5 tranches/types de décès).
4. **Investigation d'un événement** (Code préfixe `INV-`) : Fiche d'investigation menée par l'ASCQ suite à une alerte.
5. **Rapport hebdomadaire** (Code préfixe `RAP-`) : Synthèse hebdomadaire par village et ASCQ, pré-remplie depuis les alertes et décès validés.

## 2. Enchaînement opérationnel
- Le Relais Communautaire (RC) détecte et note au registre ou signale une alerte / un décès.
- L'ASCQ vérifie, valide, investigue si nécessaire.
- Les données validées alimentent le rapport hebdomadaire, puis les lignes de surveillance du rapport mensuel de l'ASCQ.

## 3. Données nominatives et confidentialité
- L'identité nominative (NPI, nom, prénom, téléphone) des cas et des personnes décédées est strictement stockée dans des tables isolées protégées par des politiques RLS rigoureuses.
- Les tableaux de bord, exports et rapports agrégés ne contiennent aucun identifiant personnel direct.
