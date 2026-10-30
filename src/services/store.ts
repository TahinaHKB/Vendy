import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  Customer,
  Order,
  Shop,
  OrderStatus,
  PaymentStatus,
  ShopType,
  PaymentMethod
} from '../types';

export const DEFAULT_CATEGORIES = [
  'Robes & Jupes',
  'Chemises & Hauts',
  'Pantalons & Jeans',
  'Vestes & Manteaux',
  'Friperie Balle & Gros',
  'Chaussures',
  'Sacs & Accessoires',
  'Autre'
];

export const GROSSISTE_UNITS = [
  'Pièce',
  'Lot de 5',
  'Lot de 10',
  'Lot de 20',
  'Carton (50 pcs)',
  'Balle Friperie (45kg)',
  'Colis Assorti'
];

export const purgeAllDemoAndMockData = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('vendy_') || key.includes('order') || key.includes('demo') || key.includes('mock'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
};

// Immediate purge on startup
purgeAllDemoAndMockData();

export class VendyStore {
  public shopId: string;
  public ownerId?: string;
  private onProductsChange?: (products: Product[]) => void;
  private onCustomersChange?: (customers: Customer[]) => void;
  private onOrdersChange?: (orders: Order[]) => void;
  private onShopChange?: (shop: Shop | null) => void;

  private unsubProducts?: () => void;
  private unsubCustomers?: () => void;
  private unsubOrders?: () => void;
  private unsubShop?: () => void;

  private isListening = false;
  private currentShop: Shop | null = null;
  private currentProducts: Product[] = [];
  private currentOrders: Order[] = [];
  private currentCustomers: Customer[] = [];

  constructor(shopId: string, ownerId?: string) {
    this.shopId = shopId;
    this.ownerId = ownerId;
  }

  // Bind real-time Firestore listeners
  public subscribe(callbacks: {
    onProducts?: (products: Product[]) => void;
    onCustomers?: (customers: Customer[]) => void;
    onOrders?: (orders: Order[]) => void;
    onShop?: (shop: Shop | null) => void;
  }) {
    if (callbacks.onProducts !== undefined) {
      this.onProductsChange = callbacks.onProducts;
      if (this.currentProducts.length > 0) callbacks.onProducts(this.currentProducts);
    }
    if (callbacks.onCustomers !== undefined) {
      this.onCustomersChange = callbacks.onCustomers;
      if (this.currentCustomers.length > 0) callbacks.onCustomers(this.currentCustomers);
    }
    if (callbacks.onOrders !== undefined) {
      this.onOrdersChange = callbacks.onOrders;
      if (this.currentOrders.length > 0) callbacks.onOrders(this.currentOrders);
    }
    if (callbacks.onShop !== undefined) {
      this.onShopChange = callbacks.onShop;
      if (this.currentShop) callbacks.onShop(this.currentShop);
    }

    if (this.isListening) return;
    this.isListening = true;

    try {
      // 1. Shop Profile from Firestore
      const shopRef = doc(db, 'shops', this.shopId);
      this.unsubShop = onSnapshot(shopRef, (snap) => {
        if (snap.exists()) {
          const shopData = { ...snap.data(), id: snap.id } as Shop;
          this.currentShop = shopData;
          if (this.onShopChange) this.onShopChange(shopData);
        } else {
          this.currentShop = null;
          if (this.onShopChange) this.onShopChange(null);
        }
      }, (err) => {
        console.warn('Firestore shop listener notice:', err.message);
      });

      // 2. Products from Firestore
      const prodQuery = query(collection(db, 'products'), where('shopId', '==', this.shopId));
      this.unsubProducts = onSnapshot(prodQuery, (snap) => {
        const list: Product[] = [];
        snap.forEach(d => list.push({ ...d.data(), id: d.id } as Product));
        this.currentProducts = list;
        if (this.onProductsChange) this.onProductsChange(list);
      }, (err) => {
        console.warn('Firestore products listener notice:', err.message);
      });

      // 3. Customers from Firestore
      const custQuery = query(collection(db, 'customers'), where('shopId', '==', this.shopId));
      this.unsubCustomers = onSnapshot(custQuery, (snap) => {
        const list: Customer[] = [];
        snap.forEach(d => list.push({ ...d.data(), id: d.id } as Customer));
        this.currentCustomers = list;
        if (this.onCustomersChange) this.onCustomersChange(list);
      }, (err) => {
        console.warn('Firestore customers listener notice:', err.message);
      });

      // 4. Orders from Firestore
      const orderQuery = query(collection(db, 'orders'), where('shopId', '==', this.shopId));
      this.unsubOrders = onSnapshot(orderQuery, (snap) => {
        const list: Order[] = [];
        snap.forEach(d => list.push({ ...d.data(), id: d.id } as Order));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.currentOrders = list;
        if (this.onOrdersChange) this.onOrdersChange(list);
      }, (err) => {
        console.warn('Firestore orders listener notice:', err.message);
      });
    } catch (e) {
      console.warn('Firestore listener setup notice:', e);
    }
  }

