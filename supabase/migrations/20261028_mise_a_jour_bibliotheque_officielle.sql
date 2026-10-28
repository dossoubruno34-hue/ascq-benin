-- =====================================================================
-- MIGRATION : NETTOYAGE ET MISE À JOUR DE LA BIBLIOTHÈQUE OFFICIELLE
-- (Suppression des faux liens / doublons 'undefined' et insertion des documents officiels du Bénin)
-- =====================================================================

-- 1. S'assurer de la présence des colonnes nécessaires
ALTER TABLE public.bibliotheque_documents 
    ADD COLUMN IF NOT EXISTS format_fichier TEXT DEFAULT 'PDF',
    ADD COLUMN IF NOT EXISTS label_source TEXT DEFAULT 'Ministère de la Santé du Bénin';

-- 2. Nettoyer les anciens enregistrements erronés (dont ceux avec URL undefined ou liens factices)
DELETE FROM public.bibliotheque_documents
WHERE lien_drive IS NULL 
   OR lien_drive = 'undefined' 
   OR lien_drive LIKE '%exemple%'
   OR titre ILIKE '%test%';

-- Nettoyage complet pour réinitialiser la bibliothèque propre
TRUNCATE TABLE public.bibliotheque_documents RESTART IDENTITY;

-- 3. Insérer les 8 documents officiels béninois vérifiés
INSERT INTO public.bibliotheque_documents (
    titre,
    description,
    categorie,
    auteur,
    format_fichier,
    lien_drive,
    label_source,
    ordre_affichage,
    est_actif
) VALUES
(
    'Politique Nationale de Santé Communautaire au Bénin (PNSC)',
    'Document cadre d''orientation stratégique définissant les rôles et attributions des ASCQ et des Relais Communautaires (RC), les paquets d''activités à haut impact, la gouvernance locale et le financement pérenne.',
    'REGLEMENTATION',
    'Ministère de la Santé de la République du Bénin',
    'PDF',
    'https://www.fao.org/faolex/results/details/fr/c/LEX-FAOC179042/',
    'Portail Officiel FAOLEX / République du Bénin',
    1,
    true
),
(
    'Santé Communautaire au Bénin pour un Accès Équitable aux Soins Essentiels',
    'Rapport national et cadre d''action de l''UNICEF et du Ministère de la Santé pour la couverture universelle des soins aux enfants et aux femmes enceintes dans les zones rurales et périurbaines du Bénin.',
    'GUIDE_CLINIQUE',
    'UNICEF Bénin & Ministère de la Santé',
    'PDF / Rapport',
    'https://www.unicef.org/benin/reports/sant%C3%A9-communautaire-au-b%C3%A9nin-pour-un-acc%C3%A8s-%C3%A9quitable',
    'UNICEF Bénin (unicef.org)',
    2,
    true
),
(
    'Plan National de Développement Sanitaire du Bénin (PNDS)',
    'Plan directeur de la politique sanitaire de la République du Bénin : axes prioritaires pour la réduction de la mortalité maternelle, néonatale et infanto-juvénile, et renforcement du premier échelon sanitaire.',
    'REGLEMENTATION',
    'Ministère de la Santé / Ministère de l''Économie et des Finances',
    'PDF',
    'https://budgetscolaire.finances.bj/download/plan-national-de-developpement-sanitaire-du-benin-2018-2022/',
    'Portail des Finances et du Budget du Bénin',
    3,
    true
),
(
    'Politique du Secteur Santé pour la Nutrition de la République du Bénin',
    'Cadre normatif pour la prévention de la malnutrition aiguë (MAM, MAS), le protocole de supplémentation des 1 000 premiers jours (AME, Enov''Mum+, Nutributter+, Vitamine A) et l''enrichissement de l''alimentation de complément.',
    'FORMATION',
    'Ministère de la Santé & OMS (GINA)',
    'PDF',
    'https://extranet.who.int/nutrition/gina/fr/node/8207',
    'Organisation Mondiale de la Santé (OMS)',
    4,
    true
),
(
    'Guide Pratique PCIME-C (Prise en Charge Intégrée des Maladies de l''Enfant au niveau Communautaire)',
    'Arbre de décision diagnostique et thérapeutique pour les ASCQ : Paludisme simple (TDR + CTA pédiatrique), Diarrhée aiguë (SRO + Sulfate de Zinc), Pneumonie simple (Amoxicilline) et critères de référence d''urgence au Centre de Santé.',
    'GUIDE_CLINIQUE',
    'Direction de la Santé de la Mère et de l''Enfant (DSME)',
    'PDF / Fiche',
    'https://www.medbox.org/document/prise-en-charge-integree-des-maladies-de-lenfant-au-niveau-communautaire-pcime-c',
    'Medbox Global Health / OMS',
    5,
    true
),
(
    'Directives Techniques de Surveillance Épidémiologique à Base Communautaire (SIMR Bénin)',
    'Directives et fiches de notification immédiate et hebdomadaire des maladies à potentiel épidémique au Bénin (Choléra, Fièvre Jaune, Méningite, Rougeole, Fièvre de Lassa, PFA/Polio) et approche ''One Health''.',
    'SURVEILLANCE',
    'Direction Nationale de la Santé Publique (DNSP)',
    'PDF',
    'https://www.afro.who.int/fr/countries/benin',
    'Bureau Pays OMS Bénin',
    6,
    true
),
(
    'Canevas Officiel de Collecte Hebdomadaire et Mensuelle PNSC / SNIS (DHIS2 Bénin)',
    'Outil standardisé d''agrégation des données des Relais Communautaires par l''ASCQ : indicateurs de consultation, références au centre de santé et GUPS, dépistage nutritionnel et suivi des mères/enfants.',
    'OUTIL_GESTION',
    'Direction des Systèmes d''Information (DSI) / Ministère de la Santé',
    'Modèle Officiel',
    'https://sante.gouv.bj',
    'Ministère de la Santé du Bénin',
    7,
    true
),
(
    'Guide Pratique du Calendrier Vaccinal Réajusté et des Soins Préventifs de l''Enfant',
    'Grille officielle PEV Bénin / UNICEF : schéma à 13 âges clés de la naissance à 24 mois (BCG, Polio, Pentavalent, Pneumocoque, Rotavirus, Paludisme VAP 4 doses, Fièvre jaune, TPIn+ 9 passages, Vitamine A, Vermifuges).',
    'FORMATION',
    'Direction de la Vaccination et des Soins Préventifs (PEV Bénin)',
    'PDF / Affiche',
    'https://www.unicef.org/benin',
    'PEV Bénin & UNICEF',
    8,
    true
);
