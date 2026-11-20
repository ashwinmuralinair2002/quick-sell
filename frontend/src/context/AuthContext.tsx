import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../api/axios';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize state with Axios in-memory token
  const updateAuth = (newUser: User | null, token: string | null) => {
    setUser(newUser);
    setAccessTokenState(token);
    setAccessToken(token);
  };

  const login = (userData: User, token: string) => {
    updateAuth(userData, token);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      updateAuth(null, null);
    }
  };

  // Restore session on initial application load using the refresh token cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshResponse = await api.post<{ accessToken: string }>('/api/auth/refresh');
        const token = refreshResponse.data.accessToken;
        setAccessToken(token);
        setAccessTokenState(token);

        // Fetch user profile using the refreshed access token
        const profileResponse = await api.get<{ user: User }>('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(profileResponse.data.user);
      } catch (error) {
        // No valid session / refresh token, clear memory
        updateAuth(null, null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: accessTokenState,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
