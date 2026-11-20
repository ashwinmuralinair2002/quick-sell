import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../api/axios';
import axios from 'axios';
import { logout, clearAuth, restoreSession } from './authSlice';

// Address snapshot on order
export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

// Item snapshot on order
export interface OrderItemSnapshot {
  product: string;
  title: string;
  price: number;
  image: string;
  seller: string | { _id: string; name: string; email: string };
}

// Order model returned from backend
export interface Order {
  _id: string;
  buyer: string | { _id: string; name: string; email: string };
  items: OrderItemSnapshot[];
  shippingAddress: ShippingAddressSnapshot;
  itemCount: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Seller sales item structure
export interface SellerSale {
  _id: string;
  orderDate: string;
  status: string;
  buyer: { _id: string; name: string; email: string } | string;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItemSnapshot[];
}

export interface CheckoutState {
  // Selected delivery address for current checkout flow
  selectedAddressId: string | null;

  // Order placement state
  placingOrder: boolean;
  placeOrderError: string | null;
  placedOrder: Order | null;

  // Order history state (buyer's orders)
  orders: Order[];
  loadingOrders: boolean;
  ordersError: string | null;

  // Single order details state
  selectedOrder: Order | null;
  loadingOrderDetails: boolean;
  orderDetailsError: string | null;

  // Seller sales data (backend capability)
  sales: SellerSale[];
  loadingSales: boolean;
  salesError: string | null;
}

const initialState: CheckoutState = {
  selectedAddressId: null,
  placingOrder: false,
  placeOrderError: null,
  placedOrder: null,
  orders: [],
  loadingOrders: false,
  ordersError: null,
  selectedOrder: null,
  loadingOrderDetails: false,
  orderDetailsError: null,
  sales: [],
  loadingSales: false,
  salesError: null
};

// Error message extractor
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

// 1. Checkout / Place Order (POST /api/orders/checkout)
export const placeOrder = createAsyncThunk<
  { message: string; order: Order },
  { addressId: string },
  { rejectValue: string }
>('checkout/placeOrder', async ({ addressId }, { rejectWithValue }) => {
  try {
    const response = await api.post<{ message: string; order: Order }>('/api/orders/checkout', {
      addressId
    });
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to place order. Please try again.'));
  }
});

// 2. Fetch Buyer's Order History (GET /api/orders/my-orders)
export const fetchMyOrders = createAsyncThunk<
  Order[],
  void,
  { rejectValue: string }
>('checkout/fetchMyOrders', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ orders: Order[] }>('/api/orders/my-orders');
    return response.data.orders || [];
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load your orders.'));
  }
});

// 3. Fetch Order by ID (GET /api/orders/:id)
export const fetchOrderById = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>('checkout/fetchOrderById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get<{ order: Order }>(`/api/orders/${id}`);
    return response.data.order;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load order details.'));
  }
});

// 4. Fetch Seller's Sales (GET /api/orders/my-sales)
export const fetchMySales = createAsyncThunk<
  SellerSale[],
  void,
  { rejectValue: string }
>('checkout/fetchMySales', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ sales: SellerSale[] }>('/api/orders/my-sales');
    return response.data.sales || [];
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load your sales.'));
  }
});

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setSelectedAddressId: (state, action: PayloadAction<string | null>) => {
      state.selectedAddressId = action.payload;
    },
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    clearPlacedOrder: (state) => {
      state.placedOrder = null;
      state.placeOrderError = null;
    },
    clearCheckoutErrors: (state) => {
      state.placeOrderError = null;
      state.ordersError = null;
      state.orderDetailsError = null;
      state.salesError = null;
    }
  },
  extraReducers: (builder) => {
    // 1. placeOrder
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placingOrder = true;
        state.placeOrderError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placingOrder = false;
        state.placedOrder = action.payload.order;
        state.placeOrderError = null;
        // Optionally prepend newly placed order to buyer's orders history
        if (action.payload.order) {
          state.orders = [action.payload.order, ...state.orders];
        }
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placingOrder = false;
        state.placeOrderError = action.payload || 'Failed to place order.';
      });

    // 2. fetchMyOrders
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.loadingOrders = true;
        state.ordersError = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loadingOrders = false;
        state.orders = action.payload;
        state.ordersError = null;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loadingOrders = false;
        state.ordersError = action.payload || 'Failed to load your orders.';
      });

    // 3. fetchOrderById
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loadingOrderDetails = true;
        state.orderDetailsError = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loadingOrderDetails = false;
        state.selectedOrder = action.payload;
        state.orderDetailsError = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loadingOrderDetails = false;
        state.orderDetailsError = action.payload || 'Failed to load order details.';
      });

    // 4. fetchMySales
    builder
      .addCase(fetchMySales.pending, (state) => {
        state.loadingSales = true;
        state.salesError = null;
      })
      .addCase(fetchMySales.fulfilled, (state, action) => {
        state.loadingSales = false;
        state.sales = action.payload;
        state.salesError = null;
      })
      .addCase(fetchMySales.rejected, (state, action) => {
        state.loadingSales = false;
        state.salesError = action.payload || 'Failed to load your sales.';
      });

    // 5. Auth synchronization: Clear checkout and order data on logout or session reset
    builder
      .addCase(logout.fulfilled, (state) => {
        state.selectedAddressId = null;
        state.placingOrder = false;
        state.placeOrderError = null;
        state.placedOrder = null;
        state.orders = [];
        state.loadingOrders = false;
        state.ordersError = null;
        state.selectedOrder = null;
        state.loadingOrderDetails = false;
        state.orderDetailsError = null;
        state.sales = [];
        state.loadingSales = false;
        state.salesError = null;
      })
      .addCase(clearAuth, (state) => {
        state.selectedAddressId = null;
        state.placingOrder = false;
        state.placeOrderError = null;
        state.placedOrder = null;
        state.orders = [];
        state.loadingOrders = false;
        state.ordersError = null;
        state.selectedOrder = null;
        state.loadingOrderDetails = false;
        state.orderDetailsError = null;
        state.sales = [];
        state.loadingSales = false;
        state.salesError = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.selectedAddressId = null;
        state.placedOrder = null;
        state.orders = [];
        state.selectedOrder = null;
        state.sales = [];
      });
  }
});

export const {
  setSelectedAddressId,
  setSelectedOrder,
  clearPlacedOrder,
  clearCheckoutErrors
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
