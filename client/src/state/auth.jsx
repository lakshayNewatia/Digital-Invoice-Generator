import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin, apiMe, apiRegister } from '@/lib/authApi';

const AuthContext = createContext(null);

const STORAGE_KEY = 'dig_invoice_ui_v2_auth';

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const cached = safeParse(localStorage.getItem(STORAGE_KEY) || '');
    if (cached?.token) {
      setToken(cached.token);
      setUser(cached.user || null);
    }
    setIsBooting(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiMe(token)
      .then((me) => {
        setUser(me);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: me }));
      })
      .catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
      });
  }, [token]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await apiLogin({ email, password });
    setToken(data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: data.token, user: { _id: data._id, name: data.name, email: data.email } }),
    );
    return data;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const data = await apiRegister({ name, email, password });
    setToken(data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: data.token, user: { _id: data._id, name: data.name, email: data.email } }),
    );
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, token, isBooting, isAuthenticated: Boolean(token), login, register, logout }),
    [user, token, isBooting, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
