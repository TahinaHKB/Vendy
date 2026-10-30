import React, { useState } from 'react';
import {
  Store,
  Building2,
  Phone,
  Save,
  Download,
  ShieldCheck,
  FileText,
  AlertCircle,
  Check,
  LogOut,
  Database,
  Globe,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product, Customer, Order, ShopType } from '../types';
import { exportToCSV } from '../utils/formatters';
import { GROSSISTE_UNITS } from '../services/store';

interface ShopSettingsProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onOpenMobileAppModal?: () => void;
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({
  products,
  customers,
  orders,
  onOpenMobileAppModal
}) => {
  const { shop, userProfile, updateShopInfo, logout } = useAuth();

  const [nom, setNom] = useState(shop?.nom || '');
  const [type, setType] = useState<ShopType>(shop?.type || 'VENDEUR_EN_LIGNE');
  const [telephone, setTelephone] = useState(shop?.telephone || '');
  const [devise, setDevise] = useState(shop?.devise || 'Ar');
  const [description, setDescription] = useState(shop?.description || '');
  const [adresse, setAdresse] = useState(shop?.adresse || '');
  const [conditionnementDefaut, setConditionnementDefaut] = useState(
    shop?.conditionnementDefaut || 'Balle Friperie (45kg)'
  );
  const [creditAutorise, setCreditAutorise] = useState(shop?.creditAutorise ?? true);
  const [isPublic, setIsPublic] = useState(shop?.isPublic ?? true);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateShopInfo({
      nom: nom.trim(),
      type,
      telephone: telephone.trim(),
      devise: devise.trim() || 'Ar',
      description: description.trim() || undefined,
      adresse: adresse.trim() || undefined,
      conditionnementDefaut: type === 'GROSSISTE' ? conditionnementDefaut : undefined,
      creditAutorise: type === 'GROSSISTE' ? creditAutorise : false,
      isPublic
    });
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportFullJSON = () => {
    const backupData = {
      app: 'Vendy Social Commerce & Grossiste',
      exportedAt: new Date().toISOString(),
      shop,
      products,
      customers,
      orders
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendy_sauvegarde_${shop?.nom?.replace(/\s+/g, '_') || 'boutique'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Paramètres de la Boutique
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Configuration du type d'activité (Vente en ligne ou Grand Grossiste), gestion des crédits et visibilité publique
        </p>
      </div>

      {/* Account Info Pill */}
      <div className="border border-zinc-200 bg-zinc-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
            Compte Connecté
          </span>
          <div className="font-semibold text-sm text-black">
            {userProfile?.nom || 'Utilisateur'} ({userProfile?.email || 'Compte personnel'})
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            Propriétaire : <span className="font-bold text-black">{userProfile?.nom}</span> • Boutique ID : <span className="font-bold text-black">{shop?.id}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto px-3 py-1.5 border border-zinc-300 hover:border-black bg-white text-xs font-semibold uppercase tracking-wider text-black flex items-center space-x-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* Profile Form */}
      <div className="border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3">
          {type === 'GROSSISTE' ? (
            <Building2 className="w-4 h-4 text-black" />
          ) : (
            <Store className="w-4 h-4 text-black" />
          )}
          <h2 className="text-xs font-bold uppercase tracking-wider text-black">
            Profil & Paramètres d'Activité
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {isSaved && (
            <div className="p-3 bg-zinc-100 border border-black text-black font-semibold flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Modifications de la boutique enregistrées avec succès.</span>
            </div>
          )}

          {/* Shop Type Selection */}
          <div className="bg-zinc-50 p-3 border border-zinc-200 space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-black">
              Type d'établissement commercial
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('VENDEUR_EN_LIGNE')}
                className={`p-2.5 text-left border text-xs transition-all ${
                  type === 'VENDEUR_EN_LIGNE'
                    ? 'border-black bg-white font-bold shadow-xs'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Store className="w-3.5 h-3.5 text-black" />
                  <span>Vente en ligne (Facebook / WhatsApp)</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                  Vente au détail, pièces uniques, friperie sélection
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('GROSSISTE')}
                className={`p-2.5 text-left border text-xs transition-all ${
                  type === 'GROSSISTE'
                    ? 'border-black bg-white font-bold shadow-xs'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-black" />
                  <span>Grand Grossiste (B2B & Dépôt Textile)</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                  Balles scellées, cartons, suivi des créances et encaissements
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Nom commercial de la boutique / dépôt *
              </label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Grand Dépôt Friperie & Textile Madagascar"
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-medium focus:outline-none focus:border-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Téléphone principal (WhatsApp / Appels) *
              </label>
              <input
                type="text"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+261 34 00 000 00"
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono focus:outline-none focus:border-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Symbole Monétaire
              </label>
              <input
                type="text"
                required
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                placeholder="Ar"
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono font-bold focus:outline-none focus:border-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Adresse physique du dépôt / magasin
              </label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Ex: Ankorondrano, Antananarivo"
                className="w-full px-3 py-2 border border-zinc-300 bg-white focus:outline-none focus:border-black text-xs"
              />
            </div>

            {/* Wholesale options */}
            {type === 'GROSSISTE' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Conditionnement par défaut
                  </label>
                  <select
                    value={conditionnementDefaut}
                    onChange={(e) => setConditionnementDefaut(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-semibold"
                  >
                    {GROSSISTE_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="creditAutorise"
                    checked={creditAutorise}
                    onChange={(e) => setCreditAutorise(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  <label htmlFor="creditAutorise" className="text-xs font-semibold text-black cursor-pointer">
                    Autoriser les ventes à crédit aux revendeurs réguliers (suivi des créances)
                  </label>
                </div>
              </>
            )}

            {/* Public visibility */}
            <div className="sm:col-span-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-black uppercase tracking-wider">
                  Visibilité sur le Catalogue Public Vendy
                </div>
                <div className="text-[11px] text-zinc-500">
                  Permet aux clients et revendeurs de commander vos articles directement sur la marketplace publique.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Description de la boutique / Bio commerciale
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentez vos spécialités, vos arrivages et conditions de commande..."
                className="w-full px-3 py-2 border border-zinc-300 bg-white focus:outline-none focus:border-black text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Application Section */}
      <div className="border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3">
          <Smartphone className="w-4 h-4 text-black" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-black">
            Applications Mobiles Officielles (.APK & .IPA)
          </h2>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Gérez votre boutique, mettez à jour vos stocks et traitez vos commandes depuis votre smartphone Android ou iPhone. Les paquets d'installation sont directement téléchargeables :
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <a
            href="/downloads/vendy.apk"
            download="vendy.apk"
            className="flex items-center space-x-2 px-4 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Télécharger vendy.apk (Android)</span>
          </a>

          <a
            href="/downloads/vendy.ipa"
            download="vendy.ipa"
            className="flex items-center space-x-2 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Télécharger vendy.ipa (iOS)</span>
          </a>

          {onOpenMobileAppModal && (
            <button
              onClick={onOpenMobileAppModal}
              className="flex items-center space-x-2 px-4 py-2.5 border border-zinc-300 hover:border-black text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span>Guide d'installation</span>
            </button>
          )}
        </div>
      </div>

      {/* Backup and Data Export Section */}
      <div className="border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3">
          <Database className="w-4 h-4 text-black" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-black">
            Sauvegarde & Exportation des Données
          </h2>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Conformément aux exigences du cahier des charges, toutes vos données (catalogue produits, fichier clients et commandes enregistrées) sont sauvegardées et peuvent être exportées à tout moment pour archivage externe.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportFullJSON}
            className="p-3 border border-zinc-300 hover:border-black bg-zinc-50 flex items-center justify-between text-left transition-colors"
          >
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-black">
                Sauvegarde Complète (JSON)
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Archive exhaustive incluant produits, clients et historique.
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-700 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => {
              const rows = orders.map((o) => ({
                Numero: o.numero,
                Date: o.date,
                Total: o.total,
                Statut: o.statut,
                Paiement: o.statutPaiement,
                MontantPaye: o.montantPaye
              }));
              exportToCSV(`commandes_${shop?.nom || 'boutique'}`, rows);
            }}
            className="p-3 border border-zinc-300 hover:border-black bg-zinc-50 flex items-center justify-between text-left transition-colors"
          >
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-black">
                Exporter Commandes (CSV)
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Tableur Excel compatible pour comptabilité.
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-700 shrink-0 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};
