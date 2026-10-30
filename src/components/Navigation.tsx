import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  Plus,
  LogOut,
  Store,
  Building2,
  Globe,
  ChevronDown,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onNewOrder: () => void;
  onOpenPublicMarketplace: () => void;
  onOpenCreateShop: () => void;
  onLogout?: () => void;
  onOpenMobileAppModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onNewOrder,
  onOpenPublicMarketplace,
  onOpenCreateShop,
  onLogout,
  onOpenMobileAppModal
}) => {
  const { shop, myShops, selectShop, userProfile, logout } = useAuth();
  const isGrossiste = shop?.type === 'GROSSISTE';

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag },
    { id: 'products', label: isGrossiste ? 'Stocks & Lots' : 'Produits & Stock', icon: Package },
    { id: 'customers', label: isGrossiste ? 'Revendeurs & Clients' : 'Clients', icon: Users },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Shop Switcher */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-black tracking-tighter text-lg shrink-0">
              V
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-zinc-950 tracking-tight text-lg">VENDY</span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 font-mono font-bold ${
                    isGrossiste ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-800'
                  }`}
                >
                  {isGrossiste ? 'GROSSISTE' : 'VENTE SOCIALE'}
                </span>
              </div>

              {/* Shop Selector Dropdown for multi-shop owners */}
              <div className="flex items-center space-x-1.5 text-xs text-zinc-600 mt-0.5">
                {isGrossiste ? (
                  <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}

                {myShops.length > 1 ? (
                  <select
                    value={shop?.id || ''}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        onOpenCreateShop();
                      } else {
                        selectShop(e.target.value);
                      }
                    }}
                    className="text-xs font-bold text-black border-b border-zinc-300 bg-transparent pr-4 focus:outline-none focus:border-black cursor-pointer max-w-[150px] sm:max-w-xs truncate"
                  >
                    {myShops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom} ({s.type === 'GROSSISTE' ? 'Grossiste' : 'Détail'})
                      </option>
                    ))}
                    <option value="__NEW__">+ Créer une autre boutique...</option>
                  </select>
                ) : (
                  <span className="font-semibold text-black truncate max-w-[140px] sm:max-w-xs">
                    {shop?.nom || 'Ma Boutique'}
                  </span>
                )}

                <button
                  onClick={onOpenCreateShop}
                  title="Créer une autre boutique"
                  className="hidden sm:inline-block ml-1 text-[10px] text-zinc-400 hover:text-black font-semibold uppercase tracking-wider hover:underline"
                >
                  + Nouvelle boutique
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Download/Install Mobile App Button */}
            {onOpenMobileAppModal && (
              <button
                onClick={onOpenMobileAppModal}
                title="Télécharger l'application mobile Android (.APK) ou iOS (.IPA)"
                className="flex items-center space-x-1.5 px-2.5 py-2 border border-zinc-900 bg-zinc-900 text-white hover:bg-black text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">App (.APK / .IPA)</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            {/* View Public Catalogue Button */}
            <button
              onClick={onOpenPublicMarketplace}
              title="Passer en mode client pour explorer le catalogue public"
              className="hidden lg:flex items-center space-x-1 px-2.5 py-2 border border-zinc-300 hover:border-black text-black text-xs font-bold uppercase tracking-wider transition-colors bg-zinc-50"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Catalogue Client</span>
            </button>

            {/* Quick Create Order */}
            <button
              onClick={onNewOrder}
              className="flex items-center space-x-1.5 px-3 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Créer Commande</span>
              <span className="sm:hidden">Créer</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  logout();
                }
              }}
              title="Déconnexion"
              className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-300 shadow-lg">
        <div className="grid grid-cols-6 text-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-0.5 transition-colors ${
                  isActive
                    ? 'text-black bg-zinc-100 font-bold border-t-2 border-black -mt-[2px]'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-1.5'}`} />
                <span className="text-[9px] mt-1 tracking-tight truncate w-full">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* Public Catalog shortcut on mobile */}
          <button
            onClick={onOpenPublicMarketplace}
            className="flex flex-col items-center justify-center py-2 px-0.5 text-black hover:bg-zinc-100 transition-colors border-l border-zinc-200"
          >
            <Globe className="w-4 h-4" />
            <span className="text-[9px] mt-1 tracking-tight font-bold">Public</span>
          </button>
        </div>
      </div>
    </header>
  );
};
