import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  UserPlus,
  Search,
  AlertCircle,
  Package,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  Order,
  Customer,
  Product,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  PaymentMethod
} from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface OrderFormModalProps {
  orderToEdit?: Order | null;
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onSaveOrder: (order: Order, previousStatus?: OrderStatus) => Promise<{ success: boolean; error?: string }>;
  onCreateCustomer: (customer: Customer) => Promise<void>;
  getNextOrderNumber: () => string;
  getAvailableStock: (productId: string, excludeOrderId?: string) => number;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  orderToEdit,
  customers,
  products,
  onClose,
  onSaveOrder,
  onCreateCustomer,
  getNextOrderNumber,
  getAvailableStock
}) => {
  const { shop, userProfile } = useAuth();

  // Selected or New customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    orderToEdit?.customerId || ''
  );
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // Order Details
  const [orderNumber, setOrderNumber] = useState<string>(
    orderToEdit?.numero || getNextOrderNumber()
  );
  const [statut, setStatut] = useState<OrderStatus>(
    orderToEdit?.statut || 'RESERVEE' // Default to Réservée for social commerce flow
  );
  const [statutPaiement, setStatutPaiement] = useState<PaymentStatus>(
    orderToEdit?.statutPaiement || 'NON_PAYE'
  );
  const [montantPaye, setMontantPaye] = useState<number>(orderToEdit?.montantPaye || 0);
  const [orderDate, setOrderDate] = useState<string>(
    orderToEdit?.date ? orderToEdit.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [adresseLivraison, setAdresseLivraison] = useState<string>(
    orderToEdit?.adresseLivraison || ''
  );
  const [note, setNote] = useState<string>(orderToEdit?.note || '');

  // Line items
  const [items, setItems] = useState<OrderItem[]>(
    orderToEdit?.items || []
  );

  // Active product picker state
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update address when customer changes if address field is empty
  useEffect(() => {
    if (selectedCustomerId && !adresseLivraison) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c?.adresse) {
        setAdresseLivraison(c.adresse);
      }
    }
  }, [selectedCustomerId]);

  // Compute calculated line totals and order total (RB-07)
  const currentTotal = items.reduce((sum, item) => sum + item.quantite * item.prixSnapshot, 0);

  // Add Item
  const handleAddItem = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    if (quantityToAdd <= 0) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }

    // Check available stock
    const available = getAvailableStock(prod.id, orderToEdit?.id);
    const existingInCart = items.find((it) => it.productId === prod.id)?.quantite || 0;
    const needed = existingInCart + quantityToAdd;

    if (available < needed) {
      setError(
        `Stock insuffisant pour "${prod.nom}". Disponible : ${available}, déjà sélectionné : ${existingInCart}.`
      );
      return;
    }

    setError(null);

    // If item already in cart, increment quantity
    const existingIndex = items.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantite + quantityToAdd;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantite: newQty,
        totalLigne: newQty * updated[existingIndex].prixSnapshot
      };
      setItems(updated);
    } else {
      // Snapshot product name and price (RB-03)
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        nomProduitSnapshot: prod.nom,
        prixSnapshot: prod.prix,
        quantite: quantityToAdd,
        totalLigne: quantityToAdd * prod.prix
      };
      setItems([...items, newItem]);
    }

    // Reset picker
    setSelectedProductToAdd('');
    setQuantityToAdd(1);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const item = items[index];
    const available = getAvailableStock(item.productId, orderToEdit?.id);

    if (available < newQty) {
      setError(`Stock disponible insuffisant : seulement ${available} unité(s) disponible(s).`);
      return;
    }
    setError(null);

    const updated = [...items];
    updated[index] = {
      ...item,
      quantite: newQty,
      totalLigne: newQty * item.prixSnapshot
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let customerIdToUse = selectedCustomerId;

    // Create customer on the fly if needed
    if (isCreatingCustomer) {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
        setError('Le nom et le numéro de téléphone du client sont obligatoires.');
        return;
      }

      const newCust: Customer = {
        id: `cust_${Date.now()}`,
        shopId: shop?.id || '',
        nom: newCustomerName.trim(),
        telephone: newCustomerPhone.trim(),
        adresse: newCustomerAddress.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await onCreateCustomer(newCust);
      customerIdToUse = newCust.id;
    }

    if (!customerIdToUse) {
      setError('Veuillez sélectionner ou créer un client.');
      return;
    }

    if (items.length === 0) {
      setError('Veuillez ajouter au moins un produit à la commande.');
      return;
    }

    setIsSubmitting(true);

    const orderData: Order = {
      id: orderToEdit ? orderToEdit.id : `cmd_${Date.now()}`,
      shopId: shop?.id || '',
      customerId: customerIdToUse,
      numero: orderNumber,
      statut,
      statutPaiement,
      total: currentTotal,
      montantPaye: Number(montantPaye) || 0,
      date: new Date(orderDate).toISOString(),
      note: note.trim() || undefined,
      adresseLivraison: adresseLivraison.trim() || undefined,
      items,
      payments: orderToEdit?.payments || [],
      createdAt: orderToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If marked as paid, ensure montantPaye matches
    if (statutPaiement === 'PAYE' && (!orderData.montantPaye || orderData.montantPaye < currentTotal)) {
      orderData.montantPaye = currentTotal;
    }

    const res = await onSaveOrder(orderData, orderToEdit?.statut);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Erreur lors de l\'enregistrement de la commande.');
    }
  };

  // Filter available products (not archived)
  const activeProducts = products.filter((p) => !p.archived);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-zinc-300 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <h2 className="text-base font-bold text-zinc-950 uppercase tracking-tight">
              {orderToEdit ? `Modifier Commande ${orderToEdit.numero}` : 'Nouvelle Commande / Réservation'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enregistrement des ventes Facebook & WhatsApp avec décompte automatique du stock
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-900 text-xs">
          {error && (
            <div className="p-3 bg-zinc-100 border border-black text-black text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Metadata: Numéro, Date, Statut Initial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Numéro de commande
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 bg-zinc-50 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Statut initial
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 border border-zinc-300 bg-white font-semibold"
              >
                <option value="RESERVEE">Réservée (Bloquer le stock)</option>
                <option value="A_CONFIRMER">À confirmer (En attente)</option>
                <option value="A_PREPARER">À préparer</option>
                <option value="PRETE">Prête / À expédier</option>
                <option value="LIVREE">Livrée (Vente terminée)</option>
              </select>
            </div>
          </div>

          {/* Section 1: Customer Selection or Rapid Creation (F-04) */}
          <div className="border border-zinc-200 p-4 bg-zinc-50 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="font-bold uppercase tracking-wider text-black text-[11px]">
                1. Informations Client
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-black font-semibold hover:underline flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingCustomer ? 'Choisir un client existant' : '+ Nouveau client'}</span>
              </button>
            </div>

            {!isCreatingCustomer ? (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Rechercher ou sélectionner un client existant
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-medium"
                >
                  <option value="">-- Sélectionner un client enregistré --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.telephone})
                    </option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Aucun client enregistré. Cliquez sur "+ Nouveau client" ci-dessus.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                    Nom / Pseudo Facebook ou WhatsApp *
                  </label>
                  <input
                    type="text"
                    required={isCreatingCustomer}
                    placeholder="Ex: Riana Randria"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                    Numéro de Téléphone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required={isCreatingCustomer}
                    placeholder="Ex: +261 34 12 345 67"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                    Adresse / Quartier de livraison habituel (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ivandry, près Jumbo Score"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                Lieu précis de livraison pour cette commande
              </label>
              <input
                type="text"
                placeholder="Ex: Livrer au bureau Ankorondrano entre 12h et 14h"
                value={adresseLivraison}
                onChange={(e) => setAdresseLivraison(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs"
              />
            </div>
          </div>

          {/* Section 2: Products & Live Stock (F-03, F-05, RB-04, RB-08) */}
          <div className="border border-zinc-200 p-4 space-y-3">
            <span className="font-bold uppercase tracking-wider text-black text-[11px] block border-b border-zinc-200 pb-2">
              2. Sélection des Articles & Vérification du Stock
            </span>

            {/* Product Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-zinc-50 p-2.5 border border-zinc-200">
              <div className="sm:col-span-7">
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Article disponible
                </label>
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="w-full px-2.5 py-2 border border-zinc-300 bg-white text-xs"
                >
                  <option value="">-- Choisir un produit du stock --</option>
                  {activeProducts.map((p) => {
                    const avail = getAvailableStock(p.id, orderToEdit?.id);
                    return (
                      <option key={p.id} value={p.id} disabled={avail <= 0}>
                        {p.nom} — {formatCurrency(p.prix, shop?.devise)} ({avail > 0 ? `${avail} dispo` : 'RUPTURE'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Quantité
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-2 border border-zinc-300 bg-white text-xs font-mono font-bold text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProductToAdd}
                  className="w-full py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Added Items Table */}
            {items.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-300 text-zinc-400">
                Aucun article ajouté pour l'instant. Choisissez un produit ci-dessus.
              </div>
            ) : (
              <div className="border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5 text-center w-24">Quantité</th>
                      <th className="p-2.5 text-right">Prix Unitaire</th>
                      <th className="p-2.5 text-right">Total Ligne</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{it.nomProduitSnapshot}</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.quantite}
                            onChange={(e) =>
                              handleUpdateItemQuantity(idx, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-1.5 py-1 border border-zinc-300 font-mono text-center font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono text-zinc-600">
                          {formatCurrency(it.prixSnapshot, shop?.devise)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {formatCurrency(it.quantite * it.prixSnapshot, shop?.devise)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-zinc-400 hover:text-black transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-50 border-t-2 border-zinc-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right uppercase text-[10px] tracking-wider text-zinc-600">
                        Total Calculé de la Commande (RB-07)
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm font-black text-black">
                        {formatCurrency(currentTotal, shop?.devise)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Payment & Notes (F-07) */}
          <div className="border border-zinc-200 p-4 space-y-3">
            <span className="font-bold uppercase tracking-wider text-black text-[11px] block border-b border-zinc-200 pb-2">
              3. Paiement & Remarques
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Statut de paiement
                </label>
                <select
                  value={statutPaiement}
                  onChange={(e) => {
                    const val = e.target.value as PaymentStatus;
                    setStatutPaiement(val);
                    if (val === 'PAYE') {
                      setMontantPaye(currentTotal);
                    } else if (val === 'NON_PAYE') {
                      setMontantPaye(0);
                    }
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white font-semibold"
                >
                  <option value="NON_PAYE">Non payé (Paiement à la livraison)</option>
                  <option value="ACOMPTE_RECU">Acompte reçu (MVola / Orange Money / Espèces)</option>
                  <option value="PAYE">Payé en intégralité</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Montant déjà reçu ({shop?.devise || 'Ar'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={montantPaye}
                  onChange={(e) => setMontantPaye(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-zinc-600 mb-1 uppercase">
                  Remarques / Notes (Canal de discussion, taille spécifique, etc.)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Venue par message privé Instagram / confirmation WhatsApp à 16h"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-200">
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
              {isSubmitting ? 'Enregistrement...' : orderToEdit ? 'Mettre à jour' : 'Enregistrer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
