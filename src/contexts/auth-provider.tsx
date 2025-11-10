
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
import { createAuditLog } from '@/hooks/use-audit';

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

const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser | null, role: UserRole = 'patient', customName?: string): User | null => {
  if (!firebaseUser) {
    return null;
  }
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
            description: "Your account is not fully set up. Please contact support or try signing up again.",
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
    let appUserRole: UserRole = roleOverride || 'patient'; // Default role if not overridden or found in DB
    let isNewUser = false;

    const patientRecordRef = dbRef(database, `patients/${firebaseUser.uid}`);
    const snapshot = await get(patientRecordRef);

    if (!snapshot.exists()) {
      isNewUser = true;
      // Record doesn't exist, create it
      const patientDataForDb: any = {
        name: finalName,
        email: firebaseUser.email || '',
        role: appUserRole, // Use the determined role (could be 'patient' or an override like 'admin')
        createdAt: serverTimestamp(),
      };
      // Ensure individual name parts are also stored if available from signup
      if (constructedName) {
          const nameParts = constructedName.split(' ');
          patientDataForDb.firstName = nameParts[0] || '';
          patientDataForDb.lastName = nameParts.length > 1 ? nameParts[nameParts.length -1] : '';
          if (nameParts.length > 2) {
            patientDataForDb.middleName = nameParts.slice(1, -1).join(' ');
          }
      }

      await set(patientRecordRef, patientDataForDb);
      toast({ title: "Account Setup Complete", description: `Database record created for ${finalName}.` });
    } else {
      // Record exists, update it if necessary
      const existingData = snapshot.val();
      appUserRole = roleOverride || existingData.role || 'patient'; // Prioritize override, then existing DB role

      const updates: any = {};
      if (finalName && existingData.name !== finalName) updates.name = finalName;
      if (firebaseUser.email && existingData.email !== firebaseUser.email) updates.email = firebaseUser.email;
      if (appUserRole && existingData.role !== appUserRole) {
        updates.role = appUserRole;
        if (user) { // Ensure there's a logged-in user to attribute the change to
           await createAuditLog(user, 'user_role_changed', `Changed role for ${finalName} to ${appUserRole}`, firebaseUser.uid, 'user', { oldRole: existingData.role, newRole: appUserRole });
        }
      }
      
      // Update name parts if they were part of constructedName and differ or missing
      if (constructedName) {
        const nameParts = constructedName.split(' ');
        const newFirstName = nameParts[0] || '';
        const newLastName = nameParts.length > 1 ? nameParts[nameParts.length -1] : '';
        const newMiddleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : (existingData.middleName || '');

        if (existingData.firstName !== newFirstName) updates.firstName = newFirstName;
        if (existingData.lastName !== newLastName) updates.lastName = newLastName;
        if (existingData.middleName !== newMiddleName) updates.middleName = newMiddleName;
      }


      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await update(patientRecordRef, updates);
        toast({ title: "Account Updated", description: `Database record for ${finalName} updated.` });
      }
    }
    
    const appUserForContext = mapFirebaseUserToAppUser(firebaseUser, appUserRole, finalName);
    setUser(appUserForContext);
    router.push('/dashboard');
    toast({ title: "Login Successful", description: `Welcome, ${appUserForContext?.name}!` });
    
    if (isNewUser) {
        // user is the user who created the account, appUserForContext is the new user
        const creator = user || appUserForContext;
        if (creator) {
            await createAuditLog(creator, 'user_created', `Created user account for ${finalName}`, appUserForContext!.id, 'user');
        }
    } else if (appUserForContext) {
        await createAuditLog(appUserForContext, 'user_login', `User ${finalName} logged in.`, appUserForContext.id, 'user');
    }
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
      
      // Pass 'patient' role explicitly for new signups
      await handleAuthSuccess(userCredential.user, finalDisplayName, 'patient');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const adminCreateUserWithEmail = useCallback(async (email: string, password: string, firstName: string, middleName: string | undefined, lastName: string, role: UserRole) => {
    setIsLoading(true);
    // This creates a temporary auth instance problem if not handled properly.
    // Best to use Admin SDK for this. For client-side, it will sign in as the new user.
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const nameParts = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean);
      const constructedDisplayName = nameParts.join(' ');
      const finalDisplayName = constructedDisplayName || userCredential.user.email || 'User';

      await updateProfile(userCredential.user, { displayName: finalDisplayName });
      
      // Pass the intended role explicitly when admin creates a user
      await handleAuthSuccess(userCredential.user, finalDisplayName, role);

      toast({ title: "User Created", description: `${finalDisplayName} (${role}) has been created.` });
      
      if (user?.role === 'admin') {
         toast({ title: "Session Changed", description: "You are now signed in as the new user. Please log out and log back in as admin if needed."});
      }

    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, router]); // Added router to dependency array


  const loginWithProvider = useCallback(async (provider: GoogleAuthProvider | FacebookAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      // Social logins also default to 'patient' role unless DB says otherwise or roleOverride is used
      await handleAuthSuccess(result.user, undefined, 'patient'); 
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
  }, [router]); // Added router to dependency array

  const loginWithGoogle = useCallback(() => {
    const provider = new GoogleAuthProvider();
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  const loginWithFacebook = useCallback(() => {
    const provider = new FacebookAuthProvider();
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  const logout = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await createAuditLog(user, 'user_logout', `User ${user.name} logged out.`, user.id, 'user');
      await signOut(auth);
      setUser(null);
      router.push('/login');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, [router, user]);

  const bootstrapAdminUser = useCallback(async (config: AdminBootstrapConfig) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, config.email, config.password);
      const adminFirebaseUser = userCredential.user;

      const adminName = config.name || "Administrator";
      await updateProfile(adminFirebaseUser, { displayName: adminName });
      
      // Explicitly pass 'admin' role for bootstrapping
      await handleAuthSuccess(adminFirebaseUser, adminName, 'admin');
      toast({ title: "Admin User Bootstrapped", description: `Admin ${adminName} created/verified and logged in.` });

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "default", title: "Admin Exists", description: "Admin email already exists. Attempting to login and verify DB record." });
         try {
            const userCredential = await signInWithEmailAndPassword(auth, config.email, config.password);
            // On successful login, handleAuthSuccess will verify/update DB
            await handleAuthSuccess(userCredential.user, config.name || "Administrator", 'admin');
            toast({ title: "Admin Verified", description: "Admin account verified and logged in."});
        } catch (loginError) {
             handleAuthError(loginError); 
        }
      } else {
        handleAuthError(error); 
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]); // Added router to dependency array


  return (
    <AuthContext.Provider value={{ user, loginWithEmail, signupWithEmail, adminCreateUserWithEmail, loginWithGoogle, loginWithFacebook, logout, isLoading, bootstrapAdminUser }}>
      {children}
    </AuthContext.Provider>
  );
};
