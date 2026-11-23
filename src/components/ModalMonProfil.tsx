"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Camera,
  Trash2,
  ShieldCheck,
  Phone,
  MapPin,
  Building2,
  Lock,
  MessageSquareText,
  KeyRound,
  Info,
  LogOut,
  X,
  Check,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import BeninPhoneAction from "@/components/BeninPhoneAction";
import BoutonVerifierMiseAJour from "@/components/BoutonVerifierMiseAJour";
import { SHARED_DEVICE_KEY } from "@/components/ModalModuleDeconnexion";
import { obtenirNomEtRoleCourt } from "@/lib/navigation-registry";
import { saveCachedMonEspace, getCachedMonEspace } from "@/lib/offline-sync";

interface ModalMonProfilProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  onOpenDeconnexion?: () => void;
  onOpenLogout?: () => void;
  onProfileUpdated?: (updated: any) => void;
}

export default function ModalMonProfil({
  isOpen,
  onClose,
  userProfile,
  onOpenDeconnexion,
  onOpenLogout,
  onProfileUpdated
}: ModalMonProfilProps) {
  const [profilComplet, setProfilComplet] = useState<any>(userProfile || null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(userProfile?.photo_url || null);
  const [photoLoading, setPhotoLoading] = useState<boolean>(false);

  // Changement de mot de passe
  const [afficherMdp, setAfficherMdp] = useState<boolean>(false);
  const [nouveauMdp, setNouveauMdp] = useState<string>("");
  const [confirmerMdp, setConfirmerMdp] = useState<string>("");
  const [mdpLoading, setMdpLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  // Option Appareil partagé
  const [appareilPartage, setAppareilPartage] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const cached = getCachedMonEspace();
    const merged = { ...(cached || {}), ...(userProfile || {}) };
    setProfilComplet(merged);
    setPhotoUrl(merged?.photo_url || null);
    if (typeof window !== "undefined") {
      setAppareilPartage(localStorage.getItem(SHARED_DEVICE_KEY) === "true");
    }
    setMessage(null);

    // Enrichir avec les noms territoriaux si manquants
    const chargerTerritoire = async () => {
      if (!navigator.onLine || !merged?.id) return;
      try {
        const { data: rpcData } = await supabase.rpc("obtenir_mon_espace");
        if (rpcData && rpcData.nom) {
          setProfilComplet((prev: any) => ({ ...prev, ...rpcData }));
          if (rpcData.photo_url) setPhotoUrl(rpcData.photo_url);
          saveCachedMonEspace(rpcData);
        }
      } catch {}
    };
    chargerTerritoire();
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const { nomCourt, roleCourt } = obtenirNomEtRoleCourt(profilComplet);
  const nomComplet = `${profilComplet?.prenoms || profilComplet?.prenom || ""} ${profilComplet?.nom || ""}`.trim() || nomCourt;
  const telephone = profilComplet?.telephone || "0169031463";

  const departement = profilComplet?.departement_nom || profilComplet?.departement || "Zou";
  const zoneSanitaire = profilComplet?.zone_sanitaire_nom || profilComplet?.zone_sanitaire || "Covè-Zagnanado-Ouinhi (COZO)";
  const commune = profilComplet?.commune_nom || profilComplet?.commune || "Ouinhi";
  const arrondissement = profilComplet?.arrondissement_nom || profilComplet?.arrondissement || "Tohouès";
  const structure = profilComplet?.structure_sante_nom || profilComplet?.structure_sante || `CS ${arrondissement}`;

  const handleChangerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPhotoUrl(dataUrl);
        if (profilComplet?.id && navigator.onLine) {
          try {
            await supabase.from("utilisateurs").update({ photo_url: dataUrl }).eq("id", profilComplet.id);
          } catch {}
        }
        const nextProf = { ...profilComplet, photo_url: dataUrl };
        setProfilComplet(nextProf);
        saveCachedMonEspace(nextProf);
        if (onProfileUpdated) onProfileUpdated(nextProf);
        setMessage({ texte: "Photo de profil mise à jour avec succès.", erreur: false });
        setPhotoLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setPhotoLoading(false);
    }
  };

  const handleRetirerPhoto = async () => {
    setPhotoLoading(true);
    try {
      setPhotoUrl(null);
      if (profilComplet?.id && navigator.onLine) {
        try {
          await supabase.from("utilisateurs").update({ photo_url: null }).eq("id", profilComplet.id);
        } catch {}
      }
      const nextProf = { ...profilComplet, photo_url: null };
      setProfilComplet(nextProf);
      saveCachedMonEspace(nextProf);
      if (onProfileUpdated) onProfileUpdated(nextProf);
      setMessage({ texte: "Photo de profil retirée.", erreur: false });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleChangerMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveauMdp.length < 6) {
      setMessage({ texte: "Le nouveau mot de passe doit contenir au moins 6 caractères.", erreur: true });
      return;
    }
    if (nouveauMdp !== confirmerMdp) {
      setMessage({ texte: "Les deux mots de passe ne correspondent pas.", erreur: true });
      return;
    }
    setMdpLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
      if (error) throw error;
      setNouveauMdp("");
      setConfirmerMdp("");
      setAfficherMdp(false);
      setMessage({ texte: "Votre mot de passe a été modifié avec succès.", erreur: false });
    } catch (err: any) {
      setMessage({ texte: err?.message || "Impossible de modifier le mot de passe actuellement.", erreur: true });
    } finally {
      setMdpLoading(false);
    }
  };

  const toggleAppareilPartage = (checked: boolean) => {
    setAppareilPartage(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem(SHARED_DEVICE_KEY, String(checked));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de titre */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#005c30]" />
            <h2 className="text-base font-black text-slate-900">Mon profil</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fermer Mon profil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Photo (changer, retirer), Nom, Badge "Compte validé", Poste */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-white border-2 border-[#008751] shadow-sm overflow-hidden flex items-center justify-center shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={nomComplet} className="w-full h-full object-cover" />
            ) : (
              <Image src="/logo-ascq.png" alt="SantéCom Bénin" width={64} height={64} className="object-contain" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900">{nomComplet}</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005c30] text-[11px] font-black border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compte validé</span>
              </span>
            </div>

            <p className="text-xs font-bold text-slate-600">
              Poste : <span className="text-slate-900">{roleCourt}</span>
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs cursor-pointer transition-all min-h-[38px]">
                <Camera className="w-3.5 h-3.5" />
                <span>{photoLoading ? "Chargement..." : "Changer la photo"}</span>
                <input type="file" accept="image/*" onChange={handleChangerPhoto} className="hidden" />
              </label>

              {photoUrl && (
                <button
                  type="button"
                  onClick={handleRetirerPhoto}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-all min-h-[38px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Retirer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message de notification */}
        {message && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            message.erreur ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{message.texte}</span>
          </div>
        )}

        {/* 2. Téléphone avec boutons Appel et WhatsApp */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#005c30] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Téléphone professionnel</span>
              <span className="font-mono font-black text-xs text-slate-900">{telephone}</span>
            </div>
          </div>
          <BeninPhoneAction telephone={telephone} variant="button-group" />
        </div>

        {/* 3. Zone d'intervention et affectation verrouillées + lien "Faire une requête" */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-black text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Zone d'intervention & Affectation (Verrouillée)</span>
            </span>
            <Link
              href="/espace-ascq/requetes"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-[#005c30] hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Faire une requête</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-bold block">Département</span>
              <strong className="font-extrabold text-slate-900">{departement}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-bold block">Zone sanitaire</span>
              <strong className="font-extrabold text-slate-900 truncate block">{zoneSanitaire}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-bold block">Commune</span>
              <strong className="font-extrabold text-slate-900">{commune}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-bold block">Arrondissement</span>
              <strong className="font-extrabold text-slate-900">{arrondissement}</strong>
            </div>
            <div className="col-span-2 p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#005c30] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Structure de référence</span>
                <strong className="font-extrabold text-slate-900">{structure}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Changer le mot de passe */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#005c30]" />
              <span>Sécurité & Mot de passe</span>
            </span>
            <button
              type="button"
              onClick={() => setAfficherMdp(!afficherMdp)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all"
            >
              {afficherMdp ? "Fermer" : "Changer le mot de passe"}
            </button>
          </div>

          {afficherMdp && (
            <form onSubmit={handleChangerMotDePasse} className="space-y-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nouveau mot de passe *</label>
                <input
                  type="password"
                  value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={confirmerMdp}
                  onChange={(e) => setConfirmerMdp(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={mdpLoading}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs flex items-center justify-center gap-2"
              >
                {mdpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Enregistrer le nouveau mot de passe</span>
              </button>
            </form>
          )}
        </div>

        {/* 5. Option "Appareil partagé" */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Appareil partagé</span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                Purge toutes les données locales à la déconnexion
              </span>
            </div>
            <input
              type="checkbox"
              checked={appareilPartage}
              onChange={(e) => toggleAppareilPartage(e.target.checked)}
              className="w-5 h-5 accent-[#005c30] rounded cursor-pointer"
            />
          </label>
        </div>

        {/* 6. À propos (Version déplacée depuis le bandeau d'en-tête) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#005c30]" />
            <div>
              <span className="font-black text-slate-900 block">À propos — SantéCom Bénin</span>
              <span className="text-[11px] text-slate-500 font-mono">Version officielle v2.7.0 • Phase Pilote Zou</span>
            </div>
          </div>
          <BoutonVerifierMiseAJour variant="card" />
        </div>

        {/* 7. Bouton Déconnexion */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenDeconnexion) onOpenDeconnexion();
            if (onOpenLogout) onOpenLogout();
          }}
          className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter de SantéCom Bénin</span>
        </button>
      </div>
    </div>
  );
}
