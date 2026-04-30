/**
 * AuthContext — DEV-läge, ingen Base44
 * Alltid inloggad som admin, använder JWT-backend på localhost:3001
 */
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const DEV_USER = {
  id: 'dev-admin-1',
  email: 'admin@lagerai.se',
  full_name: 'Admin',
  role: 'admin',
  allowedModules: [],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEV_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({
    id: 'local',
    public_settings: { require_login: false },
  });

  useEffect(() => {
    // DEV-läge: sätt token i localStorage och via Base44 SDK
    localStorage.setItem('lagerai_token', 'dev-token-admin');
    if (window.base44?.setToken) {
      window.base44.setToken('dev-token-admin');
    }
  }, []);

  const login = async (email, password) => {
    localStorage.setItem('lagerai_token', 'dev-token-admin');
    setUser(DEV_USER);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // DEV-läge: håll inloggad
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
