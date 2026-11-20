import React from 'react';

interface FilterSectionProps {
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  onCategoryChange: (val: string) => void;
  onMinPriceChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
  onSortChange: (val: string) => void;
  onReset: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  category,
  minPrice,
  maxPrice,
  sort,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
  onReset
}) => {
  return (
    <div className="card filter-card border-0 shadow-sm p-3 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
          <span>⚙️</span> Filters & Sorting
        </h6>
        <button
          type="button"
          onClick={onReset}
          className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
        >
          Reset All
        </button>
      </div>

      <div className="row g-2 align-items-end">
        {/* Category Dropdown */}
        <div className="col-12 col-sm-6 col-md-3">
          <label className="form-label small fw-semibold mb-1">Category</label>
          <select
            className="form-select form-select-sm"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
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

        {/* Min Price */}
        <div className="col-6 col-sm-3 col-md-2">
          <label className="form-label small fw-semibold mb-1">Min Price (₹)</label>
          <input
            type="number"
            className="form-control form-control-sm"
            placeholder="0"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
          />
        </div>

        {/* Max Price */}
        <div className="col-6 col-sm-3 col-md-2">
          <label className="form-label small fw-semibold mb-1">Max Price (₹)</label>
          <input
            type="number"
            className="form-control form-control-sm"
            placeholder="Any"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
          />
        </div>

        {/* Sort By */}
        <div className="col-12 col-sm-12 col-md-3 ms-md-auto">
          <label className="form-label small fw-semibold mb-1">Sort By</label>
          <select
            className="form-select form-select-sm"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
