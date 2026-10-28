import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from '../lib/mockApi';

type Ctx = {
  user: api.User | null;
  loading: boolean;
  sessionCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  const refresh = () => {
    if (user) setSessionCount(api.getSessionCount(user.id));
  };

  useEffect(() => {
    (async () => {
      const u = await api.me();
      setUser(u);
      if (u) setSessionCount(api.getSessionCount(u.id));
      setLoading(false);
    })();
  }, []);

  const value: Ctx = {
    user, loading, sessionCount,
    login: async (email, password) => {
      const { user } = await api.login(email, password);
      setUser(user);
      setSessionCount(api.getSessionCount(user.id));
    },
    register: async (email, password, name) => {
      const { user } = await api.register(email, password, name);
      setUser(user);
      setSessionCount(api.getSessionCount(user.id));
    },
    logout: () => { api.logout(); setUser(null); setSessionCount(0); },
    refresh,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
