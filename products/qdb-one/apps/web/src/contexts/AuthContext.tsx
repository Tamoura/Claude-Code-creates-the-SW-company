'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface UserSession {
  personId: string;
  qid: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  activeOrgId: string;
  personas: {
    orgId: string;
    orgNameAr: string;
    orgNameEn: string;
    crNumber: string;
    roles: { portal: string; role: string }[];
  }[];
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (user: UserSession) => void;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  activeOrg: UserSession['personas'][0] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);

  const login = (u: UserSession) => setUser(u);
  const logout = () => setUser(null);
  const switchOrg = (orgId: string) => {
    if (user) setUser({ ...user, activeOrgId: orgId });
  };

  const activeOrg = user?.personas.find(p => p.orgId === user.activeOrgId) ?? null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, switchOrg, activeOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
