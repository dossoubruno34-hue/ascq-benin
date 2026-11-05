// @ts-nocheck
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is an Edge Function deployed to Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  // Gestion CORS pré-vol
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  // 1. Initialiser le client Supabase avec la clé de service (service_role)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes sur le serveur.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Récupérer les secrets Facebook confidentiels stockés UNIQUEMENT dans Supabase Secrets
  const pageId = Deno.env.get("FB_PAGE_ID");
  const pageToken = Deno.env.get("FB_PAGE_TOKEN");

  if (!pageId || !pageToken) {
    const errorMsg = "Secrets FB_PAGE_ID ou FB_PAGE_TOKEN non configurés dans Supabase Secrets.";
    console.error(`[sync-facebook-posts] ${errorMsg}`);

    // Journaliser l'incident pour consultation super admin
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
    // 3. Appel de l'API Graph Meta v25.0 avec timeout strict de 10 secondes (pas de boucle agressive)
    const graphApiVersion = "v25.0";
    const graphUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/posts?fields=id,message,created_time,permalink_url&limit=10&access_token=${encodeURIComponent(pageToken)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

    let fbRes: Response;
    try {
      fbRes = await fetch(graphUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const fbData: FacebookApiResponse = await fbRes.json();

    // 4. Détection d'erreur de jeton ou d'API Meta (ex: Code 190 = Jeton invalide ou expiré)
    if (!fbRes.ok || fbData.error) {
      const errCode = fbData.error?.code || fbRes.status;
      const errSubcode = fbData.error?.error_subcode;
      const errMsg = fbData.error?.message || `Erreur HTTP ${fbRes.status} depuis l'API Graph Meta`;

      console.error(`[sync-facebook-posts] Erreur API Meta (code ${errCode}, subcode ${errSubcode}): ${errMsg}`);

      // Enregistrer l'incident dans le journal consultable par le Super Admin
      // IMPORTANT : Les données précédemment stockées dans publications_facebook sont INTÉGRALEMENT CONSERVÉES
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
          fbtrace_id: fbData.error?.fbtrace_id,
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

    // 5. Filtrage : ignorer les publications sans texte et garder les 3 plus récentes
    const rawPosts = Array.isArray(fbData.data) ? fbData.data : [];
    
    // Garder uniquement les posts possédant un message non vide
    const postsAvecTexte = rawPosts.filter(
      (p) => p.message && p.message.trim().length > 0 && p.created_time
    );

    // Trier par date décroissante et conserver les 3 plus récentes
    postsAvecTexte.sort(
      (a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
    );
    const top3Posts = postsAvecTexte.slice(0, 3);

    if (top3Posts.length > 0) {
      // 6. Insérer / Mettre à jour dans la table publications_facebook
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

      if (upsertErr) {
        throw upsertErr;
      }

      // Nettoyer pour s'assurer que seules les 3 plus récentes subsistent
      const idsToKeep = top3Posts.map((p) => p.id);
      await supabase
        .from("publications_facebook")
        .delete()
        .not("id_facebook", "in", `(${idsToKeep.map((id) => `"${id}"`).join(",")})`);
    }

    // 7. Enregistrer le succès dans le journal
    const durationMs = Date.now() - startTime;
    await supabase.from("facebook_sync_logs").insert({
      status: "SUCCESS",
      status_code: 200,
      message: `Synchronisation réussie : ${top3Posts.length} publication(s) active(s) en base (${durationMs}ms).`,
      posts_count: top3Posts.length,
      error_details: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        posts_count: top3Posts.length,
        duration_ms: durationMs,
        fetched_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    const errorMsg = err.name === "AbortError" 
      ? "Délai d'attente dépassé (Timeout 10s) lors de la connexion à l'API Meta." 
      : (err.message || "Erreur interne de synchronisation");

    console.error(`[sync-facebook-posts] Exception : ${errorMsg}`);

    // Journaliser l'incident sans effacer les publications existantes
    await supabase.from("facebook_sync_logs").insert({
      status: "ERROR",
      status_code: err.name === "AbortError" ? 408 : 500,
      message: errorMsg,
      posts_count: 0,
      error_details: { name: err.name, stack: err.stack },
    });

    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
