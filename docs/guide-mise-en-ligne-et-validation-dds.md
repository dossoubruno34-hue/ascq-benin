# Guide Officiel de Mise en Ligne, Déploiement et Validation Institutionnelle (Phase 11)

Ce document fournit à l'équipe de coordination et à Bruno DOSSOU le protocole complet pour déployer l'application **ASCQ BÉNIN**, installer la PWA sur les smartphones des agents, sécuriser les données et conduire les démarches officielles avec le Ministère de la Santé et la Direction Départementale de la Santé (DDS).

---

## 1. Déploiement Gratuit sur Cloudflare Pages

L'application Next.js est optimisée pour être hébergée sans aucun frais d'infrastructure sur **Cloudflare Pages**, garantissant une vitesse de chargement instantanée au Bénin grâce aux datacenters locaux et un certificat SSL sécurisé automatique (`https://`).

### Étapes de mise en ligne :
1. **Pousser le code sur GitHub** :
   - Connectez-vous à votre compte GitHub.
   - Si ce n'est pas encore fait, liez votre dépôt local au dépôt GitHub distant :
     ```bash
     git remote add origin https://github.com/<votre-utilisateur>/ascq-benin.git
     git push -u origin main
     ```
2. **Créer le projet sur Cloudflare Pages** :
   - Connectez-vous à votre tableau de bord [Cloudflare](https://dash.cloudflare.com/).
   - Allez dans la section **Workers & Pages** &rarr; cliquez sur **Create application** &rarr; onglet **Pages** &rarr; **Connect to Git**.
   - Sélectionnez votre dépôt GitHub `ascq-benin`.
3. **Paramètres de construction (Build Settings)** :
   - **Framework preset** : `Next.js`
   - **Build command** : `npm run build`
   - **Build output directory** : `.next` (ou `@cloudflare/next-on-pages` si option Edge sélectionnée)
4. **Variables d'environnement (Environment Variables)** :
   Ajoutez les 2 clés indispensables trouvées dans votre fichier local `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<votre-projet>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<votre-cle-anon-publique>`
5. **Lancer le déploiement** :
   - Cliquez sur **Save and Deploy**. En moins de 2 minutes, votre application est en ligne avec une adresse officielle (ex : `https://ascq-benin.pages.dev`).

---

## 2. Installation de la PWA sur les Téléphones des ASCQ et RC

L'application est une **Progressive Web App (PWA)** certifiée, conçue pour être installée directement sur l'écran d'accueil sans passer par le Google Play Store ou l'Apple App Store.

### Sur Android (Chrome, Brave, Samsung Internet) :
1. Ouvrez le lien du site dans le navigateur.
2. Un bouton vert flottant **« Installer l'application »** apparaît en bas de l'écran d'accueil.
3. Cliquez sur **Installer**, ou appuyez sur les 3 points en haut à droite du navigateur puis sélectionnez **« Installer l'application »** (ou « Ajouter à l'écran d'accueil »).
4. L'icône officielle vert foncé **ASCQ Bénin** apparaît instantanément parmi les applications du téléphone, sans barre d'adresse de navigateur.

### Sur iPhone / iPad (Safari) :
1. Ouvrez le lien du site dans **Safari**.
2. Appuyez sur le bouton de partage (l'icône d'un carré avec une flèche vers le haut).
3. Faites défiler vers le bas et sélectionnez **« Sur l'écran d'accueil »**.
4. Validez en cliquant sur **Ajouter**.

### Fonctionnement Hors-Ligne (Offline) :
- Les fiches de notification d'alerte, de décès, le registre et le planning restent accessibles même sans connexion internet (grâce au Service Worker `sw.js` et au stockage local `localStorage`).
- Dès que le téléphone retrouve une connexion réseau 3G/4G ou Wi-Fi, les données et les brouillons peuvent être transmis sans risque de perte.

---

## 3. Protocole de Sauvegarde et Continuité d'Activité

La base de données Supabase dispose de protections automatiques, complétées par notre script de sauvegarde locale :

1. **Sauvegarde automatisée Supabase** :
   - Supabase effectue des sauvegardes automatiques quotidiennes chiffrées de votre base de données PostgreSQL.
   - En cas d'incident, un point de restauration peut être réactivé en un clic depuis les paramètres de Supabase (*Database &rarr; Backups*).
2. **Sauvegarde locale périodique (Export de sécurité)** :
   - Pour archiver sur votre ordinateur un snapshot complet de toutes les fiches épidémiologiques, des 546 arrondissements et des rapports mensuels, exécutez simplement la commande suivante dans le terminal :
     ```bash
     node scripts/sauvegarde-base-supabase.js
     ```
   - Le fichier JSON horodaté est stocké dans le dossier `sauvegardes/` et peut être conservé sur un disque externe ou Google Drive sécurisé.

---

## 4. Revue Finale de Sécurité et Confidentialité (APDP Bénin)

Conformément à la réglementation béninoise sur la protection des données de santé (Autorité de Protection des Données Personnelles - APDP) :

| Règle de Sécurité | Implémentation dans l'Application | Statut |
| :--- | :--- | :---: |
| **Séparation des données nominatives** | Les NPI, noms de famille et téléphones des malades et défunts sont isolés dans des tables privées étanches (`cas_identite_privee`, `deces_identite_privee`). | ✅ Conforme |
| **Sécurité RLS (Row Level Security)** | RLS activée sur 100% des tables. Un ASCQ ne peut jamais consulter les données médicales d'un autre ASCQ. Un RC ne voit que ses propres fiches. | ✅ Conforme |
| **Exports épidémiologiques anonymisés** | L'export CSV de la surveillance ne contient aucun NPI, nom ou donnée identificatrice directe. | ✅ Conforme |
| **Annuaire public de proximité** | Le numéro de téléphone de l'ASCQ n'est exposé au public que si l'agent a expressément activé l'option (`afficher_annuaire_public = TRUE`). | ✅ Conforme |
| **Absence de secrets dans le code** | Aucune clé `service_role` ni mot de passe administrateur n'est inclus dans le code source ou exposé au client. | ✅ Conforme |

---

## 5. Calendrier des Démarches et Validations avec la DDS

Avant la généralisation de l'application à grande échelle, Bruno DOSSOU conduira les étapes institutionnelles suivantes avec la hiérarchie sanitaire :

1. **Présentation au Médecin Coordonnateur de Commune (MCC)** :
   - Faire une démonstration en direct du flux de notification : Alerte RC &rarr; Vérification ASCQ &rarr; Investigation &rarr; Rapport Mensuel d'Activité (RMA).
   - Présenter le format officiel imprimable du RMA avec l'emplacement réservé pour le **Visa & Cachet du MCC**.
2. **Validation des 17 Pathologies One Health avec le Responsable Épidémiologique de la DDS** :
   - Confirmer la correspondance exacte des 17 signaux et pathologies avec la grille de surveillance à base communautaire (SBC) de la Direction Départementale de la Santé.
3. **Bascule des données de test aux données réelles** :
   - Les données actuelles de la base sont des données de simulation situées dans le Zou (Covè, Zagnanado, Ouinhi).
   - Lors de la prise de service officielle, les comptes des véritables ASCQ et RC seront validés et leurs affectations territoriales confirmées.
4. **Déclaration de conformité APDP** :
   - Remplir le formulaire simplifié de conformité pour le traitement des données de santé publique dans le cadre des activités communautaires du Ministère de la Santé du Bénin.
