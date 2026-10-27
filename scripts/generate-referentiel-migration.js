const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'data', 'liste_officielle_ascq.csv');
const rawText = fs.readFileSync(csvPath, 'utf8');

function normaliserChaine(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parser CSV avec support des guillemets
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
const dataRows = [];

// Ignorer l'entête
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('FORMULAIRE') || line.startsWith('Consigne') || line.startsWith('Département')) continue;
  const parts = parseCsvLine(line);
  if (parts.length >= 4) {
    const dep = parts[0];
    const com = parts[1];
    const arr = parts[2];
    const nomPrenoms = parts[3];
    const datePrise = parts[4] || null;
    if (nomPrenoms && dep && com) {
      dataRows.push({
        departement: dep.replace(/'/g, "''"),
        commune: com.replace(/'/g, "''"),
        arrondissement_poste: arr.replace(/'/g, "''"),
        nom_prenoms: nomPrenoms.replace(/'/g, "''"),
        nom_normalise: normaliserChaine(nomPrenoms).replace(/'/g, "''"),
        date_prise_service: datePrise && datePrise.match(/^\d{4}-\d{2}-\d{2}$/) ? `'${datePrise}'` : 'NULL'
      });
    }
  }
}

console.log(`Parsed ${dataRows.length} official ASCQ records.`);

let sql = `-- ====================================================================
-- TABLE RÉFÉRENTIEL NATIONAL DES ASCQ OFFICIELS DU BÉNIN
-- Permet la vérification automatique lors de la validation des comptes
-- et notifie les administrateurs si un nom est absent de la liste nationale
-- ====================================================================

-- 1. Création d'une fonction de normalisation native (sans dépendance d'extension)
CREATE OR REPLACE FUNCTION public.normaliser_texte_comparaison(p_texte TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(
        UPPER(COALESCE(p_texte, '')),
        'ÀÁÂÃÄÅĀĄÉÈÊËĒĘÍÌÎÏĪİÓÒÔÕÖØŌÚÙÛÜŪŃŇÑÇĆŠŚŽŹŻ',
        'AAAAAAAAEEEEEEIIIIIIOOOOOOOUUUUUNNNCSSSSZZZ'
      ),
      '[^A-Z0-9]', ' ', 'g'
    ),
    '\\s+', ' ', 'g'
  ));
$$;

-- 2. Création de la table du registre national des ASCQ
CREATE TABLE IF NOT EXISTS public.ascq_referentiel_national (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement TEXT NOT NULL,
    commune TEXT NOT NULL,
    arrondissement_poste TEXT NOT NULL,
    nom_prenoms TEXT NOT NULL,
    nom_normalise TEXT NOT NULL,
    date_prise_service DATE,
    source_liste TEXT DEFAULT 'LISTE_CONSOLIDEE_2024_2025',
    est_actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_ascq_ref_nom_commune UNIQUE (nom_normalise, commune)
);

CREATE INDEX IF NOT EXISTS idx_ascq_ref_nom_norm ON public.ascq_referentiel_national(nom_normalise);
CREATE INDEX IF NOT EXISTS idx_ascq_ref_commune ON public.ascq_referentiel_national(commune);
CREATE INDEX IF NOT EXISTS idx_ascq_ref_departement ON public.ascq_referentiel_national(departement);

-- 2. Politiques de sécurité RLS
ALTER TABLE public.ascq_referentiel_national ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture referentiel pour authentifies" ON public.ascq_referentiel_national;
CREATE POLICY "Lecture referentiel pour authentifies"
    ON public.ascq_referentiel_national FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Modification referentiel reservee admin" ON public.ascq_referentiel_national;
CREATE POLICY "Modification referentiel reservee admin"
    ON public.ascq_referentiel_national FOR ALL
    USING (public.est_administrateur())
    WITH CHECK (public.est_administrateur());

-- 3. Insertion des agents de santé officiels consolidés
INSERT INTO public.ascq_referentiel_national (
    departement, commune, arrondissement_poste, nom_prenoms, nom_normalise, date_prise_service
) VALUES
`;

const insertValues = dataRows.map(r => 
  `  ('${r.departement}', '${r.commune}', '${r.arrondissement_poste}', '${r.nom_prenoms}', '${r.nom_normalise}', ${r.date_prise_service})`
).join(',\n');

sql += insertValues;
sql += `\nON CONFLICT (nom_normalise, commune) DO UPDATE SET
    arrondissement_poste = EXCLUDED.arrondissement_poste,
    date_prise_service = COALESCE(EXCLUDED.date_prise_service, ascq_referentiel_national.date_prise_service);

-- 4. Fonction RPC pour vérifier si un agent est dans le registre officiel
CREATE OR REPLACE FUNCTION public.verifier_ascq_referentiel(
    p_nom TEXT,
    p_prenoms TEXT,
    p_commune_nom TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_norm_complet TEXT;
    v_match RECORD;
BEGIN
    v_norm_complet := public.normaliser_texte_comparaison(COALESCE(p_nom, '') || ' ' || COALESCE(p_prenoms, ''));

    -- Recherche par correspondance exacte ou approchante
    SELECT * INTO v_match
    FROM public.ascq_referentiel_national
    WHERE est_actif = TRUE
      AND (
          nom_normalise = v_norm_complet
          OR v_norm_complet LIKE '%' || nom_normalise || '%'
          OR nom_normalise LIKE '%' || v_norm_complet || '%'
      )
    ORDER BY (commune = UPPER(TRIM(COALESCE(p_commune_nom, '')))) DESC
    LIMIT 1;

    IF v_match.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'present', TRUE,
            'nom_officiel', v_match.nom_prenoms,
            'departement', v_match.departement,
            'commune', v_match.commune,
            'arrondissement_poste', v_match.arrondissement_poste,
            'date_prise_service', v_match.date_prise_service,
            'message', 'ASCQ répertorié dans la liste officielle (' || v_match.commune || ' / ' || v_match.arrondissement_poste || ')'
        );
    ELSE
        RETURN jsonb_build_object(
            'present', FALSE,
            'message', 'Nom absent de la liste nationale consolidée des ASCQ'
        );
    END IF;
END;
$$;

-- 5. Fonction RPC pour ajouter manuellement un ASCQ à la liste nationale (réservé aux admins)
CREATE OR REPLACE FUNCTION public.admin_ajouter_ascq_referentiel(
    p_nom_prenoms TEXT,
    p_departement TEXT,
    p_commune TEXT,
    p_arrondissement TEXT,
    p_date_prise_service DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_norm TEXT;
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Action réservée aux administrateurs.';
    END IF;

    v_norm := public.normaliser_texte_comparaison(p_nom_prenoms);

    INSERT INTO public.ascq_referentiel_national (
        nom_prenoms, nom_normalise, departement, commune, arrondissement_poste, date_prise_service, source_liste
    ) VALUES (
        UPPER(TRIM(p_nom_prenoms)), v_norm, UPPER(TRIM(p_departement)), UPPER(TRIM(p_commune)), UPPER(TRIM(p_arrondissement)), p_date_prise_service, 'AJOUT_MANUEL_ADMIN'
    )
    ON CONFLICT (nom_normalise, commune) DO UPDATE SET
        arrondissement_poste = EXCLUDED.arrondissement_poste,
        date_prise_service = COALESCE(EXCLUDED.date_prise_service, ascq_referentiel_national.date_prise_service);

    RETURN jsonb_build_object('success', true, 'message', 'ASCQ ajouté avec succès à la liste nationale consolidée.');
END;
$$;

-- 6. Mise à jour de lister_comptes_admin() pour inclure le contrôle automatique de liste nationale
DROP FUNCTION IF EXISTS public.lister_comptes_admin();
CREATE OR REPLACE FUNCTION public.lister_comptes_admin()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    role_technique TEXT,
    statut_compte TEXT,
    created_at TIMESTAMPTZ,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    afficher_annuaire_public BOOLEAN,
    present_liste_nationale BOOLEAN,
    details_liste_nationale TEXT,
    date_prise_service DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte, u.created_at,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom,
    p.source_financement,
    p.nombre_rc,
    p.afficher_annuaire_public,
    (ref.id IS NOT NULL) AS present_liste_nationale,
    CASE 
      WHEN ref.id IS NOT NULL THEN 'Inscrit sur la liste nationale (' || ref.commune || ' / ' || ref.arrondissement_poste || ')'
      WHEN u.poste = 'ASCQ' THEN '⚠️ Nom absent de la liste nationale consolidée'
      ELSE 'Non applicable (' || u.poste || ')'
    END AS details_liste_nationale,
    ref.date_prise_service
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN LATERAL (
    SELECT r.id, r.commune, r.arrondissement_poste, r.date_prise_service
    FROM public.ascq_referentiel_national r
    WHERE r.est_actif = TRUE
      AND (
        r.nom_normalise = public.normaliser_texte_comparaison(u.nom || ' ' || u.prenoms)
        OR r.nom_normalise = public.normaliser_texte_comparaison(u.prenoms || ' ' || u.nom)
        OR public.normaliser_texte_comparaison(u.nom || ' ' || u.prenoms) LIKE '%' || r.nom_normalise || '%'
        OR r.nom_normalise LIKE '%' || public.normaliser_texte_comparaison(u.nom) || '%'
      )
    ORDER BY (c.nom IS NOT NULL AND UPPER(c.nom) = r.commune) DESC
    LIMIT 1
  ) ref ON true
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verifier_ascq_referentiel TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ajouter_ascq_referentiel TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_comptes_admin TO authenticated;
`;

const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261027_ascq_referentiel_national.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Migration successfully written to: ${outputPath}`);
