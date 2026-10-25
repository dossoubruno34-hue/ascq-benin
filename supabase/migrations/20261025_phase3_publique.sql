-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 3 : Partie Publique, Conseils Santé et Suggestions
-- =====================================================================

-- 1. Table des conseils santé publiés par les administrateurs
CREATE TABLE IF NOT EXISTS public.conseils_sante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT 'Santé communautaire',
    auteur TEXT NOT NULL DEFAULT 'Ministère de la Santé / Coordination ASCQ',
    est_publie BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des suggestions, recommandations et réclamations du public (« Votre voix compte »)
CREATE TABLE IF NOT EXISTS public.suggestions_publiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_message TEXT NOT NULL CHECK (type_message IN ('SUGGESTION', 'RECOMMANDATION', 'RECLAMATION')),
    objet TEXT NOT NULL,
    message TEXT NOT NULL,
    nom TEXT,
    telephone TEXT,
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    statut TEXT NOT NULL DEFAULT 'NOUVEAU' CHECK (statut IN ('NOUVEAU', 'TRAITE', 'ARCHIVE')),
    reponse_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sécurité RLS
ALTER TABLE public.conseils_sante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions_publiques ENABLE ROW LEVEL SECURITY;

-- Politiques Conseils santé
DROP POLICY IF EXISTS "Lecture ouverte conseils_sante" ON public.conseils_sante;
CREATE POLICY "Lecture ouverte conseils_sante" ON public.conseils_sante
    FOR SELECT USING (est_publie = true);

DROP POLICY IF EXISTS "Gestion conseils_sante par admin" ON public.conseils_sante;
CREATE POLICY "Gestion conseils_sante par admin" ON public.conseils_sante
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

-- Politiques Suggestions publiques
DROP POLICY IF EXISTS "Envoi public suggestion" ON public.suggestions_publiques;
CREATE POLICY "Envoi public suggestion" ON public.suggestions_publiques
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Lecture suggestions par admin" ON public.suggestions_publiques;
CREATE POLICY "Lecture suggestions par admin" ON public.suggestions_publiques
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN', 'GESTIONNAIRE_PERIMETRE')
        )
    );

-- 4. Ajustement des politiques d'insertion pour l'inscription des ASCQ
DROP POLICY IF EXISTS "Insertion profil ASCQ" ON public.ascq_profils;
CREATE POLICY "Insertion profil ASCQ" ON public.ascq_profils
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Exemples de conseils santé officiels
INSERT INTO public.conseils_sante (titre, contenu, categorie) VALUES
('Prévention du Paludisme en saison pluvieuse', 'Dormez chaque nuit sous Moustiquaire Imprégnée d''Insecticide à Longue Durée d''Action (MILDA). Au moindre signe de fièvre chez l''enfant, consultez immédiatement votre Agent de Santé Communautaire Qualifié (ASCQ).', 'Paludisme'),
('Surveillance et déclaration précoce des diarrhées aiguës', 'Le lavage régulier des mains à l''eau propre et au savon prévient les maladies hydriques. En cas de diarrhée aqueuse abondante avec déshydratation, orientez d''urgence le cas vers le centre de santé le plus proche.', 'Hygiène & Eau'),
('Vaccination et suivi de la croissance des enfants de 0 à 5 ans', 'Respectez scrupuleusement le calendrier vaccinal des nourrissons. Les ASCQ effectuent le suivi de proximité des enfants sous-vaccinés dans chaque grappe de ménages.', 'Vaccination')
ON CONFLICT DO NOTHING;
