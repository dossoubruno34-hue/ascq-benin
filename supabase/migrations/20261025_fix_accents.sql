-- =====================================================================
-- Correction définitive des accents dans les tables de surveillance
-- =====================================================================

-- 1. Nettoyage des 20 types d'alertes officiels
UPDATE public.types_alertes_reference SET nom = 'Rougeole' WHERE code = 1;
UPDATE public.types_alertes_reference SET nom = 'Choléra' WHERE code = 2;
UPDATE public.types_alertes_reference SET nom = 'Méningite' WHERE code = 3;
UPDATE public.types_alertes_reference SET nom = 'PFA - Paralysie Flasque Aiguë' WHERE code = 4;
UPDATE public.types_alertes_reference SET nom = 'FHV Lassa (Fièvre Hémorragique)' WHERE code = 5;
UPDATE public.types_alertes_reference SET nom = 'FHV Ebola' WHERE code = 6;
UPDATE public.types_alertes_reference SET nom = 'Fièvre Jaune' WHERE code = 7;
UPDATE public.types_alertes_reference SET nom = 'Dengue' WHERE code = 8;
UPDATE public.types_alertes_reference SET nom = 'Anthrax / Charbon bactéridien' WHERE code = 9;
UPDATE public.types_alertes_reference SET nom = 'Shigellose / Dysenterie bacillaire' WHERE code = 10;
UPDATE public.types_alertes_reference SET nom = 'Grippe Aviaire' WHERE code = 11;
UPDATE public.types_alertes_reference SET nom = 'Rage humaine' WHERE code = 12;
UPDATE public.types_alertes_reference SET nom = 'COVID-19' WHERE code = 13;
UPDATE public.types_alertes_reference SET nom = 'Mpox (Variole du singe)' WHERE code = 14;
UPDATE public.types_alertes_reference SET nom = 'Morsure de chien' WHERE code = 15;
UPDATE public.types_alertes_reference SET nom = 'Morsure de serpent' WHERE code = 16;
UPDATE public.types_alertes_reference SET nom = 'Morsure d''autres animaux' WHERE code = 17;
UPDATE public.types_alertes_reference SET nom = 'Épizootie / Animaux malades' WHERE code = 18;
UPDATE public.types_alertes_reference SET nom = 'Mortalité inhabituelle d''animaux' WHERE code = 19;
UPDATE public.types_alertes_reference SET nom = 'Autre événement inhabituel' WHERE code = 20;

-- 2. Nettoyage des 30 symptômes officiels
UPDATE public.symptomes_reference SET nom = 'Fièvre' WHERE code = 1;
UPDATE public.symptomes_reference SET nom = 'Boutons sur le corps / Éruption cutanée' WHERE code = 2;
UPDATE public.symptomes_reference SET nom = 'Diarrhée aqueuse' WHERE code = 3;
UPDATE public.symptomes_reference SET nom = 'Vomissements' WHERE code = 4;
UPDATE public.symptomes_reference SET nom = 'Selles avec du sang' WHERE code = 5;
UPDATE public.symptomes_reference SET nom = 'Maux de tête intenses' WHERE code = 6;
UPDATE public.symptomes_reference SET nom = 'Saignements inexpliqués (nez, gencives, peau)' WHERE code = 7;
UPDATE public.symptomes_reference SET nom = 'Raideur de la nuque' WHERE code = 8;
UPDATE public.symptomes_reference SET nom = 'Altération de la conscience / Somnolence' WHERE code = 9;
UPDATE public.symptomes_reference SET nom = 'Bombement de la fontanelle (nourrisson)' WHERE code = 10;
UPDATE public.symptomes_reference SET nom = 'Peur de la lumière (photophobie)' WHERE code = 11;
UPDATE public.symptomes_reference SET nom = 'Peur de l''eau ou des bruits d''eau (hydrophobie)' WHERE code = 12;
UPDATE public.symptomes_reference SET nom = 'Convulsions' WHERE code = 13;
UPDATE public.symptomes_reference SET nom = 'Yeux jaunes / Ictère' WHERE code = 14;
UPDATE public.symptomes_reference SET nom = 'Fatigue intense / Faiblesse extrême' WHERE code = 15;
UPDATE public.symptomes_reference SET nom = 'Nausées' WHERE code = 16;
UPDATE public.symptomes_reference SET nom = 'Maux de gorge' WHERE code = 17;
UPDATE public.symptomes_reference SET nom = 'Toux' WHERE code = 18;
UPDATE public.symptomes_reference SET nom = 'Douleurs abdominales' WHERE code = 19;
UPDATE public.symptomes_reference SET nom = 'Manque d''appétit / Refus de téter' WHERE code = 20;
UPDATE public.symptomes_reference SET nom = 'Paralysie ou difficulté brutale à marcher' WHERE code = 21;
UPDATE public.symptomes_reference SET nom = 'Courbatures ou fatigues musculaires' WHERE code = 22;
UPDATE public.symptomes_reference SET nom = 'Douleurs musculaires ou articulaires' WHERE code = 23;
UPDATE public.symptomes_reference SET nom = 'Présence de sang dans les urines' WHERE code = 24;
UPDATE public.symptomes_reference SET nom = 'Irritabilité ou agressivité inhabituelle' WHERE code = 25;
UPDATE public.symptomes_reference SET nom = 'Gonflement des ganglions lymphatiques' WHERE code = 26;
UPDATE public.symptomes_reference SET nom = 'Crachats teintés de sang' WHERE code = 27;
UPDATE public.symptomes_reference SET nom = 'Lésions cutanées / Ulcères' WHERE code = 28;
UPDATE public.symptomes_reference SET nom = 'Difficultés respiratoires / Essoufflement' WHERE code = 29;
UPDATE public.symptomes_reference SET nom = 'Autres symptômes à préciser' WHERE code = 30;

-- 3. Mise à jour des alertes déjà enregistrées
UPDATE public.alertes_communautaires a
SET type_alerte_nom = t.nom
FROM public.types_alertes_reference t
WHERE a.type_alerte_code = t.code;
