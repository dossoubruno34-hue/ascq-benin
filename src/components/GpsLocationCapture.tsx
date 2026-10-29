"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, RefreshCw, CheckCircle2, AlertTriangle, Navigation } from "lucide-react";

interface Props {
  latitude: number | null;
  longitude: number | null;
  onLocationCaptured?: (lat: number, lng: number, accuracy?: number) => void;
  onLocationChange?: (lat: number, lng: number, accuracy?: number) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function GpsLocationCapture({
  latitude,
  longitude,
  onLocationCaptured,
  onLocationChange,
  label = "Géolocalisation GPS du lieu de notification",
  required = false,
  className = ""
}: Props) {
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  const captureGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setHasError(true);
      setStatusMsg("La géolocalisation n'est pas prise en charge par ce navigateur.");
      return;
    }

    setLoading(true);
    setHasError(false);
    setStatusMsg("Acquisition des coordonnées GPS en cours (haute précision)...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        const acc = Math.round(pos.coords.accuracy);
        setAccuracy(acc);
        setLoading(false);
        setHasError(false);
        setStatusMsg(`Coordonnées GPS capturées avec succès (Précision : ±${acc}m).`);
        if (onLocationCaptured) onLocationCaptured(lat, lng, acc);
        if (onLocationChange) onLocationChange(lat, lng, acc);
      },
      (err) => {
        setLoading(false);
        setHasError(true);
        let msg = "Impossible d'acquérir les coordonnées GPS.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Accès à la géolocalisation refusé. Veuillez autoriser la localisation sur votre appareil.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Signal GPS indisponible ou faible.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Délai d'attente GPS dépassé.";
        }
        setStatusMsg(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  }, [onLocationCaptured]);

  // Capture automatique au montage si aucune coordonnée n'est encore définie
  useEffect(() => {
    if (latitude === null || longitude === null) {
      captureGps();
    }
  }, [latitude, longitude, captureGps]);

  const hasCoords = latitude !== null && longitude !== null;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      hasCoords 
        ? "bg-emerald-50/70 border-emerald-200" 
        : hasError 
          ? "bg-amber-50/70 border-amber-200" 
          : "bg-slate-50 border-slate-200"
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="p-1 rounded-lg bg-emerald-100 text-[#005c30]">
              <MapPin className="w-4 h-4" />
            </span>
            <span className="text-xs font-black text-slate-800">
              {label} {required && <span className="text-red-500">*</span>}
            </span>

            {hasCoords && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                <CheckCircle2 className="w-3 h-3" />
                <span>GPS Actif</span>
              </span>
            )}
          </div>

          {hasCoords ? (
            <div className="text-[11px] font-mono text-slate-700 flex flex-wrap items-center gap-2 pt-0.5">
              <span>Lat: <strong className="text-slate-900">{latitude}°</strong></span>
              <span>•</span>
              <span>Long: <strong className="text-slate-900">{longitude}°</strong></span>
              {accuracy !== null && (
                <span className="text-[10px] text-slate-500 font-sans font-bold bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                  Précision : ±{accuracy}m
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              {statusMsg || "Acquisition GPS en attente..."}
            </p>
          )}

          {hasError && (
            <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{statusMsg}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={captureGps}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          title="Actualiser les coordonnées GPS"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#005c30]" : ""}`} />
          <span>{hasCoords ? "Actualiser ma position" : "Capturer ma position"}</span>
        </button>
      </div>
    </div>
  );
}
