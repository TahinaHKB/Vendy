import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ShoppingBag,
  Clock,
  Phone,
  Calendar,
  ChevronRight,
  X,
  FileDown
} from 'lucide-react';
import { Order, Customer, Product, OrderStatus, PaymentStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  exportToCSV
} from '../utils/formatters';

interface OrdersListProps {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  onSelectOrder: (order: Order) => void;
  onNewOrder: () => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  customers,
  products,
  onSelectOrder,
  onNewOrder
}) => {
  const { shop } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'TOUS'>('TOUS');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'TOUS'>('TOUS');
  const [selectedProductId, setSelectedProductId] = useState<string>('TOUS');
  const [periodFilter, setPeriodFilter] = useState<'TOUT' | 'AUJOURDHUI' | '7_JOURS' | '30_JOURS'>('TOUT');

  // Customer map for rapid lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtering
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = Date.now();

    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== 'TOUS' && order.statut !== statusFilter) return false;

      // 2. Payment Filter
      if (paymentFilter !== 'TOUS' && order.statutPaiement !== paymentFilter) return false;

      // 3. Product Filter
      if (selectedProductId !== 'TOUS') {
        const hasProd = order.items.some((it) => it.productId === selectedProductId);
        if (!hasProd) return false;
      }

      // 4. Period Filter
      if (periodFilter !== 'TOUT') {
        const orderTime = new Date(order.date || order.createdAt).getTime();
        const diffHours = (now - orderTime) / (1000 * 3600);
        if (periodFilter === 'AUJOURDHUI' && diffHours > 24) return false;
        if (periodFilter === '7_JOURS' && diffHours > 24 * 7) return false;
        if (periodFilter === '30_JOURS' && diffHours > 24 * 30) return false;
      }

      // 5. Search Text (Order Number, Customer Name, Customer Phone)
      if (q) {
        const cust = customerMap.get(order.customerId);
        const matchNumber = order.numero.toLowerCase().includes(q);
        const matchName = cust?.nom.toLowerCase().includes(q) || false;
        const matchPhone = cust?.telephone.toLowerCase().includes(q) || false;
        const matchNote = order.note?.toLowerCase().includes(q) || false;
        if (!matchNumber && !matchName && !matchPhone && !matchNote) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter, paymentFilter, selectedProductId, periodFilter, customerMap]);

  // Status counts for tab chips
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {
      TOUS: orders.length,
      A_CONFIRMER: 0,
      RESERVEE: 0,
      A_PREPARER: 0,
      PRETE: 0,
      LIVREE: 0,
      ANNULEE: 0
    };
    orders.forEach((o) => {
      if (map[o.statut] !== undefined) map[o.statut]++;
    });
    return map;
  }, [orders]);

  const handleExportCSV = () => {
    const rows = filteredOrders.map((o) => {
      const cust = customerMap.get(o.customerId);
      return {
        Numero: o.numero,
        Date: o.date || o.createdAt,
        Client: cust?.nom || 'Inconnu',
        Telephone: cust?.telephone || '',
        Statut: o.statut,
        StatutPaiement: o.statutPaiement,
        Total: o.total,
        MontantPaye: o.montantPaye,
        Articles: o.items.map((i) => `${i.nomProduitSnapshot} (x${i.quantite})`).join('; '),
        AdresseLivraison: o.adresseLivraison || '',
        Note: o.note || ''
      };
    });
    exportToCSV(`commandes_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('TOUS');
    setPaymentFilter('TOUS');
    setSelectedProductId('TOUS');
    setPeriodFilter('TOUT');
  };

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'TOUS' ||
    paymentFilter !== 'TOUS' ||
    selectedProductId !== 'TOUS' ||
    periodFilter !== 'TOUT';

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Commandes & Réservations
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Suivi centralisé des ventes Facebook & WhatsApp ({orders.length} au total)
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
            onClick={onNewOrder}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une commande</span>
          </button>
        </div>
      </div>

      {/* Status Bar / Filter Tabs (Horizontal scroll on mobile) */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200">
        {[
          { id: 'TOUS', label: 'Toutes' },
          { id: 'A_CONFIRMER', label: 'À confirmer' },
          { id: 'RESERVEE', label: 'Réservées' },
          { id: 'A_PREPARER', label: 'À préparer' },
          { id: 'PRETE', label: 'Prêtes' },
          { id: 'LIVREE', label: 'Livrées' },
          { id: 'ANNULEE', label: 'Annulées' }
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          const count = countByStatus[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center space-x-1.5 border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-black text-black bg-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-black hover:bg-zinc-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 ${
                  isActive ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-zinc-200 p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="N° commande, client, tél..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
            />
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
            >
              <option value="TOUS">Paiement : Tous</option>
              <option value="NON_PAYE">Non payé</option>
              <option value="ACOMPTE_RECU">Acompte reçu</option>
              <option value="PAYE">Payé</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
            >
              <option value="TOUT">Période : Tout l'historique</option>
              <option value="AUJOURDHUI">Dernières 24 heures</option>
              <option value="7_JOURS">7 derniers jours</option>
              <option value="30_JOURS">30 derniers jours</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
            >
              <option value="TOUS">Produit : Tous</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-zinc-600 pt-1 border-t border-zinc-100">
            <span>
              {filteredOrders.length} résultat(s) correspondant aux filtres
            </span>
            <button
              onClick={clearFilters}
              className="text-black font-semibold flex items-center space-x-1 hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          </div>
        )}
      </div>

      {/* Orders List Content */}
      {filteredOrders.length === 0 ? (
        <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
            Aucune commande trouvée
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Modifiez vos critères de recherche ou enregistrez une nouvelle commande.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-3.5 py-1.5 border border-zinc-400 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-100"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white divide-y divide-zinc-200">
          {filteredOrders.map((order) => {
            const customer = customerMap.get(order.customerId);
            const statusMeta = getOrderStatusMeta(order.statut);
            const paymentMeta = getPaymentStatusMeta(order.statutPaiement);
            const resteAPayer = Math.max(0, order.total - (order.montantPaye || 0));

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="p-4 hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left block: Order Number, Customer, Date, Items */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 tracking-wider">
                      {order.numero}
                    </span>
                    <span className="font-bold text-zinc-950 text-sm">
                      {customer?.nom || 'Client non spécifié'}
                    </span>
                    {customer?.telephone && (
                      <span className="text-xs text-zinc-500 flex items-center space-x-1 font-mono">
                        <Phone className="w-3 h-3 text-zinc-400 inline" />
                        <span>{customer.telephone}</span>
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 font-mono flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-zinc-400 inline" />
                      <span>{formatDate(order.date || order.createdAt)}</span>
                    </span>
                  </div>

                  {/* Order items preview */}
                  <div className="text-xs text-zinc-600 line-clamp-2">
                    <span className="font-semibold text-zinc-800">Articles : </span>
                    {order.items
                      .map((it) => `${it.nomProduitSnapshot} x ${it.quantite}`)
                      .join(' • ')}
                  </div>

                  {order.note && (
                    <div className="text-xs text-zinc-500 italic line-clamp-1">
                      Note : {order.note}
                    </div>
                  )}
                </div>

                {/* Right block: Total, Payment badge, Status badge */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
                  {/* Financial amounts */}
                  <div className="text-left md:text-right">
                    <div className="font-mono font-extrabold text-base text-zinc-950">
                      {formatCurrency(order.total, shop?.devise)}
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5 justify-start md:justify-end">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 border ${paymentMeta.badgeClass}`}
                      >
                        {paymentMeta.label}
                      </span>
                      {order.statutPaiement === 'ACOMPTE_RECU' && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          (Reste: {formatCurrency(resteAPayer, shop?.devise)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <span
                      className={`text-xs px-2.5 py-1 border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
