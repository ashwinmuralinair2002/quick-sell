import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar-custom border-bottom bg-white sticky-top">
      <div className="container d-flex align-items-center justify-content-between py-2">
        {/* Clickable Brand Logo (Navigates to /) */}
        <Link to="/" className="text-decoration-none d-flex align-items-center gap-2" title="QuickSell Home">
          <span className="brand-logo-icon">⚡</span>
          <span className="brand-logo-text">Quick<span className="brand-logo-accent">Sell</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="d-flex align-items-center gap-2 gap-md-3">
          <Link to="/my-listings" className="nav-link-custom">
            My Listings
          </Link>

          {/* Cart Link with Live Item-Count Badge */}
          <Link to="/cart" className="nav-link-custom d-flex align-items-center gap-1 position-relative">
            <span>🛒 Cart</span>
            {cartItemCount > 0 && (
              <span
                className="badge rounded-pill bg-primary ms-1"
                style={{ fontSize: '0.725rem', padding: '0.25em 0.55em' }}
                title={`${cartItemCount} items in cart`}
              >
                {cartItemCount}
              </span>
            )}
          </Link>

          {/* Sell Product Button */}
          <Link to="/add-product" className="btn btn-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-1">
            <span>+</span>
            <span>Sell Product</span>
          </Link>

          {/* User Account / Sign Out */}
          {user && (
            <div className="d-flex align-items-center ms-2 ps-3 border-start">
              {/* Clickable Greeting navigating to /account */}
              <Link
                to="/account"
                className="user-greeting d-none d-md-inline text-decoration-none me-3"
                style={{ color: '#334155', cursor: 'pointer' }}
                title="View your account"
              >
                Hi, <strong>{user.name.split(' ')[0]}</strong>
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger btn-logout"
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
