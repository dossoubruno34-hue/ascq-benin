"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  Printer, 
  ShieldCheck, 
  Lock, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Crown, 
  Building2, 
  Stethoscope, 
  Baby, 
  Activity, 
  MapPin, 
  Phone, 
  HelpCircle, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from "lucide-react";

type GuideTab = "inscription" | "rapports" | "fiches" | "consultations" | "profils" | "depannage";

export default function GuideUtilisateurPage() {
  const [activeTab, setActiveTab] = useState<GuideTab>("inscription");
  const [search, setSearch] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("tous");

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased pb-24 print:bg-white print:p-0 print:pb-0">
      
      {/* 1. EN-TÊTE OFFICIEL - MASQUÉ À L'IMPRESSION */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour à l'accueil</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold tracking-tight">Guide d'Utilisateur Officiel</h1>
            <p className="text-[10px] text-white/80">Plateforme ASCQ Bénin • Version V4.0</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Imprimer le guide"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* EN-TÊTE OFFICIEL POUR L'IMPRESSION FORMAT A4 */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-base font-black uppercase text-black">RÉPUBLIQUE DU BÉNIN</h1>
        <h2 className="text-xs font-bold uppercase text-slate-800">Ministère de la Santé — Direction Nationale de la Santé Publique</h2>
        <h3 className="text-xs font-extrabold text-[#005c30]">Guide d'Utilisateur Officiel Intégral par Profil (V4.0)</h3>
        <p className="text-[11px] text-slate-600 mt-1">Programme National de Santé Communautaire (PNSC) & SIMR</p>
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6 print:max-w-none print:px-0 print:pt-0">
        
        {/* BANNIÈRE DE PRÉSENTATION & RECHERCHE */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                  Référentiel Officiel V4.0
                </span>
                <span className="text-[11px] text-slate-400 font-bold">Novembre 2026</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Manuel Opérationnel & Procédures Détaillées par Profil
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Règles d'inscription anti-hack, pyramide des rapports agrégés, transparence des fiches, signatures RC-ASCQ et secret médical.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/briefing"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide Clinique SIMR</span>
              </Link>
            </div>
          </div>

          {/* Barre de recherche instantanée */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher une procédure, un profil, une règle de signature..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]/20 focus:border-[#005c30]"
            />
          </div>

          {/* ONGLETS THÉMATIQUES */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold border-t border-slate-100 pt-3">
            {[
              { id: "inscription", label: "1. Inscription Sécurisée", icon: ShieldCheck },
              { id: "rapports", label: "2. Pyramide des Rapports", icon: FileSpreadsheet },
              { id: "fiches", label: "3. Fiches & Signatures", icon: Activity },
              { id: "consultations", label: "4. Soins & Secret Médical", icon: Stethoscope },
              { id: "profils", label: "5. Guides par Profil", icon: Users },
              { id: "depannage", label: "6. Dépannage & Fiches Réflexes", icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as GuideTab)}
                  className={`px-3 py-2 rounded-xl shrink-0 flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-[#005c30] text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENU SECTION 1 : INSCRIPTION DIFFÉRENCIÉE & SÉCURITÉ */}
        {activeTab === "inscription" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 1 : Règles d'Inscription et Sécurité Anti-Piratage
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                La plateforme distingue rigoureusement la création de compte pour les agents de terrain et pour les cadres afin d'éviter tout piratage :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Carte RC */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#005c30]">Relais Communautaires (RC)</span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-[#005c30] px-2 py-0.5 rounded-full">
                      Formulaire Terrain
                    </span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                    <li><strong>Identifiant</strong> : Numéro de téléphone cellulaire béninois (+229).</li>
                    <li><strong>Mot de passe</strong> : <strong>Code secret PIN à 4 chiffres</strong>.</li>
                    <li><strong>Adresse email</strong> : <strong>NON REQUISE</strong> (aucun email n'est exigé sur le terrain rural).</li>
                    <li><strong>Affectation</strong> : Village / quartier et arrondissement de tutelle.</li>
                  </ul>
                </div>

                {/* Carte ASCQ & Cadres */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-blue-900">ASCQ & Cadres Superviseurs</span>
                    <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                      Anti-Piratage Renforcé
                    </span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                    <li><strong>Email Professionnel OBLIGATOIRE</strong> avec contrôle de validité.</li>
                    <li><strong>Mot de passe renforcé obligatoire</strong> :
                      <ul className="list-circle pl-4 mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <li>Minimum 8 caractères</li>
                        <li>Au moins une lettre alphabétique</li>
                        <li>Au moins un chiffre</li>
                        <li>Au moins un caractère spécial obligatoire (ex. : <code>!@#$%^&*</code>)</li>
                      </ul>
                    </li>
                    <li><strong>Précision obligatoire de la fonction exacte</strong> pour tous les cadres communaux, départementaux et nationaux.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <strong>Connexion universelle :</strong> Tout utilisateur peut se connecter avec son numéro de téléphone béninois OU son adresse email sur <Link href="/connexion" className="text-[#005c30] font-bold underline">la page de connexion</Link>.
              </div>
            </div>
          </div>
        )}

        {/* CONTENU SECTION 2 : PYRAMIDE DES RAPPORTS AGRÉGÉS */}
        {activeTab === "rapports" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <FileSpreadsheet className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 2 : Pyramide d'Agrégation Hiérarchique des Rapports Mensuels
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Les données d'activité remontent automatiquement le long de la chaîne sanitaire béninoise :
              </p>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Niveau Arrondissement (ASCQ Superviseur)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Rapport mensuel agrégeant automatiquement les rapports hebdomadaires d'activité des Relais Communautaires (RC) rattachés à l'arrondissement. L'ASCQ valide les totaux (VAD, causeries, femmes CPN référées, enfants PEV) et dépose le RMA <strong>avant le 5 du mois suivant</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Niveau Commune (Représentant Communal)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Rapport consolidé communal regroupant l'ensemble des ASCQ de la commune. Permet de suivre la complétude des dépôts et les performances sanitaires de chaque arrondissement.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Niveau Département (Cadres DDS)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Rapport consolidé départemental synthétisant les résultats de l'ensemble des communes du département pour pilotage stratégique par la Direction Départementale de la Santé.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Niveau National (Ministère de la Santé & Super Admin)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Consolidation macro-stratégique regroupant les 12 départements de la République du Bénin pour transmission au Conseil des Ministres et aux partenaires techniques et financiers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU SECTION 3 : FICHES DE NOTIFICATION & SIGNATURES */}
        {activeTab === "fiches" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <Activity className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 3 : Fiches de Notifications (Alertes SIMR & Décès) : Transparence et Signatures
                </h3>
              </div>

              {/* Règle de transparence 100% */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
                <span className="font-black text-xs text-[#005c30] uppercase block">
                  ✓ Règle de Transparence Intégrale (100% des données visibles)
                </span>
                <p className="text-xs text-slate-700">
                  Peu importe le niveau hiérarchique (communal, zone sanitaire, départemental ou national), <strong>celui qui consulte la fiche doit tout voir</strong> : coordonnées GPS précises, date/heure, symptômes complets, bilan d'impact humain et animal, identité intégrale du cas ou défunt, contact de l'agent notificateur et signature tactile recueillie.
                </p>
              </div>

              {/* Règle absolue des signatures */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <span className="font-black text-xs text-amber-900 uppercase block">
                  ⚠️ Règle Absolue de Signature : Strictement entre le RC et l'ASCQ
                </span>
                <p className="text-xs text-slate-800">
                  <strong>Le Médecin Coordonnateur n'a rien à signer sur les fiches de notification terrain.</strong>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <strong className="block text-slate-900 mb-0.5">1. Le Relais Communautaire (RC)</strong>
                    <span className="text-slate-600">Notificateur / déclarant terrain : appose sa signature tactile manuscrite horodatée lors du signalement.</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <strong className="block text-slate-900 mb-0.5">2. L'ASCQ Superviseur</strong>
                    <span className="text-slate-600">Vérifie l'alerte sur le terrain (Avérée / Non avérée) et appose son visa officiel d'arrondissement.</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 italic">
                  L'alerte remonte ensuite instantanément sans blocage administratif vers les cadres pour riposte précoce.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU SECTION 4 : CONSULTATIONS & SECRET MÉDICAL */}
        {activeTab === "consultations" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <Stethoscope className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 4 : Consultations iCCM, Décompte par Maladie & Secret Médical
                </h3>
              </div>

              {/* Secret Médical Absolu */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-1.5">
                <span className="font-black text-xs text-blue-900 uppercase flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Secret Médical & Déontologie : Zéro donnée nominative partagée</span>
                </span>
                <p className="text-xs text-slate-700">
                  Conformément aux normes déontologiques : <strong>montrer seulement les nombres de consultation par maladie, pas d'accès aux informations personnelles des patients</strong>. Le nom, prénom, nom du parent et numéro de téléphone sont systématiquement masqués dans tous les registres partagés sous la mention <code>🔒 Dossier Anonymisé — Secret Médical Garanti</code>.
                </p>
              </div>

              {/* Décompte épidémiologique */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                  Décompte Épidémiologique des 5 Pathologies Surveillées :
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-200">
                    <span className="text-red-700 font-bold block text-[10px] uppercase">Paludisme Simple</span>
                    <strong className="text-sm font-black text-red-900">TDR Positif (CTA)</strong>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-800 font-bold block text-[10px] uppercase">Diarrhée</span>
                    <strong className="text-sm font-black text-amber-900">SRO + Zinc (10j)</strong>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-blue-800 font-bold block text-[10px] uppercase">Pneumonie / IRA</span>
                    <strong className="text-sm font-black text-blue-900">Amoxicilline</strong>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-purple-800 font-bold block text-[10px] uppercase">Malnutrition</span>
                    <strong className="text-sm font-black text-purple-900">Périmètre Shakir</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-600 font-bold block text-[10px] uppercase">Autres Motifs</span>
                    <strong className="text-sm font-black text-slate-800">Conseil / CS</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU SECTION 5 : GUIDES PAR PROFIL */}
        {activeTab === "profils" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <Users className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 5 : Missions et Guide Opérationnel par Profil
                </h3>
              </div>

              <div className="space-y-3">
                
                {/* Profil Super Admin */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>1. Super Administrateur National</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Pouvoir Universel
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Combine la gouvernance des 12 départements (<Link href="/admin" className="text-[#005c30] font-bold underline">/admin</Link>), le nettoyage universel des données erronées et la gestion du personnel (<Link href="/perimetre" className="text-[#005c30] font-bold underline">/perimetre</Link>), avec une pratique clinique de terrain.
                  </p>
                </div>

                {/* Profil Cadres Départementaux */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>2. Cadres Départementaux (DDS, CSSPR, CSPSMEMH, CCD CDLS-TP)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      Périmètre Département
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Cloisonnement strict au département d'affectation. Suivi des indicateurs compilés, contrôle des délais de dépôt du RMA (avant le 5 du mois), relance en 1 clic par WhatsApp ou appel direct, consultation intégrale des fiches d'alerte et émission d'ordres de mission.
                  </p>
                </div>

                {/* Profil Représentants Communaux */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>3. Représentants Communaux (MCC, PF CCLS-TP)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Périmètre Commune
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Validation des inscriptions locales en attente, consultation du rapport communal consolidé, gestion du personnel et radiation administrative pour motif légal.
                  </p>
                </div>

                {/* Profil ASCQ */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-[#005c30]" />
                      <span>4. ASCQ (Agent de Santé Communautaire Qualifié)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-[#005c30] px-2 py-0.5 rounded-full">
                      Arrondissement
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Consultations iCCM enfants de 2 à 59 mois, suivi maternité et 1000 jours, validation des fiches hebdomadaires des RC, investigation et visa des alertes d'arrondissement, et dépôt du RMA avant le 5 du mois suivant.
                  </p>
                </div>

                {/* Profil Relais Communautaire */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>5. Relais Communautaire (RC de village)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Village / Quartier
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Interface simplifiée avec grands boutons (<Link href="/espace-rc" className="text-[#005c30] font-bold underline">/espace-rc</Link>). Signalement des alertes SIMR avec signature tactile sur smartphone, déclaration des décès au village, planning hebdomadaire et suivi des ménages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU SECTION 6 : DÉPANNAGE & FICHES RÉFLEXES */}
        {activeTab === "depannage" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#005c30]">
                <HelpCircle className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  Section 6 : Fiches Réflexes & Dépannage Technique
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Réflexe 1 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-bold text-sm">
                    Fiche Réflexe 1 : « Comment réinitialiser son mot de passe ? »
                  </strong>
                  <p className="text-slate-600">
                    Sur la page de connexion, cliquez sur <strong>Mot de passe oublié ?</strong>. Pour un Relais Communautaire, son superviseur ASCQ réinitialise son code PIN à <code>0000</code> depuis son onglet <em>Mes Relais</em>. Pour un ASCQ, le Représentant Communal réinitialise son code à <code>000000</code>. En cas d'urgence, contactez l'assistance nationale au <strong>01 69 03 14 63</strong>.
                  </p>
                </div>

                {/* Réflexe 2 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-bold text-sm">
                    Fiche Réflexe 2 : « Les changements récents ne sont pas encore visibles »
                  </strong>
                  <p className="text-slate-600">
                    L'application fonctionne en mode PWA avec Service Worker V8. Sur smartphone : faites glisser l'écran vers le bas pour forcer la mise à jour. Sur ordinateur : pressez <strong><code>Ctrl + F5</code></strong> (ou <code>Cmd + Shift + R</code>) pour purger l'ancien cache et charger les nouveaux fichiers.
                  </p>
                </div>

                {/* Réflexe 3 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-bold text-sm">
                    Fiche Réflexe 3 : « Position GPS non capturée »
                  </strong>
                  <p className="text-slate-600">
                    Vérifiez que la localisation GPS est activée sur votre téléphone. Dans Chrome, cliquez sur le cadenas à gauche de l'adresse $\rightarrow$ Autorisations $\rightarrow$ Autoriser la position. Si vous êtes à l'intérieur d'un bâtiment lourd, sortez quelques instants à l'extérieur pour accrocher le signal satellite.
                  </p>
                </div>

                {/* Réflexe 4 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-bold text-sm">
                    Fiche Réflexe 4 : « Travail en zone rurale sans connexion internet (Zone Blanche) »
                  </strong>
                  <p className="text-slate-600">
                    L'application est 100% fonctionnelle hors-ligne. Saisissez vos consultations, alertes et fiches normalement. Dès que vous retrouvez du réseau au chef-lieu, la synchronisation s'effectue automatiquement en arrière-plan sans perte de données.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
