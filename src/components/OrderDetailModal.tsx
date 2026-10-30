import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Edit,
  DollarSign,
  Share2,
  Trash2,
  FileText,
  CreditCard,
  Send
} from 'lucide-react';
import { Order, Customer, Shop, OrderStatus, PaymentStatus, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDate,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  buildWhatsAppMessage
} from '../utils/formatters';

interface OrderDetailModalProps {
  order: Order;
  customer?: Customer;
  onClose: () => void;
  onEditOrder: (order: Order) => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => Promise<{ success: boolean; error?: string }>;
  onAddPayment: (order: Order, montant: number, type: PaymentMethod, note: string) => Promise<void>;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  customer,
  onClose,
  onEditOrder,
  onUpdateStatus,
  onAddPayment
}) => {
  const { shop } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Payment Recording State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>(
    String(Math.max(0, order.total - (order.montantPaye || 0)))
  );
  const [paymentType, setPaymentType] = useState<PaymentMethod>('MVOLA');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Delivered edit warning
  const [showDeliveredWarning, setShowDeliveredWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);

  const statusMeta = getOrderStatusMeta(order.statut);
  const paymentMeta = getPaymentStatusMeta(order.statutPaiement);
  const resteAPayer = Math.max(0, order.total - (order.montantPaye || 0));

  // Available status transitions
  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'A_CONFIRMER', label: '1. À confirmer' },
    { value: 'RESERVEE', label: '2. Réservée (Stock bloqué)' },
    { value: 'A_PREPARER', label: '3. À préparer' },
    { value: 'PRETE', label: '4. Prête / À expédier' },
    { value: 'LIVREE', label: '5. Livrée (Vente terminée)' },
    { value: 'ANNULEE', label: 'Annulée (Libérer stock)' }
  ];

  const handleStatusChangeRequest = async (newStatus: OrderStatus) => {
    if (newStatus === order.statut) return;

    // RB-06: Check if modifying a delivered order
    if (order.statut === 'LIVREE' && newStatus !== 'LIVREE') {
      setPendingStatus(newStatus);
      setShowDeliveredWarning(true);
      return;
    }

    await applyStatusChange(newStatus);
  };

  const applyStatusChange = async (newStatus: OrderStatus) => {
    setStatusError(null);
    setIsUpdatingStatus(true);
    const result = await onUpdateStatus(order, newStatus);
    setIsUpdatingStatus(false);
    if (!result.success) {
      setStatusError(result.error || 'Erreur lors du changement de statut');
    }
  };

  const handleCopyWhatsApp = () => {
    if (!shop) return;
    const msg = buildWhatsAppMessage(order, customer?.nom || 'Client', shop);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!customer?.telephone || !shop) return;
    const cleanPhone = customer.telephone.replace(/\D/g, '');
    const msg = encodeURIComponent(buildWhatsAppMessage(order, customer.nom, shop));
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmittingPayment(true);
    await onAddPayment(order, amount, paymentType, paymentNote);
    setIsSubmittingPayment(false);
    setShowPaymentForm(false);
    setPaymentNote('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-zinc-300 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-sm bg-black text-white px-2 py-0.5">
                {order.numero}
              </span>
              <span className={`text-xs px-2 py-0.5 border ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Enregistrée le {formatDate(order.date || order.createdAt)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-900">
          {/* Status Change Error Notification */}
          {statusError && (
            <div className="p-3 bg-zinc-100 border border-black text-black text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
              <button onClick={() => setStatusError(null)} className="text-zinc-600 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Warning for Delivered Order Modification (RB-06) */}
          {showDeliveredWarning && (
            <div className="p-4 border-2 border-black bg-zinc-100 space-y-2">
              <div className="flex items-center space-x-2 text-black font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Avertissement Règle Métier RB-06</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Cette commande a déjà été marquée comme <strong>Livrée</strong> (marchandise remise et décomptée du stock physique). Modifier son statut réajustera l'inventaire. Confirmez-vous cette opération ?
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    if (pendingStatus) applyStatusChange(pendingStatus);
                    setShowDeliveredWarning(false);
                    setPendingStatus(null);
                  }}
                  className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800"
                >
                  Confirmer le changement
                </button>
                <button
                  onClick={() => {
                    setShowDeliveredWarning(false);
                    setPendingStatus(null);
                  }}
                  className="px-3 py-1.5 border border-zinc-400 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Quick Transition Pipeline Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Statut de la commande
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statusOptions.map((opt) => {
                const isSelected = order.statut === opt.value;
                return (
                  <button
                    key={opt.value}
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChangeRequest(opt.value)}
                    className={`py-2 px-2.5 text-xs text-left border transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white font-bold shadow-xs'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:border-black hover:bg-zinc-50'
                    }`}
                  >
                    <div className="truncate">{opt.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-500 italic">
              {statusMeta.description}
            </p>
          </div>

          {/* Customer & Delivery Information */}
          <div className="border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Fiche Client
              </span>
              {customer?.telephone && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-black text-white text-[11px] font-semibold hover:bg-zinc-800 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Ouvrir WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block">Nom du client :</span>
                <span className="font-bold text-zinc-950 text-sm">
                  {customer?.nom || 'Client inconnu'}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 block">Téléphone :</span>
                <span className="font-mono font-medium text-zinc-950">
                  {customer?.telephone || 'Non renseigné'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-zinc-500 block">Lieu / Adresse de livraison :</span>
                <span className="font-medium text-zinc-950 flex items-start space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{order.adresseLivraison || customer?.adresse || 'À convenir avec le client'}</span>
                </span>
              </div>

              {order.note && (
                <div className="sm:col-span-2 bg-white p-2.5 border border-zinc-200">
                  <span className="text-zinc-500 block font-semibold text-[10px] uppercase tracking-wider">
                    Instructions / Notes :
                  </span>
                  <p className="text-zinc-800 text-xs mt-0.5 whitespace-pre-wrap">{order.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table (Snapshots RB-03) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Articles commandés (Instantané de vente)
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {order.items.length} référence(s)
              </span>
            </div>

            <div className="border border-zinc-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="p-2.5">Article</th>
                    <th className="p-2.5 text-center">Quantité</th>
                    <th className="p-2.5 text-right">Prix Unitaire</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="p-2.5 font-medium text-zinc-950">
                        {item.nomProduitSnapshot}
                      </td>
                      <td className="p-2.5 text-center font-mono font-semibold">
                        {item.quantite}
                      </td>
                      <td className="p-2.5 text-right font-mono text-zinc-600">
                        {formatCurrency(item.prixSnapshot, shop?.devise)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-zinc-950">
                        {formatCurrency(item.totalLigne, shop?.devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] tracking-wider text-zinc-700">
                      Total de la commande (calculé)
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm text-black">
                      {formatCurrency(order.total, shop?.devise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Section (F-07) */}
          <div className="border border-zinc-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  Règlement & Acomptes
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 border ${paymentMeta.badgeClass}`}>
                {paymentMeta.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 border border-zinc-200 font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Montant Reçu</span>
                <span className="font-bold text-sm text-zinc-950">
                  {formatCurrency(order.montantPaye || 0, shop?.devise)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Reste à percevoir</span>
                <span className={`font-bold text-sm ${resteAPayer > 0 ? 'text-black' : 'text-zinc-500'}`}>
                  {formatCurrency(resteAPayer, shop?.devise)}
                </span>
              </div>
            </div>

            {/* List recorded payments */}
            {order.payments && order.payments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-zinc-500">
                  Historique des versements :
                </span>
                <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
                  {order.payments.map((p, idx) => (
                    <div key={idx} className="p-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-black font-mono">
                          {formatCurrency(p.montant, shop?.devise)}
                        </span>
                        <span className="text-zinc-500 text-[10px] ml-2">
                          via {p.type} {p.note && `• ${p.note}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {formatDate(p.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add payment form trigger */}
            {!showPaymentForm ? (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full py-2 bg-white border border-zinc-300 hover:border-black text-xs font-semibold uppercase tracking-wider text-black transition-colors"
              >
                + Enregistrer un acompte ou règlement
              </button>
            ) : (
              <form onSubmit={handleRecordPayment} className="p-3 bg-zinc-100 border border-zinc-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black uppercase">
                    Nouveau versement
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="text-zinc-500 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-600 mb-1">
                      Montant reçu ({shop?.devise || 'Ar'})
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-zinc-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-600 mb-1">
                      Moyen de paiement
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-zinc-300 bg-white text-xs font-semibold"
                    >
                      <option value="MVOLA">MVola</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="AIRTEL_MONEY">Airtel Money</option>
                      <option value="ESPECES">Espèces à la livraison</option>
                      <option value="VIREMENT">Virement bancaire</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-zinc-600 mb-1">
                      Note facultative (référence SMS, note)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Réf MVola 49281, acompte 50%"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-zinc-300 bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800"
                  >
                    Valider le versement
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-3 py-1.5 border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-zinc-300 hover:border-black text-xs font-semibold text-black transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier texte WhatsApp'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {order.statut !== 'LIVREE' && order.statut !== 'ANNULEE' && (
              <button
                onClick={() => {
                  onClose();
                  onEditOrder(order);
                }}
                className="flex items-center space-x-1 px-3 py-2 border border-zinc-300 hover:border-black bg-white text-xs font-semibold text-black transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
