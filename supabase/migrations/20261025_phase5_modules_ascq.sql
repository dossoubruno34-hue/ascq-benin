-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 5 : Mon Espace, Permutation, Requêtes, Bibliothèque
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE : PERMUTATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    -- Poste actuel
    departement_depart_id UUID NOT NULL REFERENCES public.departements(id),
    commune_depart_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_depart_id UUID NOT NULL REFERENCES public.arrondissements(id),
    -- Destination souhaitée
    departement_souhaite_id UUID NOT NULL REFERENCES public.departements(id),
    commune_souhaite_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_souhaite_id UUID REFERENCES public.arrondissements(id),
    motif TEXT,
    statut TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'PROPOSEE', 'VALIDEE', 'REFUSEE', 'ANNULEE')),
    partenaire_ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    commentaire_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_permutations_ascq_id ON public.permutations(ascq_id);
CREATE INDEX IF NOT EXISTS idx_permutations_statut ON public.permutations(statut);
CREATE INDEX IF NOT EXISTS idx_permutations_dest ON public.permutations(departement_souhaite_id, commune_souhaite_id);

-- ---------------------------------------------------------------------
-- 2. TABLE : REQUÊTES ASCQ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requetes_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    type_requete TEXT NOT NULL CHECK (type_requete IN ('ADMINISTRATIVE', 'TECHNIQUE', 'SUGGESTION', 'MODIFICATION_AFFECTATION', 'AUTRE')),
    objet TEXT NOT NULL,
    message TEXT NOT NULL,
    priorite TEXT NOT NULL DEFAULT 'NORMALE' CHECK (priorite IN ('NORMALE', 'URGENTE')),
    statut TEXT NOT NULL DEFAULT 'ENVOYEE' CHECK (statut IN ('ENVOYEE', 'EN_COURS', 'RESOLUE', 'REJETEE')),
    reponse_admin TEXT,
    repondu_par UUID REFERENCES public.utilisateurs(id),
    repondu_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requetes_ascq_id ON public.requetes_ascq(ascq_id);
CREATE INDEX IF NOT EXISTS idx_requetes_statut ON public.requetes_ascq(statut);

-- ---------------------------------------------------------------------
-- 3. TABLE : BIBLIOTHÈQUE DOCUMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bibliotheque_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    categorie TEXT NOT NULL CHECK (categorie IN ('GUIDE_CLINIQUE', 'SURVEILLANCE', 'OUTIL_GESTION', 'REGLEMENTATION', 'FORMATION', 'AUTRE')),
    description TEXT,
    lien_drive TEXT NOT NULL,
    format_fichier TEXT DEFAULT 'PDF',
    auteur TEXT DEFAULT 'MINISTERE DE LA SANTE',
    est_actif BOOLEAN NOT NULL DEFAULT TRUE,
    ordre_affichage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblio_categorie ON public.bibliotheque_documents(categorie);

-- ---------------------------------------------------------------------
-- 4. POLITIQUES RLS (ROW LEVEL SECURITY)
-- ---------------------------------------------------------------------
ALTER TABLE public.permutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requetes_ascq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bibliotheque_documents ENABLE ROW LEVEL SECURITY;

-- Politiques Permutations
DROP POLICY IF EXISTS "Lecture permutations ouvertes et propres" ON public.permutations;
DROP POLICY IF EXISTS "Insertion permutation ASCQ" ON public.permutations;
DROP POLICY IF EXISTS "Mise a jour permutation ASCQ ou Admin" ON public.permutations;

CREATE POLICY "Lecture permutations ouvertes et propres" ON public.permutations
    FOR SELECT USING (
        statut IN ('OUVERTE', 'PROPOSEE') OR
        ascq_id = auth.uid() OR
        partenaire_ascq_id = auth.uid()
    );

CREATE POLICY "Insertion permutation ASCQ" ON public.permutations
    FOR INSERT WITH CHECK (
        ascq_id = auth.uid()
    );

CREATE POLICY "Mise a jour permutation ASCQ ou Admin" ON public.permutations
    FOR UPDATE USING (
        ascq_id = auth.uid() OR partenaire_ascq_id = auth.uid()
    );

-- Politiques Requêtes
DROP POLICY IF EXISTS "Lecture requetes propres" ON public.requetes_ascq;
DROP POLICY IF EXISTS "Insertion requetes propres" ON public.requetes_ascq;
DROP POLICY IF EXISTS "Mise a jour requetes propres" ON public.requetes_ascq;

CREATE POLICY "Lecture requetes propres" ON public.requetes_ascq
    FOR SELECT USING (
        ascq_id = auth.uid()
    );

CREATE POLICY "Insertion requetes propres" ON public.requetes_ascq
    FOR INSERT WITH CHECK (
        ascq_id = auth.uid()
    );

