
'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-config'; // Import Firebase auth instance
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, firstName: string, middleName?: string, lastName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, role: UserRole = 'patient', customName?: string): User => {
  return {
    id: firebaseUser.uid,
    name: customName || firebaseUser.displayName || firebaseUser.email || 'User',
    email: firebaseUser.email || undefined,
    role: role, // Default role, needs a proper role management system
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // When auth state changes, we might not have the customName from signup immediately
        // Firebase displayName should be the source of truth after initial profile update.
        const appUser = mapFirebaseUserToAppUser(firebaseUser, 'patient', firebaseUser.displayName || undefined);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (firebaseUser: FirebaseUser, constructedName?: string) => {
    const appUser = mapFirebaseUserToAppUser(firebaseUser, 'patient', constructedName || firebaseUser.displayName || undefined);
    setUser(appUser);
    router.push('/dashboard');
    toast({ title: "Action Successful", description: `Welcome, ${appUser.name}!` });
  };

  const handleAuthError = (error: any) => {
    console.error("Firebase Auth Error:", error);
    toast({ variant: "destructive", title: "Authentication Error", description: error.message || "An unknown error occurred." });
    setIsLoading(false); 
  };

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess(userCredential.user);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const signupWithEmail = useCallback(async (email: string, password: string, firstName: string, middleName?: string, lastName?: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Simplified and robust displayName construction
      // firstName and lastName are guaranteed by Zod schema to be non-empty strings.
      // middleName is string | undefined.
      const nameParts = [
        firstName.trim(), 
        middleName?.trim(), 
        lastName.trim()
      ].filter(Boolean); // Filter out undefined or empty strings resulting from middleName?.trim()

      const constructedDisplayName = nameParts.join(' ');
      
      // Fallback if somehow constructedDisplayName is empty (should not happen with schema)
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      // Pass the constructed name to handleAuthSuccess
      handleAuthSuccess(userCredential.user, finalDisplayName);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const loginWithProvider = useCallback(async (provider: GoogleAuthProvider | FacebookAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      handleAuthSuccess(result.user);
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast({
          variant: "destructive",
          title: "Account Exists",
          description: "An account already exists with the same email address but different sign-in credentials. Try signing in with the original method.",
        });
      } else {
        handleAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const loginWithGoogle = useCallback(() => {
    const provider = new GoogleAuthProvider();
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  const loginWithFacebook = useCallback(() => {
    const provider = new FacebookAuthProvider();
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      router.push('/login');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loginWithEmail, signupWithEmail, loginWithGoogle, loginWithFacebook, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
