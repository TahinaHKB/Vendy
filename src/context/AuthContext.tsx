import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { Shop, UserProfile, ShopType } from '../types';
import { VendyStore, purgeAllDemoAndMockData } from '../services/store';

export interface CreateShopInput {
  nom: string;
  type: ShopType;
  telephone: string;
  description?: string;
  adresse?: string;
  ville?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  myShops: Shop[];
  activeShop: Shop | null;
  shop: Shop | null; // Alias for activeShop for backwards compatibility
  store: VendyStore | null;
  loading: boolean;
  selectShop: (shopId: string) => void;
  createShop: (input: CreateShopInput) => Promise<{ success: boolean; shopId?: string; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    nom: string,
    email: string,
    pass: string,
    tel?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateShopInfo: (updated: Partial<Shop>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [store, setStore] = useState<VendyStore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active shop is the currently selected shop
  const activeShop = myShops.find((s) => s.id === activeShopId) || (myShops.length > 0 ? myShops[0] : null);

  // Sync active store whenever activeShop changes
  useEffect(() => {
    if (activeShop && currentUser) {
      const newStore = new VendyStore(activeShop.id, currentUser.uid);
      setStore(newStore);
    } else {
      if (store) store.unsubscribe();
      setStore(null);
    }
  }, [activeShop?.id, currentUser?.uid]);

  // Listen to Auth State and User Shops
  useEffect(() => {
    purgeAllDemoAndMockData();

    let unsubShops: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);

        // Fetch or create user personal document
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserProfile({
              id: fbUser.uid,
              nom: data.nom || fbUser.displayName || 'Client',
              email: fbUser.email || '',
              telephone: data.telephone || '',
              adresse: data.adresse || '',
              createdAt: data.createdAt || new Date().toISOString()
            });
          } else {
            const newProfile: UserProfile = {
              id: fbUser.uid,
              nom: fbUser.displayName || 'Client',
              email: fbUser.email || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile, { merge: true });
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('User profile sync notice:', err);
          setUserProfile({
            id: fbUser.uid,
            nom: fbUser.displayName || 'Client',
            email: fbUser.email || '',
            createdAt: new Date().toISOString()
          });
        }

        // Listen in real-time to all shops owned by this user
        const shopsQuery = query(collection(db, 'shops'), where('ownerId', '==', fbUser.uid));
        unsubShops = onSnapshot(shopsQuery, (snap) => {
          const list: Shop[] = [];
          snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Shop));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMyShops(list);

          // Restore previously active shop or default to first
          const savedActive = localStorage.getItem(`vendy_active_shop_${fbUser.uid}`);
          if (savedActive && list.some((s) => s.id === savedActive)) {
            setActiveShopId(savedActive);
          } else if (list.length > 0) {
            setActiveShopId(list[0].id);
          } else {
            setActiveShopId(null);
          }
        }, (err) => {
          console.warn('My shops listener notice:', err);
        });

      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setMyShops([]);
        setActiveShopId(null);
        if (store) store.unsubscribe();
        setStore(null);
        if (unsubShops) {
          unsubShops();
          unsubShops = undefined;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubShops) unsubShops();
    };
  }, []);

  const selectShop = (shopId: string) => {
    setActiveShopId(shopId);
    if (currentUser) {
      localStorage.setItem(`vendy_active_shop_${currentUser.uid}`, shopId);
    }
  };

  const createShop = async (input: CreateShopInput): Promise<{ success: boolean; shopId?: string; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Vous devez être connecté pour créer une boutique.' };
    }

    try {
      const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const isGrossiste = input.type === 'GROSSISTE';

      const cleanShop: Record<string, any> = {
        id: shopId,
        ownerId: currentUser.uid,
        nom: input.nom.trim(),
        type: input.type,
        telephone: input.telephone.trim(),
        devise: 'Ar',
        isPublic: true,
        description: input.description?.trim() || (isGrossiste ? 'Grossiste : Vente en gros, balles et cartons.' : 'Vente de vêtements & friperie sur les réseaux sociaux.'),
        conditionnementDefaut: isGrossiste ? 'Balle Friperie (45kg)' : 'Pièce',
        creditAutorise: isGrossiste,
        createdAt: new Date().toISOString()
      };
      if (input.adresse) cleanShop.adresse = input.adresse.trim();
      if (input.ville) cleanShop.ville = input.ville.trim();

      await setDoc(doc(db, 'shops', shopId), cleanShop);

      // Select the new shop immediately
      selectShop(shopId);
      return { success: true, shopId };
    } catch (err: any) {
      console.warn('Create shop notice:', err);
      return { success: false, error: err.message || 'Erreur lors de la création de la boutique dans Firestore' };
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setCurrentUser(cred.user);
      return { success: true };
    } catch (err: any) {
      console.warn('Login notice (invalid credentials or network):', err.code || err.message);
      let msg = 'Identifiants invalides ou erreur de connexion.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Email ou mot de passe incorrect. Si vous n\'avez pas encore de compte, créez votre compte en quelques secondes.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Adresse email invalide.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Trop de tentatives infructueuses. Veuillez patienter un instant.';
      }
      return { success: false, error: msg };
    }
  };

  const registerWithEmail = async (
    nom: string,
    email: string,
    pass: string,
    tel?: string
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: nom.trim() });
        setCurrentUser(cred.user);

        // Every new account is an individual person / client first
        const newProfile: UserProfile = {
          id: cred.user.uid,
          nom: nom.trim(),
          email: email.trim(),
          telephone: tel?.trim() || undefined,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', cred.user.uid), newProfile, { merge: true });
        setUserProfile(newProfile);
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Register notice:', err.code || err.message);
      let msg = 'Erreur lors de la création du compte.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Cet email est déjà associé à un compte. Veuillez vous connecter.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Le mot de passe doit comporter au moins 6 caractères.';
      }
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible d\'envoyer l\'email de réinitialisation.' };
    }
  };

  const logout = async () => {
    if (store) {
      store.unsubscribe();
    }
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setCurrentUser(null);
    setUserProfile(null);
    setMyShops([]);
    setActiveShopId(null);
    setStore(null);
  };

  const updateShopInfo = async (updated: Partial<Shop>) => {
    if (!activeShop || !store) return;
    const nextShop: Shop = { ...activeShop, ...updated };
    await store.saveShop(nextShop);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        myShops,
        activeShop,
        shop: activeShop, // backward-compatibility alias
        store,
        loading,
        selectShop,
        createShop,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        updateShopInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