  public unsubscribe() {
    this.unsubProducts?.();
    this.unsubCustomers?.();
    this.unsubOrders?.();
    this.unsubShop?.();
    this.unsubProducts = undefined;
    this.unsubCustomers = undefined;
    this.unsubOrders = undefined;
    this.unsubShop = undefined;
    this.isListening = false;
  }

  // --- Shop Operations ---
  public async getShop(): Promise<Shop | null> {
    try {
      const snap = await getDoc(doc(db, 'shops', this.shopId));
      if (snap.exists()) {
        const shop = { ...snap.data(), id: snap.id } as Shop;
        this.currentShop = shop;
        return shop;
      }
    } catch (err) {
      console.warn('Firestore getShop error:', err);
    }
    return null;
  }

  public async saveShop(shop: Shop): Promise<{ success: boolean; error?: string }> {
    const cleanShop: Record<string, any> = {
      id: shop.id || this.shopId,
      ownerId: shop.ownerId,
      nom: shop.nom.trim(),
      type: shop.type || 'VENDEUR_EN_LIGNE',
      telephone: shop.telephone.trim(),
      devise: shop.devise || 'Ar',
      isPublic: shop.isPublic ?? true,
      createdAt: shop.createdAt || new Date().toISOString()
    };
    if (shop.description) cleanShop.description = shop.description.trim();
    if (shop.adresse) cleanShop.adresse = shop.adresse.trim();
    if (shop.ville) cleanShop.ville = shop.ville.trim();
    if (shop.conditionnementDefaut) cleanShop.conditionnementDefaut = shop.conditionnementDefaut;
    if (shop.creditAutorise !== undefined) cleanShop.creditAutorise = shop.creditAutorise;

    try {
      await setDoc(doc(db, 'shops', this.shopId), cleanShop, { merge: true });
      this.currentShop = cleanShop as Shop;
      if (this.onShopChange) this.onShopChange(cleanShop as Shop);
      return { success: true };
    } catch (err: any) {
      console.error('Firestore saveShop error:', err);
      return { success: false, error: err.message || 'Erreur lors de l\'enregistrement de la boutique' };
    }
  }

  // --- Product Operations ---
  public getProducts(): Product[] {
    return this.currentProducts;
  }