CREATE POLICY "Mise a jour requetes propres" ON public.requetes_ascq
    FOR UPDATE USING (
        ascq_id = auth.uid()
    );

-- Politiques Bibliothèque
DROP POLICY IF EXISTS "Lecture bibliotheque pour tous connectes" ON public.bibliotheque_documents;
CREATE POLICY "Lecture bibliotheque pour tous connectes" ON public.bibliotheque_documents
    FOR SELECT USING (est_actif = TRUE);

-- ---------------------------------------------------------------------
-- 5. FONCTIONS RPC SÉCURISÉES (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- A. Obtenir la situation complète de l'ASCQ (Mon Espace)
CREATE OR REPLACE FUNCTION public.obtenir_mon_espace()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_ascq RECORD;
    v_dep TEXT;
    v_com TEXT;
    v_arr TEXT;
    v_arr2 TEXT;
    v_zs TEXT;
    v_structure TEXT;
    v_nb_requetes INTEGER;
    v_nb_rc_actifs INTEGER;
    v_permutation RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur introuvable.';
    END IF;

    -- Profil spécifique ASCQ
    SELECT * INTO v_ascq FROM public.ascq_profils WHERE id = v_user_id;

    -- Récupération des libellés géographiques
    SELECT nom INTO v_dep FROM public.departements WHERE id = v_user.departement_id;
    SELECT nom INTO v_com FROM public.communes WHERE id = v_user.commune_id;
    SELECT nom INTO v_arr FROM public.arrondissements WHERE id = v_user.arrondissement_id;
    SELECT nom INTO v_arr2 FROM public.arrondissements WHERE id = v_ascq.second_arrondissement_id;
    SELECT nom INTO v_zs FROM public.zones_sanitaires WHERE id = v_user.zone_sanitaire_id;
    SELECT nom INTO v_structure FROM public.structures_sante WHERE id = v_ascq.structure_sante_id;

    -- Nombre de requêtes en cours
    SELECT COUNT(*) INTO v_nb_requetes FROM public.requetes_ascq 
    WHERE ascq_id = v_user_id AND statut IN ('ENVOYEE', 'EN_COURS');

    -- Nombre de RC actifs réellement enrôlés
    SELECT COUNT(*) INTO v_nb_rc_actifs FROM public.relais_communautaires 
    WHERE ascq_id = v_user_id;

    -- Permutation active si existante
    SELECT p.*, d.nom AS dep_souhaite, c.nom AS com_souhaite, a.nom AS arr_souhaite
    INTO v_permutation
    FROM public.permutations p
    LEFT JOIN public.departements d ON p.departement_souhaite_id = d.id
    LEFT JOIN public.communes c ON p.commune_souhaite_id = c.id
    LEFT JOIN public.arrondissements a ON p.arrondissement_souhaite_id = a.id
    WHERE p.ascq_id = v_user_id AND p.statut IN ('OUVERTE', 'PROPOSEE')
    LIMIT 1;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'nom', v_user.nom,
        'prenoms', v_user.prenoms,
        'telephone', v_user.telephone,
        'poste', v_user.poste,
        'departement_id', v_user.departement_id,
        'departement_nom', COALESCE(v_dep, 'NON DÉFINI'),
        'commune_id', v_user.commune_id,
        'commune_nom', COALESCE(v_com, 'NON DÉFINIE'),
        'arrondissement_id', v_user.arrondissement_id,
        'arrondissement_nom', COALESCE(v_arr, 'NON DÉFINI'),
        'second_arrondissement_nom', v_arr2,
        'cumul_deux_arrondissements', COALESCE(v_ascq.cumul_deux_arrondissements, FALSE),
        'zone_sanitaire_nom', COALESCE(v_zs, 'NON DÉFINIE'),
        'structure_sante_nom', COALESCE(v_structure, 'CENTRE DE SANTÉ COMMUNAL'),
        'source_financement', COALESCE(v_ascq.source_financement, 'LLF'),
        'source_financement_autre', v_ascq.source_financement_autre,
        'nombre_rc_declare', COALESCE(v_ascq.nombre_rc, 0),
        'nombre_rc_enroles', v_nb_rc_actifs,
        'nombre_requetes_en_cours', v_nb_requetes,
        'permutation_active', CASE WHEN v_permutation.id IS NOT NULL THEN jsonb_build_object(
            'id', v_permutation.id,
            'dep_souhaite', v_permutation.dep_souhaite,
            'com_souhaite', v_permutation.com_souhaite,
            'arr_souhaite', v_permutation.arr_souhaite,
            'statut', v_permutation.statut,
            'motif', v_permutation.motif,
            'created_at', v_permutation.created_at
        ) ELSE NULL END
    );
END;
$$;

