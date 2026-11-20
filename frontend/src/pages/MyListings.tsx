import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import type { BackendProduct } from '../components/ProductCard';
import api from '../api/axios';
import axios from 'axios';

const MyListings: React.FC = () => {
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch authenticated user's listings from GET /api/products/my-listings
  const fetchMyListings = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<{ products: BackendProduct[] }>('/api/products/my-listings');
      setProducts(response.data.products || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to load your listings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

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
          <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
            <div className="row g-2 text-center text-sm-start">
              <div className="col-4 col-sm-3 border-end">
                <span className="text-muted small d-block">Total Listings</span>
                <span className="fw-bold fs-5 text-slate-800">{products.length}</span>
              </div>
              <div className="col-4 col-sm-3 border-end">
                <span className="text-muted small d-block">Active / Available</span>
                <span className="fw-bold fs-5 text-success">{availableCount}</span>
              </div>
              <div className="col-4 col-sm-3">
                <span className="text-muted small d-block">Sold</span>
                <span className="fw-bold fs-5 text-secondary">{soldCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-5 text-center my-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading your listings...</span>
            </div>
            <p className="text-muted mt-3 small">Loading your listings...</p>
          </div>
        )}

        {/* Error State with Retry */}
        {!isLoading && errorMessage && (
          <div className="card border-0 shadow-sm p-4 text-center my-4 mx-auto" style={{ maxWidth: '600px' }}>
            <div className="text-danger mb-2" style={{ fontSize: '2rem' }}>⚠️</div>
            <h5 className="fw-bold text-slate-800 mb-2">Failed to Load Listings</h5>
            <p className="text-muted small mb-3">{errorMessage}</p>
            <div>
              <button
                onClick={fetchMyListings}
                className="btn btn-outline-primary btn-sm px-4"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && products.length === 0 && (
          <div className="card border-0 shadow-sm p-5 text-center my-4 mx-auto rounded-4" style={{ maxWidth: '600px' }}>
            <div className="mb-3" style={{ fontSize: '3rem' }}>📦</div>
            <h4 className="fw-bold text-slate-800 mb-2">No Listings Yet</h4>
            <p className="text-muted small mb-4">
              You haven't posted any gadgets or tech products for sale yet. Start selling today!
            </p>
            <div>
              <Link to="/add-product" className="btn btn-primary px-4 py-2 fw-semibold">
                Post Your First Listing
              </Link>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !errorMessage && products.length > 0 && (
          <div className="row g-3 g-md-4 mb-4">
            {products.map((product) => {
              const isSold = product.status === 'sold';

              return (
                <div key={product._id} className="col-12 col-sm-6 col-lg-3 position-relative">
                  {/* Status Indicator Badge Overlay */}
                  <div
                    className="position-absolute end-0 top-0 m-3 z-3"
                    style={{ pointerEvents: 'none' }}
                  >
                    {isSold ? (
                      <span className="badge bg-danger shadow-sm px-2 py-1 small fw-bold">
                        Sold
                      </span>
                    ) : (
                      <span className="badge bg-success shadow-sm px-2 py-1 small fw-semibold">
                        Available
                      </span>
                    )}
                  </div>

                  {/* Existing ProductCard (isOwner=true applies subtle yellow card styling) */}
                  <ProductCard product={product} isOwner={true} />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyListings;
