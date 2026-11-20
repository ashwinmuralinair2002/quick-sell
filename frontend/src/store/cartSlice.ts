import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../api/axios';
import axios from 'axios';
import { login, restoreSession, logout, clearAuth } from './authSlice';

// Existing Backend Cart Item Data Structure
export interface CartItem {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  images: Array<{ url: string; public_id: string }> | string[];
  seller?: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  isAvailable: boolean;
}

// Backend Response Structure for GET/POST/DELETE cart operations
export interface CartResponse {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  message?: string;
}

export interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  isLoading: boolean;
  error: string | null;
  actionLoading: boolean;
  actionError: string | null;
  actionSuccess: string | null;
}

const initialState: CartState = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  gstAmount: 0,
  grandTotal: 0,
  status: 'idle',
  isLoading: false,
  error: null,
  actionLoading: false,
  actionError: null,
  actionSuccess: null
};

// Error extractor helper
const getErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

// 1. Fetch Cart (GET /api/cart)
export const fetchCart = createAsyncThunk<
  CartResponse,
  void,
  { rejectValue: string }
>('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<CartResponse>('/api/cart');
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load your cart.'));
  }
});

// 2. Add Item to Cart (POST /api/cart/items)
export const addToCart = createAsyncThunk<
  CartResponse,
  string,
  { rejectValue: string }
>('cart/addToCart', async (productId, { rejectWithValue }) => {
  try {
    const response = await api.post<CartResponse>('/api/cart/items', { productId });
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to add item to cart.'));
  }
});

// 3. Remove Item from Cart (DELETE /api/cart/items/:productId)
export const removeFromCart = createAsyncThunk<
  CartResponse,
  string,
  { rejectValue: string }
>('cart/removeFromCart', async (productId, { rejectWithValue }) => {
  try {
    const response = await api.delete<CartResponse>(`/api/cart/items/${productId}`);
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to remove item from cart.'));
  }
});

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => {
      state.items = [];
      state.itemCount = 0;
      state.subtotal = 0;
      state.gstAmount = 0;
      state.grandTotal = 0;
      state.status = 'idle';
      state.isLoading = false;
      state.error = null;
      state.actionLoading = false;
      state.actionError = null;
      state.actionSuccess = null;
    },
    clearCartFeedback: (state) => {
      state.actionError = null;
      state.actionSuccess = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // 1. fetchCart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action: PayloadAction<CartResponse>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.itemCount = action.payload.itemCount || 0;
        state.subtotal = action.payload.subtotal || 0;
        state.gstAmount = action.payload.gstAmount || 0;
        state.grandTotal = action.payload.grandTotal || 0;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload || 'Failed to load your cart.';
      });

    // 2. addToCart
    builder
      .addCase(addToCart.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(addToCart.fulfilled, (state, action: PayloadAction<CartResponse>) => {
        state.actionLoading = false;
        state.items = action.payload.items || [];
        state.itemCount = action.payload.itemCount || 0;
        state.subtotal = action.payload.subtotal || 0;
        state.gstAmount = action.payload.gstAmount || 0;
        state.grandTotal = action.payload.grandTotal || 0;
        state.actionSuccess = action.payload.message || 'Product added to cart successfully';
        state.actionError = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Failed to add item to cart.';
      });

    // 3. removeFromCart
    builder
      .addCase(removeFromCart.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action: PayloadAction<CartResponse>) => {
        state.actionLoading = false;
        state.items = action.payload.items || [];
        state.itemCount = action.payload.itemCount || 0;
        state.subtotal = action.payload.subtotal || 0;
        state.gstAmount = action.payload.gstAmount || 0;
        state.grandTotal = action.payload.grandTotal || 0;
        state.actionSuccess = action.payload.message || 'Product removed from cart successfully';
        state.actionError = null;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Failed to remove item from cart.';
      });

    // 4. Respond to Auth Actions: Clear cart on logout or clearAuth
    builder
      .addCase(logout.fulfilled, (state) => {
        state.items = [];
        state.itemCount = 0;
        state.subtotal = 0;
        state.gstAmount = 0;
        state.grandTotal = 0;
        state.status = 'idle';
        state.isLoading = false;
        state.error = null;
        state.actionLoading = false;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(clearAuth, (state) => {
        state.items = [];
        state.itemCount = 0;
        state.subtotal = 0;
        state.gstAmount = 0;
        state.grandTotal = 0;
        state.status = 'idle';
        state.isLoading = false;
        state.error = null;
      })
      // Clear previous error on fresh login
      .addCase(login.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.items = [];
        state.itemCount = 0;
        state.subtotal = 0;
        state.gstAmount = 0;
        state.grandTotal = 0;
      });
  }
});

export const { clearCart, clearCartFeedback } = cartSlice.actions;

export default cartSlice.reducer;
