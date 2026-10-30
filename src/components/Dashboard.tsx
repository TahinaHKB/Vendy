import React, { useState } from 'react';
import {
  Clock,
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Building2,
  Store,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Phone,
  Send,
  Coins
} from 'lucide-react';
import { Order, Product, Customer, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getOrderStatusMeta, getPaymentStatusMeta } from '../utils/formatters';

interface DashboardProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  onSelectOrder: (order: Order) => void;
  onNewOrder: () => void;
  onNavigateTab: (tab: string) => void;
  onQuickUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  products,
  customers,
  onSelectOrder,
  onNewOrder,
  onNavigateTab,
  onQuickUpdateStatus
}) => {
  const { shop, store } = useAuth();
  const isGrossiste = shop?.type === 'GROSSISTE';

  const [period, setPeriod] = useState<'AUJOURDHUI' | '7_JOURS' | '30_JOURS' | 'TOUT'>('30_JOURS');

  // Filter orders by period for statistics
  const getFilteredOrders = () => {
    const now = new Date().getTime();
    if (period === 'TOUT') return orders;
    return orders.filter((o) => {
      const orderTime = new Date(o.date || o.createdAt).getTime();
      const diffHours = (now - orderTime) / (1000 * 3600);
      if (period === 'AUJOURDHUI') return diffHours <= 24;
      if (period === '7_JOURS') return diffHours <= 24 * 7;
      if (period === '30_JOURS') return diffHours <= 24 * 30;
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Metrics
  const aConfirmerCount = orders.filter((o) => o.statut === 'A_CONFIRMER').length;
  const aPreparerCount = orders.filter((o) => o.statut === 'A_PREPARER' || o.statut === 'RESERVEE').length;
  const livreesCount = filteredOrders.filter((o) => o.statut === 'LIVREE').length;
  const totalVolume = filteredOrders.filter((o) => o.statut !== 'ANNULEE').reduce((sum, o) => sum + o.total, 0);
  const totalEncaisse = filteredOrders.reduce((sum, o) => sum + (o.montantPaye || 0), 0);

  // Grossiste specific financial metrics ("gérer leur stocks, clients, argents")
  const wholesaleStats = store ? store.getWholesaleFinancialStats() : {
    totalCreancesEnAttente: 0,
    totalEncaissements: totalEncaisse,
    valeurStockPhysique: 0,
    totalCommandesGros: orders.length,
    nombreClientsDebiteurs: 0
  };

  // Critical stock items
  const lowStockProducts = products.filter((p) => !p.archived && p.stock <= (isGrossiste ? 2 : 1));

  // Recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Debtors for grossistes (clients having unpaid balances)
  const debiteurCustomers = customers.map((c) => {
    const clientOrders = orders.filter((o) => o.customerId === c.id && o.statut !== 'ANNULEE');
    const totalDue = clientOrders.reduce((sum, o) => sum + Math.max(0, o.total - (o.montantPaye || 0)), 0);
    return { customer: c, totalDue, ordersCount: clientOrders.length };
  }).filter((c) => c.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);

  const getCustomerName = (customerId: string) => {
    const c = customers.find((cust) => cust.id === customerId);
    return c ? c.nom : 'Client inconnu';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              {isGrossiste ? 'Gestion Dépôt Grossiste' : 'Tableau de bord'}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 font-mono uppercase font-bold tracking-wider ${
                isGrossiste ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-900'
              }`}
            >
              {isGrossiste ? 'Grand Grossiste B2B' : 'Vente en ligne'}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isGrossiste
              ? 'Pilotage des stocks en gros, comptes clients revendeurs et trésorerie/créances'
              : 'Suivi des ventes, réservations et commandes pour Facebook et WhatsApp'}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center border border-zinc-300 bg-white p-1 space-x-1">
          <button
            onClick={() => setPeriod('AUJOURDHUI')}
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              period === 'AUJOURDHUI' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setPeriod('7_JOURS')}
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              period === '7_JOURS' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
            }`}
          >
            7 Jours
          </button>
          <button
            onClick={() => setPeriod('30_JOURS')}
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              period === '30_JOURS' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
            }`}
          >
            30 Jours
          </button>
          <button
            onClick={() => setPeriod('TOUT')}
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              period === 'TOUT' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Tout
          </button>
        </div>
      </div>

      {/* Grossiste Financial & Stock Management Row (Section Argents & Trésorerie) */}
      {isGrossiste && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-black" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-black">
              Gestion de l'Argent, Créances & Valeur de Stock (Grossiste)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Créances en attente (Argent dû par les clients) */}
            <div className="border-2 border-black bg-white p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-zinc-600 text-xs font-mono uppercase tracking-wider">
                <span>Créances Revendeurs</span>
                <CreditCard className="w-4 h-4 text-black" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-black font-mono">
                  {formatCurrency(wholesaleStats.totalCreancesEnAttente, shop?.devise)}
                </span>
                <p className="text-xs text-zinc-600 mt-1">
                  À recouvrer ({wholesaleStats.nombreClientsDebiteurs} clients débiteurs)
                </p>
              </div>
            </div>

            {/* Total Encaissements réels */}
            <div className="border border-zinc-300 bg-white p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-600 text-xs font-mono uppercase tracking-wider">
                <span>Argents Encaissés</span>
                <TrendingUp className="w-4 h-4 text-zinc-900" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-zinc-950 font-mono">
                  {formatCurrency(wholesaleStats.totalEncaissements, shop?.devise)}
                </span>
                <p className="text-xs text-zinc-500 mt-1">Trésorerie effective perçue</p>
              </div>
            </div>

            {/* Valeur Monétaire du Stock */}
            <div className="border border-zinc-300 bg-white p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-600 text-xs font-mono uppercase tracking-wider">
                <span>Valeur du Stock Entrepôt</span>
                <PackageCheck className="w-4 h-4 text-zinc-900" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-zinc-950 font-mono">
                  {formatCurrency(wholesaleStats.valeurStockPhysique, shop?.devise)}
                </span>
                <p className="text-xs text-zinc-500 mt-1">Balles, cartons et lots en réserve</p>
              </div>
            </div>

            {/* Chiffre d'affaires commandes */}
            <div className="border border-black bg-zinc-950 text-white p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider">
                <span>Commandes Gros</span>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight font-mono text-white">
                  {formatCurrency(totalVolume, shop?.devise)}
                </span>
                <p className="text-xs text-zinc-400 mt-1">Total ventes facturées</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Orders KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* À confirmer */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="cursor-pointer border border-zinc-200 bg-white p-4 hover:border-black transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono uppercase tracking-wider">
            <span>À Confirmer</span>
            <Clock className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">
              {aConfirmerCount}
            </span>
            <p className="text-xs text-zinc-500 mt-1">Validation attendue</p>
          </div>
        </div>

        {/* À préparer / Réservées */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="cursor-pointer border border-zinc-200 bg-white p-4 hover:border-black transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono uppercase tracking-wider">
            <span>À Préparer / Colis</span>
            <PackageCheck className="w-4 h-4 text-zinc-900" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">
              {aPreparerCount}
            </span>
            <p className="text-xs text-zinc-500 mt-1">
              {isGrossiste ? 'Balles/cartons scellés à expédier' : 'Articles mis de côté'}
            </p>
          </div>
        </div>

        {/* Livrées */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="cursor-pointer border border-zinc-200 bg-white p-4 hover:border-black transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono uppercase tracking-wider">
            <span>Livrées (Période)</span>
            <CheckCircle2 className="w-4 h-4 text-zinc-900" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">
              {livreesCount}
            </span>
            <p className="text-xs text-zinc-500 mt-1">Expéditions finalisées</p>
          </div>
        </div>

        {/* Total Ventes / Encaissé (Social view) */}
        {!isGrossiste ? (
          <div className="border border-black bg-zinc-950 text-white p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider">
              <span>Chiffre Ventes</span>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-black tracking-tight font-mono">
                {formatCurrency(totalVolume, shop?.devise)}
              </span>
              <p className="text-xs text-zinc-400 mt-1">
                Encaissé : {formatCurrency(totalEncaisse, shop?.devise)}
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigateTab('products')}
            className="cursor-pointer border border-zinc-200 bg-white p-4 hover:border-black transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono uppercase tracking-wider">
              <span>Lots & Références</span>
              <Building2 className="w-4 h-4 text-zinc-900" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">
                {products.filter(p => !p.archived).length}
              </span>
              <p className="text-xs text-zinc-500 mt-1">Articles en catalogue gros</p>
            </div>
          </div>
        )}
      </div>

      {/* Alert for low stock */}
      {lowStockProducts.length > 0 && (
        <div className="border border-zinc-400 bg-zinc-50 p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-black mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                Alerte Stock Restreint ({lowStockProducts.length} référence{lowStockProducts.length > 1 ? 's' : ''})
              </h4>
              <p className="text-xs text-zinc-600 mt-0.5">
                {isGrossiste
                  ? 'Des balles ou cartons atteignent le seuil critique d\'approvisionnement.'
                  : 'Certains articles sont épuisés ou ne disposent plus que d\'un exemplaire.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-white border border-zinc-300 font-mono text-zinc-800"
                  >
                    {p.nom} : {p.stock} {p.unite || 'en stock'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('products')}
            className="text-xs font-bold uppercase tracking-wider text-black hover:underline shrink-0 ml-2"
          >
            Gérer
          </button>
        </div>
      )}

      {/* Main Grid: Commandes récentes + Debtors for Grossistes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders table (2 columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-black" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                Commandes Récentes
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-zinc-600 hover:text-black flex items-center space-x-1 uppercase tracking-wider"
            >
              <span>Voir tout ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="border border-dashed border-zinc-300 p-8 text-center bg-white">
              <ShoppingBag className="w-8 h-8 text-zinc-300 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-zinc-700 mt-2">Aucune commande enregistrée</p>
              <button
                onClick={onNewOrder}
                className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer une commande</span>
              </button>
            </div>
          ) : (
            <div className="border border-zinc-200 bg-white divide-y divide-zinc-100">
              {recentOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.statut);
                const paymentMeta = getPaymentStatusMeta(order.statutPaiement);
                return (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="p-3.5 hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-black bg-zinc-100 px-1.5 py-0.5 border border-zinc-200">
                          {order.numero}
                        </span>
                        <span className="font-semibold text-sm text-zinc-900">
                          {getCustomerName(order.customerId)}
                        </span>
                        {order.source === 'CATALOGUE_PUBLIC' && (
                          <span className="text-[10px] bg-black text-white px-1.5 py-0.2 uppercase font-mono">
                            Web
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                          {formatDate(order.date || order.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 line-clamp-1">
                        {order.items.map((it) => `${it.nomProduitSnapshot} (x${it.quantite})`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-zinc-950">
                          {formatCurrency(order.total, shop?.devise)}
                        </div>
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.2 border ${paymentMeta.badgeClass}`}
                        >
                          {paymentMeta.label}
                        </span>
                      </div>

                      <span
                        className={`text-xs px-2 py-1 border ${statusMeta.badgeClass} shrink-0`}
                      >
                        {statusMeta.label}
                      </span>

                      <ChevronRight className="w-4 h-4 text-zinc-400 hidden sm:block" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Actions & Debtors / Best Practice */}
        <div className="space-y-4">
          {/* Quick Actions Panel */}
          <div className="border border-zinc-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-zinc-200 pb-2">
              Actions Rapides
            </h3>
            <div className="space-y-2">
              <button
                onClick={onNewOrder}
                className="w-full py-2.5 px-3 bg-black text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>Nouvelle Commande</span>
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigateTab('products')}
                className="w-full py-2.5 px-3 bg-white border border-zinc-300 text-black hover:bg-zinc-100 text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>{isGrossiste ? 'Ajouter Lot / Carton' : 'Ajouter un Produit'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigateTab('customers')}
                className="w-full py-2.5 px-3 bg-white border border-zinc-300 text-black hover:bg-zinc-100 text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>{isGrossiste ? 'Fichier Revendeurs' : 'Fichier Clients'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Wholesale: Debtors / Outstanding Balances list */}
          {isGrossiste && debiteurCustomers.length > 0 && (
            <div className="border border-zinc-300 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-black flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Créances Revendeurs ({debiteurCustomers.length})</span>
                </span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                {debiteurCustomers.slice(0, 4).map((deb) => (
                  <div key={deb.customer.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-black truncate max-w-[140px]">
                        {deb.customer.nom}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {deb.customer.telephone}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-black block">
                        {formatCurrency(deb.totalDue, shop?.devise)}
                      </span>
                      <span className="text-[9px] uppercase font-mono text-zinc-500">
                        {deb.ordersCount} cmd impayée(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guide Card */}
          <div className="border border-zinc-950 bg-zinc-900 text-white p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
              {isGrossiste ? 'Guide Grand Grossiste' : 'Guide Vendeur Social'}
            </span>
            <h4 className="text-xs font-bold">
              {isGrossiste
                ? 'Gestion des créances & approvisionnement'
                : 'Zéro surbooking sur Messenger / WhatsApp'}
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {isGrossiste
                ? 'Les commandes passées depuis le catalogue public sont directement associées au compte du revendeur. Dès réception de l\'acompte, passez la commande au statut "À préparer" pour déclencher le départ du colis.'
                : 'Dès qu\'une cliente commente « Je prends » sur Facebook, enregistrez la commande au statut "Réservée" : le stock est instantanément déduit sur votre catalogue public et privé.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
