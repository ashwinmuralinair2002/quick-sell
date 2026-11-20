import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCart } from '../store/cartSlice';
import {
  placeOrder,
  setSelectedAddressId,
  clearPlacedOrder,
  clearCheckoutErrors
} from '../store/checkoutSlice';
import type { CartItem, CartResponse } from '../store/cartSlice';
import axios from 'axios';

interface AddressItem {
  _id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux Checkout state
  const {
    selectedAddressId,
    placingOrder: isPlacingOrder,
    placeOrderError,
    placedOrder
  } = useAppSelector((state) => state.checkout);

  // Local data and status states for checkout
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  // Effective error message
  const errorMessage = placeOrderError || localErrorMessage;

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

  // Fetch initial checkout data (Cart + Addresses)
  useEffect(() => {
    let isMounted = true;

    // Reset placedOrder and errors when starting a fresh checkout visit
    dispatch(clearPlacedOrder());
    dispatch(clearCheckoutErrors());

    const fetchCheckoutData = async () => {
      setIsLoading(true);
      setLocalErrorMessage(null);

      try {
        const [cartRes, addressRes] = await Promise.all([
          api.get<CartResponse>('/api/cart'),
          api.get<{ addresses: AddressItem[] }>('/api/addresses')
        ]);

        if (!isMounted) return;

        const cartData = cartRes.data;
        const addressList = addressRes.data.addresses || [];

        // Check if cart is empty or has 0 available items
        if (!cartData || !cartData.items || cartData.items.length === 0 || cartData.itemCount === 0) {
          // Redirect to Cart page
          navigate('/cart', { replace: true });
          return;
        }

        setCart(cartData);
        setAddresses(addressList);

        // Auto-select default address, or the first address if available
        if (addressList.length > 0) {
          const defaultAddr = addressList.find((a) => a.isDefault);
          if (defaultAddr) {
            dispatch(setSelectedAddressId(defaultAddr._id));
          } else {
            dispatch(setSelectedAddressId(addressList[0]._id));
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          setLocalErrorMessage(err.response.data.message);
        } else {
          setLocalErrorMessage('Failed to load checkout information. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCheckoutData();

    return () => {
      isMounted = false;
    };
  }, [navigate, dispatch]);

  // Selected address item object
  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

  // Handle Place Order
  const handlePlaceOrder = async () => {
    dispatch(clearCheckoutErrors());
    setLocalErrorMessage(null);

    if (!selectedAddressId) {
      setLocalErrorMessage('Please select a delivery address to place your order.');
      return;
    }

    if (!cart || cart.itemCount === 0) {
      setLocalErrorMessage('Your cart does not contain any available products to checkout.');
      return;
    }

    try {
      await dispatch(placeOrder({ addressId: selectedAddressId })).unwrap();

      // Update cart state in Redux store (backend cleared the cart)
      await dispatch(fetchCart());

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Rejection is captured by placeOrder.rejected into state.checkout.placeOrderError
    }
  };

  return (
    <div className="homepage-wrapper">
      <Navbar />

      <main className="container py-4">
        {/* ========================================================================= */}
        {/* CASE 1: ORDER CONFIRMATION SCREEN (Shown after confirmed backend success) */}
        {/* ========================================================================= */}
        {placedOrder ? (
          <div className="order-confirmation-container py-3">
            <style>{`
              @keyframes scaleInCheck {
                0% { transform: scale(0); opacity: 0; }
                60% { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes bounceCelebration {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              .success-badge-anim {
                animation: scaleInCheck 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
              }
              .celebration-anim {
                animation: bounceCelebration 1.8s ease-in-out infinite;
              }
            `}</style>

            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white mx-auto" style={{ maxWidth: '780px' }}>
              {/* Celebratory Checkmark Header */}
              <div className="text-center mb-4">
                <div
                  className="success-badge-anim mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3 shadow"
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '40px'
                  }}
                >
                  ✓
                </div>
                <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-semibold mb-2">
                  Order Successfully Placed
                </span>
                <h2 className="fw-bold text-slate-800 mb-1">Thank You for Your Order!</h2>
                <p className="text-muted small">
                  Your purchase of pre-owned tech hardware is confirmed. Sellers have been notified for shipment logistics.
                </p>
                <div className="p-2 bg-light rounded-3 d-inline-block font-monospace small text-muted border">
                  Order Reference: <strong>#{placedOrder._id}</strong>
                </div>
              </div>

              {/* Order Information Grid */}
              <div className="row g-4 mb-4">
                {/* Purchased Items List */}
                <div className="col-12 col-md-7">
                  <div className="border rounded-4 p-3 bg-light h-100">
                    <h6 className="fw-bold text-slate-800 mb-3 d-flex align-items-center gap-2">
                      <span>📦</span> Purchased Devices ({placedOrder.itemCount})
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      {placedOrder.items.map((item, idx) => (
                        <div key={idx} className="d-flex align-items-center justify-content-between p-2 bg-white rounded-3 border">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-2 overflow-hidden bg-light flex-shrink-0"
                              style={{ width: '48px', height: '48px' }}
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-100 h-100"
                                  style={{ objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small" style={{ fontSize: '10px' }}>
                                  No img
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="fw-semibold text-slate-800 small text-truncate" style={{ maxWidth: '200px' }}>
                                {item.title}
                              </div>
                              <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                Verified Hardware
                              </span>
                            </div>
                          </div>
                          <div className="fw-bold text-primary small">
                            ₹{formatINR(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delivery Snapshot & Payment Info */}
                <div className="col-12 col-md-5">
                  <div className="border rounded-4 p-3 bg-light h-100 d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="fw-bold text-slate-800 mb-3 d-flex align-items-center gap-2">
                        <span>📍</span> Shipping Address
                      </h6>
                      <div className="small text-dark fw-semibold mb-1">
                        {placedOrder.shippingAddress.fullName}
                      </div>
                      <div className="text-muted small mb-1">
                        {placedOrder.shippingAddress.addressLine}
                        {placedOrder.shippingAddress.landmark ? `, Near ${placedOrder.shippingAddress.landmark}` : ''}
                      </div>
                      <div className="text-muted small mb-2">
                        {placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.state} - {placedOrder.shippingAddress.pincode}
                      </div>
                      <div className="text-muted small">
                        <strong>Phone:</strong> {placedOrder.shippingAddress.phone}
                      </div>
                    </div>

                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Subtotal:</span>
                        <span>₹{formatINR(placedOrder.subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>GST (18%):</span>
                        <span>₹{formatINR(placedOrder.gstAmount)}</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold text-slate-800 pt-2 border-top">
                        <span>Total Paid:</span>
                        <span className="text-primary">₹{formatINR(placedOrder.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 pt-2">
                <Link to="/account" className="btn btn-outline-primary px-4 py-2 fw-semibold">
                  View in My Orders
                </Link>
                <Link to="/" className="btn btn-primary px-4 py-2 fw-semibold">
                  Back to Marketplace
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: ACTIVE CHECKOUT PAGE (Address Selection + Order Summary Review)   */
          /* ========================================================================= */
          <>
            {/* Navigation Breadcrumb */}
            <div className="mb-3">
              <Link to="/cart" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
                <span>←</span> Back to Cart
              </Link>
            </div>

            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h2 className="fw-bold text-slate-800 mb-1">Checkout & Place Order</h2>
                <p className="text-muted small mb-0">
                  Select a delivery address and confirm your purchase.
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small mb-4" role="alert">
                <strong>Error: </strong> {errorMessage}
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="py-5 text-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading checkout...</span>
                </div>
                <p className="text-muted mt-3 small">Loading shipping addresses and cart details...</p>
              </div>
            )}

            {/* Main Checkout Grid */}
            {!isLoading && cart && cart.items.length > 0 && (
              <div className="row g-4">
                {/* Left Column: Address Selection & Cart Items Review */}
                <div className="col-12 col-lg-8">
                  {/* STEP 1: SELECT DELIVERY ADDRESS */}
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h5 className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                        <span>📍</span> Step 1: Select Delivery Address
                      </h5>
                      <Link to="/account" className="btn btn-outline-primary btn-sm px-3 fw-semibold">
                        + Add / Manage Addresses
                      </Link>
                    </div>

                    {/* Address List */}
                    {addresses.length === 0 ? (
                      <div className="p-4 border rounded-3 text-center my-2 bg-light">
                        <div className="mb-2" style={{ fontSize: '2rem' }}>📫</div>
                        <h6 className="fw-bold text-slate-800 mb-1">No Delivery Addresses Found</h6>
                        <p className="text-muted small mb-3">
                          You need to add a shipping address to receive your pre-owned gadget.
                        </p>
                        <Link to="/account" className="btn btn-primary btn-sm px-4 fw-semibold">
                          Add Address in My Account
                        </Link>
                      </div>
                    ) : (
                      <div className="row g-3">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr._id;

                          return (
                            <div key={addr._id} className="col-12 col-md-6">
                              <div
                                onClick={() => dispatch(setSelectedAddressId(addr._id))}
                                className={`p-3 rounded-4 border transition-all h-100 position-relative ${
                                  isSelected
                                    ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                                    : 'border-light-subtle bg-white hover-shadow'
                                }`}
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <input
                                      type="radio"
                                      id={`addr-${addr._id}`}
                                      name="selectedAddress"
                                      className="form-check-input mt-0"
                                      checked={isSelected}
                                      onChange={() => dispatch(setSelectedAddressId(addr._id))}
                                    />
                                    <label htmlFor={`addr-${addr._id}`} className="fw-bold text-slate-800 small mb-0 cursor-pointer">
                                      {addr.fullName}
                                    </label>
                                  </div>

                                  {addr.isDefault && (
                                    <span className="badge bg-secondary small" style={{ fontSize: '0.65rem' }}>
                                      Default
                                    </span>
                                  )}
                                </div>

                                <div className="text-muted small ps-4" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                  <div>{addr.addressLine}</div>
                                  {addr.landmark && <div>Near {addr.landmark}</div>}
                                  <div>
                                    {addr.city}, {addr.state} - {addr.pincode}
                                  </div>
                                  <div className="mt-1 text-dark fw-semibold">
                                    📞 {addr.phone}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STEP 2: REVIEW PURCHASED HARDWARE */}
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                    <h5 className="fw-bold text-slate-800 mb-3 d-flex align-items-center gap-2">
                      <span>🛍️</span> Step 2: Review Hardware In Cart ({cart.itemCount})
                    </h5>

                    <div className="table-responsive">
                      {cart.items.map((item) => {
                        const imgUrl = getItemImageUrl(item);

                        return (
                          <div
                            key={item._id}
                            className={`d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-3 border-bottom gap-3 ${
                              !item.isAvailable ? 'bg-light opacity-50' : ''
                            }`}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-3 overflow-hidden bg-light flex-shrink-0"
                                style={{ width: '64px', height: '64px' }}
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
                                <span className="badge bg-dark bg-opacity-75 text-white mb-1 small" style={{ fontSize: '0.65rem' }}>
                                  {item.category} &rsaquo; {item.subcategory}
                                </span>
                                <div className="fw-semibold text-slate-800 small mb-1">
                                  {item.title}
                                </div>
                                {!item.isAvailable && (
                                  <span className="badge bg-danger text-white small">
                                    Unavailable (Will not be purchased)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="fw-bold text-primary small text-sm-end">
                              ₹{formatINR(item.price)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Summary & Place Order */}
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: '90px' }}>
                    <h5 className="fw-bold text-slate-800 mb-3">Order Summary</h5>

                    {/* Delivery Address Preview */}
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <div className="text-muted small fw-semibold mb-1">Shipping To:</div>
                      {selectedAddress ? (
                        <div className="small text-slate-800">
                          <strong>{selectedAddress.fullName}</strong>
                          <div className="text-muted text-truncate" style={{ maxWidth: '240px' }}>
                            {selectedAddress.addressLine}, {selectedAddress.city}
                          </div>
                          <div className="text-muted">{selectedAddress.phone}</div>
                        </div>
                      ) : (
                        <div className="text-danger small">
                          No delivery address selected.
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between mb-2 text-muted small">
                      <span>Items to Purchase</span>
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

                    <div className="d-flex justify-content-between mb-3 mt-2">
                      <span className="fw-bold fs-5 text-slate-800">Grand Total</span>
                      <span className="fw-bold fs-5 text-primary">₹{formatINR(cart.grandTotal)}</span>
                    </div>

                    {/* Place Order Action Button */}
                    <button
                      type="button"
                      className="btn btn-primary-custom w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                      disabled={!selectedAddressId || cart.itemCount === 0 || isPlacingOrder}
                      onClick={handlePlaceOrder}
                    >
                      {isPlacingOrder ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Placing Order...</span>
                        </>
                      ) : (
                        <span>Place Order</span>
                      )}
                    </button>

                    {/* Notice for missing address */}
                    {!selectedAddressId && (
                      <div className="text-danger text-center small mt-2" style={{ fontSize: '0.75rem' }}>
                        * Please select a delivery address to place your order.
                      </div>
                    )}

                    <div className="small text-muted text-center mt-3" style={{ fontSize: '0.75rem' }}>
                      🔒 Safe and secure checkout with verified hardware delivery.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
