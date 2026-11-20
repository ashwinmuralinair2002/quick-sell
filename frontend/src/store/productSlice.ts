import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../api/axios';
import axios from 'axios';
import type { BackendProduct } from '../components/ProductCard';

export type { BackendProduct };

// Query parameters for GET /api/products
export interface FetchProductsParams {
  category?: string;
  subcategory?: string;
  search?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sort?: string;
  page?: number | string;
  limit?: number | string;
}

export interface ProductsApiResponse {
  products: BackendProduct[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
}

export interface ProductState {
  // Homepage product catalog & pagination
  products: BackendProduct[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;

  // Selected single product for ProductDetails page
  selectedProduct: BackendProduct | null;

  // User's own listings for MyListings page
  myListings: BackendProduct[];

  // Request status and errors
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  isLoading: boolean;
  error: string | null;

  // Granular action statuses
  actionLoading: boolean;
  actionError: string | null;
  actionSuccess: string | null;
}

const initialState: ProductState = {
  products: [],
  currentPage: 1,
  totalPages: 1,
  totalProducts: 0,
  selectedProduct: null,
  myListings: [],
  status: 'idle',
  isLoading: false,
  error: null,
  actionLoading: false,
  actionError: null,
  actionSuccess: null
};

// Helper for error messages
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

// 1. Fetch all products (with search, category, sort, price, pagination)
export const fetchProducts = createAsyncThunk<
  ProductsApiResponse,
  FetchProductsParams | undefined,
  { rejectValue: string }
>('products/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<ProductsApiResponse>('/api/products', { params });
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load products.'));
  }
});

// 2. Fetch single product by ID
export const fetchProductById = createAsyncThunk<
  BackendProduct,
  string,
  { rejectValue: string }
>('products/fetchById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get<{ product: BackendProduct }>(`/api/products/${id}`);
    return response.data.product;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load product details.'));
  }
});

// 3. Fetch logged-in user's listings
export const fetchMyListings = createAsyncThunk<
  BackendProduct[],
  void,
  { rejectValue: string }
>('products/fetchMyListings', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ products: BackendProduct[] }>('/api/products/my-listings');
    return response.data.products;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to load your listings.'));
  }
});

// 4. Create a product (FormData containing fields and 2-5 images)
export const createProduct = createAsyncThunk<
  { message: string; product: BackendProduct },
  FormData,
  { rejectValue: string }
>('products/create', async (formData, { rejectWithValue }) => {
  try {
    const response = await api.post<{ message: string; product: BackendProduct }>(
      '/api/products',
      formData
    );
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to create product listing.'));
  }
});

// 5. Update a product by ID (FormData or JSON body)
export const updateProduct = createAsyncThunk<
  { message: string; product: BackendProduct },
  { id: string; data: FormData | { status?: string; [key: string]: unknown } },
  { rejectValue: string }
>('products/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put<{ message: string; product: BackendProduct }>(
      `/api/products/${id}`,
      data
    );
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to update product.'));
  }
});

// 6. Delete a product by ID
export const deleteProduct = createAsyncThunk<
  { id: string; message: string },
  string,
  { rejectValue: string }
>('products/delete', async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete<{ message: string }>(`/api/products/${id}`);
    return { id, message: response.data.message || 'Product deleted successfully' };
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Failed to delete product.'));
  }
});

export const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    clearActionStatus: (state) => {
      state.actionLoading = false;
      state.actionError = null;
      state.actionSuccess = null;
    },
    clearProductError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // 1. fetchProducts
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<ProductsApiResponse>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.products = action.payload.products || [];
        state.currentPage = action.payload.currentPage || 1;
        state.totalPages = action.payload.totalPages || 1;
        state.totalProducts = action.payload.totalProducts || 0;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload || 'Failed to load products.';
      });

    // 2. fetchProductById
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action: PayloadAction<BackendProduct>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.selectedProduct = action.payload;
        state.error = null;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.selectedProduct = null;
        state.error = action.payload || 'Failed to load product details.';
      });

    // 3. fetchMyListings
    builder
      .addCase(fetchMyListings.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyListings.fulfilled, (state, action: PayloadAction<BackendProduct[]>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.myListings = action.payload || [];
        state.error = null;
      })
      .addCase(fetchMyListings.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload || 'Failed to load your listings.';
      });

    // 4. createProduct
    builder
      .addCase(createProduct.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionSuccess = action.payload.message;
        state.actionError = null;
        // Optionally prepend to myListings if populated
        if (action.payload.product) {
          state.myListings = [action.payload.product, ...state.myListings];
        }
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Failed to create product listing.';
      });

    // 5. updateProduct
    builder
      .addCase(updateProduct.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionSuccess = action.payload.message;
        state.actionError = null;
        const updated = action.payload.product;
        if (updated) {
          if (state.selectedProduct && state.selectedProduct._id === updated._id) {
            state.selectedProduct = updated;
          }
          state.myListings = state.myListings.map((p) => (p._id === updated._id ? updated : p));
          state.products = state.products.map((p) => (p._id === updated._id ? updated : p));
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Failed to update product.';
      });

    // 6. deleteProduct
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.actionSuccess = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionSuccess = action.payload.message;
        state.actionError = null;
        const deletedId = action.payload.id;
        state.myListings = state.myListings.filter((p) => p._id !== deletedId);
        state.products = state.products.filter((p) => p._id !== deletedId);
        if (state.selectedProduct && state.selectedProduct._id === deletedId) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Failed to delete product.';
      });
  }
});

export const { clearSelectedProduct, clearActionStatus, clearProductError } = productSlice.actions;

export default productSlice.reducer;
