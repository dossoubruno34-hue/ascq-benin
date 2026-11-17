/**
 * UTILITAIRE UNIVERSEL DE TÉLÉCHARGEMENT & IMPRESSION PDF
 * 100% Client-Side - Compatible Android (Chrome/Samsung/Opera), iOS (Safari), PC/Mac
 */

export function creerBlobPdfUrl(pdfBytes: Uint8Array): string {
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/**
 * Télécharge un fichier PDF de manière fiable sur Android, iOS et PC
 */
export async function telechargerPdf(pdfBytes: Uint8Array, nomFichier: string): Promise<boolean> {
  try {
    const cleanNom = nomFichier.endsWith(".pdf") ? nomFichier : `${nomFichier}.pdf`;
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

    // 1. Essai avec Web Share API sur Mobile (Android / iOS) si supporté
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([blob], cleanNom, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: cleanNom,
            text: "Planning officiel Santé Communautaire Bénin",
          });
          return true;
        }
      } catch (err: any) {
        // Si l'utilisateur annule le partage ou erreur, on continue vers le téléchargement classique
        if (err.name === "AbortError") return true;
        console.warn("[telechargerPdf] Web Share non disponible, repli sur lien classique:", err);
      }
    }

    // 2. Téléchargement via balise <a> (standard Chrome / Firefox / Safari)
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = cleanNom;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    return true;
  } catch (err) {
    console.error("[telechargerPdf] Erreur lors du téléchargement :", err);
    // Dernier recours : ouvrir dans un nouvel onglet
    try {
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      return true;
    } catch {}
    return false;
  }
}

/**
 * Ouvre la boîte d'impression native du PDF sur desktop ou déclenche la vue PDF sur mobile
 */
export async function imprimerPdf(pdfBytes: Uint8Array, nomFichier: string = "document.pdf"): Promise<void> {
  try {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    if (isMobile) {
      // Sur Android et iOS, l'impression par iframe est souvent bloquée par le navigateur.
      // On ouvre l'URL du blob dans un nouvel onglet où la barre d'outils PDF native propose "Imprimer" ou "Télécharger".
      window.open(blobUrl, "_blank");
      return;
    }

    // Sur PC / Mac : Iframe d'impression directe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "none";
    iframe.src = blobUrl;

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn("[imprimerPdf] print() sur iframe bloqué, ouverture directe :", e);
          window.open(blobUrl, "_blank");
        }
      }, 500);
    };

    document.body.appendChild(iframe);

    // Nettoyage après 60 secondes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      URL.revokeObjectURL(blobUrl);
    }, 60000);

  } catch (err) {
    console.error("[imprimerPdf] Erreur lors de l'impression :", err);
    // Repli de sécurité
    telechargerPdf(pdfBytes, nomFichier);
  }
}
