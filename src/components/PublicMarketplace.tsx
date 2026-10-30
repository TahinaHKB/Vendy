import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Store,
  Building2,
  Search,
  Filter,
  ShoppingCart,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Phone,
  Send,
  User,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  MapPin,
  CreditCard,
  ChevronLeft,
  ExternalLink,
  Store as StoreIcon,
  Smartphone,
  Download
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Shop, ShopType, Order, PaymentMethod } from '../types';
import { VendyStore } from '../services/store';
import { formatCurrency, formatDate, getOrderStatusMeta, getPaymentStatusMeta } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface PublicMarketplaceProps {
  onGoToSellerSpace: () => void;
  onOpenCreateShop: () => void;
  onOpenAuth: () => void;
  onOpenMobileAppModal?: () => void;
}

interface CartItem {
  product: Product & { shopName: string; shopType: ShopType; shopPhone: string; shopAddress?: string };
  quantite: number;
}

export const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({
  onGoToSellerSpace,
  onOpenCreateShop,
  onOpenAuth,
  onOpenMobileAppModal
}) => {
  const { userProfile, myShops, logout } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<(Product & { shopName: string; shopType: ShopType; shopPhone: string; shopAddress?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: 'CATALOG', 'SHOPS_LIST', 'SHOP_DETAIL', 'MY_ORDERS'
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'SHOPS_LIST' | 'MY_ORDERS'>('CATALOG');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Filters
  const [shopTypeFilter, setShopTypeFilter] = useState<'ALL' | 'VENDEUR_EN_LIGNE' | 'GROSSISTE'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Client checkout state
  const [clientNom, setClientNom] = useState(userProfile?.nom || '');
  const [clientTelephone, setClientTelephone] = useState(userProfile?.telephone || '+261 ');
  const [clientAdresse, setClientAdresse] = useState(userProfile?.adresse || '');
  const [clientNote, setClientNote] = useState('');
  const [modePaiement, setModePaiement] = useState<PaymentMethod>('MVOLA');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<{
    orders: Order[];
    shopPhones: Record<string, string>;
  } | null>(null);

  // Client past orders
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Load catalog directly and exclusively from Firestore
  useEffect(() => {
    const unsub = VendyStore.subscribeToPublicCatalog((data) => {
      setShops(data.shops);
      setProducts(data.products);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Load client orders directly and exclusively from Firestore
  useEffect(() => {
    try {
      localStorage.removeItem('vendy_client_placed_orders');
    } catch {}

    if (!userProfile?.id) {
      setMyOrders([]);
      return;
    }

    const q = query(collection(db, 'orders'), where('clientAuthId', '==', userProfile.id));
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Order));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyOrders(list);
    }, (err) => {
      console.warn('Client orders listener notice:', err.message);
      setMyOrders([]);
    });

    return () => unsub();
  }, [userProfile?.id]);

  useEffect(() => {
    if (userProfile) {
      if (!clientNom) setClientNom(userProfile.nom);
      if (!clientTelephone || clientTelephone === '+261 ') setClientTelephone(userProfile.telephone || '+261 ');
      if (!clientAdresse && userProfile.adresse) setClientAdresse(userProfile.adresse);
    }
  }, [userProfile]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set);
  }, [products]);

  // Products filtered by search, category, shopType, and selectedShop
  const displayedProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      // If a specific boutique is selected
      if (selectedShop && p.shopId !== selectedShop.id) return false;

      // Filter by type
      if (!selectedShop && shopTypeFilter !== 'ALL' && p.shopType !== shopTypeFilter) return false;

      // Filter by category
      if (selectedCategory !== 'ALL' && p.categorie !== selectedCategory) return false;

      // Filter by search query
      if (q) {
        const matchName = p.nom.toLowerCase().includes(q);
        const matchShop = p.shopName.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchCat = p.categorie?.toLowerCase().includes(q);
        if (!matchName && !matchShop && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [products, selectedShop, shopTypeFilter, selectedCategory, search]);

  // Cart operations
  const addToCart = (product: Product & { shopName: string; shopType: ShopType; shopPhone: string; shopAddress?: string }) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].quantite += 1;
        return updated;
      }
      return [...prev, { product, quantite: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantite + delta;
            return newQty > 0 ? { ...item, quantite: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.product.shopType === 'GROSSISTE' && item.product.prixGros
      ? item.product.prixGros
      : item.product.prix;
    return sum + price * item.quantite;
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantite, 0);

  // Place order: groups items per shop and writes directly into the seller's dashboard
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!clientNom.trim() || !clientTelephone.trim() || clientTelephone.trim() === '+261') {
      alert('Veuillez renseigner votre nom et votre numéro de téléphone (WhatsApp).');
      return;
    }

    setIsSubmittingOrder(true);

    const itemsByShop = new Map<string, CartItem[]>();
    cart.forEach((item) => {
      const list = itemsByShop.get(item.product.shopId) || [];
      list.push(item);
      itemsByShop.set(item.product.shopId, list);
    });

    const createdOrders: Order[] = [];
    const phones: Record<string, string> = {};

    for (const [shopId, shopItems] of itemsByShop.entries()) {
      const firstItem = shopItems[0];
      phones[shopId] = firstItem.product.shopPhone;

      const res = await VendyStore.placePublicOrder({
        shopId,
        clientNom,
        clientTelephone,
        clientAdresse,
        clientNote,
        clientAuthId: userProfile?.id,
        items: shopItems.map((si) => ({
          product: si.product,
          quantite: si.quantite
        })),
        modePaiementChoisi: modePaiement
      });

      if (res.success && res.order) {
        createdOrders.push(res.order);
        // Trigger notification event for active seller session
        window.dispatchEvent(new CustomEvent('vendy_order_created', { detail: { shopId } }));
      }
    }

    setIsSubmittingOrder(false);
    setCart([]);
    setIsCartOpen(false);

    if (createdOrders.length > 0) {
      setOrderSuccessData({
        orders: createdOrders,
        shopPhones: phones
      });
    }
  };

  const openWhatsAppConfirmation = (phone: string, orderNumber: string, shopName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Bonjour ${shopName},\nJe viens d'enregistrer la commande N° *${orderNumber}* sur le catalogue public Vendy.\nNom du client : ${clientNom}\nTéléphone : ${clientTelephone}\nMerci de me confirmer la commande et les détails de livraison !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans text-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              onClick={() => {
                setSelectedShop(null);
                setActiveTab('CATALOG');
              }}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-black tracking-tighter text-lg">
                V
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-zinc-950 tracking-tight text-lg">VENDY</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-black text-white">
                    Marketplace
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-medium">
                  Boutiques en ligne & Grands Grossistes Madagascar
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => {
                  setSelectedShop(null);
                  setActiveTab('CATALOG');
                }}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'CATALOG' && !selectedShop
                    ? 'bg-black text-white'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                }`}
              >
                Tous les Produits
              </button>

              <button
                onClick={() => {
                  setSelectedShop(null);
                  setActiveTab('SHOPS_LIST');
                }}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'SHOPS_LIST'
                    ? 'bg-black text-white'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                }`}
              >
                <StoreIcon className="w-3.5 h-3.5" />
                <span>Boutiques & Dépôts ({shops.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('MY_ORDERS')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'MY_ORDERS'
                    ? 'bg-black text-white'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                }`}
              >
                <span>Mes Commandes</span>
                {myOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-zinc-200 text-black text-[10px] font-mono font-bold">
                    {myOrders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right actions: Mobile App, Cart & Authentication */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Mobile App Download/Install Button */}
              {onOpenMobileAppModal && (
                <button
                  onClick={onOpenMobileAppModal}
                  title="Télécharger l'application mobile Android (.APK) et iOS (.IPA)"
                  className="px-2.5 sm:px-3 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">App Mobile (.APK / .IPA)</span>
                  <span className="sm:hidden">App (.APK)</span>
                </button>
              )}

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative px-3 py-2 bg-white border border-zinc-300 hover:border-black text-black text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Panier</span>
                {cartItemsCount > 0 && (
                  <span className="bg-black text-white text-[10px] font-mono px-1.5 py-0.2 font-bold">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              {userProfile ? (
                <div className="flex items-center space-x-2">
                  {myShops.length > 0 ? (
                    <>
                      <button
                        onClick={onGoToSellerSpace}
                        className="px-3 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
                      >
                        <StoreIcon className="w-3.5 h-3.5" />
                        <span>{myShops.length > 1 ? `Mes Boutiques (${myShops.length})` : 'Gérer ma boutique'}</span>
                      </button>
                      <button
                        onClick={onOpenCreateShop}
                        title="Créer une nouvelle boutique"
                        className="hidden sm:flex px-2.5 py-2 border border-zinc-300 hover:border-black text-black text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        + Boutique
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onOpenCreateShop}
                      className="px-3.5 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ouvrir une boutique</span>
                    </button>
                  )}

                  <div className="hidden md:flex items-center space-x-1 px-2 py-1 bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 font-medium">
                    <User className="w-3 h-3 text-zinc-400" />
                    <span className="truncate max-w-[100px]">{userProfile.nom}</span>
                  </div>

                  <button
                    onClick={logout}
                    title="Se déconnecter"
                    className="p-2 border border-zinc-300 hover:border-black text-zinc-600 hover:text-black text-xs transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-2 bg-zinc-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Connexion / Inscription
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile secondary tab bar */}
        <div className="md:hidden flex border-t border-zinc-200 bg-zinc-50 text-xs font-bold uppercase">
          <button
            onClick={() => {
              setSelectedShop(null);
              setActiveTab('CATALOG');
            }}
            className={`flex-1 py-2 text-center ${
              activeTab === 'CATALOG' && !selectedShop ? 'border-b-2 border-black text-black bg-white' : 'text-zinc-500'
            }`}
          >
            Catalogue
          </button>
          <button
            onClick={() => {
              setSelectedShop(null);
              setActiveTab('SHOPS_LIST');
            }}
            className={`flex-1 py-2 text-center ${
              activeTab === 'SHOPS_LIST' ? 'border-b-2 border-black text-black bg-white' : 'text-zinc-500'
            }`}
          >
            Boutiques ({shops.length})
          </button>
          <button
            onClick={() => setActiveTab('MY_ORDERS')}
            className={`flex-1 py-2 text-center ${
              activeTab === 'MY_ORDERS' ? 'border-b-2 border-black text-black bg-white' : 'text-zinc-500'
            }`}
          >
            Commandes ({myOrders.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: Specific Shop Showcase (When clicked on a boutique) */}
        {selectedShop && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => setSelectedShop(null)}
              className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-black hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Retour à toutes les boutiques</span>
            </button>

            {/* Shop Profile Banner */}
            <div className="border-2 border-black bg-white p-5 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 font-bold ${
                        selectedShop.type === 'GROSSISTE' ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-900'
                      }`}
                    >
                      {selectedShop.type === 'GROSSISTE' ? 'Grand Grossiste B2B' : 'Boutique Vente en Ligne'}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Ref: {selectedShop.id}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    {selectedShop.nom}
                  </h1>

                  {selectedShop.description && (
                    <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl">
                      {selectedShop.description}
                    </p>
                  )}
                </div>

                {/* Direct WhatsApp Contact Button */}
                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                  <a
                    href={`https://wa.me/${selectedShop.telephone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Contacter sur WhatsApp ({selectedShop.telephone})</span>
                  </a>

                  {selectedShop.adresse && (
                    <div className="text-xs text-zinc-500 flex items-center space-x-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{selectedShop.adresse}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shop highlights */}
              <div className="pt-3 border-t border-zinc-200 flex flex-wrap gap-4 text-xs font-semibold text-zinc-700">
                <span>
                  <strong>{displayedProducts.length}</strong> article(s) disponible(s) en rayon
                </span>
                {selectedShop.type === 'GROSSISTE' && selectedShop.conditionnementDefaut && (
                  <span>
                    Conditionnement habituel : <strong>{selectedShop.conditionnementDefaut}</strong>
                  </span>
                )}
                <span>
                  Devise acceptée : <strong>{selectedShop.devise || 'Ar'}</strong>
                </span>
              </div>
            </div>

            {/* Products of this boutique */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                Articles en vente chez {selectedShop.nom} ({displayedProducts.length})
              </h2>

              {displayedProducts.length === 0 ? (
                <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
                  <Package className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-2">
                    Aucun article en stock actuellement dans cette boutique
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Le vendeur n'a pas encore ajouté de produit ou les articles sont en cours de réapprovisionnement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedProducts.map((p) => {
                    const isGrossiste = p.shopType === 'GROSSISTE';
                    const displayPrice = isGrossiste && p.prixGros ? p.prixGros : p.prix;

                    return (
                      <div
                        key={p.id}
                        className="border border-zinc-200 bg-white flex flex-col justify-between hover:border-black transition-all"
                      >
                        <div>
                          <div className="h-44 bg-zinc-100 relative overflow-hidden border-b border-zinc-200 flex items-center justify-center">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.nom} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-8 h-8 text-zinc-300" />
                            )}
                            {p.unite && (
                              <span className="absolute bottom-2 left-2 bg-white/95 text-black border border-zinc-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                                {p.unite}
                              </span>
                            )}
                            <span className="absolute top-2 right-2 bg-white/95 border border-zinc-300 text-black text-[10px] font-mono font-bold px-2 py-0.5">
                              {p.stock > 0 ? `${p.stock} dispo` : 'Rupture'}
                            </span>
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                              {p.categorie}
                            </span>
                            <h3 className="font-bold text-sm text-black line-clamp-2">
                              {p.nom}
                            </h3>
                            {p.description && (
                              <p className="text-xs text-zinc-500 line-clamp-2">
                                {p.description}
                              </p>
                            )}
                            <div className="pt-2 font-mono text-base font-black text-black">
                              {formatCurrency(displayPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 border-t border-zinc-100 bg-zinc-50">
                          <button
                            onClick={() => addToCart(p)}
                            disabled={p.stock <= 0}
                            className="w-full py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter au panier</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: All Products Global Catalog */}
        {!selectedShop && activeTab === 'CATALOG' && (
          <div className="space-y-6">
            {/* Mobile App Download Banner */}
            {onOpenMobileAppModal && (
              <div className="bg-zinc-950 text-white p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white text-black font-black flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">Application Mobile Vendy</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-emerald-500 text-black font-bold">
                        vendy.apk
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-sky-500 text-black font-bold">
                        vendy.ipa
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Téléchargez l'application officielle (.APK Android & .IPA iOS) connectée à Firebase pour gérer vos boutiques ou commander directement.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto">
                  <a
                    href="/downloads/vendy.apk"
                    download="vendy.apk"
                    className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>vendy.apk</span>
                  </a>
                  <a
                    href="/downloads/vendy.ipa"
                    download="vendy.ipa"
                    className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-sky-400 hover:bg-sky-300 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>vendy.ipa</span>
                  </a>
                  <button
                    onClick={onOpenMobileAppModal}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <span>Guide & Détails</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white border border-zinc-200 p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un vêtement, lot, ou nom de boutique..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
                  />
                </div>

                <div className="flex border border-zinc-300 bg-zinc-50 p-1 space-x-1 shrink-0">
                  <button
                    onClick={() => setShopTypeFilter('ALL')}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      shopTypeFilter === 'ALL' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                    }`}
                  >
                    Toutes ({products.length})
                  </button>
                  <button
                    onClick={() => setShopTypeFilter('VENDEUR_EN_LIGNE')}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center space-x-1 ${
                      shopTypeFilter === 'VENDEUR_EN_LIGNE'
                        ? 'bg-black text-white'
                        : 'text-zinc-600 hover:text-black'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Détail / Social</span>
                  </button>
                  <button
                    onClick={() => setShopTypeFilter('GROSSISTE')}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center space-x-1 ${
                      shopTypeFilter === 'GROSSISTE'
                        ? 'bg-black text-white'
                        : 'text-zinc-600 hover:text-black'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Grossistes B2B</span>
                  </button>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-zinc-100">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                      selectedCategory === 'ALL'
                        ? 'bg-black text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    Toutes catégories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-black text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {displayedProducts.length === 0 ? (
              <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
                <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
                  Aucun article trouvé dans le catalogue public
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Créez une boutique ou ajoutez vos premiers articles depuis votre espace vendeur.
                </p>
                <button
                  onClick={onGoToSellerSpace}
                  className="mt-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
                >
                  Accéder à l'espace vendeur pour ajouter des produits
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedProducts.map((p) => {
                  const isGrossiste = p.shopType === 'GROSSISTE';
                  const displayPrice = isGrossiste && p.prixGros ? p.prixGros : p.prix;

                  return (
                    <div
                      key={p.id}
                      className="border border-zinc-200 bg-white flex flex-col justify-between hover:border-black transition-all group"
                    >
                      <div>
                        {/* Image */}
                        <div className="h-48 bg-zinc-100 relative overflow-hidden border-b border-zinc-200 flex items-center justify-center">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nom}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-zinc-300" />
                          )}

                          {/* Shop Type Tag */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 tracking-wider font-bold ${
                                isGrossiste ? 'bg-black text-white' : 'bg-zinc-900 text-zinc-100'
                              }`}
                            >
                              {isGrossiste ? 'Grossiste' : 'Boutique'}
                            </span>
                          </div>

                          {p.unite && (
                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-black border border-zinc-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                              {p.unite}
                            </div>
                          )}

                          <div className="absolute top-2 right-2 bg-white/95 border border-zinc-300 text-black text-[10px] font-mono font-bold px-2 py-0.5">
                            {p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2">
                          {/* CLICKABLE BOUTIQUE BADGE (Requirements: voir quel boutique vend et cliquer sur la boutique) */}
                          <button
                            type="button"
                            onClick={() => {
                              const found = shops.find((s) => s.id === p.shopId);
                              if (found) setSelectedShop(found);
                            }}
                            className="w-full text-left p-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs transition-colors group/shop"
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              {isGrossiste ? (
                                <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              ) : (
                                <Store className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              )}
                              <span className="font-bold text-black truncate">{p.shopName}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 group-hover/shop:text-black uppercase font-mono font-semibold shrink-0 ml-1">
                              Voir boutique →
                            </span>
                          </button>

                          <h3 className="font-bold text-sm text-zinc-950 line-clamp-2 leading-snug pt-1">
                            {p.nom}
                          </h3>

                          {p.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2">
                              {p.description}
                            </p>
                          )}

                          <div className="pt-2">
                            <div className="font-mono text-base font-black text-black">
                              {formatCurrency(displayPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add to cart */}
                      <div className="p-3 border-t border-zinc-200 bg-zinc-50">
                        <button
                          onClick={() => addToCart(p)}
                          disabled={p.stock <= 0}
                          className="w-full py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Commander</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: List of All Boutiques & Dépôts Grossistes */}
        {!selectedShop && activeTab === 'SHOPS_LIST' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Boutiques en ligne & Dépôts Grossistes ({shops.length})
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Sélectionnez une boutique pour consulter l'ensemble de son stock et passer commande
              </p>
            </div>

            {shops.length === 0 ? (
              <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
                <Store className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
                  Aucune boutique enregistrée pour le moment
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Créez votre boutique pour la faire figurer sur cette marketplace.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="mt-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
                >
                  Créer ma boutique
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map((shop) => {
                  const shopProds = products.filter((p) => p.shopId === shop.id);
                  const isGrossiste = shop.type === 'GROSSISTE';

                  return (
                    <div
                      key={shop.id}
                      className="border border-zinc-200 bg-white p-5 hover:border-black transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 font-bold ${
                              isGrossiste ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-900'
                            }`}
                          >
                            {isGrossiste ? 'Grand Grossiste B2B' : 'Vente en ligne'}
                          </span>

                          <span className="text-xs text-zinc-400 font-mono">
                            {shopProds.length} article(s)
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-black">{shop.nom}</h3>
                          <div className="text-xs text-zinc-600 font-mono flex items-center space-x-1.5 mt-1">
                            <Phone className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{shop.telephone}</span>
                          </div>
                          {shop.adresse && (
                            <div className="text-xs text-zinc-500 flex items-center space-x-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{shop.adresse}</span>
                            </div>
                          )}
                        </div>

                        {shop.description && (
                          <p className="text-xs text-zinc-600 line-clamp-2">
                            {shop.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedShop(shop)}
                          className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors flex items-center space-x-1"
                        >
                          <span>Visiter la boutique</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <a
                          href={`https://wa.me/${shop.telephone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 border border-zinc-300 hover:border-black text-black"
                          title="WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: My Orders */}
        {!selectedShop && activeTab === 'MY_ORDERS' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Mes Commandes Passées
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Suivi en temps réel de vos commandes transmises aux boutiques
              </p>
            </div>

            {myOrders.length === 0 ? (
              <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
                <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
                  Vous n'avez pas encore passé de commande
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Parcourez le catalogue public pour commander auprès des boutiques.
                </p>
                <button
                  onClick={() => setActiveTab('CATALOG')}
                  className="mt-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
                >
                  Voir le catalogue
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((ord) => {
                  const statusMeta = getOrderStatusMeta(ord.statut);
                  const paymentMeta = getPaymentStatusMeta(ord.statutPaiement);

                  return (
                    <div
                      key={ord.id}
                      className="border border-zinc-200 bg-white p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">
                            {ord.numero}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            Passée le {formatDate(ord.date || ord.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-0.5 border ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 border ${paymentMeta.badgeClass}`}>
                            {paymentMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-800">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span>
                              {it.nomProduitSnapshot} <strong>x{it.quantite}</strong>
                            </span>
                            <span className="font-mono font-semibold">
                              {formatCurrency(it.totalLigne)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <div className="text-zinc-500">
                          {ord.adresseLivraison && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 inline" />
                              <span>Livraison : {ord.adresseLivraison}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                            Total Commande
                          </span>
                          <span className="font-mono font-black text-base text-black">
                            {formatCurrency(ord.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-zinc-300 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base text-black uppercase tracking-tight">
                  Votre Panier ({cartItemsCount} article{cartItemsCount > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  Votre panier est vide.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-zinc-200 border border-zinc-200">
                    {cart.map((item) => {
                      const price = item.product.shopType === 'GROSSISTE' && item.product.prixGros
                        ? item.product.prixGros
                        : item.product.prix;

                      return (
                        <div key={item.product.id} className="p-3 bg-white flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase font-mono text-zinc-400 block truncate">
                              Boutique : {item.product.shopName}
                            </span>
                            <div className="font-bold text-sm text-black truncate">
                              {item.product.nom}
                            </div>
                            <div className="font-mono text-zinc-600 text-xs">
                              {formatCurrency(price)}
                              {item.product.unite && ` / ${item.product.unite}`}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="p-1 border border-zinc-300 hover:border-black text-black"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-sm px-1">
                              {item.quantite}
                            </span>
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="p-1 border border-zinc-300 hover:border-black text-black"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right font-mono font-bold text-sm text-black min-w-[80px]">
                            {formatCurrency(price * item.quantite)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-zinc-50 border border-zinc-200 flex justify-between items-center text-sm">
                    <span className="font-bold uppercase tracking-wider text-black">
                      Total de la commande
                    </span>
                    <span className="font-mono font-black text-lg text-black">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>

                  {/* Checkout Form */}
                  <form id="checkout-form" onSubmit={handleCheckout} className="border border-zinc-200 p-4 bg-zinc-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <span className="font-bold uppercase tracking-wider text-black text-[11px]">
                        Coordonnées pour la livraison
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Votre Nom complet *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Riana Randria"
                          value={clientNom}
                          onChange={(e) => setClientNom(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Numéro WhatsApp (indispensable) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+261 34 00 000 00"
                          value={clientTelephone}
                          onChange={(e) => setClientTelephone(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 bg-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Lieu / Quartier de livraison précis *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ankorondrano, en face de l'immeuble Assist"
                          value={clientAdresse}
                          onChange={(e) => setClientAdresse(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Mode de paiement prévu
                        </label>
                        <select
                          value={modePaiement}
                          onChange={(e) => setModePaiement(e.target.value as PaymentMethod)}
                          className="w-full px-3 py-2 border border-zinc-300 bg-white font-semibold"
                        >
                          <option value="MVOLA">MVola</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="AIRTEL_MONEY">Airtel Money</option>
                          <option value="ESPECES">Espèces à la livraison</option>
                          <option value="VIREMENT">Virement bancaire</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Note pour la boutique
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Appelez-moi avant d'envoyer le coursier"
                          value={clientNote}
                          onChange={(e) => setClientNote(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 bg-white"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-xs font-semibold uppercase hover:bg-zinc-200"
                >
                  Continuer mes achats
                </button>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmittingOrder}
                  className="px-5 py-2.5 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingOrder ? 'Transmission...' : 'Valider la commande'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Success Confirmation */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg shadow-2xl p-6 space-y-5 text-center">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-tight text-black">
                Commande transmise au tableau de bord !
              </h3>
              <p className="text-xs text-zinc-600">
                La boutique a immédiatement reçu votre commande dans son tableau de bord de gestion.
              </p>
            </div>

            <div className="border border-zinc-300 bg-zinc-50 p-4 divide-y divide-zinc-200 text-left text-xs">
              {orderSuccessData.orders.map((ord) => {
                const phone = orderSuccessData.shopPhones[ord.shopId] || '';
                return (
                  <div key={ord.id} className="py-2.5 space-y-2 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm bg-black text-white px-2 py-0.5">
                        {ord.numero}
                      </span>
                      <span className="font-mono font-bold text-black">
                        Total : {formatCurrency(ord.total)}
                      </span>
                    </div>

                    <div className="text-zinc-600 text-[11px]">
                      {ord.items.map((i) => `${i.nomProduitSnapshot} (x${i.quantite})`).join(', ')}
                    </div>

                    {phone && (
                      <button
                        onClick={() => openWhatsAppConfirmation(phone, ord.numero, 'la boutique')}
                        className="w-full py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirmer sur WhatsApp ({phone})</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setOrderSuccessData(null);
                  setActiveTab('MY_ORDERS');
                }}
                className="px-4 py-2 bg-white border border-zinc-400 text-black text-xs font-bold uppercase hover:bg-zinc-100"
              >
                Voir dans mes commandes
              </button>
              <button
                onClick={() => setOrderSuccessData(null)}
                className="px-4 py-2 bg-black text-white text-xs font-bold uppercase hover:bg-zinc-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
