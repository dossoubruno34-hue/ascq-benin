"use client";

import React, { useRef, useState, useEffect } from "react";
import { Eraser, Check, PenLine } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (signatureBase64: string | null) => void;
  defaultValue?: string | null;
  readOnly?: boolean;
}

export default function SignatureCanvas({
  onSignatureChange,
  defaultValue,
  readOnly = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialisation du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustement de la résolution pour écrans retina
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#005c30"; // Vert foncé ASCQ Bénin
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Si une signature par défaut existe (ex: lecture seule)
    if (defaultValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = defaultValue;
    }
  }, [defaultValue]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Empêcher le défilement de page pendant le tracé tactile
    if ("touches" in e) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSignatureChange(dataUrl);
  };

  const clearCanvas = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-36 touch-none ${
            readOnly ? "cursor-default" : "cursor-crosshair"
          }`}
        />

        {!hasDrawn && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <PenLine className="w-5 h-5 text-emerald-600/60" />
            <span className="text-xs font-medium">
              Signez ici avec votre doigt ou un stylet
            </span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500 italic">
            {hasDrawn ? "✓ Signature enregistrée" : "Signature obligatoire"}
          </span>
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasDrawn}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              hasDrawn
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
                : "text-slate-300 cursor-not-allowed"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>
        </div>
      )}
    </div>
  );
}
