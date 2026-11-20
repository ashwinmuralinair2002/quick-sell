import React from 'react';
import { Link } from 'react-router-dom';

export interface BackendImage {
  url: string;
  public_id: string;
}

export interface BackendSeller {
  _id: string;
  name: string;
  email: string;
}

export interface BackendProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  images: BackendImage[] | string[];
  seller?: BackendSeller | string;
  status: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductCardProps {
  product: BackendProduct;
  isOwner?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isOwner = false }) => {
  // Format price in Indian Rupee format
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(product.price);

  // Extract first product image URL from backend structure
  let imageUrl = '';
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0];
    if (typeof firstImg === 'string') {
      imageUrl = firstImg;
    } else if (firstImg && typeof firstImg.url === 'string') {
      imageUrl = firstImg.url;
    }
  }

  return (
    <Link
      to={`/product/${product._id}`}
      className="text-decoration-none text-dark d-block h-100"
    >
      <div
        className="card product-card h-100 border-0 shadow-sm"
        style={{
          backgroundColor: isOwner ? '#FFF9E9' : '#ffffff'
        }}
      >
        {/* Product Image Container */}
        <div className="product-image-container position-relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="card-img-top product-img"
              loading="lazy"
            />
          ) : (
            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted">
              <span>No Image</span>
            </div>
          )}

          {/* Your Listing Badge */}
          {isOwner && (
            <span
              className="badge position-absolute top-0 start-0 m-2 px-2 py-1 small rounded-1"
              style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            >
              Your Listing
            </span>
          )}

          <span className="badge bg-dark bg-opacity-75 text-white position-absolute bottom-0 end-0 m-2 px-2 py-1 small rounded-1">
            {product.category}
          </span>
        </div>

        {/* Product Card Details */}
        <div className="card-body d-flex flex-column p-3">
          <h6 className="product-title card-title mb-1" title={product.title}>
            {product.title}
          </h6>

          <div className="product-price mb-2">
            ₹{formattedPrice}
          </div>

          <div className="mt-auto d-flex align-items-center justify-content-between text-muted small pt-2 border-top">
            {product.location ? (
              <span className="d-flex align-items-center gap-1 text-truncate">
                <span>📍</span> {product.location}
              </span>
            ) : (
              <span className="text-secondary small">
                {product.subcategory}
              </span>
            )}
            <span className="badge bg-light text-secondary border">Verified</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
