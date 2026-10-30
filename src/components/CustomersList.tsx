import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  X,
  FileDown,
  Calendar,
  Send
} from 'lucide-react';
import { Customer, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, exportToCSV, getOrderStatusMeta } from '../utils/formatters';

interface CustomersListProps {
  customers: Customer[];
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onNewOrderForCustomer: (customer: Customer) => void;
}

export const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  orders,
  onSelectOrder,
  onSaveCustomer,
  onNewOrderForCustomer
}) => {
  const { shop } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal create/edit customer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map orders per customer
  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((o) => {
      const list = map.get(o.customerId) || [];
      list.push(o);
      map.set(o.customerId, list);
    });
    return map;
  }, [orders]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.telephone.toLowerCase().includes(q) ||
        c.adresse?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setNom('');
    setTelephone('+261 ');
    setAdresse('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setNom(c.nom);
    setTelephone(c.telephone);
    setAdresse(c.adresse || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim()) return;

    setIsSubmitting(true);
    const newCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      shopId: shop?.id || '',
      nom: nom.trim(),
      telephone: telephone.trim(),
      adresse: adresse.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    await onSaveCustomer(newCust);
    if (selectedCustomer?.id === newCust.id) {
      setSelectedCustomer(newCust);
    }
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const rows = filteredCustomers.map((c) => {
      const clientOrders = ordersByCustomer.get(c.id) || [];
      const totalSpent = clientOrders
        .filter((o) => o.statut === 'LIVREE')
        .reduce((sum, o) => sum + o.total, 0);

      return {
        Nom: c.nom,
        Telephone: c.telephone,
        Adresse: c.adresse || '',
        NombreCommandes: clientOrders.length,
        TotalDepense: totalSpent,
        Notes: c.notes || '',
        DateCreation: c.createdAt
      };
    });
    exportToCSV(`clients_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const openWhatsApp = (phone: string, customerName: string) => {
    const clean = phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Bonjour ${customerName}, merci pour votre confiance chez ${shop?.nom || 'notre boutique'} !`);
    window.open(`https://wa.me/${clean}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Fichier Clients
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Historique des acheteurs Facebook & WhatsApp ({customers.length} contacts)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-zinc-300 hover:border-black text-xs font-semibold uppercase tracking-wider text-black transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau client</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-zinc-200 p-3.5">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, quartier..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
          />
        </div>
      </div>

      {/* Customers List / Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Users className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
            Aucun client trouvé
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Enregistrez vos clients pour retrouver facilement leur historique et leurs adresses de livraison.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider"
          >
            Ajouter un client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const clientOrders = ordersByCustomer.get(c.id) || [];
            const deliveredOrders = clientOrders.filter((o) => o.statut === 'LIVREE');
            const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
            const pendingOrders = clientOrders.filter(
              (o) => o.statut !== 'LIVREE' && o.statut !== 'ANNULEE'
            );

            return (
              <div
                key={c.id}
                className="border border-zinc-200 bg-white p-4 hover:border-black transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-zinc-950">{c.nom}</h3>
                      <div className="flex items-center space-x-1.5 text-xs text-zinc-600 font-mono mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{c.telephone}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openWhatsApp(c.telephone, c.nom)}
                      title="Contacter sur WhatsApp"
                      className="p-1.5 bg-black text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {c.adresse && (
                    <div className="flex items-start space-x-1.5 text-xs text-zinc-600">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.adresse}</span>
                    </div>
                  )}

                  {/* Orders stats pill */}
                  <div className="border border-zinc-200 bg-zinc-50 p-2.5 grid grid-cols-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-zinc-500 block">Commandes</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {clientOrders.length}
                        {pendingOrders.length > 0 && (
                          <span className="text-[10px] text-black font-semibold ml-1">
                            ({pendingOrders.length} en cours)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="border-l border-zinc-200">
                      <span className="text-[10px] uppercase text-zinc-500 block">Total Achat</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {formatCurrency(totalSpent, shop?.devise)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between mt-3">
                  <button
                    onClick={() => setSelectedCustomer(c)}
                    className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center space-x-1"
                  >
                    <span>Historique ({clientOrders.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openEditModal(c)}
                    className="text-xs font-semibold text-zinc-500 hover:text-black uppercase tracking-wider"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Detail & History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-zinc-300 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="font-bold text-base text-zinc-950 uppercase tracking-tight">
                  {selectedCustomer.nom}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  {selectedCustomer.telephone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-zinc-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Coordonnées
                </span>
                <p className="text-xs text-zinc-800">
                  <strong>Adresse habituelle :</strong> {selectedCustomer.adresse || 'Non renseignée'}
                </p>
                {selectedCustomer.notes && (
                  <p className="text-xs text-zinc-600 italic">
                    <strong>Notes :</strong> {selectedCustomer.notes}
                  </p>
                )}
              </div>

              {/* Order history */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                    Historique des commandes
                  </span>
                  <button
                    onClick={() => {
                      const c = selectedCustomer;
                      setSelectedCustomer(null);
                      onNewOrderForCustomer(c);
                    }}
                    className="text-xs font-bold text-black uppercase tracking-wider hover:underline"
                  >
                    + Nouvelle commande pour ce client
                  </button>
                </div>

                {(() => {
                  const clientOrders = ordersByCustomer.get(selectedCustomer.id) || [];
                  if (clientOrders.length === 0) {
                    return (
                      <p className="text-xs text-zinc-500 italic p-4 text-center border border-dashed border-zinc-200">
                        Aucune commande enregistrée pour ce client.
                      </p>
                    );
                  }
                  return (
                    <div className="border border-zinc-200 divide-y divide-zinc-200">
                      {clientOrders.map((o) => {
                        const statusMeta = getOrderStatusMeta(o.statut);
                        return (
                          <div
                            key={o.id}
                            onClick={() => {
                              setSelectedCustomer(null);
                              onSelectOrder(o);
                            }}
                            className="p-3 hover:bg-zinc-50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-black">{o.numero}</span>
                                <span className="text-zinc-400 font-mono text-[10px]">
                                  {formatDate(o.date || o.createdAt)}
                                </span>
                              </div>
                              <div className="text-zinc-600 text-[11px] mt-0.5">
                                {o.items.map((i) => `${i.nomProduitSnapshot} (x${i.quantite})`).join(', ')}
                              </div>
                            </div>

                            <div className="text-right flex items-center space-x-2">
                              <div>
                                <span className="font-mono font-bold text-xs block text-black">
                                  {formatCurrency(o.total, shop?.devise)}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.2 border ${statusMeta.badgeClass}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <button
                onClick={() => openWhatsApp(selectedCustomer.telephone, selectedCustomer.nom)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold uppercase tracking-wider"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Message WhatsApp</span>
              </button>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 border border-zinc-300 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-zinc-300 w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-sm uppercase text-black">
                {editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">
                  Nom ou Identifiant social (Facebook / WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fara Andriamihaja"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">
                  Numéro de téléphone (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+261 34 00 000 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">
                  Adresse habituelle / Point de repère
                </label>
                <input
                  type="text"
                  placeholder="Ex: Andoharanofotsy, arrêt bus"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">
                  Notes privées sur le client
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Préfère les robes taille S, commande souvent en début de mois"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-300 text-xs font-semibold uppercase hover:bg-zinc-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
