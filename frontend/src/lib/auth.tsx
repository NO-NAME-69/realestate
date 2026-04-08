// src/lib/auth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

export interface User {
  id: string;
  email: string | null;
  mobile: string | null;
  fullName: string | null;
  role: 'INVESTOR' | 'TEAM_LEADER' | 'FINANCE_MGR' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'INACTIVE' | 'ACTIVE' | 'SUSPENDED';
  teamId: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('rp_access_token');
      if (token) {
        try {
          const res = await api.get<{ data: User }>('/users/me', { preventAutoRedirect: true });
          setUser(res.data);
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem('rp_access_token');
        }
      }
      setIsLoading(false);
    };

    void initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('rp_access_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('rp_access_token');
    setUser(null);
    window.location.href = '/';
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
