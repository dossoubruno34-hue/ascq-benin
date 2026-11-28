-- Résolution sécurisée de l'email de connexion à partir d'un numéro de téléphone (formats Bénin 8 ou 10 chiffres, avec/sans +229)
CREATE OR REPLACE FUNCTION public.obtenir_email_connexion_par_telephone(p_telephone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_digits text;
  v_nat text;
  v_no01 text;
  v_with01 text;
  v_email text;
BEGIN
  v_digits := regexp_replace(coalesce(p_telephone, ''), '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RETURN NULL;
  END IF;

  IF left(v_digits, 3) = '229' THEN
    v_nat := substring(v_digits FROM 4);
  ELSE
    v_nat := v_digits;
  END IF;

  IF left(v_nat, 2) = '01' AND length(v_nat) = 10 THEN
    v_no01 := substring(v_nat FROM 3);
    v_with01 := v_nat;
  ELSE
    v_no01 := v_nat;
    v_with01 := '01' || v_nat;
  END IF;

  SELECT COALESCE(NULLIF(trim(u.email), ''), au.email)
  INTO v_email
  FROM public.utilisateurs u
  LEFT JOIN auth.users au ON au.id = u.id
  WHERE regexp_replace(coalesce(u.telephone, ''), '\D', '', 'g') IN (
    v_digits,
    v_nat,
    v_no01,
    v_with01,
    '229' || v_nat,
    '229' || v_no01,
    '229' || v_with01
  )
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtenir_email_connexion_par_telephone(text) TO anon, authenticated;
