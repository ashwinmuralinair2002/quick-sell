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

interface OrderItem {
  product: string;
  title: string;
  price: number;
  image: string;
  seller: string;
}

interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

interface CreatedOrder {
  _id: string;
  buyer: string;
  items: OrderItem[];
  shippingAddress: ShippingAddressSnapshot;
  itemCount: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: string;
  createdAt: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  // Data states
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmed Order state
  const [placedOrder, setPlacedOrder] = useState<CreatedOrder | null>(null);

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

    const fetchCheckoutData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

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
            setSelectedAddressId(defaultAddr._id);
          } else {
            setSelectedAddressId(addressList[0]._id);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          setErrorMessage(err.response.data.message);
        } else {
          setErrorMessage('Failed to load checkout information. Please try again.');
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
  }, [navigate]);

  // Selected address item object
  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

  // Handle Place Order
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setErrorMessage('Please select a delivery address to place your order.');
      return;
    }

    if (!cart || cart.itemCount === 0) {
      setErrorMessage('Your cart does not contain any available products to checkout.');
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; order: CreatedOrder }>('/api/orders/checkout', {
        addressId: selectedAddressId
      });

      // Update cart count badge in navbar (backend cleared the cart)
      await refreshCartCount();

      // Display Order Confirmation view
      setPlacedOrder(response.data.order);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to place order. Please try again.');
      }
    } finally {
      setIsPlacingOrder(false);
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
                <div className="celebration-anim mb-1" style={{ fontSize: '1.75rem' }}>
                  🎉
                </div>
                <h2 className="fw-bold text-slate-800 mb-1">Order Placed Successfully!</h2>
                <p className="text-muted small mb-2">
                  Thank you for your purchase. We have notified the seller and your order is confirmed.
                </p>
                <div className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border">
                  <span className="small text-muted">Order ID:</span>
                  <span className="small fw-bold text-primary font-monospace">{placedOrder._id}</span>
                </div>
              </div>

              {/* Order Details & Summary */}
              <div className="row g-4 mb-4">
                {/* Shipping Details */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100 border">
                    <h6 className="fw-bold text-slate-800 mb-2 d-flex align-items-center gap-2">
                      <span>📍</span> Delivery Address
                    </h6>
                    <div className="small text-secondary" style={{ lineHeight: 1.6 }}>
                      <div className="fw-bold text-dark">{placedOrder.shippingAddress.fullName}</div>
                      <div>📞 {placedOrder.shippingAddress.phone}</div>
                      <div>{placedOrder.shippingAddress.addressLine}</div>
                      {placedOrder.shippingAddress.landmark && (
                        <div>Landmark: {placedOrder.shippingAddress.landmark}</div>
                      )}
                      <div>
                        {placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.state} -{' '}
                        <strong>{placedOrder.shippingAddress.pincode}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100 border">
                    <h6 className="fw-bold text-slate-800 mb-2 d-flex align-items-center gap-2">
                      <span>🧾</span> Payment & Price Breakdown
                    </h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Items Purchased:</span>
                        <span className="fw-semibold text-dark">{placedOrder.itemCount}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Subtotal:</span>
                        <span className="fw-semibold text-dark">₹{formatINR(placedOrder.subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-muted">
                        <span>GST (18%):</span>
                        <span className="fw-semibold text-dark">₹{formatINR(placedOrder.gstAmount)}</span>
                      </div>
                      <hr className="my-2 opacity-25" />
                      <div className="d-flex justify-content-between pt-1">
                        <span className="fw-bold text-slate-800">Grand Total:</span>
                        <span className="fw-bold text-primary fs-6">₹{formatINR(placedOrder.grandTotal)}</span>
                      </div>
                      <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
                        Status: <span className="badge bg-success bg-opacity-75 text-white">{placedOrder.status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchased Items List */}
              <div className="mb-4">
                <h6 className="fw-bold text-slate-800 mb-3 d-flex align-items-center gap-2">
                  <span>📦</span> Purchased Items ({placedOrder.items.length})
                </h6>
                <div className="d-flex flex-column gap-2">
                  {placedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-white"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-2 overflow-hidden bg-light flex-shrink-0"
                          style={{ width: '50px', height: '50px' }}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small" style={{ fontSize: '0.65rem' }}>
                              No img
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="fw-semibold text-slate-800 small text-truncate" style={{ maxWidth: '380px' }}>
                            {item.title}
                          </div>
                          <span className="badge bg-secondary bg-opacity-25 text-dark small" style={{ fontSize: '0.65rem' }}>
                            Verified Gadget
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

              {/* Actions Footer */}
              <div className="text-center pt-2">
                <Link to="/" className="btn btn-primary px-5 py-2 fw-semibold text-decoration-none shadow-sm">
                  Back to Marketplace
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: REGULAR CHECKOUT FLOW (Address Selection + Order Summary)         */
          /* ========================================================================= */
          <>
            {/* Navigation Breadcrumb */}
            <div className="mb-3">
              <Link to="/cart" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
                <span>←</span> Back to Cart
              </Link>
            </div>

            {/* Page Title */}
            <div className="mb-4">
              <h2 className="fw-bold text-slate-800 mb-1">Checkout</h2>
              <p className="text-muted small">
                Review your order details and select a delivery address.
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small mb-4">
                {errorMessage}
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="py-5 text-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading checkout details...</span>
                </div>
                <p className="text-muted mt-3 small">Loading order summary and delivery addresses...</p>
              </div>
            )}

            {/* Main Checkout Content */}
            {!isLoading && cart && cart.items.length > 0 && (
              <div className="row g-4">
                {/* Left Column: Delivery Address Selection */}
                <div className="col-12 col-lg-7">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h5 className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                        <span>📍</span> Select Delivery Address
                      </h5>
                      <Link
                        to="/account"
                        className="btn btn-outline-primary btn-sm px-3 fw-semibold text-decoration-none"
                      >
                        + Add New Address
                      </Link>
                    </div>

                    {/* Empty State: No addresses */}
                    {addresses.length === 0 ? (
                      <div className="p-4 border rounded-3 text-center my-3 bg-light">
                        <div className="mb-2" style={{ fontSize: '2.5rem' }}>📫</div>
                        <h6 className="fw-bold text-slate-800 mb-1">No Delivery Address Found</h6>
                        <p className="text-muted small mb-3">
                          You need to add a shipping address before completing your checkout.
                        </p>
                        <Link to="/account" className="btn btn-primary btn-sm px-4 fw-semibold text-decoration-none">
                          Add Address in My Account
                        </Link>
                      </div>
                    ) : (
                      /* Address Cards / Radio Options */
                      <div className="d-flex flex-column gap-3">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr._id;

                          return (
                            <div
                              key={addr._id}
                              onClick={() => setSelectedAddressId(addr._id)}
                              className={`p-3 rounded-3 border transition-all position-relative ${
                                isSelected
                                  ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                              style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                            >
                              <div className="d-flex align-items-start gap-3">
                                <div className="pt-1">
                                  <input
                                    type="radio"
                                    name="deliveryAddress"
                                    id={`addr-${addr._id}`}
                                    className="form-check-input"
                                    checked={isSelected}
                                    onChange={() => setSelectedAddressId(addr._id)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </div>

                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <label
                                      htmlFor={`addr-${addr._id}`}
                                      className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2"
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {addr.fullName}
                                      {addr.isDefault && (
                                        <span className="badge bg-secondary text-white small rounded-pill px-2 py-0">
                                          Default Address
                                        </span>
                                      )}
                                      {isSelected && (
                                        <span className="badge bg-primary text-white small rounded-pill px-2 py-0">
                                          Selected
                                        </span>
                                      )}
                                    </label>
                                    <span className="text-muted small fw-medium">📞 {addr.phone}</span>
                                  </div>

                                  <div className="text-secondary small" style={{ lineHeight: 1.5 }}>
                                    <div>{addr.addressLine}</div>
                                    {addr.landmark && <div>Landmark: {addr.landmark}</div>}
                                    <div>
                                      {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delivery Details Callout */}
                  {selectedAddress && (
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-light border-start border-primary border-4">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fs-5">🚚</span>
                        <div>
                          <div className="small fw-bold text-slate-800">
                            Delivering to: {selectedAddress.fullName}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                            {selectedAddress.addressLine}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Order Summary and Price Breakdown */}
                <div className="col-12 col-lg-5">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: '90px' }}>
                    <h5 className="fw-bold text-slate-800 mb-3">Order Summary</h5>

                    {/* Items in Checkout */}
                    <div className="checkout-items-list mb-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {cart.items.map((item) => {
                        const imgUrl = getItemImageUrl(item);

                        return (
                          <div
                            key={item._id}
                            className={`d-flex align-items-center justify-content-between p-2 mb-2 rounded-3 border ${
                              !item.isAvailable ? 'bg-light opacity-75' : 'bg-white'
                            }`}
                          >
                            <div className="d-flex align-items-center gap-2 overflow-hidden">
                              <div
                                className="rounded-2 overflow-hidden bg-light flex-shrink-0"
                                style={{ width: '56px', height: '56px' }}
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={item.title}
                                    className="w-100 h-100"
                                    style={{ objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small" style={{ fontSize: '0.65rem' }}>
                                    No img
                                  </div>
                                )}
                              </div>

                              <div className="text-truncate">
                                <span className="badge bg-light text-secondary border small mb-1" style={{ fontSize: '0.65rem' }}>
                                  {item.category} &rsaquo; {item.subcategory}
                                </span>
                                <div className="text-slate-800 fw-semibold text-truncate small" title={item.title}>
                                  {item.title}
                                </div>
                                {!item.isAvailable && (
                                  <span className="badge bg-danger text-white small" style={{ fontSize: '0.65rem' }}>
                                    Unavailable
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="fw-bold text-primary small ms-2 flex-shrink-0">
                              ₹{formatINR(item.price)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <hr className="my-2 opacity-25" />

                    {/* Price Breakdown */}
                    <div className="price-breakdown mb-3">
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Purchasable Items</span>
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
