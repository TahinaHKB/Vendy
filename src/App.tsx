import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { OrdersList } from './components/OrdersList';
import { OrderDetailModal } from './components/OrderDetailModal';
import { OrderFormModal } from './components/OrderFormModal';
import { ProductsList } from './components/ProductsList';
import { ProductFormModal } from './components/ProductFormModal';
import { CustomersList } from './components/CustomersList';
import { ShopSettings } from './components/ShopSettings';
import { AuthModal } from './components/AuthModal';
import { CreateShopModal } from './components/CreateShopModal';
import { PublicMarketplace } from './components/PublicMarketplace';
import { MobileAppModal } from './components/MobileAppModal';
import { Order, Product, Customer, OrderStatus, PaymentMethod } from './types';
import { Bell, CheckCircle2, X, Store, Plus, ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { userProfile, shop, myShops, store, loading, logout } = useAuth();

  // Mode: 'SELLER' (Dashboard/Management) or 'PUBLIC' (Public catalog/marketplace)
  const [viewMode, setViewMode] = useState<'SELLER' | 'PUBLIC'>('PUBLIC');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateShopModalOpen, setIsCreateShopModalOpen] = useState(false);
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState(false);

  // Application Data State for active shop
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Live order notification
  const [newOrderNotice, setNewOrderNotice] = useState<string | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Reset seller data if user disconnects
  useEffect(() => {
    if (!userProfile) {
      setViewMode('PUBLIC');
      setProducts([]);
      setCustomers([]);
      setOrders([]);
      setSelectedOrder(null);
      setOrderToEdit(null);
    }
  }, [userProfile]);

  // Subscribe to store updates when store is initialized
  useEffect(() => {
    if (!store) {
      setProducts([]);
      setCustomers([]);
      setOrders([]);
      return;
    }

    store.subscribe({
      onProducts: (prods) => setProducts(prods),
      onCustomers: (custs) => setCustomers(custs),
      onOrders: (ords) => {
        setOrders(ords);
        setSelectedOrder((prev) => (prev ? ords.find((o) => o.id === prev.id) || null : null));
      }
    });

    // Listen for live public web orders placed for this shop
    const handleOrderEvent = (e: any) => {
      if (e.detail?.shopId === store.shopId) {
        setNewOrderNotice('Une nouvelle commande client vient d\'être reçue depuis le site web !');
        const freshOrders = store.getOrders();
        setOrders(freshOrders);
        const freshProducts = store.getProducts();
        setProducts(freshProducts);
      }
    };

    window.addEventListener('vendy_order_created', handleOrderEvent);

    return () => {
      window.removeEventListener('vendy_order_created', handleOrderEvent);
    };
  }, [store]);

  // Explicit, foolproof logout handler
  const handleLogout = async () => {
    await logout();
    setProducts([]);
    setCustomers([]);
    setOrders([]);
    setSelectedOrder(null);
    setOrderToEdit(null);
    setIsOrderFormOpen(false);
    setIsProductFormOpen(false);
    setIsCreateShopModalOpen(false);
    setViewMode('PUBLIC');
    setIsAuthModalOpen(false);
    setLogoutNotice('Vous avez été déconnecté avec succès.');
    setTimeout(() => setLogoutNotice(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-xl mx-auto animate-pulse">
            V
          </div>
          <p className="text-xs uppercase font-mono tracking-widest text-zinc-500">
            Chargement de Vendy...
          </p>
        </div>
      </div>
    );
  }

  // Auth modal view
  if (isAuthModalOpen) {
    return (
      <AuthModal
        onClose={() => setIsAuthModalOpen(false)}
        onExplorePublic={() => {
          setIsAuthModalOpen(false);
          setViewMode('PUBLIC');
        }}
      />
    );
  }

  // Public Marketplace view
  if (viewMode === 'PUBLIC') {
    return (
      <div className="relative">
        {logoutNotice && (
          <div className="fixed top-4 right-4 z-50 bg-black text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{logoutNotice}</span>
            <button onClick={() => setLogoutNotice(null)} className="ml-2 text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <PublicMarketplace
          onGoToSellerSpace={() => {
            if (myShops.length > 0) {
              setViewMode('SELLER');
            } else if (userProfile) {
              setIsCreateShopModalOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          onOpenCreateShop={() => {
            if (userProfile) {
              setIsCreateShopModalOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenMobileAppModal={() => setIsMobileAppModalOpen(true)}
        />

        {isCreateShopModalOpen && (
          <CreateShopModal
            onClose={() => setIsCreateShopModalOpen(false)}
            onSuccess={() => {
              setIsCreateShopModalOpen(false);
              setViewMode('SELLER');
            }}
          />
        )}

        <MobileAppModal
          isOpen={isMobileAppModalOpen}
          onClose={() => setIsMobileAppModalOpen(false)}
        />
      </div>
    );
  }

  // If user navigated to SELLER but doesn't have any shop yet
  if (viewMode === 'SELLER' && myShops.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-zinc-300 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-black uppercase tracking-tight">
              Vous n'avez pas encore de boutique
            </h2>
            <p className="text-xs text-zinc-600 mt-1">
              Chaque compte peut créer une ou plusieurs boutiques (vendeur de friperie en ligne ou grand grossiste).
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setIsCreateShopModalOpen(true)}
              className="flex-1 px-4 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Créer ma première boutique</span>
            </button>
            <button
              onClick={() => setViewMode('PUBLIC')}
              className="px-4 py-2.5 border border-zinc-300 hover:bg-zinc-100 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Catalogue</span>
            </button>
          </div>
        </div>

        {isCreateShopModalOpen && (
          <CreateShopModal
            onClose={() => setIsCreateShopModalOpen(false)}
            onSuccess={() => {
              setIsCreateShopModalOpen(false);
              setViewMode('SELLER');
            }}
          />
        )}
      </div>
    );
  }

  // Helper stock functions for Seller space
  const getReservedQuantity = (productId: string) => {
    return store ? store.getProductReservedQuantity(productId) : 0;
  };

  const getAvailableStock = (productId: string, excludeOrderId?: string) => {
    return store ? store.getProductAvailableStock(productId, excludeOrderId) : 0;
  };

  // Order actions
  const handleSaveOrder = async (order: Order, previousStatus?: OrderStatus) => {
    if (!store) return { success: false, error: 'Boutique non initialisée' };
    return await store.saveOrder(order, previousStatus);
  };

  const handleUpdateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    if (!store) return { success: false, error: 'Boutique non initialisée' };
    return await store.saveOrder({ ...order, statut: newStatus }, order.statut);
  };

  const handleAddPayment = async (
    order: Order,
    montant: number,
    type: PaymentMethod,
    note: string
  ) => {
    if (!store) return;
    const newPayments = [
      ...(order.payments || []),
      {
        id: `pay_${Date.now()}`,
        orderId: order.id,
        montant,
        date: new Date().toISOString(),
        type,
        note: note.trim() || undefined
      }
    ];

    const totalReceived = newPayments.reduce((sum, p) => sum + p.montant, 0);
    const newStatutPaiement =
      totalReceived >= order.total
        ? 'PAYE'
        : totalReceived > 0
        ? 'ACOMPTE_RECU'
        : 'NON_PAYE';

    await store.saveOrder(
      {
        ...order,
        montantPaye: totalReceived,
        statutPaiement: newStatutPaiement,
        payments: newPayments
      },
      order.statut
    );
  };

  const handleSaveCustomer = async (customer: Customer): Promise<void> => {
    if (!store) return;
    await store.saveCustomer(customer);
  };

  const handleSaveProduct = async (product: Product) => {
    if (!store) return { success: false, error: 'Boutique non connectée à Firestore' };
    return await store.saveProduct(product);
  };

  const handleArchiveProduct = async (productId: string, archived: boolean) => {
    if (!store) return;
    await store.archiveProduct(productId, archived);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans text-zinc-950 selection:bg-black selection:text-white">
      {/* Real-time Order Notification Banner */}
      {newOrderNotice && (
        <div className="bg-black text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>{newOrderNotice}</span>
          </div>
          <button
            onClick={() => {
              setNewOrderNotice(null);
              setCurrentTab('orders');
            }}
            className="px-3 py-1 bg-white text-black text-[11px] font-bold hover:bg-zinc-200 uppercase"
          >
            Consulter les commandes
          </button>
        </div>
      )}

      {/* Top Header & Mobile Bottom Bar */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onNewOrder={() => {
          setOrderToEdit(null);
          setIsOrderFormOpen(true);
        }}
        onOpenPublicMarketplace={() => setViewMode('PUBLIC')}
        onOpenCreateShop={() => setIsCreateShopModalOpen(true)}
        onLogout={handleLogout}
        onOpenMobileAppModal={() => setIsMobileAppModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            products={products}
            customers={customers}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onNewOrder={() => {
              setOrderToEdit(null);
              setIsOrderFormOpen(true);
            }}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onQuickUpdateStatus={(ord, newStatus) => handleUpdateOrderStatus(ord, newStatus)}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersList
            orders={orders}
            customers={customers}
            products={products}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onNewOrder={() => {
              setOrderToEdit(null);
              setIsOrderFormOpen(true);
            }}
          />
        )}

        {currentTab === 'products' && (
          <ProductsList
            products={products}
            onAddProduct={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
            onEditProduct={(prod) => {
              setProductToEdit(prod);
              setIsProductFormOpen(true);
            }}
            onArchiveProduct={handleArchiveProduct}
            getReservedQuantity={getReservedQuantity}
            getAvailableStock={getAvailableStock}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersList
            customers={customers}
            orders={orders}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onSaveCustomer={handleSaveCustomer}
            onNewOrderForCustomer={() => {
              setOrderToEdit(null);
              setIsOrderFormOpen(true);
            }}
          />
        )}

        {currentTab === 'settings' && (
          <ShopSettings
            products={products}
            customers={customers}
            orders={orders}
            onOpenMobileAppModal={() => setIsMobileAppModalOpen(true)}
          />
        )}
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          customer={customers.find((c) => c.id === selectedOrder.customerId)}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onAddPayment={handleAddPayment}
          onEditOrder={(ord) => {
            setSelectedOrder(null);
            setOrderToEdit(ord);
            setIsOrderFormOpen(true);
          }}
        />
      )}

      {/* Order Create / Edit Modal */}
      {isOrderFormOpen && (
        <OrderFormModal
          orderToEdit={orderToEdit}
          customers={customers}
          products={products}
          onClose={() => {
            setIsOrderFormOpen(false);
            setOrderToEdit(null);
          }}
          onSaveOrder={handleSaveOrder}
          onCreateCustomer={handleSaveCustomer}
          getNextOrderNumber={() => (store ? store.getNextOrderNumber() : 'CMD-001')}
          getAvailableStock={getAvailableStock}
        />
      )}

      {/* Product Create / Edit Modal */}
      {isProductFormOpen && (
        <ProductFormModal
          productToEdit={productToEdit}
          onClose={() => {
            setIsProductFormOpen(false);
            setProductToEdit(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {/* Create Shop Modal */}
      {isCreateShopModalOpen && (
        <CreateShopModal
          onClose={() => setIsCreateShopModalOpen(false)}
          onSuccess={() => {
            setIsCreateShopModalOpen(false);
            setViewMode('SELLER');
          }}
        />
      )}

      {/* Mobile App Modal */}
      <MobileAppModal
        isOpen={isMobileAppModalOpen}
        onClose={() => setIsMobileAppModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