-- B. Mettre à jour les champs autorisés de Mon Espace (Téléphone, Financement, Nombre RC)
CREATE OR REPLACE FUNCTION public.mettre_a_jour_mon_espace(
    p_telephone TEXT,
    p_source_financement TEXT,
    p_source_financement_autre TEXT,
    p_nombre_rc INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_clean_phone TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Numéro de téléphone invalide.';
    END IF;

    -- Mise à jour dans utilisateurs
    UPDATE public.utilisateurs
    SET telephone = p_telephone,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Mise à jour dans ascq_profils
    UPDATE public.ascq_profils
    SET source_financement = p_source_financement,
        source_financement_autre = p_source_financement_autre,
        nombre_rc = p_nombre_rc,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Informations mises à jour avec succès.'
    );
END;
$$;

-- C. Soumettre une requête administrative ou technique
CREATE OR REPLACE FUNCTION public.soumettre_requete_ascq(
    p_type_requete TEXT,
    p_objet TEXT,
    p_message TEXT,
    p_priorite TEXT DEFAULT 'NORMALE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_requete_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    INSERT INTO public.requetes_ascq (
        ascq_id,
        type_requete,
        objet,
        message,
        priorite,
        statut
    ) VALUES (
        v_user_id,
        p_type_requete,
        TRIM(p_objet),
        TRIM(p_message),
        p_priorite,
        'ENVOYEE'
    )
    RETURNING id INTO v_requete_id;

    RETURN jsonb_build_object(
        'success', true,
        'requete_id', v_requete_id,
        'message', 'Votre requête a bien été transmise à l''administration.'
    );
END;
$$;

