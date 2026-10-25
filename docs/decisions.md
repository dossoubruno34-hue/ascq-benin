# Décisions prises et questions ouvertes

## 1. Principes généraux du projet
- **Utilisateur & porteur du projet** : Bruno DOSSOU, infirmier et ASCQ au Bénin.
- **Approche** : Pas à pas, validation explicite à la fin de chaque phase, langage clair sans jargon.
- **Sécurité** : Aucun secret ni mot de passe dans le code ou les échanges. RLS systématique sur toutes les tables Supabase. Données sensibles (NPI, IFU, identité des patients/défunts) isolées dans des tables privées.
- **Données réelles** : Données de test fictives uniquement durant le développement (département du Zou). Validation préalable nécessaire avec la Direction Départementale de la Santé avant toute mise en production réelle.

## 2. Décisions techniques de la Phase 0 (Préparation)
- **Pile technique retenue** : Next.js (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS, Storage), PWA.
- **Environnement local** : Node.js v24.22.1 détecté, Git installé et configuré avec le dépôt initial sur la branche principale `main`.
- **Référentiel géographique initial** : Fichiers `referentiel_geographique_benin.csv` et `.xlsx` présents dans le dossier `data/` (12 départements, 34 zones sanitaires, 77 communes, 546 arrondissements).

## 3. Questions ouvertes pour la Phase 1 (Architecture & Décisions)
- Choix précis du mode d'hébergement gratuit (Cloudflare Pages / OpenNext vs alternative gratuite la plus robuste et simple).
- Gestion des comptes avec numéro de téléphone comme identifiant via Supabase Auth (ex. email technique dérivé vs provider SMS/OTP ultérieur).
- Rattachement des 13 arrondissements de Cotonou aux 4 zones sanitaires (statut « à rattacher »).
- Modèle simplifié des rôles et permissions (distinction rôle technique vs mandat/poste).
- Jour de démarrage de la semaine épidémiologique (lundi ou dimanche).
