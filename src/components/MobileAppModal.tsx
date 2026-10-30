import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  X,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  Database,
  ShieldCheck,
  FileCode,
  Package,
  Layers,
  Info,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const { canInstall, isInstalled, isIOS, isAndroid, installApp } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'apk' | 'ipa' | 'pwa'>(
    isIOS ? 'ipa' : 'apk'
  );
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNativePWAInstall = async () => {
    const success = await installApp();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopyStatus(`Lien ${label} copié dans le presse-papier !`);
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const apkDownloadUrl = '/downloads/vendy.apk';
  const ipaDownloadUrl = '/downloads/vendy.ipa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 bg-zinc-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xl shadow-sm">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Télécharger Vendy Mobile</h2>
                <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">Applications téléchargeables .APK (Android) & .IPA (iOS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 p-2 gap-1.5 sm:gap-2">
          {/* Android APK Tab */}
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'apk'
                ? 'bg-zinc-900 text-white shadow-sm font-bold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Android (.APK)</span>
            {isAndroid && (
              <span className="hidden sm:inline text-[9px] bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded font-mono">
                Détecté
              </span>
            )}
          </button>

          {/* iOS IPA Tab */}
          <button
            onClick={() => setActiveTab('ipa')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ipa'
                ? 'bg-zinc-900 text-white shadow-sm font-bold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.67-.82 1.13-1.95.99-3.1-.98.05-2.14.66-2.82 1.46-.6.69-1.12 1.83-.98 2.94 1.1.08 2.18-.54 2.81-1.3z" />
            </svg>
            <span>iPhone (.IPA)</span>
            {isIOS && (
              <span className="hidden sm:inline text-[9px] bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded font-mono">
                Détecté
              </span>
            )}
          </button>

          {/* Quick Install Web Tab */}
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2 sm:py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pwa'
                ? 'bg-zinc-900 text-white shadow-sm font-bold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Installation Directe</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Status feedback */}
          {copyStatus && (
            <div className="p-3 bg-zinc-900 text-white rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{copyStatus}</span>
            </div>
          )}

          {isInstalled && (
            <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-zinc-900 shrink-0" />
              <div className="text-xs sm:text-sm text-zinc-800">
                L'application Vendy est déjà installée sur cet appareil et synchronisée avec Firestore.
              </div>
            </div>
          )}

          {installSuccess && (
            <div className="p-3 bg-zinc-900 text-white rounded-xl flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div className="text-xs sm:text-sm font-medium">
                Installation lancée avec succès ! Retrouvez l'icône Vendy sur votre écran d'accueil.
              </div>
            </div>
          )}

          {/* TAB 1: ANDROID APK */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Main Download Card */}
              <div className="p-4 bg-zinc-50 border-2 border-zinc-900 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xl shrink-0">
                      APK
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 text-base">Fichier vendy.apk pour Android</h3>
                      <p className="text-xs text-zinc-500 font-mono">com.vendy.app • 62 Ko • Android 5.0 à 14+ (Signé v1/v2/v3)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 bg-black text-white rounded">
                    CERTIFIÉ
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                  Paquet natif compilé avec Android SDK (<code className="bg-zinc-200 px-1 py-0.5 rounded text-[11px]">aapt</code>, <code className="bg-zinc-200 px-1 py-0.5 rounded text-[11px]">dalvik-exchange</code> & <code className="bg-zinc-200 px-1 py-0.5 rounded text-[11px]">apksigner</code>), avec signature officielle et manifeste binaire garantissant une installation sans erreur d'analyse.
                </p>

                {/* Direct Download Button */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={apkDownloadUrl}
                    download="vendy.apk"
                    className="flex-1 py-3.5 px-5 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Télécharger vendy.apk (62 Ko)</span>
                  </a>
                  <button
                    onClick={() => handleCopyLink(`${window.location.origin}${apkDownloadUrl}`, 'du fichier APK')}
                    className="py-3 px-3.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    title="Copier le lien direct du fichier .apk"
                  >
                    <span>Copier lien</span>
                  </button>
                </div>
              </div>

              {/* Step by step installation guide */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-zinc-600" />
                  <span>Comment installer le fichier .APK sur votre smartphone :</span>
                </h4>
                <ol className="text-xs sm:text-sm text-zinc-700 space-y-2.5 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Touchez le bouton ci-dessus pour lancer le téléchargement de <strong>vendy.apk</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Ouvrez le fichier depuis la barre de notification ou votre gestionnaire de fichiers / dossier Téléchargements.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Si Android affiche <em>« Pour votre sécurité, votre téléphone n'est pas autorisé à installer des applications inconnues »</em>, touchez <strong>Paramètres</strong> et activez <strong>« Autoriser cette source »</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>Touchez <strong>« Installer »</strong> puis <strong>« Ouvrir »</strong>. L'application Vendy démarre immédiatement avec toutes vos données en temps réel.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: IOS IPA */}
          {activeTab === 'ipa' && (
            <div className="space-y-4">
              {/* Main Download Card */}
              <div className="p-4 bg-zinc-50 border-2 border-zinc-900 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xl shrink-0">
                      IPA
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 text-base">Fichier vendy.ipa pour iOS (iPhone & iPad)</h3>
                      <p className="text-xs text-zinc-500 font-mono">com.vendy.app • 552 Ko • iOS 14.0+</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 bg-black text-white rounded">
                    PAQUET iOS
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                  Paquet d'installation natif iOS (.IPA) avec architecture ARM64, manifeste Info.plist configuré, autorisations caméra/galerie et conteneur Firebase unifié.
                </p>

                {/* Direct Download Button */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={ipaDownloadUrl}
                    download="vendy.ipa"
                    className="flex-1 py-3.5 px-5 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Télécharger vendy.ipa (552 Ko)</span>
                  </a>
                  <button
                    onClick={() => handleCopyLink(`${window.location.origin}${ipaDownloadUrl}`, 'du fichier IPA')}
                    className="py-3 px-3.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    title="Copier le lien direct du fichier .ipa"
                  >
                    <span>Copier lien</span>
                  </button>
                </div>
              </div>

              {/* Sideloading & installation instructions */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-zinc-600" />
                  <span>Méthodes d'installation sur iPhone :</span>
                </h4>
                
                <div className="space-y-3 text-xs sm:text-sm text-zinc-700">
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                    <strong className="text-zinc-900 block font-semibold">1. Sideloading (AltStore, Sideloadly, TrollStore ou Scarlet)</strong>
                    <p className="text-zinc-600 text-xs">
                      Importez le fichier <code>vendy.ipa</code> dans votre utilitaire habituel pour signer et installer directement l'application sur votre iPhone sans passer par l'App Store.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                    <strong className="text-zinc-900 block font-semibold">2. Installation 1-clic depuis Safari (Sans ordinateur)</strong>
                    <p className="text-zinc-600 text-xs">
                      Sur iPhone, ouvrez ce site dans Safari, appuyez sur l'icône <strong>Partager</strong> (<Share className="w-3 h-3 inline mx-0.5 text-zinc-900" />) puis sur <strong>« Sur l'écran d'accueil »</strong> (<PlusSquare className="w-3 h-3 inline mx-0.5 text-zinc-900" />). L'application s'installe instantanément en plein écran avec l'icône Vendy native.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PWA / WebAPK 1-CLIC */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Installation Progressive Web App (PWA)</h3>
                    <p className="text-xs text-zinc-500">Installation automatique sans téléchargement manuel de fichier</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black text-white">
                    INSTANTANÉ
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Votre navigateur peut ajouter automatiquement Vendy sur l'écran d'accueil avec support hors-ligne, icône haute définition et démarrage plein écran sans barre d'adresse.
                </p>

                {canInstall && (
                  <div className="pt-2">
                    <button
                      onClick={handleNativePWAInstall}
                      className="w-full py-3.5 px-4 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Installer directement sur cet appareil (1 clic)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Comparison specs */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Fichiers mobiles disponibles au téléchargement :
                </h4>
                <div className="divide-y divide-zinc-100 text-xs text-zinc-600">
                  <div className="py-2 flex items-center justify-between">
                    <span className="font-medium text-zinc-900">Android APK</span>
                    <a href={apkDownloadUrl} download="vendy.apk" className="font-mono text-zinc-900 underline flex items-center gap-1">
                      vendy.apk (62 Ko) <Download className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="font-medium text-zinc-900">Apple iOS IPA</span>
                    <a href={ipaDownloadUrl} download="vendy.ipa" className="font-mono text-zinc-900 underline flex items-center gap-1">
                      vendy.ipa (552 Ko) <Download className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Highlights & Guarantees */}
          <div className="border-t border-zinc-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-black shrink-0" />
              <span>Base Firebase unifiée (vendy-2197a)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-black shrink-0" />
              <span>Authentification & Firestore réelles</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black shrink-0" />
              <span>Grossistes, Vendeurs & Clients</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
          <span className="text-xs text-zinc-500 font-mono">Vendy • Téléchargement direct APK & IPA</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
