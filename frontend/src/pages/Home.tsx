import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import CategorySection from '../components/CategorySection';
import ProductCard from '../components/ProductCard';
import type { BackendProduct } from '../components/ProductCard';
import FilterSection from '../components/FilterSection';
import { useAppSelector } from '../store/hooks';
import axios from 'axios';

interface ProductsApiResponse {
  products: BackendProduct[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
}

const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  // Products and Pagination State
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProducts, setTotalProducts] = useState<number>(0);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search and Filter States
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('newest');

  // Fetch products from backend GET /api/products
  const fetchProducts = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: Record<string, string | number> = {
        page,
        limit: 12
      };

      if (category.trim()) {
        params.category = category.trim();
      }

      if (activeSearch.trim()) {
        params.search = activeSearch.trim();
      }

      if (minPrice.trim() !== '') {
        const parsedMin = Number(minPrice);
        if (!Number.isNaN(parsedMin) && parsedMin >= 0) {
          params.minPrice = parsedMin;
        }
      }

      if (maxPrice.trim() !== '') {
        const parsedMax = Number(maxPrice);
        if (!Number.isNaN(parsedMax) && parsedMax >= 0) {
          params.maxPrice = parsedMax;
        }
      }

      if (sort.trim()) {
        params.sort = sort.trim();
      }

      const response = await api.get<ProductsApiResponse>('/api/products', { params });

      setProducts(response.data.products || []);
      setCurrentPage(response.data.currentPage || 1);
      setTotalPages(response.data.totalPages || 1);
      setTotalProducts(response.data.totalProducts || 0);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to load marketplace products. Please check your connection.');
      }
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, activeSearch, minPrice, maxPrice, sort]);

  // Re-fetch when filters change (resets to page 1)
  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setSearchInput('');
    setActiveSearch('');
  };

  // Pagination Change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchProducts(newPage);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  return (
    <div className="homepage-wrapper">
      {/* Navigation Bar */}
      <Navbar />

      <main className="container py-4">
        {/* Hero & Search Banner */}
        <section className="hero-search-section rounded-4 p-4 p-md-5 mb-4 text-center">
          <div className="mx-auto" style={{ maxWidth: '680px' }}>
            <span className="badge-tech-tag mb-2">Second-Hand Tech Marketplace</span>
            <h1 className="hero-title mb-2">Buy & Sell Pre-Owned Tech with Confidence</h1>
            <p className="hero-subtitle mb-4">
              Find verified deals on smartphones, laptops, audio gear, wearables, and cameras.
            </p>

            {/* Prominent Search Bar */}
            <form onSubmit={handleSearchSubmit} className="search-form d-flex gap-2">
              <div className="input-group search-input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  🔍
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by brand, model or device (e.g. iPhone 14, MacBook M2, Sony XM5)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-link text-muted border-0 text-decoration-none pe-3"
                    onClick={() => {
                      setSearchInput('');
                      setActiveSearch('');
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-search px-4 fw-semibold text-white">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Product Categories */}
        <CategorySection
          selectedCategory={category}
          onSelectCategory={(selected) => setCategory(selected)}
        />

        {/* Filter and Sorting UI */}
        <FilterSection
          category={category}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sort={sort}
          onCategoryChange={setCategory}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onSortChange={setSort}
          onReset={handleResetFilters}
        />

        {/* Product Listings Header */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0 text-slate-800">
            Available Listings
          </h5>
          {!isLoading && !errorMessage && (
            <span className="text-muted small">
              {totalProducts === 1 ? '1 listing found' : `${totalProducts} listings found`}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-5 text-center my-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading products...</span>
            </div>
            <p className="text-muted mt-3 small">Loading marketplace listings...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="card border-0 shadow-sm p-4 text-center my-4">
            <div className="text-danger mb-2" style={{ fontSize: '2rem' }}>⚠️</div>
            <h6 className="fw-bold text-danger mb-2">Failed to Load Products</h6>
            <p className="text-muted small mb-3">{errorMessage}</p>
            <div>
              <button
                onClick={() => fetchProducts(currentPage)}
                className="btn btn-outline-primary btn-sm px-4"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && products.length === 0 && (
          <div className="card border-0 shadow-sm p-5 text-center my-4">
            <div className="mb-2" style={{ fontSize: '2.5rem' }}>📦</div>
            <h5 className="fw-bold text-slate-800 mb-1">No Products Found</h5>
            <p className="text-muted small mb-3">
              {activeSearch || category || minPrice || maxPrice
                ? 'No listings matched your active filters or search keyword.'
                : 'There are currently no listings available in the marketplace.'}
            </p>
            {(activeSearch || category || minPrice || maxPrice) && (
              <div>
                <button
                  onClick={handleResetFilters}
                  className="btn btn-outline-secondary btn-sm px-3"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !errorMessage && products.length > 0 && (
          <>
            <div className="row g-3 g-md-4 mb-4">
              {products.map((product) => {
                const sellerId =
                  typeof product.seller === 'object' && product.seller !== null
                    ? product.seller._id
                    : typeof product.seller === 'string'
                    ? product.seller
                    : '';
                const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);

                return (
                  <div key={product._id} className="col-12 col-sm-6 col-lg-3">
                    <ProductCard product={product} isOwner={isOwner} />
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav className="d-flex justify-content-center align-items-center gap-2 my-4">
                <button
                  className="btn btn-outline-secondary btn-sm px-3"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="small text-muted px-2">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm px-3"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-custom border-top py-4 bg-white mt-auto">
        <div className="container text-center text-muted small">
          <div className="fw-semibold text-slate-700 mb-1">
            ⚡ QuickSell - India's Technology-Focused Second-Hand Marketplace
          </div>
          <div>© {new Date().getFullYear()} QuickSell Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
