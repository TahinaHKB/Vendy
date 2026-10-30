import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Edit,
  AlertTriangle,
  Tag,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ProductsListProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onArchiveProduct: (productId: string, archived: boolean) => Promise<void>;
  getReservedQuantity: (productId: string) => number;
  getAvailableStock: (productId: string) => number;
}

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onArchiveProduct,
  getReservedQuantity,
  getAvailableStock
}) => {
  const { shop } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TOUS');
  const [viewFilter, setViewFilter] = useState<'ACTIFS' | 'ARCHIVES' | 'RUPTURE' | 'TOUS'>('ACTIFS');

  // Categories present in catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products.filter((p) => {
      // 1. View Filter
      if (viewFilter === 'ACTIFS' && p.archived) return false;
      if (viewFilter === 'ARCHIVES' && !p.archived) return false;
      if (viewFilter === 'RUPTURE') {
        const avail = getAvailableStock(p.id);
        if (p.archived || avail > 0) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'TOUS' && p.categorie !== categoryFilter) return false;

      // 3. Search query
      if (q) {
        const matchName = p.nom.toLowerCase().includes(q);
        const matchCat = p.categorie?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc) return false;
      }

      return true;
    });
  }, [products, search, categoryFilter, viewFilter, getAvailableStock]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Produits & Stocks
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Inventaire de friperie et vêtements avec gestion des réservations
          </p>
        </div>

        <button
          onClick={onAddProduct}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-1 border-b border-zinc-200 overflow-x-auto pb-1">
        {[
          { id: 'ACTIFS', label: 'En vente' },
          { id: 'RUPTURE', label: 'Rupture de stock' },
          { id: 'ARCHIVES', label: 'Archivés' },
          { id: 'TOUS', label: 'Tous' }
        ].map((tab) => {
          const isActive = viewFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewFilter(tab.id as any)}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-black text-black bg-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-black hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-zinc-200 p-3.5 flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un vêtement, catégorie..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
          />
        </div>

        {/* Category Dropdown */}
        <div className="sm:w-64">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-zinc-300 focus:outline-none focus:border-black bg-white"
          >
            <option value="TOUS">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Package className="w-10 h-10 text-zinc-300 mx-auto stroke-1" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mt-3">
            Aucun article trouvé
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Aucun produit ne correspond à ces critères dans votre catalogue.
          </p>
          <button
            onClick={onAddProduct}
            className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider"
          >
            Ajouter un produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const reserved = getReservedQuantity(p.id);
            const available = getAvailableStock(p.id);
            const isOutOfStock = available <= 0;

            return (
              <div
                key={p.id}
                className={`border bg-white flex flex-col justify-between transition-all ${
                  p.archived
                    ? 'border-zinc-300 opacity-60 bg-zinc-50'
                    : isOutOfStock
                    ? 'border-zinc-400'
                    : 'border-zinc-200 hover:border-black'
                }`}
              >
                <div>
                  {/* Image / Thumbnail Header */}
                  <div className="h-44 bg-zinc-100 border-b border-zinc-200 relative overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.nom}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto" />
                        <span className="text-[10px] text-zinc-400 uppercase mt-1 block">
                          Sans photo
                        </span>
                      </div>
                    )}

                    {/* Category Tag overlay */}
                    <div className="absolute top-2 left-2 bg-black text-white text-[10px] uppercase font-mono px-2 py-0.5 tracking-wider">
                      {p.categorie || 'Vêtement'}
                    </div>

                    {/* Archived or Stock Status overlay */}
                    {p.archived ? (
                      <div className="absolute top-2 right-2 bg-zinc-600 text-white text-[10px] uppercase font-mono px-2 py-0.5">
                        Archivé
                      </div>
                    ) : isOutOfStock ? (
                      <div className="absolute top-2 right-2 bg-zinc-950 text-white text-[10px] uppercase font-mono px-2 py-0.5 border border-white">
                        Épuisé
                      </div>
                    ) : reserved > 0 ? (
                      <div className="absolute top-2 right-2 bg-zinc-100 border border-black text-black text-[10px] uppercase font-mono font-bold px-2 py-0.5">
                        {reserved} Réservé(s)
                      </div>
                    ) : null}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-950 leading-snug">
                        {p.nom}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-extrabold text-black">
                        {formatCurrency(p.prix, shop?.devise)}
                      </span>
                    </div>

                    {/* Stock Breakdown (Physical vs Reserved vs Available) */}
                    <div className="border border-zinc-200 bg-zinc-50 p-2.5 grid grid-cols-3 text-center text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 block">Physique</span>
                        <span className="font-mono font-semibold text-zinc-800">{p.stock}</span>
                      </div>
                      <div className="border-x border-zinc-200">
                        <span className="text-[10px] uppercase text-zinc-500 block">Réservé</span>
                        <span className="font-mono font-semibold text-zinc-800">{reserved}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-black block">Dispo</span>
                        <span
                          className={`font-mono font-black ${
                            available > 0 ? 'text-black' : 'text-zinc-400'
                          }`}
                        >
                          {available}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex items-center space-x-1 text-xs font-semibold text-zinc-700 hover:text-black uppercase tracking-wider"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>

                  <button
                    onClick={() => onArchiveProduct(p.id, !p.archived)}
                    className="flex items-center space-x-1 text-xs font-semibold text-zinc-500 hover:text-black uppercase tracking-wider"
                  >
                    {p.archived ? (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Restaurer</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archiver</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
