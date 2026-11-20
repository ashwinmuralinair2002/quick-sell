import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMyListings } from '../store/productSlice';

const MyListings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myListings: products, isLoading, error: errorMessage } = useAppSelector(
    (state) => state.products
  );

  useEffect(() => {
    dispatch(fetchMyListings());
  }, [dispatch]);

  const availableCount = products.filter((p) => p.status === 'available').length;
  const soldCount = products.filter((p) => p.status === 'sold').length;

  return (
    <div className="homepage-wrapper">
      <Navbar />

      <main className="container py-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-3">
          <Link to="/" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
            <span>←</span> Back to Marketplace
          </Link>
        </div>

        {/* Page Header */}
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-4 gap-2">
          <div>
            <h2 className="fw-bold text-slate-800 mb-1">My Listings</h2>
            <p className="text-muted small mb-0">
              Manage the products and tech gadgets you have posted for sale.
            </p>
          </div>

          <Link
            to="/add-product"
            className="btn btn-primary px-3 py-2 fw-semibold d-inline-flex align-items-center gap-1 align-self-start align-self-sm-auto"
          >
            <span>+</span>
            <span>Sell Another Product</span>
          </Link>
        </div>

        {/* Stats summary banner */}
        {!isLoading && !errorMessage && products.length > 0 && (
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-4">
              <div className="p-3 bg-white rounded-3 border shadow-sm text-center">
                <span className="text-muted small d-block mb-1">Total Listed</span>
                <span className="h4 fw-bold text-slate-800">{products.length}</span>
              </div>
            </div>
            <div className="col-6 col-sm-4">
              <div className="p-3 bg-white rounded-3 border shadow-sm text-center">
                <span className="text-success small d-block mb-1">Active / Available</span>
                <span className="h4 fw-bold text-success">{availableCount}</span>
              </div>
            </div>
            <div className="col-6 col-sm-4">
              <div className="p-3 bg-white rounded-3 border shadow-sm text-center">
                <span className="text-secondary small d-block mb-1">Sold Devices</span>
                <span className="h4 fw-bold text-secondary">{soldCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading listings...</span>
            </div>
            <p className="text-muted small">Loading your listings...</p>
          </div>
        )}

        {/* Error Alert */}
        {!isLoading && errorMessage && (
          <div className="alert alert-danger py-3 px-4 rounded-3 text-center my-4" role="alert">
            <p className="mb-2 fw-semibold">{errorMessage}</p>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => dispatch(fetchMyListings())}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && products.length === 0 && (
          <div className="empty-state-box text-center py-5 my-4 bg-white rounded-4 border p-4 shadow-sm">
            <div className="empty-state-icon mb-3" style={{ fontSize: '3rem' }}>📦</div>
            <h4 className="fw-bold text-slate-700 mb-2">No Products Listed Yet</h4>
            <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '420px' }}>
              You haven't posted any tech devices for sale yet. Turn your unused electronics into cash today!
            </p>
            <Link
              to="/add-product"
              className="btn btn-primary btn-sm px-4 fw-semibold"
            >
              Post Your First Product
            </Link>
          </div>
        )}

        {/* Listings Grid */}
        {!isLoading && !errorMessage && products.length > 0 && (
          <div className="row g-3 g-md-4 mb-4">
            {products.map((product) => (
              <div key={product._id} className="col-6 col-md-4 col-lg-3">
                <ProductCard product={product} isOwner={true} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyListings;
