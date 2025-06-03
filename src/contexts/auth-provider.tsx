'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, name?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data based on role
const MOCK_USERS: Record<UserRole, Omit<User, 'id' | 'role'>> = {
  admin: { name: 'Admin User' },
  doctor: { name: 'Dr. Smith' },
  patient: { name: 'Jane Doe' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('currentUser');
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((role: UserRole, name?: string) => {
    const newUserId = `user-${Date.now()}`; // Simple unique ID for mock
    const newUser: User = {
      id: newUserId, // For patients, this ID would be their actual patient ID
      name: name || MOCK_USERS[role].name,
      role,
    };
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    setUser(newUser);
    // Redirect based on role or to a general dashboard
    if (role === 'patient') {
        // If we had a specific patient ID, we might redirect to their specific dashboard
        // For now, all go to general dashboard, access control will limit what they see
        router.push('/dashboard');
    } else {
        router.push('/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
