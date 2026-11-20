import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api, { setAccessToken as setAxiosAccessToken } from '../api/axios';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  isLoading: true, // starts true for initial session restoration
  error: null
};

// DTO Interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

interface RegisterResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ProfileResponse {
  user: User;
}

// Helper to extract error message
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

// 1. Login Thunk
export const login = createAsyncThunk<
  { user: User; accessToken: string },
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post<AuthResponse>('/api/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password
    });
    const { user, accessToken } = response.data;
    setAxiosAccessToken(accessToken);
    return { user, accessToken };
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Unable to sign in. Please check your credentials.'));
  }
});

// 2. Register Thunk
export const register = createAsyncThunk<
  RegisterResponse,
  RegisterCredentials,
  { rejectValue: string }
>('auth/register', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post<RegisterResponse>('/api/auth/register', {
      name: credentials.name.trim(),
      email: credentials.email.trim(),
      password: credentials.password
    });
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, 'Registration failed. Please check your inputs.'));
  }
});

// 3. Restore Session Thunk
export const restoreSession = createAsyncThunk<
  { user: User; accessToken: string },
  void,
  { rejectValue: string }
>('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const refreshResponse = await api.post<{ accessToken: string }>('/api/auth/refresh');
    const token = refreshResponse.data.accessToken;
    setAxiosAccessToken(token);

    const profileResponse = await api.get<ProfileResponse>('/api/users/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return { user: profileResponse.data.user, accessToken: token };
  } catch (err: unknown) {
    setAxiosAccessToken(null);
    return rejectWithValue(getErrorMessage(err, 'No active session.'));
  }
});

// 4. Logout Thunk
export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/api/auth/logout');
    } catch (err: unknown) {
      console.error('Logout error:', err);
      // Even if network fails, logout proceeds locally
      return rejectWithValue(getErrorMessage(err, 'Logout encountered an issue.'));
    } finally {
      setAxiosAccessToken(null);
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.error = null;
      state.status = 'succeeded';
      setAxiosAccessToken(action.payload.accessToken);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setTokenFromRefresh: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.error = null;
      state.status = 'idle';
      setAxiosAccessToken(null);
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed';
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Registration failed';
      });

    // Restore Session
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isLoading = false;
        state.status = 'idle';
        state.user = null;
        state.accessToken = null;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.status = 'idle';
        state.user = null;
        state.accessToken = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.isLoading = false;
        state.status = 'idle';
        state.user = null;
        state.accessToken = null;
        state.error = null;
      });
  }
});

export const {
  setCredentials,
  updateUser,
  setTokenFromRefresh,
  clearAuth,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
