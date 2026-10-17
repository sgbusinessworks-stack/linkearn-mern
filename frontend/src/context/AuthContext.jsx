import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api('/auth/me').then(({ user }) => setUser(user)).catch(() => localStorage.removeItem('linkearn_token')).finally(() => setReady(true));
  }, []);
  const signIn = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('linkearn_token', data.token); setUser(data.user); return data.user;
  };
  const signUp = async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    localStorage.setItem('linkearn_token', data.token); setUser(data.user); return data.user;
  };
  const signOut = () => { localStorage.removeItem('linkearn_token'); setUser(null); };
  return <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
