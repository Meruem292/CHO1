
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
import { auth, database } from '@/lib/firebase-config'; // Import Firebase auth and database instances
import { ref as dbRef, set, get, update, serverTimestamp } from 'firebase/database'; // Firebase RTDB functions
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
    role: role, // This role is for the client-side context, DB record might have authoritative role
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Attempt to fetch the role from the database for the current user
        // This makes the client-side user object reflect the DB role if available
        let userRole: UserRole = 'patient'; // Default
        let userName = firebaseUser.displayName || firebaseUser.email || 'User';

        const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
        const patientSnapshot = await get(patientRecordRef);
        if (patientSnapshot.exists()) {
          const patientData = patientSnapshot.val();
          userRole = patientData.role || 'patient';
          userName = patientData.name || userName; // Prefer name from DB if available
        }
        
        const appUser = mapFirebaseUserToAppUser(firebaseUser, userRole, userName);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = async (firebaseUser: FirebaseUser, constructedName?: string) => {
    const finalName = constructedName || firebaseUser.displayName || firebaseUser.email || 'User';
    
    // Determine role for the app user context.
    // For a fresh signup/login, we might not have the DB role yet, default to patient.
    // onAuthStateChanged will later try to sync with DB role.
    let appUserRole: UserRole = 'patient'; 

    const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
    const snapshot = await get(patientRecordRef);

    if (!snapshot.exists()) {
      // Patient record doesn't exist, create it
      const patientDataForDb = {
        name: finalName,
        email: firebaseUser.email || '',
        role: 'patient', // New users are patients by default
        createdAt: serverTimestamp(),
      };
      await set(patientRecordRef, patientDataForDb);
      appUserRole = 'patient';
    } else {
      // Patient record exists, update name if different, and get current role from DB
      const existingData = snapshot.val();
      appUserRole = existingData.role || 'patient'; // Use DB role for context

      const updates: any = {};
      if (existingData.name !== finalName) {
        updates.name = finalName;
      }
      if (firebaseUser.email && existingData.email !== firebaseUser.email) {
        updates.email = firebaseUser.email;
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await update(patientRecordRef, updates);
      }
    }
    
    const appUserForContext = mapFirebaseUserToAppUser(firebaseUser, appUserRole, finalName);
    setUser(appUserForContext);
    router.push('/dashboard');
    toast({ title: "Action Successful", description: `Welcome, ${appUserForContext.name}!` });
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
      await handleAuthSuccess(userCredential.user);
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
      
      const nameParts = [
        firstName.trim(), 
        middleName?.trim(), 
        lastName.trim()
      ].filter(Boolean); 

      const constructedDisplayName = nameParts.join(' ');
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      await handleAuthSuccess(userCredential.user, finalDisplayName);
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
      await handleAuthSuccess(result.user);
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
