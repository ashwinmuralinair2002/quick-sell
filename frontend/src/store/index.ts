import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setTokenFromRefresh, clearAuth } from './authSlice';
import productReducer from './productSlice';
import { setTokenSyncHandler } from '../api/axios';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer
  }
});

// Connect Axios token refresh callbacks to Redux dispatch to avoid circular dependency
setTokenSyncHandler({
  onTokenRefreshed: (token: string) => {
    store.dispatch(setTokenFromRefresh(token));
  },
  onAuthExpired: () => {
    store.dispatch(clearAuth());
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
