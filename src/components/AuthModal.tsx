import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  ShoppingBag,
  Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose?: () => void;
  onExplorePublic?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onExplorePublic }) => {
  const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('+261 ');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === 'LOGIN') {
      const res = await loginWithEmail(email, password);
      if (!res.success) {
        setError(res.error || 'Erreur lors de la connexion.');
      } else if (onClose) {
        onClose();
      }
    } else if (mode === 'REGISTER') {
      if (!nom.trim()) {
        setError('Veuillez renseigner votre nom complet.');
        setLoading(false);
        return;
      }
      const res = await registerWithEmail(
        nom,
        email,
        password,
        telephone
      );
      if (!res.success) {
        setError(res.error || 'Erreur lors de la création du compte.');
      } else if (onClose) {
        onClose();
      }
    } else if (mode === 'RESET') {
      const res = await resetPassword(email);
      if (res.success) {
        setSuccessMsg('Un lien de réinitialisation vous a été envoyé par email.');
      } else {
        setError(res.error || 'Impossible d\'envoyer le courriel.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-0 top-0 p-2 text-zinc-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="inline-flex w-12 h-12 bg-black text-white items-center justify-center font-black text-2xl tracking-tighter shadow-md">
            V
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black">VENDY</h1>
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
            Vente Friperie • Grands Grossistes • Marketplace
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 bg-white border border-zinc-300 p-6 sm:p-8 shadow-sm">
          {/* Main Mode Navigation Tabs */}
          <div className="flex border-b border-zinc-200 mb-6 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                mode === 'LOGIN' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-black'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                mode === 'REGISTER' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-black'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Registration Info Note */}
          {mode === 'REGISTER' && (
            <div className="mb-5 bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-700 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-black uppercase text-[10px] tracking-wider">
                <User className="w-3.5 h-3.5" />
                <span>Compte Personnel & Client</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Votre compte vous permet de commander sur le site. Vous pourrez ensuite <strong>créer une ou plusieurs boutiques</strong> (vendeur friperie ou grand grossiste) et en être le seul propriétaire.
              </p>
            </div>
          )}

          {/* Notifications */}
          {error && (
            <div className="mb-4 p-3 bg-zinc-100 border border-black text-black text-xs font-semibold space-y-1.5">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {mode === 'LOGIN' && (
                <div className="pt-1.5 border-t border-zinc-200 flex items-center justify-between text-[11px] font-normal">
                  <span className="text-zinc-600">Pas encore de compte ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      setError(null);
                    }}
                    className="underline font-bold text-black hover:text-zinc-700"
                  >
                    Créer un compte ici
                  </button>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-zinc-950 text-white text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'REGISTER' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Votre Nom complet *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tahina Andriantsoa"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Adresse Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="votre-email@domaine.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white"
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Numéro de Téléphone (optionnel)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="+261 34 00 000 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white"
                  />
                </div>
              </div>
            )}

            {mode !== 'RESET' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    Mot de passe *
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('RESET');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-black underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:outline-none focus:border-black bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-1 mt-4"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                <>
                  <span>
                    {mode === 'LOGIN'
                      ? 'Se connecter'
                      : mode === 'REGISTER'
                      ? 'Créer mon compte'
                      : 'Envoyer le lien de réinitialisation'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>
          </form>

          {mode === 'RESET' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-zinc-600 hover:text-black underline font-semibold"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Explore public catalog without logging in */}
          {onExplorePublic && (
            <div className="mt-6 pt-4 border-t border-zinc-200 text-center">
              <button
                type="button"
                onClick={onExplorePublic}
                className="text-xs text-zinc-500 hover:text-black flex items-center justify-center space-x-1.5 mx-auto font-medium"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Continuer vers le catalogue public sans se connecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
