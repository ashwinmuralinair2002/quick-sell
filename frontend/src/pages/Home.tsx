import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import CategorySection from '../components/CategorySection';
import ProductCard from '../components/ProductCard';
import FilterSection from '../components/FilterSection';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProducts } from '../store/productSlice';
import type { FetchProductsParams } from '../store/productSlice';

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { products, currentPage, totalPages, totalProducts, isLoading, error: errorMessage } =
    useAppSelector((state) => state.products);

  // Immediate input states (separate from debounced query values for instant typing feedback)
  const [searchInput, setSearchInput] = useState<string>('');
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');

  // Debounced filter states used for triggering API queries
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState<string>('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<string>('');

  // Applied filters (used for querying and badge display)
  const [category, setCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('newest');

  // Filter Modal visibility and draft states
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [draftCategory, setDraftCategory] = useState<string>('');
  const [draftMinPrice, setDraftMinPrice] = useState<string>('');
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>('');
  const [draftSort, setDraftSort] = useState<string>('newest');

  // 400ms Debounce effect for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  // Dispatch fetchProducts thunk with cancellation of stale in-flight requests
  const loadProducts = useCallback(
    (page: number = 1) => {
      const params: FetchProductsParams = {
        page,
        limit: 12
      };

      if (category.trim()) {
        params.category = category.trim();
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
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

      const promise = dispatch(fetchProducts(params));
      return () => {
        promise.abort();
      };
    },
    [dispatch, category, debouncedSearch, minPrice, maxPrice, sort]
  );

  // Re-fetch when debounced search/price, category, or sort changes (resets to page 1)
  useEffect(() => {
    const cancel = loadProducts(1);
    return () => {
      if (cancel) cancel();
    };
  }, [loadProducts]);

  // Handle immediate Search Form Submission (bypasses remaining 400ms delay on Enter/Submit)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchInput);
  };

  // Open filter modal and synchronize draft states from currently applied filters
  const handleOpenFilterModal = () => {
    setDraftCategory(category);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftSort(sort);
    setShowFilterModal(true);
  };

  // Apply filters from modal
  const handleApplyModalFilters = () => {
    setCategory(draftCategory);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setSort(draftSort);
    setShowFilterModal(false);
  };

  // Reset modal draft filters
  const handleResetModalFilters = () => {
    setDraftCategory('');
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setDraftSort('newest');
  };

  // Reset all active filters (and search if requested)
  const handleResetFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setSearchInput('');
    setDebouncedSearch('');
    setDraftCategory('');
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setDraftSort('newest');
  };

  // Pagination Change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      loadProducts(newPage);
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
                <span className="input-group-text bg-white border-end-0 ps-3">
                  <span className="text-muted">🔍</span>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 py-2 ps-2"
                  placeholder="Search smartphones, laptops, audio devices..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search products"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-link text-muted border-0 pe-3 text-decoration-none"
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedSearch('');
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-primary px-4 fw-semibold shadow-sm">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Category Navigation Bar */}
        <CategorySection
          selectedCategory={category}
          onSelectCategory={(cat) => setCategory(cat)}
        />



        {/* Active Filters Summary */}
        {(category || debouncedSearch || minPrice || maxPrice || sort !== 'newest') && (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-1">
            <div className="d-flex align-items-center gap-2 flex-wrap small text-muted">
              <span>Filtering by:</span>
              {category && <span className="badge bg-light text-dark border">Category: {category}</span>}
              {debouncedSearch && <span className="badge bg-light text-dark border">Search: "{debouncedSearch}"</span>}
              {minPrice && <span className="badge bg-light text-dark border">Min: ₹{minPrice}</span>}
              {maxPrice && <span className="badge bg-light text-dark border">Max: ₹{maxPrice}</span>}
              {sort !== 'newest' && <span className="badge bg-light text-dark border">Sort: {sort}</span>}
            </div>

            <button
              onClick={handleResetFilters}
              className="btn btn-link btn-sm text-decoration-none p-0 text-primary small"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Section Heading with Results Count & Filter Button */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-1">
          <h2 className="section-title mb-0">Explore Available Listings</h2>
          <div className="d-flex align-items-center gap-3">
            {!isLoading && !errorMessage && (
              <span className="text-muted small">
                {totalProducts} {totalProducts === 1 ? 'device' : 'devices'} found
              </span>
            )}
            <button
              type="button"
              onClick={handleOpenFilterModal}
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 px-3 py-1 rounded-3 shadow-sm"
              aria-label="Filter and Sort"
            >
              <span>⚙️</span>
              <span className="fw-semibold">Filters</span>
              {(((Boolean(category) ? 1 : 0) + (Boolean(minPrice) ? 1 : 0) + (Boolean(maxPrice) ? 1 : 0) + (sort !== "newest" ? 1 : 0))) > 0 && (
                <span className="badge bg-primary rounded-pill px-2 py-0" style={{ fontSize: '0.7rem' }}>
                  {(((Boolean(category) ? 1 : 0) + (Boolean(minPrice) ? 1 : 0) + (Boolean(maxPrice) ? 1 : 0) + (sort !== "newest" ? 1 : 0)))}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading marketplace products...</span>
            </div>
            <p className="text-muted small">Fetching pre-owned tech deals...</p>
          </div>
        )}

        {/* Error Alert */}
        {!isLoading && errorMessage && (
          <div className="alert alert-danger py-3 px-4 rounded-3 text-center my-4" role="alert">
            <p className="mb-2 fw-semibold">{errorMessage}</p>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => loadProducts(currentPage)}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && products.length === 0 && (
          <div className="empty-state-box text-center py-5 my-4 bg-white rounded-4 border p-4 shadow-sm">
            <div className="empty-state-icon mb-3" style={{ fontSize: '3rem' }}>🔍</div>
            <h4 className="fw-bold text-slate-700 mb-2">No Devices Match Your Search</h4>
            <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '420px' }}>
              We couldn't find any second-hand products matching your current filters. Try searching for broader terms or resetting your filters.
            </p>
            <button
              className="btn btn-primary btn-sm px-4 fw-semibold"
              onClick={handleResetFilters}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !errorMessage && products.length > 0 && (
          <div className="row g-3 g-md-4 mb-4">
            {products.map((product) => {
              const sellerId =
                product.seller && typeof product.seller === 'object' && '_id' in product.seller
                  ? product.seller._id
                  : typeof product.seller === 'string'
                  ? product.seller
                  : '';
              const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);

              return (
                <div key={product._id} className="col-6 col-md-4 col-lg-3">
                  <ProductCard product={product} isOwner={isOwner} />
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !errorMessage && totalPages > 1 && (
          <nav aria-label="Product pagination" className="d-flex justify-content-center my-4">
            <ul className="pagination pagination-custom gap-1">
              {/* Previous Button */}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link rounded-2"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous"
                >
                  ‹ Prev
                </button>
              </li>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <li
                  key={pageNum}
                  className={`page-item ${currentPage === pageNum ? 'active' : ''}`}
                >
                  <button
                    className="page-link rounded-2"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                </li>
              ))}

              {/* Next Button */}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link rounded-2"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next"
                >
                  Next ›
                </button>
              </li>
            </ul>
          </nav>
        )}

      {/* Filter and Sorting Modal */}
      {showFilterModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                  <h5 className="fw-bold text-slate-800 mb-0">Filter & Sort Products</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFilterModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              <div>
                {/* Category Selection */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Mobiles">Mobiles</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Audio">Audio</option>
                    <option value="Computers">Computers</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Cameras">Cameras</option>
                  </select>
                </div>

                {/* Price Range */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold mb-1">Min Price (₹)</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light text-muted">₹</span>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="0"
                        min="0"
                        value={draftMinPrice}
                        onChange={(e) => setDraftMinPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-semibold mb-1">Max Price (₹)</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light text-muted">₹</span>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Any"
                        min="0"
                        value={draftMaxPrice}
                        onChange={(e) => setDraftMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sort Option */}
                <div className="mb-4">
                  <label className="form-label small fw-semibold mb-1">Sort By</label>
                  <select
                    className="form-select form-select-sm"
                    value={draftSort}
                    onChange={(e) => setDraftSort(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>

                {/* Modal Footer Controls */}
                <div className="d-flex align-items-center justify-content-between pt-2 border-top gap-2">
                  <button
                    type="button"
                    onClick={handleResetModalFilters}
                    className="btn btn-outline-secondary btn-sm px-3 fw-semibold"
                  >
                    Reset All
                  </button>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFilterModal(false)}
                      className="btn btn-outline-secondary btn-sm px-3"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyModalFilters}
                      className="btn btn-primary btn-sm px-4 fw-semibold"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default Home;
