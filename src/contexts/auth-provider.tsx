
'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, name?: string, email?: string) => void; // Added email for potential use
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data based on role
const MOCK_USERS: Record<UserRole, Omit<User, 'id' | 'role' | 'email'>> = {
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

  const login = useCallback((role: UserRole, name?: string, email?: string) => {
    const newUserId = `user-${Date.now()}`; 
    const newUser: User = {
      id: newUserId,
      name: name || MOCK_USERS[role].name,
      role,
      // email: email, // Store email if provided, though not fully used in mock
    };
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    setUser(newUser);
    router.push('/dashboard');
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
