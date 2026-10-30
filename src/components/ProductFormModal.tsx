import React, { useState } from 'react';
import { X, Image as ImageIcon, AlertCircle, Building2, Store } from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_CATEGORIES, GROSSISTE_UNITS } from '../services/store';
import { useAuth } from '../context/AuthContext';

interface ProductFormModalProps {
  productToEdit?: Product | null;
  onClose: () => void;
  onSave: (product: Product) => Promise<{ success: boolean; error?: string } | void>;
}

const PRESET_IMAGES = [
  { label: 'Balle Friperie', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Robe Vintage', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80' },
  { label: 'Chemise Lin', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Jean Denim', url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80' },
  { label: 'Veste Blazer', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80' },
  { label: 'Accessoire Sac', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80' }
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  productToEdit,
  onClose,
  onSave
}) => {
  const { shop, store, currentUser } = useAuth();
  const isGrossiste = shop?.type === 'GROSSISTE';

  const [nom, setNom] = useState(productToEdit?.nom || '');
  const [prix, setPrix] = useState(productToEdit ? String(productToEdit.prix) : '');
  const [prixGros, setPrixGros] = useState(productToEdit?.prixGros ? String(productToEdit.prixGros) : '');
  const [unite, setUnite] = useState(productToEdit?.unite || (isGrossiste ? 'Balle Friperie (45kg)' : 'Pièce'));
  const [stock, setStock] = useState(productToEdit ? String(productToEdit.stock) : isGrossiste ? '5' : '1');
  const [categorie, setCategorie] = useState(productToEdit?.categorie || (isGrossiste ? 'Friperie Balle & Gros' : DEFAULT_CATEGORIES[0]));
  const [imageUrl, setImageUrl] = useState(productToEdit?.imageUrl || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numPrix = parseFloat(prix);
    const numStock = parseInt(stock, 10);
    const numPrixGros = prixGros ? parseFloat(prixGros) : undefined;

    if (!nom.trim()) {
      setError('Le nom du produit est obligatoire.');
      return;
    }
    if (isNaN(numPrix) || numPrix < 0) {
      setError('Le prix de vente doit être supérieur ou égal à 0.');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setError('La quantité en stock doit être positive.');
      return;
    }

    const targetShopId = shop?.id || store?.shopId || (currentUser ? `shop_${currentUser.uid}` : '');
    if (!targetShopId) {
      setError('Identifiant de la boutique introuvable. Veuillez vous reconnecter.');
      return;
    }

    setIsSubmitting(true);
    const newProduct: Product = {
      id: productToEdit ? productToEdit.id : `prod_${Date.now()}`,
      shopId: targetShopId,
      nom: nom.trim(),
      prix: numPrix,
      prixGros: numPrixGros,
      unite: unite.trim() || (isGrossiste ? 'Balle Friperie (45kg)' : 'Pièce'),
      stock: numStock,
      categorie,
      imageUrl: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      archived: productToEdit ? productToEdit.archived : false,
      createdAt: productToEdit ? productToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await onSave(newProduct);
      if (res && typeof res === 'object' && res.success === false) {
        setError(res.error || 'Erreur lors de l\'enregistrement dans Firestore');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch (saveErr: any) {
      console.error('Save product error in modal:', saveErr);
      setError(saveErr.message || 'Erreur lors de l\'enregistrement dans Firestore');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-zinc-300 w-full max-w-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-zinc-950 uppercase tracking-tight">
                {productToEdit ? 'Modifier le Produit' : isGrossiste ? 'Ajouter un Lot / Balle Gros' : 'Ajouter un Produit'}
              </h2>
              <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2">
                {isGrossiste ? 'Grossiste' : 'Détail'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isGrossiste
                ? 'Gestion de stock par balles, cartons et lots pour revendeurs'
                : 'Gestion de catalogue friperie & vêtements (F-03)'}
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

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Nom de l'article / Référence de lot *
            </label>
            <input
              type="text"
              required
              placeholder={isGrossiste ? "Ex: Balle Friperie Robes Vintage USA (45kg)" : "Ex: Robe Vintage Trapèze Fleurie"}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 bg-white font-medium text-xs focus:outline-none focus:border-black"
            />
          </div>

          {/* Unit selection for Grossiste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Conditionnement / Unité *
              </label>
              {isGrossiste ? (
                <select
                  value={unite}
                  onChange={(e) => setUnite(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-semibold focus:outline-none focus:border-black"
                >
                  {GROSSISTE_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={unite}
                  onChange={(e) => setUnite(e.target.value)}
                  placeholder="Pièce"
                  className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Stock disponible ({unite || 'unités'}) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder={isGrossiste ? "Ex: 10 balles" : "Ex: 1"}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono font-bold text-xs focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Prix unitaire ({shop?.devise || 'Ar'}) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="500"
                placeholder={isGrossiste ? "Ex: 650000" : "Ex: 35000"}
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono font-bold text-xs focus:outline-none focus:border-black"
              />
            </div>

            {isGrossiste && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Prix de gros préférentiel revendeur ({shop?.devise || 'Ar'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="Ex: 600000"
                  value={prixGros}
                  onChange={(e) => setPrixGros(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono font-bold text-xs focus:outline-none focus:border-black"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Catégorie
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-semibold focus:outline-none focus:border-black"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Photo du produit / de la balle (Lien URL facultatif)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs focus:outline-none focus:border-black"
            />

            <div className="mt-2">
              <span className="text-[10px] uppercase text-zinc-500 font-mono block mb-1">
                Ou choisir une image modèle :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="px-2 py-0.5 border border-zinc-200 hover:border-black bg-zinc-50 text-[10px] font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {imageUrl && (
              <div className="mt-2 p-2 border border-zinc-200 bg-zinc-50 flex items-center space-x-3">
                <img
                  src={imageUrl}
                  alt="Aperçu"
                  className="w-12 h-12 object-cover border border-zinc-300"
                  onError={() => setImageUrl('')}
                />
                <span className="text-[11px] text-zinc-600">Aperçu de la photo</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Description / Informations pour revendeurs
            </label>
            <textarea
              rows={2}
              placeholder={isGrossiste ? "Ex: Environ 130 pièces par balle, arrivage direct port Toamasina, tri 1er choix." : "Ex: Taille M, état impeccable, import France"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs focus:outline-none focus:border-black"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : productToEdit ? 'Mettre à jour' : 'Ajouter au stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
