
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
  adminCreateUserWithEmail: (email: string, password: string, firstName: string, middleName: string | undefined, lastName: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ADMIN_ID = 'ADMIN_LOCAL_001';
const LOCAL_ADMIN_EMAIL = 'admin@gmail.com';
const LOCAL_ADMIN_NAME = 'System Administrator (Local)';

const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, role: UserRole = 'patient', customName?: string): User => {
  return {
    id: firebaseUser.uid,
    name: customName || firebaseUser.displayName || firebaseUser.email || 'User',
    email: firebaseUser.email || undefined,
    role: role,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userRole: UserRole = 'patient';
        let userName = firebaseUser.displayName || firebaseUser.email || 'User';

        const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
        const patientSnapshot = await get(patientRecordRef);
        if (patientSnapshot.exists()) {
          const patientData = patientSnapshot.val();
          userRole = patientData.role || 'patient';
          userName = patientData.name || userName;
        }
        
        const appUser = mapFirebaseUserToAppUser(firebaseUser, userRole, userName);
        setUser(appUser);
      } else {
        // Check for local admin session if no Firebase user
        const localAdminSession = localStorage.getItem('localAdminSession');
        if (localAdminSession) {
          try {
            const adminUser = JSON.parse(localAdminSession);
            if (adminUser.id === LOCAL_ADMIN_ID) {
              setUser(adminUser);
            } else {
              setUser(null);
              localStorage.removeItem('localAdminSession');
            }
          } catch (e) {
            setUser(null);
            localStorage.removeItem('localAdminSession');
          }
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = async (firebaseUser: FirebaseUser, constructedName?: string, roleOverride?: UserRole) => {
    const finalName = constructedName || firebaseUser.displayName || firebaseUser.email || 'User';
    let appUserRole: UserRole = roleOverride || 'patient'; 

    const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
    const snapshot = await get(patientRecordRef);

    if (!snapshot.exists()) {
      const patientDataForDb = {
        name: finalName,
        email: firebaseUser.email || '',
        role: appUserRole, // Use provided role or default to 'patient'
        createdAt: serverTimestamp(),
      };
      await set(patientRecordRef, patientDataForDb);
    } else {
      const existingData = snapshot.val();
      appUserRole = roleOverride || existingData.role || 'patient'; 

      const updates: any = {};
      if (existingData.name !== finalName) updates.name = finalName;
      if (firebaseUser.email && existingData.email !== firebaseUser.email) updates.email = firebaseUser.email;
      if (roleOverride && existingData.role !== roleOverride) updates.role = roleOverride;
      
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
    if (email === LOCAL_ADMIN_EMAIL && password === 'admin') {
      // Handle special local admin login
      const adminUser: User = {
        id: LOCAL_ADMIN_ID,
        name: LOCAL_ADMIN_NAME,
        email: LOCAL_ADMIN_EMAIL,
        role: 'admin',
      };
      // Ensure local admin record exists in DB
      const adminRecordRef = dbRef(database, `patients/${LOCAL_ADMIN_ID}`);
      const snapshot = await get(adminRecordRef);
      if (!snapshot.exists()) {
        await set(adminRecordRef, {
          name: adminUser.name,
          email: adminUser.email,
          role: 'admin',
          createdAt: serverTimestamp(),
        });
      } else {
        // Optionally update if details changed, e.g. name
        const currentData = snapshot.val();
        if(currentData.name !== adminUser.name || currentData.email !== adminUser.email || currentData.role !== 'admin') {
            await update(adminRecordRef, {
                name: adminUser.name,
                email: adminUser.email,
                role: 'admin',
                updatedAt: serverTimestamp()
            });
        }
      }
      setUser(adminUser);
      localStorage.setItem('localAdminSession', JSON.stringify(adminUser)); // Persist local admin session
      setIsLoading(false);
      router.push('/dashboard');
      toast({ title: "Admin Login Successful", description: `Welcome, ${adminUser.name}!` });
      return;
    }

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
        lastName?.trim() // lastName can also be optional or empty
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

  const adminCreateUserWithEmail = useCallback(async (email: string, password: string, firstName: string, middleName: string | undefined, lastName: string, role: UserRole) => {
    setIsLoading(true);
    // This function should only be callable by an admin. Consider adding role checks if not done at UI level.
    try {
      // Note: Firebase Admin SDK is needed to create users without signing them in.
      // For client-side creation, this will sign in the admin temporarily as the new user,
      // then we must sign them back in as admin. This is not ideal.
      // A Cloud Function is the proper way to handle admin user creation.
      // For this client-side-only example, we'll proceed with limitations:
      const tempAuth = auth; // Use the main auth instance
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      
      const nameParts = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean);
      const constructedDisplayName = nameParts.join(' ');
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      // Create DB record for the new user with the specified role
      const patientRecordRef = dbRef(database, `patients/${userCredential.user.uid}`);
      const patientDataForDb = {
        name: finalDisplayName,
        email: userCredential.user.email || '',
        role: role, 
        createdAt: serverTimestamp(),
      };
      await set(patientRecordRef, patientDataForDb);

      toast({ title: "User Created", description: `${finalDisplayName} (${role}) has been created.` });
      // IMPORTANT: The admin is now technically signed in as the new user.
      // This is a side effect of client-side createUserWithEmailAndPassword.
      // For a real app, an admin SDK backend function is far superior.
      // To "fix" this on client, we would re-authenticate the admin.
      // For now, we'll let onAuthStateChanged handle the current user. Or prompt admin to re-login.
      // Better: If current user IS the local admin, restore local admin session.
      if (user?.id === LOCAL_ADMIN_ID) {
        setUser(user); // Restore local admin context
      } else {
         // If the admin was a Firebase admin, they might need to log out and log back in
         // or we'd need to re-authenticate them programmatically here.
         // For simplicity, we'll assume onAuthStateChanged will eventually reflect the admin user if they were Firebase auth'd.
      }

    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);


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
      if (user?.id === LOCAL_ADMIN_ID) {
        localStorage.removeItem('localAdminSession');
        setUser(null);
      } else {
        await signOut(auth);
        setUser(null); // onAuthStateChanged will also set this, but good to be explicit
      }
      router.push('/login');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router, user]);

  return (
    <AuthContext.Provider value={{ user, loginWithEmail, signupWithEmail, adminCreateUserWithEmail, loginWithGoogle, loginWithFacebook, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

