import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch } from './store/hooks';
import { restoreSession } from './store/authSlice';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AddProduct from './pages/AddProduct';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyListings from './pages/MyListings';
import Account from './pages/Account';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Restore session on initial application load using refresh-token cookie
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            {/* Public only routes: authenticated users get redirected to / */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected routes: unauthenticated users get redirected to /login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/add-product" element={<AddProduct />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/account" element={<Account />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
