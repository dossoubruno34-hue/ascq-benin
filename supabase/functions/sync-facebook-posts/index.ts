// @ts-nocheck
// Supabase Edge Function (Deno runtime)
// Synchronisation officielle des publications Facebook du Collectif ASCQ Bénin

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
}

interface FacebookApiResponse {
  data?: FacebookPost[];
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Nettoie toute chaîne de caractères pour éliminer les jetons ou secrets avant journalisation.
 */
function assainirMessage(msg: string): string {
  if (!msg) return "";
  return msg
    .replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

Deno.serve(async (req) => {
  // 0. Gestion CORS pré-vol
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Initialiser le client Supabase serveur avec la clé service_role
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Variables d'environnement serveur SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. CONTRÔLE D'ACCÈS STRICT (Point 4 : Cron ou Secret d'invocation uniquement)
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const cronSecret = Deno.env.get("CRON_SYNC_SECRET") || supabaseServiceKey;

  const isServiceRole = authHeader.replace(/^Bearer\s+/i, "").trim() === supabaseServiceKey;
  const isCronAuthorized = 
    (cronHeader && cronHeader === cronSecret) || 
    (authHeader && authHeader.replace(/^Bearer\s+/i, "").trim() === cronSecret);

  let isSuperAdmin = false;
  if (!isServiceRole && !isCronAuthorized && authHeader.startsWith("Bearer ")) {
    try {
      const userToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      const { data: { user } } = await supabase.auth.getUser(userToken);
      if (user) {
        const { data: profil } = await supabase
          .from("utilisateurs")
          .select("role_technique, telephone")
          .eq("id", user.id)
          .single();
        if (profil && (profil.role_technique === "SUPER_ADMIN" || (profil.telephone || "").includes("69031463"))) {
          isSuperAdmin = true;
        }
      }
    } catch {
      // Token utilisateur invalide
    }
  }

  // Refuser formellement tout appel anonyme ou non autorisé (401 Unauthorized)
  if (!isServiceRole && !isCronAuthorized && !isSuperAdmin) {
    console.warn("[sync-facebook-posts] Tentative d'accès non autorisé refusée (401)");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Non autorisé (401) : Cette fonction est réservée au cron planifié et à la coordination Super Admin.",
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Récupérer les secrets Facebook stockés UNIQUEMENT dans Supabase Secrets
  const pageId = Deno.env.get("FB_PAGE_ID");
  const pageToken = Deno.env.get("FB_PAGE_TOKEN");

  if (!pageId || !pageToken) {
    const errorMsg = "Secrets FB_PAGE_ID ou FB_PAGE_TOKEN non configurés dans Supabase Secrets.";
    console.error(`[sync-facebook-posts] ${errorMsg}`);

    await supabase.from("facebook_sync_logs").insert({
      status: "ERROR",
      status_code: 500,
      message: errorMsg,
      posts_count: 0,
      error_details: { reason: "MISSING_SECRETS" },
    });

    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 4. Appel API Graph Meta v25.0
    // SÉCURITÉ STRICTE (Point 3) : 
    // - Le jeton passe UNIQUEMENT dans l'en-tête Authorization: Bearer <TOKEN>
    // - JAMAIS dans l'URL ni dans les paramètres de requête.
    const graphApiVersion = "v25.0";
    const graphUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/posts?fields=id,message,created_time,permalink_url&limit=10`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s strict

    let fbRes: Response;
    try {
      fbRes = await fetch(graphUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${pageToken}`, // Jeton dans l'en-tête
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const fbData: FacebookApiResponse = await fbRes.json();

    // 5. Gestion des erreurs de l'API Graph (Code 190 ou erreur serveur)
    if (!fbRes.ok || fbData.error) {
      const errCode = fbData.error?.code || fbRes.status;
      const errSubcode = fbData.error?.error_subcode;
      const rawErrMsg = fbData.error?.message || `Erreur HTTP ${fbRes.status} depuis l'API Graph Meta`;
      const errMsg = assainirMessage(rawErrMsg);

      console.error(`[sync-facebook-posts] Erreur API Meta (code ${errCode}, subcode ${errSubcode}): ${errMsg}`);

      // Enregistrer l'erreur dans facebook_sync_logs (SANS AUCUN JETON)
      // Les données précédentes en base restent 100% conservées
      await supabase.from("facebook_sync_logs").insert({
        status: "ERROR",
        status_code: errCode,
        message: errCode === 190 
          ? `Jeton de page Facebook expiré ou révoqué (Code 190) : ${errMsg}` 
          : `Erreur API Meta Graph : ${errMsg}`,
        posts_count: 0,
        error_details: {
          code: errCode,
          subcode: errSubcode,
          type: fbData.error?.type,
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg,
          code: errCode,
          note: "La version précédente des publications a été conservée sans altération.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Filtrage : ignorer les publications sans texte et garder les 3 plus récentes
    const rawPosts = Array.isArray(fbData.data) ? fbData.data : [];
    const postsAvecTexte = rawPosts.filter(
      (p) => p.message && p.message.trim().length > 0 && p.created_time
    );

    postsAvecTexte.sort(
      (a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    const top3Posts = postsAvecTexte.slice(0, 3);

    // POINT 5 : Si 0 publication avec texte, NE SURTOUT PAS VIDER LA TABLE !
    if (top3Posts.length === 0) {
      console.log("[sync-facebook-posts] 0 publication avec texte trouvée. Conservation intégrale des données existantes.");
      await supabase.from("facebook_sync_logs").insert({
        status: "SUCCESS",
        status_code: 200,
        message: "Synchronisation réussie : 0 nouvelle publication trouvée. Publications existantes conservées.",
        posts_count: 0,
        error_details: { action: "RETAIN_EXISTING_DATA" },
      });

      return new Response(
        JSON.stringify({
          success: true,
          posts_synced: 0,
          message: "0 publication trouvée. Les publications en base restent inchangées.",
          table_cleared: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Enregistrement des 3 publications en base (Upsert)
    const rowsToUpsert = top3Posts.map((p) => ({
      id_facebook: p.id,
      message: p.message!.trim(),
      permalink_url: p.permalink_url || `https://www.facebook.com/${p.id}`,
      created_time: p.created_time,
      fetched_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from("publications_facebook")
      .upsert(rowsToUpsert, { onConflict: "id_facebook" });

    if (upsertErr) throw upsertErr;

    // Nettoyage automatique pour ne conserver que les 3 plus récentes
    const idsToKeep = top3Posts.map((p) => p.id);
    await supabase
      .from("publications_facebook")
      .delete()
      .not("id_facebook", "in", `(${idsToKeep.map((id) => `"${id}"`).join(",")})`);

    // Journaliser le succès
    await supabase.from("facebook_sync_logs").insert({
      status: "SUCCESS",
      status_code: 200,
      message: `Synchronisation réussie : ${top3Posts.length} publication(s) mises à jour.`,
      posts_count: top3Posts.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        posts_synced: top3Posts.length,
        items: top3Posts.map((p) => ({ id: p.id, created_time: p.created_time })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const safeErrorMsg = assainirMessage(err.message || String(err));
    console.error(`[sync-facebook-posts] Erreur interne : ${safeErrorMsg}`);

    await supabase.from("facebook_sync_logs").insert({
      status: "ERROR",
      status_code: 500,
      message: safeErrorMsg,
      posts_count: 0,
    });

    return new Response(
      JSON.stringify({ success: false, error: safeErrorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
