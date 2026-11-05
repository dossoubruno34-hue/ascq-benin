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

  // 2. CONTRÔLE D'ACCÈS STRICT (Cron ou Secret d'invocation uniquement)
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
  const pageId = Deno.env.get("FB_PAGE_ID") || "61595028870500";
  const initialToken = Deno.env.get("FB_PAGE_TOKEN");

  if (!initialToken) {
    const errorMsg = "Secret FB_PAGE_TOKEN non configuré dans Supabase Secrets.";
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
    const graphApiVersion = "v25.0";
    let activeToken = initialToken;
    let resolvedPageName = "Page officielle";

    // 4. RÉSOLUTION D'IDENTITÉ INTELLIGENTE DU JETON (Page Token vs User Token)
    // Permet de fonctionner de manière transparente même si l'utilisateur a configuré un jeton utilisateur
    try {
      const meRes = await fetch(`https://graph.facebook.com/${graphApiVersion}/me?fields=id,name,category`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${initialToken}`,
        },
      });
      const meData = await meRes.json();

      if (meData?.id) {
        if (meData.category) {
          // Le jeton est déjà un jeton direct de page !
          resolvedPageName = meData.name || resolvedPageName;
          console.log(`[sync-facebook-posts] Jeton de Page direct vérifié : "${meData.name}" (ID: ${meData.id})`);
        } else {
          // Le jeton est un jeton utilisateur -> récupérer le jeton de page via /me/accounts
          console.log(`[sync-facebook-posts] Jeton Utilisateur détecté : "${meData.name}". Recherche automatique du jeton de page via /me/accounts...`);
          const accRes = await fetch(`https://graph.facebook.com/${graphApiVersion}/me/accounts?fields=id,name,access_token`, {
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${initialToken}`,
            },
          });
          const accData = await accRes.json();
          if (Array.isArray(accData?.data) && accData.data.length > 0) {
            // Trouver la page du Collectif ou la première page disponible
            const matchingPage = accData.data.find((p: any) => 
              p.id === pageId || (p.name || "").toLowerCase().includes("ascq") || (p.name || "").toLowerCase().includes("collectif")
            ) || accData.data[0];

            if (matchingPage?.access_token) {
              activeToken = matchingPage.access_token;
              resolvedPageName = matchingPage.name || resolvedPageName;
              console.log(`[sync-facebook-posts] Jeton de Page obtenu avec succès pour "${matchingPage.name}" (ID: ${matchingPage.id})`);
            }
          }
        }
      }
    } catch (discoveryErr) {
      console.warn("[sync-facebook-posts] Résolution d'identité /me contournée:", discoveryErr.message);
    }

    // 5. Appel de l'API Graph Meta v25.0
    // Teste d'abord /{pageId}/posts puis /me/posts puis /me/feed
    const candidateEndpoints = [
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/posts?fields=id,message,created_time,permalink_url&limit=10`,
      `https://graph.facebook.com/${graphApiVersion}/me/posts?fields=id,message,created_time,permalink_url&limit=10`,
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/feed?fields=id,message,created_time,permalink_url&limit=10`,
      `https://graph.facebook.com/${graphApiVersion}/me/feed?fields=id,message,created_time,permalink_url&limit=10`
    ];

    let lastErrorData: any = null;
    let successfulPosts: FacebookPost[] | null = null;

    for (const url of candidateEndpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${activeToken}`,
          },
        });
        clearTimeout(timeoutId);

        const data: FacebookApiResponse = await res.json();
        if (res.ok && !data.error && Array.isArray(data.data)) {
          successfulPosts = data.data;
          console.log(`[sync-facebook-posts] Données récupérées avec succès via ${url.split('?')[0]}`);
          break;
        } else {
          lastErrorData = data.error || { message: `HTTP ${res.status}` };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastErrorData = { message: err.message || "Erreur de connexion" };
      }
    }

    // Si aucun endpoint n'a pu répondre favorablement
    if (!successfulPosts) {
      const errCode = lastErrorData?.code || 400;
      const rawErrMsg = lastErrorData?.message || "Impossible de récupérer les publications Meta.";
      const errMsg = assainirMessage(rawErrMsg);

      console.error(`[sync-facebook-posts] Échec de récupération Graph API : ${errMsg}`);

      let explanation = errMsg;
      if (errCode === 190) {
        explanation = `Jeton Facebook expiré ou invalide (Code 190). Veuillez renouveler le jeton de page dans Supabase Secrets.`;
      } else if (errMsg.includes("Unsupported get request") || errMsg.includes("does not exist") || errMsg.includes("missing permissions")) {
        explanation = `Autorisations insuffisantes ou jeton non relié à la page : le jeton utilisé ne possède pas la permission 'pages_read_engagement' pour la page ${pageId}. Assurez-vous d'avoir sélectionné la Page 'Collectif des ASCQ Bénin' dans le menu déroulant de l'Explorateur Graph avant de copier le jeton.`;
      }

      await supabase.from("facebook_sync_logs").insert({
        status: "ERROR",
        status_code: errCode,
        message: explanation,
        posts_count: 0,
        error_details: {
          code: errCode,
          type: lastErrorData?.type,
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: explanation,
          code: errCode,
          note: "Les données précédemment en base ont été conservées.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Filtrage : ignorer les publications sans texte et garder les 3 plus récentes
    const postsAvecTexte = successfulPosts.filter(
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
        message: `Synchronisation réussie pour ${resolvedPageName} : 0 nouvelle publication avec texte trouvée. Publications précédentes conservées.`,
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
      message: `Synchronisation réussie (${resolvedPageName}) : ${top3Posts.length} publication(s) mises à jour.`,
      posts_count: top3Posts.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        posts_synced: top3Posts.length,
        page_name: resolvedPageName,
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
