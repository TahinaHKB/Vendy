export type ShopType = 'VENDEUR_EN_LIGNE' | 'GROSSISTE';

export type OrderStatus =
  | 'A_CONFIRMER'      // Commande enregistrée, confirmation attendue
  | 'RESERVEE'          // Article réservé, quantité indisponible pour autre réservation
  | 'A_PREPARER'        // Commande confirmée et à préparer
  | 'PRETE'             // Commande préparée, en attente de remise ou livraison
  | 'LIVREE'            // Commande considérée comme remise au client
  | 'ANNULEE';          // Commande annulée, stock libéré

export type PaymentStatus =
  | 'NON_PAYE'
  | 'ACOMPTE_RECU'
  | 'PAYE';

export type PaymentMethod =
  | 'ESPECES'
  | 'MVOLA'
  | 'ORANGE_MONEY'
  | 'AIRTEL_MONEY'
  | 'VIREMENT'
  | 'CREDIT_GROSSISTE'
  | 'AUTRE';

export interface UserProfile {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  nom: string;
  type: ShopType; // 'VENDEUR_EN_LIGNE' ou 'GROSSISTE'
  telephone: string;
  devise: string; // ex: 'Ar'
  description?: string;
  adresse?: string;
  ville?: string;
  conditionnementDefaut?: string; // ex: 'Carton', 'Colis', 'Balle friperie'
  creditAutorise?: boolean; // Vente à crédit/terme pour les grossistes
  isPublic?: boolean; // Visible sur le catalogue public
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  ownerId?: string;
  nom: string;
  prix: number;
  prixGros?: number; // Prix spécifique grossiste / lot
  quantiteMinGros?: number; // Seuil minimum de commande en gros (ex: 5, 10)
  unite?: string; // 'Pièce', 'Carton', 'Lot de 5', 'Balle 45kg', etc.
  stock: number; // Stock physique
  categorie: string;
  imageUrl?: string;
  description?: string;
  archived: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  notes?: string;
  typeClient?: 'PARTICULIER' | 'REVENDEUR' | 'BOUTIQUE';
  plafondCredit?: number; // Pour les grossistes: montant max de crédit accordé
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  nomProduitSnapshot: string;
  prixSnapshot: number;
  quantite: number;
  totalLigne: number;
  unite?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  montant: number;
  date: string;
  type: PaymentMethod;
  note?: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerId: string;
  numero: string; // ex: CMD-2026-001
  statut: OrderStatus;
  statutPaiement: PaymentStatus;
  total: number;
  montantPaye: number;
  date: string;
  note?: string;
  adresseLivraison?: string;
  items: OrderItem[];
  payments: PaymentRecord[];
  source?: 'DIRECT_VENDEUR' | 'CATALOGUE_PUBLIC';
  clientAuthId?: string; // Si le client public s'est connecté
  clientNomPublic?: string;
  clientTelPublic?: string;
  dateEcheanceCredit?: string; // Pour les grossistes accordant un délai de paiement
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilterOptions {
  searchQuery: string;
  statut?: OrderStatus | 'TOUS';
  statutPaiement?: PaymentStatus | 'TOUS';
  periode?: 'TOUT' | 'AUJOURDHUI' | '7_JOURS' | '30_JOURS';
  productId?: string;
}

export interface CartItem {
  product: Product;
  shop: Shop;
  quantite: number;
}
