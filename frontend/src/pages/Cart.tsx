import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import axios from 'axios';

interface CartItem {
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

interface CartResponse {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  message?: string;
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { setCartItemCount } = useCart();

  // Cart State
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Cart from GET /api/cart
  const fetchCart = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<CartResponse>('/api/cart');
      setCart(response.data);
      if (typeof response.data.itemCount === 'number') {
        setCartItemCount(response.data.itemCount);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to load your cart. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Handle Remove Item via DELETE /api/cart/items/:productId
  const handleRemoveItem = async (productId: string) => {
    setRemovingId(productId);
    setActionSuccess(null);
    setErrorMessage(null);

    try {
      const response = await api.delete<CartResponse>(`/api/cart/items/${productId}`);
      setCart(response.data);
      if (typeof response.data.itemCount === 'number') {
        setCartItemCount(response.data.itemCount);
      }
      setActionSuccess(response.data.message || 'Item removed from cart');

      setTimeout(() => {
        setActionSuccess(null);
      }, 2500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to remove item from cart.');
      }
    } finally {
      setRemovingId(null);
    }
  };

  // Helper to extract image URL
  const getItemImageUrl = (item: CartItem): string => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.url === 'string') return first.url;
    }
    return '';
  };

  // Currency Formatter
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="homepage-wrapper">
      <Navbar />

      <main className="container py-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-3">
          <Link to="/" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
            <span>←</span> Continue Shopping
          </Link>
        </div>

        {/* Page Title */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="fw-bold text-slate-800 mb-0">Your Shopping Cart</h2>
          {cart && cart.itemCount > 0 && (
            <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="alert alert-success py-2 px-3 small mb-3">
            {actionSuccess}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 small mb-3">
            {errorMessage}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-5 text-center my-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading cart...</span>
            </div>
            <p className="text-muted mt-3 small">Loading your cart items...</p>
          </div>
        )}

        {/* Empty Cart State */}
        {!isLoading && (!cart || cart.items.length === 0) && (
          <div className="card border-0 shadow-sm p-5 text-center my-4 mx-auto rounded-4" style={{ maxWidth: '600px' }}>
            <div className="mb-3" style={{ fontSize: '3rem' }}>🛒</div>
            <h4 className="fw-bold text-slate-800 mb-2">Your Cart is Empty</h4>
            <p className="text-muted small mb-4">
              Looks like you haven't added any pre-owned gadgets to your cart yet. Explore the marketplace for great deals!
            </p>
            <div>
              <Link to="/" className="btn btn-primary px-4 py-2 fw-semibold">
                Browse Marketplace
              </Link>
            </div>
          </div>
        )}

        {/* Cart Contents */}
        {!isLoading && cart && cart.items.length > 0 && (
          <div className="row g-4">
            {/* Cart Items List (Left Column) */}
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-3">
                <div className="table-responsive">
                  {cart.items.map((item) => {
                    const imgUrl = getItemImageUrl(item);

                    return (
                      <div
                        key={item._id}
                        className={`d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-3 border-bottom gap-3 ${
                          !item.isAvailable ? 'bg-light opacity-75' : ''
                        }`}
                      >
                        {/* Image & Title */}
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-3 overflow-hidden bg-light flex-shrink-0"
                            style={{ width: '90px', height: '90px' }}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.title}
                                className="w-100 h-100"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                                No img
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="badge bg-dark bg-opacity-75 text-white mb-1 small" style={{ fontSize: '0.7rem' }}>
                              {item.category} &rsaquo; {item.subcategory}
                            </span>
                            <Link
                              to={`/product/${item._id}`}
                              className="text-decoration-none text-slate-800 d-block fw-semibold mb-1"
                              style={{ fontSize: '0.95rem' }}
                            >
                              {item.title}
                            </Link>

                            {!item.isAvailable && (
                              <span className="badge bg-danger text-white small">
                                Sold Out / Unavailable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price & Remove Action */}
                        <div className="d-flex align-items-center justify-content-between justify-content-sm-end gap-3 text-sm-end">
                          <div className="fw-bold text-primary fs-5">
                            ₹{formatINR(item.price)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item._id)}
                            className="btn btn-outline-danger btn-sm px-2 py-1"
                            disabled={removingId === item._id}
                            title="Remove from cart"
                          >
                            {removingId === item._id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              'Remove'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary (Right Column) */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: '90px' }}>
                <h5 className="fw-bold text-slate-800 mb-3">Order Summary</h5>

                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Available Items</span>
                  <span className="fw-semibold text-dark">{cart.itemCount}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Subtotal</span>
                  <span className="fw-semibold text-dark">₹{formatINR(cart.subtotal)}</span>
                </div>

                <div className="d-flex justify-content-between mb-3 text-muted small">
                  <span>GST (18%)</span>
                  <span className="fw-semibold text-dark">₹{formatINR(cart.gstAmount)}</span>
                </div>

                <hr className="my-2 opacity-25" />

                <div className="d-flex justify-content-between mb-4 mt-2">
                  <span className="fw-bold fs-5 text-slate-800">Grand Total</span>
                  <span className="fw-bold fs-5 text-primary">₹{formatINR(cart.grandTotal)}</span>
                </div>

                {/* Checkout Button */}
                <button
                  type="button"
                  className="btn btn-primary-custom w-100 py-2 fw-semibold"
                  disabled={cart.itemCount === 0}
                  onClick={() => {
                    // Placeholder navigation for checkout phase
                    navigate('/checkout');
                  }}
                >
                  Proceed to Checkout
                </button>

                <div className="small text-muted text-center mt-3" style={{ fontSize: '0.75rem' }}>
                  🔒 Secure checkout with authentic pre-owned hardware verification.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
