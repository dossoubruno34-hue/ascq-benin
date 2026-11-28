"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check, PenTool, Upload, Sparkles, Edit3, Trash2, CheckCircle2 } from "lucide-react";

const SAVED_SIGNATURE_STORAGE_KEY = "santecom_saved_signature_v1";

interface SignatureCanvasProps {
  onSignatureChange?: (signatureBase64: string | null) => void;
  onChange?: (signatureBase64: string | null) => void;
  defaultValue?: string | null;
  initialData?: string | null;
  readOnly?: boolean;
}

/**
 * Optimise une image importée et supprime automatiquement l'arrière-plan clair/papier
 * pour produire un PNG transparent prêt à être apposé sur les formulaires et PDF.
 */
function processImportedSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format d'image non reconnu."));
      img.onload = () => {
        const maxW = 600;
        const maxH = 240;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const offscreen = document.createElement("canvas");
        offscreen.width = targetW;
        offscreen.height = targetH;
        const ctx = offscreen.getContext("2d");
        if (!ctx) {
          reject(new Error("Contexte graphique indisponible."));
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imageData.data;

        let minX = targetW;
        let minY = targetH;
        let maxX = 0;
        let maxY = 0;
        let hasInk = false;

        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const idx = (y * targetW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 25) {
              data[idx + 3] = 0;
              continue;
            }

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Fond blanc / gris clair / papier ombré -> transparent
            if ((r > 175 && g > 175 && b > 175 && maxC - minC < 40) || lum > 215) {
              data[idx + 3] = 0;
            } else {
              // Renforcer le contraste de l'encre pour une signature nette
              const factor = lum < 130 ? 0.65 : 0.85;
              data[idx] = Math.max(0, Math.round(r * factor));
              data[idx + 1] = Math.max(0, Math.round(g * factor));
              data[idx + 2] = Math.max(0, Math.round(b * factor));
              data[idx + 3] = Math.min(255, Math.round(a * 1.15));

              hasInk = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Recadrer autour de la signature détectée avec une petite marge
        if (hasInk && maxX > minX && maxY > minY) {
          const pad = 8;
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(targetW - cropX, maxX - minX + 1 + pad * 2);
          const cropH = Math.min(targetH - cropY, maxY - minY + 1 + pad * 2);

          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = cropW;
          finalCanvas.height = cropH;
          const fCtx = finalCanvas.getContext("2d");
          if (fCtx) {
            fCtx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            resolve(finalCanvas.toDataURL("image/png"));
            return;
          }
        }

        resolve(offscreen.toDataURL("image/png"));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function SignatureCanvas({
  onSignatureChange,
  onChange,
  defaultValue = null,
  initialData = null,
  readOnly = false,
}: SignatureCanvasProps) {
  const initialSig = defaultValue ?? initialData ?? null;
  const emitChange = useCallback(
    (sig: string | null) => {
      onSignatureChange?.(sig);
      onChange?.(sig);
    },
    [onSignatureChange, onChange]
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentSig, setCurrentSig] = useState<string | null>(initialSig);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [mode, setMode] = useState<"draw" | "import">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Charger la signature mémorisée en localStorage au montage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SAVED_SIGNATURE_STORAGE_KEY);
      if (stored && stored.startsWith("data:image/")) {
        setSavedSig(stored);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Synchroniser si initialSig change depuis le parent
  useEffect(() => {
    const next = defaultValue ?? initialData ?? null;
    if (next !== currentSig) {
      setCurrentSig(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue, initialData]);

  // Initialiser le canvas uniquement quand l'éditeur en mode dessin est ouvert
  useEffect(() => {
    if (!isEditorOpen || mode !== "draw" || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width || 360, 280);
    const height = Math.max(rect.height || 160, 140);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0F172A";
    setHasDrawnStroke(false);
  }, [isEditorOpen, mode, readOnly]);

  const persistSignature = (sigDataUrl: string) => {
    setSavedSig(sigDataUrl);
    try {
      window.localStorage.setItem(SAVED_SIGNATURE_STORAGE_KEY, sigDataUrl);
    } catch {
      // Ignore storage quota errors
    }
  };

  const applyAndMemorize = (sigDataUrl: string) => {
    persistSignature(sigDataUrl);
    setCurrentSig(sigDataUrl);
    emitChange(sigDataUrl);
    setIsEditorOpen(false);
    setImportPreview(null);
    setImportError(null);
  };

  const handleUseSaved = () => {
    if (!savedSig || readOnly) return;
    setCurrentSig(savedSig);
    emitChange(savedSig);
    setIsEditorOpen(false);
  };

  const handleRemoveCurrent = () => {
    if (readOnly) return;
    setCurrentSig(null);
    emitChange(null);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawnStroke(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnStroke(false);
  };

  const handleValidateDrawn = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnStroke) return;
    const dataUrl = canvas.toDataURL("image/png");
    applyAndMemorize(dataUrl);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setIsProcessingImport(true);
    try {
      const cleaned = await processImportedSignatureImage(file);
      setImportPreview(cleaned);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Erreur lors du traitement de la signature."
      );
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Mode lecture seule
  if (readOnly) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-center min-h-[100px]">
        {currentSig ? (
          <img
            src={currentSig}
            alt="Signature apposée"
            className="max-h-24 w-auto object-contain"
          />
        ) : (
          <span className="text-xs text-slate-400 italic">Aucune signature enregistrée</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* État fermé : bouton Signer ou aperçu de la signature appliquée / mémorisée */}
      {!isEditorOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
          {currentSig ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-center min-w-[120px] max-w-[200px] h-16">
                  <img
                    src={currentSig}
                    alt="Signature appliquée"
                    className="max-h-12 w-auto object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Signature prête
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mémorisée pour vos prochains documents.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCurrent}
                  title="Retirer de ce document"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-2 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : savedSig ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-white border border-dashed border-emerald-300 rounded-xl px-3 py-2 flex items-center justify-center min-w-[120px] max-w-[200px] h-16">
                  <img
                    src={savedSig}
                    alt="Signature mémorisée"
                    className="max-h-12 w-auto object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">
                    Signature enregistrée disponible
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Apposez votre signature mémorisée ou modifiez-la.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleUseSaved}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Signer avec ma signature
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifier
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Aucune signature apposée
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cliquez sur « Signer » pour dessiner ou importer votre signature.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors shrink-0"
              >
                <PenTool className="w-4 h-4" />
                Signer
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Espace dédié à la signature (ouvert uniquement après clic sur Signer / Modifier) */
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-3.5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("draw")}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  mode === "draw"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Signature numérique
              </button>
              <button
                type="button"
                onClick={() => setMode("import")}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  mode === "import"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Importer signature
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setImportPreview(null);
                setImportError(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Fermer
            </button>
          </div>

          {mode === "draw" ? (
            <div className="space-y-2.5">
              <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 cursor-crosshair block"
                />
                {!hasDrawnStroke && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-400">
                      Tracez votre signature ici avec le doigt ou la souris
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Effacer
                </button>
                <button
                  type="button"
                  onClick={handleValidateDrawn}
                  disabled={!hasDrawnStroke}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Valider et mémoriser
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileImport}
                className="hidden"
              />

              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suppression automatique de l&apos;arrière-plan activée
                </div>
                <p className="text-xs text-slate-600">
                  Importez une photo ou un scan de votre signature sur papier blanc : le fond est automatiquement nettoyé et rendu transparent.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImport}
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {isProcessingImport ? "Optimisation en cours..." : "Choisir une image de signature"}
                </button>
              </div>

              {importError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {importError}
                </p>
              )}

              {importPreview && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Aperçu optimisé (fond transparent)
                  </p>
                  <div
                    className="rounded-lg border border-slate-200 p-3 flex items-center justify-center min-h-[90px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)",
                      backgroundSize: "14px 14px",
                      backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <img
                      src={importPreview}
                      alt="Aperçu signature détourée"
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => applyAndMemorize(importPreview)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Appliquer et mémoriser
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
