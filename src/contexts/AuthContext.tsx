import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from '../firebase/config';
import type { AppLanguage, UserDoc, UserRole } from '../types';

export interface OnboardingPayload {
  role: Exclude<UserRole, 'admin'> | 'admin';
  fullName: string;
  phone: string;
  preferredLanguage: AppLanguage;
  state?: string;
  district?: string;
  village?: string;
  farmName?: string;
  farmAreaAcres?: number;
  businessName?: string;
  location?: string;
  buyerCategory?: 'individual' | 'retailer' | 'wholesaler' | 'processor' | 'exporter';
  serviceCategory?: string;
  operatingLocation?: string;
  serviceDescription?: string;
  specialization?: string;
  qualification?: string;
  organization?: string;
  operatingRegion?: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  authLoading: boolean;
  isBootstrappedAdmin: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
  updateUserProfile: (patch: Partial<Pick<UserDoc, 'fullName' | 'phone' | 'preferredLanguage' | 'state' | 'district' | 'village'>>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (!user) {
        setUserDoc(null);
        setAuthLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setUserDoc({ id: snap.id, ...(snap.data() as Omit<UserDoc, 'id'>) });
          } else {
            setUserDoc(null);
          }
          setAuthLoading(false);
        },
        (error) => {
          console.error('Error listening to user document:', error);
          setAuthLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const isBootstrappedAdmin = Boolean(
    firebaseUser?.email &&
      firebaseUser.emailVerified &&
      firebaseUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );

  const isAdmin = isBootstrappedAdmin || userDoc?.role === 'admin';

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async (email: string, password: string, fullName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(credential.user, { displayName: fullName.trim() });
    }
    try {
      await sendEmailVerification(credential.user);
    } catch {
      // Verification email dispatch may fail on restricted test accounts; UI displays resend option
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const completeOnboarding = async (payload: OnboardingPayload) => {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in to complete onboarding.');

    const chosenRole: UserRole =
      payload.role === 'admin' && isBootstrappedAdmin ? 'admin' : payload.role === 'admin' ? 'farmer' : payload.role;

    const userRecord: Record<string, unknown> = {
      uid: user.uid,
      email: (user.email || '').trim().slice(0, 200),
      fullName: payload.fullName.trim().slice(0, 120),
      phone: payload.phone.trim().slice(0, 30),
      role: chosenRole,
      preferredLanguage: payload.preferredLanguage,
      verificationStatus: chosenRole === 'admin' ? 'verified' : 'pending',
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (payload.state) userRecord.state = payload.state.trim().slice(0, 80);
    if (payload.district) userRecord.district = payload.district.trim().slice(0, 80);
    if (payload.village) userRecord.village = payload.village.trim().slice(0, 100);

    try {
      await setDoc(doc(db, 'users', user.uid), userRecord);

      if (chosenRole === 'farmer') {
        const farmerPayload: Record<string, unknown> = {
          userId: user.uid,
          fullName: payload.fullName.trim().slice(0, 120),
          phone: payload.phone.trim().slice(0, 30),
          state: (payload.state || 'Tamil Nadu').trim().slice(0, 80),
          district: (payload.district || 'Coimbatore').trim().slice(0, 80),
          village: (payload.village || 'Primary Village').trim().slice(0, 100),
          farmAreaAcres: Math.max(0.1, Number(payload.farmAreaAcres || 1)),
          preferredLanguage: payload.preferredLanguage,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (payload.farmName?.trim()) farmerPayload.farmName = payload.farmName.trim().slice(0, 120);
        await setDoc(doc(db, 'farmer_profiles', user.uid), farmerPayload);
      } else if (chosenRole === 'buyer') {
        await setDoc(doc(db, 'buyer_profiles', user.uid), {
          userId: user.uid,
          businessName: (payload.businessName || payload.fullName).trim().slice(0, 150),
          phone: payload.phone.trim().slice(0, 30),
          location: (payload.location || 'India').trim().slice(0, 160),
          buyerCategory: payload.buyerCategory || 'individual',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (chosenRole === 'provider') {
        await setDoc(doc(db, 'provider_profiles', user.uid), {
          userId: user.uid,
          businessName: (payload.businessName || payload.fullName).trim().slice(0, 150),
          serviceCategory: (payload.serviceCategory || 'Tractor Rental').trim().slice(0, 80),
          contactPhone: payload.phone.trim().slice(0, 30),
          operatingLocation: (payload.operatingLocation || 'India').trim().slice(0, 160),
          serviceDescription: (payload.serviceDescription || 'Agricultural field services').trim().slice(0, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (chosenRole === 'expert') {
        const expertPayload: Record<string, unknown> = {
          userId: user.uid,
          fullName: payload.fullName.trim().slice(0, 120),
          specialization: (payload.specialization || 'Agronomy & Crop Protection').trim().slice(0, 120),
          qualification: (payload.qualification || 'B.Sc / M.Sc Agriculture').trim().slice(0, 150),
          operatingRegion: (payload.operatingRegion || 'Tamil Nadu').trim().slice(0, 120),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (payload.organization?.trim()) expertPayload.organization = payload.organization.trim().slice(0, 150);
        await setDoc(doc(db, 'expert_profiles', user.uid), expertPayload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const updateUserProfile = async (
    patch: Partial<Pick<UserDoc, 'fullName' | 'phone' | 'preferredLanguage' | 'state' | 'district' | 'village'>>
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...patch,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        authLoading,
        isBootstrappedAdmin,
        isAdmin,
        isOnline,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerification,
        completeOnboarding,
        updateUserProfile,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
