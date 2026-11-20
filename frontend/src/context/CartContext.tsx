import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItemCount: number;
  refreshCartCount: () => Promise<void>;
  setCartItemCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartItemCount, setCartItemCount] = useState<number>(0);

  // Fetch itemCount from GET /api/cart
  const refreshCartCount = useCallback(async () => {
    if (!user) {
      setCartItemCount(0);
      return;
    }

    try {
      const response = await api.get<{ itemCount?: number }>('/api/cart');
      if (typeof response.data?.itemCount === 'number') {
        setCartItemCount(response.data.itemCount);
      }
    } catch {
      // If error or unauthenticated, default to 0
      setCartItemCount(0);
    }
  }, [user]);

  // Update cart count whenever authenticated user changes (login/logout/restore)
  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  return (
    <CartContext.Provider
      value={{
        cartItemCount,
        refreshCartCount,
        setCartItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