-- D. Lister ses propres requêtes
CREATE OR REPLACE FUNCTION public.lister_mes_requetes()
RETURNS TABLE (
    id UUID,
    type_requete TEXT,
    objet TEXT,
    message TEXT,
    priorite TEXT,
    statut TEXT,
    reponse_admin TEXT,
    repondu_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.type_requete,
        r.objet,
        r.message,
        r.priorite,
        r.statut,
        r.reponse_admin,
        r.repondu_at,
        r.created_at
    FROM public.requetes_ascq r
    WHERE r.ascq_id = auth.uid()
    ORDER BY r.created_at DESC;
END;
$$;

-- E. Publier une demande de permutation
CREATE OR REPLACE FUNCTION public.publier_demande_permutation(
    p_dep_souhaite_id UUID,
    p_com_souhaite_id UUID,
    p_arr_souhaite_id UUID DEFAULT NULL,
    p_motif TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_perm_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;

    IF v_user.departement_id IS NULL OR v_user.commune_id IS NULL OR v_user.arrondissement_id IS NULL THEN
        RAISE EXCEPTION 'Votre affectation géographique doit être complète pour publier une demande de permutation.';
    END IF;

    -- Annuler les anciennes demandes ouvertes de cet ASCQ
    UPDATE public.permutations
    SET statut = 'ANNULEE', updated_at = NOW()
    WHERE ascq_id = v_user_id AND statut = 'OUVERTE';

    -- Insérer la nouvelle demande
    INSERT INTO public.permutations (
        ascq_id,
        departement_depart_id,
        commune_depart_id,
        arrondissement_depart_id,
        departement_souhaite_id,
        commune_souhaite_id,
        arrondissement_souhaite_id,
        motif,
        statut
    ) VALUES (
        v_user_id,
        v_user.departement_id,
        v_user.commune_id,
        v_user.arrondissement_id,
        p_dep_souhaite_id,
        p_com_souhaite_id,
        p_arr_souhaite_id,
        TRIM(p_motif),
        'OUVERTE'
    )
    RETURNING id INTO v_perm_id;

    RETURN jsonb_build_object(
        'success', true,
        'permutation_id', v_perm_id,
        'message', 'Votre demande de permutation a été publiée avec succès sur la bourse.'
    );
END;
$$;

-- F. Lister les permutations disponibles sur la bourse
CREATE OR REPLACE FUNCTION public.lister_permutations_disponibles()
RETURNS TABLE (
    id UUID,
    ascq_id UUID,
    demandeur_nom TEXT,
    demandeur_prenoms TEXT,
    dep_depart_nom TEXT,
    com_depart_nom TEXT,
    arr_depart_nom TEXT,
    dep_souhaite_nom TEXT,
    com_souhaite_nom TEXT,
    arr_souhaite_nom TEXT,
    motif TEXT,
    statut TEXT,
    created_at TIMESTAMPTZ,
    est_ma_demande BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.ascq_id,
        u.nom AS demandeur_nom,
        u.prenoms AS demandeur_prenoms,
        dd.nom AS dep_depart_nom,
        cd.nom AS com_depart_nom,
        ad.nom AS arr_depart_nom,
        ds.nom AS dep_souhaite_nom,
        cs.nom AS com_souhaite_nom,
        asouh.nom AS arr_souhaite_nom,
        p.motif,
        p.statut,
        p.created_at,
        (p.ascq_id = auth.uid()) AS est_ma_demande
    FROM public.permutations p
    JOIN public.utilisateurs u ON p.ascq_id = u.id
    JOIN public.departements dd ON p.departement_depart_id = dd.id
    JOIN public.communes cd ON p.commune_depart_id = cd.id
    JOIN public.arrondissements ad ON p.arrondissement_depart_id = ad.id
    JOIN public.departements ds ON p.departement_souhaite_id = ds.id
    JOIN public.communes cs ON p.commune_souhaite_id = cs.id
    LEFT JOIN public.arrondissements asouh ON p.arrondissement_souhaite_id = asouh.id
    WHERE p.statut IN ('OUVERTE', 'PROPOSEE')
    ORDER BY p.created_at DESC;
END;
$$;

-- G. Proposer une permutation avec un confrère
CREATE OR REPLACE FUNCTION public.proposer_permutation(p_permutation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_perm RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT * INTO v_perm FROM public.permutations WHERE id = p_permutation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offre de permutation introuvable.';
    END IF;

    IF v_perm.ascq_id = v_user_id THEN
        RAISE EXCEPTION 'Vous ne pouvez pas permuter avec votre propre offre.';
    END IF;

    IF v_perm.statut <> 'OUVERTE' THEN
        RAISE EXCEPTION 'Cette offre n''est plus disponible.';
    END IF;

    UPDATE public.permutations
    SET statut = 'PROPOSEE',
        partenaire_ascq_id = v_user_id,
        updated_at = NOW()
    WHERE id = p_permutation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Votre proposition de permutation a été transmise. Elle sera soumise à validation administrative.'
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 6. DONNÉES INITIALES POUR LA BIBLIOTHÈQUE
-- ---------------------------------------------------------------------
INSERT INTO public.bibliotheque_documents (titre, categorie, description, lien_drive, format_fichier, auteur, ordre_affichage)
VALUES
(
    'Guide National de Prise en Charge Intégrée des Maladies de l''Enfant au niveau Communautaire (PCIME-C / iCCM)',
    'GUIDE_CLINIQUE',
    'Manuel officiel de diagnostic et de traitement du paludisme, des infections respiratoires aiguës (IRA) et de la diarrhée chez l''enfant de 2 mois à 5 ans.',
    'https://drive.google.com/drive/folders/ascq-benin-pcimec',
    'PDF',
    'MINISTERE DE LA SANTE DU BENIN - DSME',
    1
),
(
    'Directives Nationales de Surveillance Épidémiologique à Base Communautaire (SBC)',
    'SURVEILLANCE',
    'Directives opérationnelles pour la détection, la notification précoce des alertes et des rumeurs, et les fiches d''investigation de terrain.',
    'https://drive.google.com/drive/folders/ascq-benin-surveillance',
    'PDF',
    'MINISTERE DE LA SANTE DU BENIN - DNSP',
    2
),
(
    'Politique Nationale de Santé Communautaire au Bénin (PNSC)',
    'REGLEMENTATION',
    'Cadre stratégique définissant le statut, les attributions et le périmètre d''action des Agents de Santé Communautaire Qualifiés (ASCQ) et des Relais Communautaires (RC).',
    'https://drive.google.com/drive/folders/ascq-benin-pnsc',
    'PDF',
    'MINISTERE DE LA SANTE DU BENIN',
    3
),
(
    'Fiches Officielles et Modèle de Rapport Mensuel d''Activité de l''ASCQ (RMA)',
    'OUTIL_GESTION',
    'Ensemble des fiches types de rapportage mensuel, de suivi de grappes et d''inventaire du matériel communautaire.',
    'https://drive.google.com/drive/folders/ascq-benin-outils-gestion',
    'PDF',
    'COORDINATION NATIONALE DE SANTE COMMUNAUTAIRE',
    4
),
(
    'Manuel de Formation des Relais Communautaires sur la Vaccination et la Santé Maternelle',
    'FORMATION',
    'Outil d''animation et de sensibilisation pour les visites à domicile et le suivi des femmes enceintes et des enfants zéro-dose.',
    'https://drive.google.com/drive/folders/ascq-benin-formation-rc',
    'PDF',
    'PROGRAMME ELARGI DE VACCINATION (PEV)',
    5
)
ON CONFLICT DO NOTHING;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.obtenir_mon_espace TO authenticated;
GRANT EXECUTE ON FUNCTION public.mettre_a_jour_mon_espace TO authenticated;
GRANT EXECUTE ON FUNCTION public.soumettre_requete_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_requetes TO authenticated;
GRANT EXECUTE ON FUNCTION public.publier_demande_permutation TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_permutations_disponibles TO authenticated;
GRANT EXECUTE ON FUNCTION public.proposer_permutation TO authenticated;
