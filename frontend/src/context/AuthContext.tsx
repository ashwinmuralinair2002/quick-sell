import React, { createContext, useContext } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout as logoutThunk, updateUser as updateUserAction } from '../store/authSlice';
import type { User } from '../store/authSlice';

export type { User };

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Compatibility AuthProvider bridging Redux Toolkit authSlice state to legacy useAuth consumers.
 * Redux Toolkit remains the single source of truth for all authentication state.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, accessToken, isLoading } = useAppSelector((state) => state.auth);

  const login = (_userData: User, _token: string) => {
    // Redux handles login directly via createAsyncThunk, but we support the callback signature if invoked
  };

  const updateUser = (updatedFields: Partial<User>) => {
    dispatch(updateUserAction(updatedFields));
  };

  const logout = async () => {
    await dispatch(logoutThunk()).unwrap();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        updateUser
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
