
'use client';

import type { User, UserRole, AdminBootstrapConfig } from '@/types';
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
  bootstrapAdminUser?: (config: AdminBootstrapConfig) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
        const snapshot = await get(patientRecordRef);

        if (snapshot.exists()) {
          const patientData = snapshot.val();
          const userRole: UserRole = patientData.role || 'patient'; // Default to 'patient' if role not set
          const userName = patientData.name || firebaseUser.displayName || firebaseUser.email || 'User';
          const appUser = mapFirebaseUserToAppUser(firebaseUser, userRole, userName);
          setUser(appUser);
        } else {
          // User exists in Auth, but not in RTDB (e.g., manual deletion of RTDB record or incomplete signup)
          // This is a critical misconfiguration.
          console.error(`User ${firebaseUser.uid} authenticated but no database record found in /patients. Signing out.`);
          toast({
            variant: "destructive",
            title: "Account Configuration Error",
            description: "Your account is not fully set up. Please contact support.",
          });
          await signOut(auth); // Sign out the user
          setUser(null);
        }
      } else {
        setUser(null);
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
        role: appUserRole,
        createdAt: serverTimestamp(),
      };
      await set(patientRecordRef, patientDataForDb);
    } else {
      const existingData = snapshot.val();
      appUserRole = roleOverride || existingData.role || 'patient';

      const updates: any = {};
      if (finalName && existingData.name !== finalName) updates.name = finalName;
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
    console.error("Firebase Auth Error:", error.code, error.message);
    let description = error.message || "An unknown error occurred.";

    if (error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password') {
      description = "Invalid email or password. Please check your credentials and try again.";
    } else if (error.code === 'auth/email-already-in-use') {
      description = "This email address is already in use by another account.";
    }
    // Add more specific error messages as needed

    toast({ variant: "destructive", title: "Authentication Error", description });
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
        lastName?.trim()
      ].filter(Boolean); 

      const constructedDisplayName = nameParts.join(' ');
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      await handleAuthSuccess(userCredential.user, finalDisplayName, 'patient'); // New users are patients by default
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const adminCreateUserWithEmail = useCallback(async (email: string, password: string, firstName: string, middleName: string | undefined, lastName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const tempAuth = auth; 
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      
      const nameParts = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean);
      const constructedDisplayName = nameParts.join(' ');
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      const patientRecordRef = dbRef(database, `patients/${userCredential.user.uid}`);
      const patientDataForDb = {
        name: finalDisplayName,
        email: userCredential.user.email || '',
        role: role, 
        createdAt: serverTimestamp(),
      };
      await set(patientRecordRef, patientDataForDb);

      toast({ title: "User Created", description: `${finalDisplayName} (${role}) has been created.` });
      
      // Important: Admin is now signed in as the new user.
      // For a real app, an admin SDK backend function is far superior.
      // For now, we inform the admin. They might need to re-login or we'd need a mechanism to restore their session.
      if (user?.role === 'admin') {
         toast({ title: "Session Changed", description: "You are now signed in as the new user. Please log out and log back in as admin if needed."});
         // The onAuthStateChanged will update the current user context.
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
      await handleAuthSuccess(result.user, undefined, 'patient'); // Social logins default to 'patient' role
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

  const bootstrapAdminUser = useCallback(async (config: AdminBootstrapConfig) => {
    setIsLoading(true);
    try {
      // Check if admin already exists in Auth
      // Note: Checking existence client-side before creation is tricky without Admin SDK.
      // Firebase signInWithEmailAndPassword throws specific errors if user not found,
      // but createUserWithEmailAndPassword throws if email is already in use.
      // We'll attempt creation and let Firebase handle existing user errors.

      const userCredential = await createUserWithEmailAndPassword(auth, config.email, config.password);
      const adminFirebaseUser = userCredential.user;

      const adminName = config.name || "Administrator";
      await updateProfile(adminFirebaseUser, { displayName: adminName });

      const adminRecordRef = dbRef(database, `patients/${adminFirebaseUser.uid}`);
      await set(adminRecordRef, {
        name: adminName,
        email: adminFirebaseUser.email,
        role: 'admin', // Explicitly set role to admin
        createdAt: serverTimestamp(),
      });

      // handleAuthSuccess will now sign in this new admin user.
      await handleAuthSuccess(adminFirebaseUser, adminName, 'admin');
      toast({ title: "Admin User Bootstrapped", description: `Admin ${adminName} created/verified and logged in.` });

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "default", title: "Admin Exists", description: "Admin email already exists in Firebase Auth. Attempting to verify database record." });
        // If auth user exists, try to ensure DB record is correct or log them in.
        // This part is tricky without knowing the UID if creation failed.
        // Best to manually ensure DB record is correct if this happens, or try logging in directly.
        // For simplicity, we'll just inform the user.
         try {
            const userCredential = await signInWithEmailAndPassword(auth, config.email, config.password);
            const patientRecordRef = dbRef(database, `patients/${userCredential.user.uid}`);
            const snapshot = await get(patientRecordRef);
            if (snapshot.exists() && snapshot.val().role === 'admin') {
                await handleAuthSuccess(userCredential.user, snapshot.val().name, 'admin');
                toast({ title: "Admin Verified", description: "Admin account verified and logged in."});
            } else {
                 await set(patientRecordRef, {
                    name: config.name || "Administrator",
                    email: config.email,
                    role: 'admin',
                    updatedAt: serverTimestamp(),
                 });
                await handleAuthSuccess(userCredential.user, config.name || "Administrator", 'admin');
                toast({ title: "Admin Record Updated", description: "Admin database record updated/created. Logged in."});
            }
        } catch (loginError) {
             handleAuthError(loginError); // Handle login failure
        }

      } else {
        handleAuthError(error); // Handle other creation errors
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);


  return (
    <AuthContext.Provider value={{ user, loginWithEmail, signupWithEmail, adminCreateUserWithEmail, loginWithGoogle, loginWithFacebook, logout, isLoading, bootstrapAdminUser }}>
      {children}
    </AuthContext.Provider>
  );
};