  public async saveProduct(product: Product): Promise<{ success: boolean; error?: string }> {
    const shopId = product.shopId || this.shopId;
    if (!shopId) {
      return { success: false, error: 'Identifiant de boutique introuvable. Veuillez vous reconnecter.' };
    }

    const cleanProduct: Record<string, any> = {
      id: product.id,
      shopId: shopId,
      nom: product.nom.trim(),
      prix: Number(product.prix) || 0,
      stock: Number(product.stock) || 0,
      categorie: product.categorie || 'Autre',
      archived: product.archived ?? false,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const effectiveOwnerId = this.ownerId || product.ownerId;
    if (effectiveOwnerId) {
      cleanProduct.ownerId = effectiveOwnerId;
    }
    if (product.prixGros !== undefined && product.prixGros !== null && !isNaN(product.prixGros)) {
      cleanProduct.prixGros = Number(product.prixGros);
    }
    if (product.unite) cleanProduct.unite = product.unite.trim();
    if (product.imageUrl) cleanProduct.imageUrl = product.imageUrl.trim();
    if (product.description) cleanProduct.description = product.description.trim();

    try {
      console.log('Writing product to Firestore:', cleanProduct);
      const prodRef = doc(db, 'products', cleanProduct.id);
      await setDoc(prodRef, cleanProduct, { merge: true });

      // Immediate local state update for zero latency
      const idx = this.currentProducts.findIndex(p => p.id === cleanProduct.id);
      if (idx >= 0) {
        this.currentProducts[idx] = cleanProduct as Product;
      } else {
        this.currentProducts = [cleanProduct as Product, ...this.currentProducts];
      }
      if (this.onProductsChange) {
        this.onProductsChange([...this.currentProducts]);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Firestore saveProduct error:', err);
      let errMsg = err.message || 'Erreur lors de l\'enregistrement dans Firestore';
      if (err.code === 'permission-denied') {
        errMsg = 'Permission Firestore refusée. Vérifiez vos règles de sécurité.';
      }
      return { success: false, error: errMsg };
    }
  }

  public async archiveProduct(productId: string, archived: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'products', productId), {
        archived,
        updatedAt: new Date().toISOString()
      });
      const prod = this.currentProducts.find(p => p.id === productId);
      if (prod) {
        prod.archived = archived;
        if (this.onProductsChange) this.onProductsChange([...this.currentProducts]);
      }
    } catch (err) {
      console.error('Firestore archiveProduct error:', err);
    }
  }

  // --- Customer Operations ---
  public getCustomers(): Customer[] {
    return this.currentCustomers;
  }

  public async saveCustomer(customer: Customer): Promise<{ success: boolean; error?: string }> {
    const cleanCustomer: Record<string, any> = {
      id: customer.id,
      shopId: customer.shopId || this.shopId,
      nom: customer.nom.trim(),
      telephone: customer.telephone.trim(),
      createdAt: customer.createdAt || new Date().toISOString()
    };
    if (customer.adresse) cleanCustomer.adresse = customer.adresse.trim();
    if (customer.notes) cleanCustomer.notes = customer.notes.trim();
    if (customer.email) cleanCustomer.email = customer.email.trim();
    if (customer.typeClient) cleanCustomer.typeClient = customer.typeClient;
    if (customer.plafondCredit) cleanCustomer.plafondCredit = customer.plafondCredit;

    try {
      await setDoc(doc(db, 'customers', customer.id), cleanCustomer, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Firestore saveCustomer error:', err);
      return { success: false, error: err.message };
    }
  }

  // --- Order Operations ---
  public getOrders(): Order[] {
    return this.currentOrders;
  }

  public getProductReservedQuantity(productId: string, excludeOrderId?: string): number {
    const orders = this.getOrders();
    const activeOrders = orders.filter(o => 
      o.id !== excludeOrderId && 
      (o.statut === 'RESERVEE' || o.statut === 'A_PREPARER' || o.statut === 'PRETE')
    );

    let reservedCount = 0;
    for (const order of activeOrders) {
      for (const item of order.items) {
        if (item.productId === productId) {
          reservedCount += item.quantite;
        }
      }
    }
    return reservedCount;
  }

  public getProductAvailableStock(productId: string, excludeOrderId?: string): number {
    const product = this.getProducts().find(p => p.id === productId);
    if (!product) return 0;
    const reserved = this.getProductReservedQuantity(productId, excludeOrderId);
    return Math.max(0, product.stock - reserved);
  }

  public async saveOrder(order: Order, previousStatus?: OrderStatus): Promise<{ success: boolean; error?: string }> {
    for (const item of order.items) {
      if (item.quantite <= 0) {
        return { success: false, error: 'Les quantités doivent être strictement supérieures à zéro.' };
      }
      if (item.prixSnapshot < 0) {
        return { success: false, error: 'Le prix unitaire ne peut pas être négatif.' };
      }
    }

    const isNowReserving = ['RESERVEE', 'A_PREPARER', 'PRETE', 'LIVREE'].includes(order.statut);
    const wasAlreadyReserving = previousStatus && ['RESERVEE', 'A_PREPARER', 'PRETE', 'LIVREE'].includes(previousStatus);

    if (isNowReserving && (!previousStatus || !wasAlreadyReserving || previousStatus === 'A_CONFIRMER' || previousStatus === 'ANNULEE')) {
      for (const item of order.items) {
        const available = this.getProductAvailableStock(item.productId, order.id);
        if (available < item.quantite) {
          const prod = this.getProducts().find(p => p.id === item.productId);
          return {
            success: false,
            error: `Stock insuffisant pour "${prod?.nom || 'l\'article'}". Disponible: ${available}, requis: ${item.quantite}.`
          };
        }
      }
    }

    if (order.statut === 'LIVREE' && previousStatus !== 'LIVREE') {
      const products = this.getProducts();
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantite);
          await this.saveProduct({ ...prod, stock: newStock, updatedAt: new Date().toISOString() });
        }
      }
    } else if (previousStatus === 'LIVREE' && order.statut === 'ANNULEE') {
      const products = this.getProducts();
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = prod.stock + item.quantite;
          await this.saveProduct({ ...prod, stock: newStock, updatedAt: new Date().toISOString() });
        }
      }
    }

    const calculatedItems = order.items.map(item => ({
      ...item,
      totalLigne: item.quantite * item.prixSnapshot
    }));
    const total = calculatedItems.reduce((acc, it) => acc + it.totalLigne, 0);

    const cleanOrder: Record<string, any> = {
      id: order.id,
      shopId: order.shopId || this.shopId,
      customerId: order.customerId,
      numero: order.numero,
      statut: order.statut,
      statutPaiement: order.statutPaiement,
      total: total,
      montantPaye: order.montantPaye || 0,
      date: order.date || new Date().toISOString(),
      items: calculatedItems,
      payments: order.payments || [],
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (order.note) cleanOrder.note = order.note.trim();
    if (order.adresseLivraison) cleanOrder.adresseLivraison = order.adresseLivraison.trim();
    if (order.source) cleanOrder.source = order.source;
    if (order.clientAuthId) cleanOrder.clientAuthId = order.clientAuthId;
    if (order.clientNomPublic) cleanOrder.clientNomPublic = order.clientNomPublic;
    if (order.clientTelPublic) cleanOrder.clientTelPublic = order.clientTelPublic;
    if (order.dateEcheanceCredit) cleanOrder.dateEcheanceCredit = order.dateEcheanceCredit;

    try {
      await setDoc(doc(db, 'orders', order.id), cleanOrder, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Firestore saveOrder error:', err);
      return { success: false, error: err.message };
    }
  }

  public getNextOrderNumber(): string {
    const orders = this.getOrders();
    const count = orders.length + 1;
    const padded = String(count).padStart(3, '0');
    return `CMD-${padded}`;
  }

  // --- Wholesale metrics ---
  public getWholesaleFinancialStats(): {
    totalCreancesEnAttente: number;
    totalEncaissements: number;
    valeurStockPhysique: number;
    totalCommandesGros: number;
    nombreClientsDebiteurs: number;
  } {
    const orders = this.getOrders().filter(o => o.statut !== 'ANNULEE');
    const products = this.getProducts().filter(p => !p.archived);

    let totalCreancesEnAttente = 0;
    let totalEncaissements = 0;
    const debiteurCustomerIds = new Set<string>();

    orders.forEach(o => {
      totalEncaissements += (o.montantPaye || 0);
      const reste = Math.max(0, o.total - (o.montantPaye || 0));
      if (reste > 0) {
        totalCreancesEnAttente += reste;
        debiteurCustomerIds.add(o.customerId);
      }
    });

    const valeurStockPhysique = products.reduce((acc, p) => acc + (p.stock * p.prix), 0);

    return {
      totalCreancesEnAttente,
      totalEncaissements,
      valeurStockPhysique,
      totalCommandesGros: orders.length,
      nombreClientsDebiteurs: debiteurCustomerIds.size
    };
  }

  // --- Real-time Public Marketplace from Firestore (Pure Live Sync) ---
  public static subscribeToPublicCatalog(callback: (data: {
    shops: Shop[];
    products: (Product & { shopName: string; shopType: ShopType; shopPhone: string; shopAddress?: string })[];
  }) => void): () => void {
    let latestShops: Shop[] = [];
    let latestProducts: Product[] = [];

    const notify = () => {
      const shopMap = new Map<string, Shop>();
      latestShops.forEach(s => shopMap.set(s.id, s));

      const enrichedProducts: (Product & { shopName: string; shopType: ShopType; shopPhone: string; shopAddress?: string })[] = [];
      latestProducts.forEach(p => {
        const s = shopMap.get(p.shopId);
        if (s && s.isPublic !== false && !p.archived) {
          enrichedProducts.push({
            ...p,
            shopName: s.nom,
            shopType: s.type,
            shopPhone: s.telephone,
            shopAddress: s.adresse
          });
        }
      });

      callback({
        shops: latestShops.filter(s => s.isPublic !== false),
        products: enrichedProducts
      });
    };

    const unsubShops = onSnapshot(collection(db, 'shops'), (snap) => {
      const list: Shop[] = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Shop));
      latestShops = list;
      notify();
    }, (err) => {
      console.warn('Firestore public shops listener:', err.message);
    });

    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => {
        const p = { ...d.data(), id: d.id } as Product;
        if (!p.archived) list.push(p);
      });
      latestProducts = list;
      notify();
    }, (err) => {
      console.warn('Firestore public products listener:', err.message);
    });

    return () => {
      unsubShops();
      unsubProds();
    };
  }

  // --- Place Public Order directly into Firestore ---
  public static async placePublicOrder(params: {
    shopId: string;
    clientNom: string;
    clientTelephone: string;
    clientAdresse?: string;
    clientNote?: string;
    clientAuthId?: string;
    items: { product: Product; quantite: number }[];
    modePaiementChoisi?: PaymentMethod;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const shopSnap = await getDoc(doc(db, 'shops', params.shopId));
      if (!shopSnap.exists()) {
        return { success: false, error: 'Boutique introuvable dans Firestore.' };
      }
      const shop = { ...shopSnap.data(), id: shopSnap.id } as Shop;

      const custId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cleanCustomer: Record<string, any> = {
        id: custId,
        shopId: params.shopId,
        nom: params.clientNom.trim(),
        telephone: params.clientTelephone.trim(),
        notes: 'Commande passée depuis le catalogue public.',
        typeClient: shop.type === 'GROSSISTE' ? 'REVENDEUR' : 'PARTICULIER',
        createdAt: new Date().toISOString()
      };
      if (params.clientAdresse?.trim()) {
        cleanCustomer.adresse = params.clientAdresse.trim();
      }
      await setDoc(doc(db, 'customers', custId), cleanCustomer);

      const orderItems = params.items.map(it => {
        const unitPrice = shop.type === 'GROSSISTE' && it.product.prixGros ? it.product.prixGros : it.product.prix;
        const itemObj: Record<string, any> = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: it.product.id,
          nomProduitSnapshot: it.product.nom,
          prixSnapshot: unitPrice,
          quantite: it.quantite,
          totalLigne: unitPrice * it.quantite
        };
        if (it.product.unite) itemObj.unite = it.product.unite;
        return itemObj as any;
      });

      const total = orderItems.reduce((acc, i) => acc + i.totalLigne, 0);
      const orderNumber = `${shop.type === 'GROSSISTE' ? 'GROS' : 'CMD'}-${String(Date.now()).slice(-4)}`;
      const orderId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const cleanOrder: Record<string, any> = {
        id: orderId,
        shopId: params.shopId,
        customerId: custId,
        numero: orderNumber,
        statut: 'A_CONFIRMER',
        statutPaiement: 'NON_PAYE',
        total,
        montantPaye: 0,
        date: new Date().toISOString(),
        items: orderItems,
        payments: [],
        source: 'CATALOGUE_PUBLIC',
        clientNomPublic: params.clientNom,
        clientTelPublic: params.clientTelephone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (params.clientNote?.trim()) {
        cleanOrder.note = params.clientNote.trim();
      }
      if (params.clientAdresse?.trim()) {
        cleanOrder.adresseLivraison = params.clientAdresse.trim();
      }
      if (params.clientAuthId) {
        cleanOrder.clientAuthId = params.clientAuthId;
      }

      await setDoc(doc(db, 'orders', orderId), cleanOrder);

      return { success: true, order: cleanOrder as Order };
    } catch (err: any) {
      console.error('placePublicOrder error:', err);
      return { success: false, error: err.message || 'Erreur lors de la commande.' };
    }
  }
}
