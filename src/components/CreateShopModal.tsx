import React, { useState } from 'react';
import { X, Store, Building2, Phone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ShopType } from '../types';
import { useAuth } from '../context/AuthContext';

interface CreateShopModalProps {
  onClose: () => void;
  onSuccess?: (shopId: string) => void;
}

export const CreateShopModal: React.FC<CreateShopModalProps> = ({ onClose, onSuccess }) => {
  const { createShop, userProfile } = useAuth();

  const [nom, setNom] = useState('');
  const [type, setType] = useState<ShopType>('VENDEUR_EN_LIGNE');
  const [telephone, setTelephone] = useState(userProfile?.telephone || '+261 ');
  const [ville, setVille] = useState('Antananarivo');
  const [adresse, setAdresse] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nom.trim()) {
      setError('Veuillez renseigner le nom de la boutique.');
      return;
    }
    if (!telephone.trim()) {
      setError('Veuillez renseigner le numéro de téléphone de contact.');
      return;
    }

    setIsSubmitting(true);
    const res = await createShop({
      nom: nom.trim(),
      type,
      telephone: telephone.trim(),
      ville: ville.trim() || undefined,
      adresse: adresse.trim() || undefined,
      description: description.trim() || undefined
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Erreur lors de la création de la boutique.');
      return;
    }

    if (onSuccess && res.shopId) {
      onSuccess(res.shopId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-zinc-300 w-full max-w-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-zinc-950 uppercase tracking-tight">
                Créer une nouvelle boutique
              </h2>
              <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.5">
                Propriétaire unique
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Chaque compte peut créer et gérer une ou plusieurs boutiques
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-zinc-100 border border-black text-black text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-black mb-1.5">
              Type d'activité de la boutique :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('VENDEUR_EN_LIGNE')}
                className={`p-3 text-left border transition-all ${
                  type === 'VENDEUR_EN_LIGNE'
                    ? 'border-black bg-zinc-50 font-bold shadow-xs'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Store className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-black">Vendeur en ligne</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1 leading-snug">
                  Friperie & vêtements sur Facebook & WhatsApp. Vente au détail, réservation et confirmation de commandes.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('GROSSISTE')}
                className={`p-3 text-left border transition-all ${
                  type === 'GROSSISTE'
                    ? 'border-black bg-zinc-50 font-bold shadow-xs'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-black">Grand Grossiste</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1 leading-snug">
                  Dépôt de gros, balles de friperie 45kg et cartons. Suivi des stocks de gros et créances revendeurs.
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Nom de la boutique ou du dépôt *
            </label>
            <input
              type="text"
              required
              placeholder={type === 'GROSSISTE' ? 'Ex: Dépôt Friperie Océan Gros' : 'Ex: Friperie Chic Tana'}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Téléphone professionnel *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="tel"
                  required
                  placeholder="+261 34 00 000 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Ville / Localisation
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: Antananarivo, Toamasina..."
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Adresse physique / Point de retrait (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Box 14, Bazar Be, Toamasina"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Description / Présentation de l'activité
            </label>
            <textarea
              rows={2}
              placeholder={type === 'GROSSISTE' ? 'Ex: Grossiste direct d\'importation balles de friperie 45kg et cartons chaussures/draps.' : 'Ex: Boutique spécialisée dans le prêt-à-porter friperie vintage et moderne.'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white text-xs"
            />
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              Propriétaire : <strong>{userProfile?.nom || 'Votre compte'}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-zinc-300 hover:bg-zinc-100 uppercase text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-black hover:bg-zinc-800 text-white uppercase text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin inline-block"></span>
                    <span>Création...</span>
                  </>
                ) : (
                  <span>Créer la boutique</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
