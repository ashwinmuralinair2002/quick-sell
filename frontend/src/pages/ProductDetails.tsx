import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAppSelector } from '../store/hooks';
import { useCart } from '../context/CartContext';
import type { BackendProduct } from '../components/ProductCard';
import axios from 'axios';

const PRODUCT_CATEGORIES = {
  Mobiles: ['Smartphones', 'Tablets', 'Feature Phones'],
  Wearables: ['Smartwatches', 'Fitness Bands', 'Smart Rings'],
  Audio: ['Headphones', 'Earbuds', 'Speakers', 'Microphones'],
  Computers: ['Laptops', 'Desktops', 'Monitors', 'PC Components'],
  Accessories: ['Keyboards', 'Mice', 'Chargers & Cables', 'Storage Devices', 'Adapters & Hubs'],
  Cameras: ['DSLR Cameras', 'Mirrorless Cameras', 'Action Cameras', 'Camera Lenses']
} as const;

type CategoryName = keyof typeof PRODUCT_CATEGORIES;

interface EditFormErrors {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  subcategory?: string;
  images?: string;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
}

interface CartItemResponse {
  _id: string;
}

interface CartApiResponse {
  items: CartItemResponse[];
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { refreshCartCount } = useCart();

  // Product Data and UI States
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cart Membership & Action States
  const [isInCart, setIsInCart] = useState<boolean>(false);
  const [isCartActionLoading, setIsCartActionLoading] = useState<boolean>(false);
  const [cartActionError, setCartActionError] = useState<string | null>(null);
  const [cartActionSuccess, setCartActionSuccess] = useState<string | null>(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategory, setEditCategory] = useState<CategoryName | ''>('');
  const [editSubcategory, setEditSubcategory] = useState<string>('');
  const [newImages, setNewImages] = useState<ImagePreview[]>([]);
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Confirmation Modal States (SweetAlert-style modal without external packages)
  const [showMarkSoldModal, setShowMarkSoldModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isMarkingSold, setIsMarkingSold] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch product from GET /api/products/:id and check cart status from GET /api/cart
  const fetchProductAndCartStatus = async () => {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch Product
      const productPromise = api.get<{ product: BackendProduct }>(`/api/products/${id}`);
      // 2. Fetch Cart if user is logged in
      const cartPromise = user ? api.get<CartApiResponse>('/api/cart') : Promise.resolve(null);

      const [productResponse, cartResponse] = await Promise.all([productPromise, cartPromise]);

      const data = productResponse.data.product;
      setProduct(data);
      setSelectedImageIndex(0);

      // Pre-fill edit fields
      setEditTitle(data.title);
      setEditDescription(data.description);
      setEditPrice(String(data.price));
      setEditCategory(data.category as CategoryName);
      setEditSubcategory(data.subcategory);

      // Verify cart membership against backend cart
      if (cartResponse && cartResponse.data && Array.isArray(cartResponse.data.items)) {
        const itemExists = cartResponse.data.items.some((item) => item._id === id);
        setIsInCart(itemExists);
      } else {
        setIsInCart(false);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to load product details. Please check your connection.');
      }
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductAndCartStatus();
  }, [id, user]);

  // Compute seller ID and ownership
  const sellerId =
    product && typeof product.seller === 'object' && product.seller !== null
      ? product.seller._id
      : product && typeof product.seller === 'string'
      ? product.seller
      : '';

  const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);
  const isSold = product?.status === 'sold';

  // Image helpers
  const getImageUrls = (): string[] => {
    if (!product || !Array.isArray(product.images)) return [];
    return product.images.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img.url === 'string') return img.url;
      return '';
    }).filter(Boolean);
  };

  const imageUrls = getImageUrls();
  const currentMainImage = imageUrls[selectedImageIndex] || imageUrls[0] || '';

  // Handle Cart Button Click: Add to Cart (POST) or Remove from Cart (DELETE)
  const handleCartAction = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!product) return;

    if (isOwner) {
      setCartActionError('You cannot purchase your own listing.');
      return;
    }

    setIsCartActionLoading(true);
    setCartActionError(null);
    setCartActionSuccess(null);

    try {
      if (isInCart) {
        // Product is already in cart -> Remove from Cart (DELETE /api/cart/items/:productId)
        const response = await api.delete(`/api/cart/items/${product._id}`);
        setIsInCart(false);
        setCartActionSuccess(response.data.message || 'Product removed from your cart.');
        await refreshCartCount();
      } else {
        // Product is not in cart -> Add to Cart (POST /api/cart/items)
        if (product.status === 'sold') {
          setCartActionError('This product has already been sold.');
          setIsCartActionLoading(false);
          return;
        }

        const response = await api.post('/api/cart/items', {
          productId: product._id
        });
        setIsInCart(true);
        setCartActionSuccess(response.data.message || 'Product added to your cart!');
        await refreshCartCount();
      }

      // Auto-clear success notification after 3 seconds
      setTimeout(() => {
        setCartActionSuccess(null);
      }, 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setCartActionError(err.response.data.message);
      } else {
        setCartActionError('Failed to update cart. Please try again.');
      }
    } finally {
      setIsCartActionLoading(false);
    }
  };

  // Handle Edit Category Change
  const handleEditCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CategoryName | '';
    setEditCategory(selected);
    setEditSubcategory('');
    if (editErrors.category) setEditErrors((prev) => ({ ...prev, category: undefined }));
    if (editErrors.subcategory) setEditErrors((prev) => ({ ...prev, subcategory: undefined }));
  };

  // Handle New Image Selection for Edit
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const maxAllowed = 5;

    if (newImages.length + selectedFiles.length > maxAllowed) {
      setEditErrors((prev) => ({
        ...prev,
        images: `You can upload a maximum of ${maxAllowed} images`
      }));
      return;
    }

    const previews: ImagePreview[] = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setNewImages((prev) => [...prev, ...previews]);
    if (editErrors.images) setEditErrors((prev) => ({ ...prev, images: undefined }));
    e.target.value = '';
  };

  const handleRemoveNewImage = (idxToRemove: number) => {
    setNewImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      URL.revokeObjectURL(prev[idxToRemove].previewUrl);
      return updated;
    });
  };

  // Validate Edit Form
  const validateEditForm = (): boolean => {
    const newErrors: EditFormErrors = {};

    if (!editTitle.trim()) {
      newErrors.title = 'Title is required';
    } else if (editTitle.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!editDescription.trim()) {
      newErrors.description = 'Description is required';
    } else if (editDescription.trim().length < 15) {
      newErrors.description = 'Description must be at least 15 characters';
    }

    const numPrice = Number(editPrice);
    if (!editPrice.trim()) {
      newErrors.price = 'Price is required';
    } else if (Number.isNaN(numPrice) || numPrice <= 0) {
      newErrors.price = 'Price must be a positive number';
    }

    if (!editCategory) {
      newErrors.category = 'Category is required';
    }

    if (!editSubcategory) {
      newErrors.subcategory = 'Subcategory is required';
    }

    // Backend rule: if new images are provided to replace old ones, at least 2 are required
    if (newImages.length > 0 && newImages.length < 2) {
      newErrors.images = 'When replacing images, at least 2 images are required (max 5)';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Edit Submit (PUT /api/products/:id)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!validateEditForm() || !id) return;

    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      formData.append('price', editPrice.trim());
      formData.append('category', editCategory);
      formData.append('subcategory', editSubcategory);

      // Only append images if replacing existing images
      if (newImages.length > 0) {
        newImages.forEach((img) => {
          formData.append('images', img.file);
        });
      }

      const response = await api.put<{ message: string; product: BackendProduct }>(
        `/api/products/${id}`,
        formData
      );

      setUpdateSuccess(response.data.message || 'Product updated successfully!');
      setProduct(response.data.product);
      setNewImages([]);

      setTimeout(() => {
        setIsEditing(false);
        setUpdateSuccess(null);
      }, 1000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setUpdateError(err.response.data.message);
      } else {
        setUpdateError('Failed to update product. Please check your connection.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm and Execute Mark as Sold
  const handleConfirmMarkAsSold = async () => {
    if (!id || !product) return;

    setIsMarkingSold(true);
    setCartActionError(null);

    try {
      const response = await api.put<{ message: string; product: BackendProduct }>(
        `/api/products/${id}`,
        { status: 'sold' }
      );

      setProduct(response.data.product);
      setShowMarkSoldModal(false);
      setCartActionSuccess('Product marked as SOLD successfully!');

      setTimeout(() => {
        setCartActionSuccess(null);
      }, 3500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setCartActionError(err.response.data.message);
      } else {
        setCartActionError('Failed to mark product as sold.');
      }
      setShowMarkSoldModal(false);
    } finally {
      setIsMarkingSold(false);
    }
  };

  // Confirm and Execute Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!id || !product) return;

    setIsDeleting(true);
    setCartActionError(null);

    try {
      await api.delete(`/api/products/${id}`);
      setShowDeleteModal(false);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setCartActionError(err.response.data.message);
      } else {
        setCartActionError('Failed to delete product. Please try again.');
      }
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

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

        {/* Loading State */}
        {isLoading && (
          <div className="py-5 text-center my-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading product...</span>
            </div>
            <p className="text-muted mt-3 small">Loading listing details...</p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && (errorMessage || !product) && (
          <div className="card border-0 shadow-sm p-5 text-center my-4 mx-auto" style={{ maxWidth: '600px' }}>
            <div className="mb-2" style={{ fontSize: '2.5rem' }}>🔍</div>
            <h5 className="fw-bold text-slate-800 mb-2">Product Not Found</h5>
            <p className="text-muted small mb-3">
              {errorMessage || 'The product you are looking for does not exist or may have been removed.'}
            </p>
            <div>
              <Link to="/" className="btn btn-primary btn-sm px-4">
                Browse Marketplace
              </Link>
            </div>
          </div>
        )}

        {/* Product Details View */}
        {!isLoading && product && !isEditing && (
          <div className="row g-4">
            {/* Left Column: Image Gallery */}
            <div className="col-12 col-lg-7">
              <div
                className="card border-0 shadow-sm rounded-4 p-3 bg-white"
                style={{ backgroundColor: isOwner ? '#FFF9E9' : '#ffffff' }}
              >
                {/* Main Large Image */}
                <div
                  className="rounded-3 overflow-hidden position-relative bg-light mb-3"
                  style={{ height: '420px', width: '100%' }}
                >
                  {currentMainImage ? (
                    <img
                      src={currentMainImage}
                      alt={product.title}
                      className="w-100 h-100"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                      No Image Available
                    </div>
                  )}

                  {/* Badges */}
                  <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
                    {isOwner && (
                      <span
                        className="badge px-3 py-2 rounded-2"
                        style={{
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.825rem'
                        }}
                      >
                        Your Listing
                      </span>
                    )}
                    {isSold && (
                      <span className="badge bg-danger px-3 py-2 rounded-2 fw-bold" style={{ fontSize: '0.825rem' }}>
                        SOLD
                      </span>
                    )}
                  </div>

                  <span className="badge bg-dark bg-opacity-75 text-white position-absolute bottom-0 end-0 m-3 px-3 py-1 rounded-2">
                    {product.category}
                  </span>
                </div>

                {/* Thumbnail Strip */}
                {imageUrls.length > 1 && (
                  <div className="d-flex gap-2 overflow-auto pb-1">
                    {imageUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`p-0 border rounded-2 overflow-hidden bg-white ${
                          selectedImageIndex === idx ? 'border-primary border-2 shadow-sm' : 'border-light'
                        }`}
                        style={{ width: '80px', height: '80px', flexShrink: 0, cursor: 'pointer' }}
                      >
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Product Information */}
            <div className="col-12 col-lg-5">
              <div
                className="card border-0 shadow-sm rounded-4 p-4 p-md-4 bg-white h-100 d-flex flex-column"
                style={{ backgroundColor: isOwner ? '#FFF9E9' : '#ffffff' }}
              >
                {/* Category & Status Badges */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted fw-semibold">
                    {product.category} &rsaquo; {product.subcategory}
                  </span>
                  {isSold ? (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold">
                      Sold Out
                    </span>
                  ) : (
                    <span className="badge bg-light text-secondary border">Verified Tech</span>
                  )}
                </div>

                {/* Title */}
                <h3 className="fw-bold text-slate-800 mb-2">{product.title}</h3>

                {/* Price */}
                <div className="fs-2 fw-bold text-primary mb-3">
                  ₹{new Intl.NumberFormat('en-IN').format(product.price)}
                </div>

                <hr className="my-3 opacity-25" />

                {/* Description */}
                <div className="mb-4">
                  <h6 className="fw-bold text-slate-800 mb-2">Product Description</h6>
                  <p className="text-secondary small" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {product.description}
                  </p>
                </div>

                <hr className="my-3 opacity-25" />

                {/* Seller Information */}
                <div className="mb-4">
                  <h6 className="fw-bold text-slate-800 mb-2">Seller Details</h6>
                  {typeof product.seller === 'object' && product.seller !== null ? (
                    <div className="p-3 bg-light rounded-3">
                      <div className="fw-semibold text-slate-800">{product.seller.name}</div>
                      <div className="text-muted small">{product.seller.email}</div>
                    </div>
                  ) : (
                    <div className="text-muted small">Seller information available</div>
                  )}
                </div>

                {/* Cart Action Feedback Alerts */}
                {cartActionSuccess && (
                  <div className="alert alert-success py-2 px-3 small mb-3">
                    <strong>Success: </strong> {cartActionSuccess}
                  </div>
                )}

                {cartActionError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3">
                    <strong>Error: </strong> {cartActionError}
                  </div>
                )}

                {/* Owner Actions (Directly below Seller Information) */}
                <div className="mt-auto pt-2">
                  {isOwner ? (
                    isSold ? (
                      <div className="alert alert-secondary py-3 px-3 small mb-0 text-center rounded-3">
                        <div className="fw-bold mb-1">🏷️ Listing Marked as Sold</div>
                        <div className="text-muted">
                          This item has been marked as sold. Seller actions and buyer purchases are disabled.
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        <div className="alert alert-warning py-2 px-3 small mb-2 d-flex align-items-center gap-2">
                          <span>ℹ️</span> You are the seller of this listing.
                        </div>

                        {/* 1. Edit Product Button (Primary Blue) */}
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="btn btn-primary w-100 py-2 fw-semibold"
                        >
                          ✏️ Edit Product
                        </button>

                        {/* 2. Mark as Sold Button (Yellow/Amber) */}
                        <button
                          type="button"
                          onClick={() => setShowMarkSoldModal(true)}
                          className="btn btn-warning w-100 py-2 fw-semibold text-dark"
                          style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#ffffff' }}
                        >
                          ✓ Mark as Sold
                        </button>

                        {/* 3. Delete Listing Button (Red) */}
                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(true)}
                          className="btn btn-danger w-100 py-2 fw-semibold"
                        >
                          🗑️ Delete Listing
                        </button>
                      </div>
                    )
                  ) : isSold ? (
                    <button className="btn btn-secondary w-100 py-2 fw-semibold" disabled>
                      Sold Out
                    </button>
                  ) : (
                    <button
                      className={`btn w-100 py-2 fw-semibold ${
                        isInCart ? 'btn-secondary text-white' : 'btn-primary-custom'
                      }`}
                      onClick={handleCartAction}
                      disabled={isCartActionLoading}
                    >
                      {isCartActionLoading ? (
                        <span className="d-flex align-items-center justify-content-center gap-2">
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>{isInCart ? 'Removing from Cart...' : 'Adding to Cart...'}</span>
                        </span>
                      ) : isInCart ? (
                        'Remove from Cart'
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form View (Only contains editing fields) */}
        {!isLoading && product && isEditing && (
          <div className="mx-auto" style={{ maxWidth: '720px' }}>
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <span className="badge-tech-tag bg-primary bg-opacity-10 text-primary mb-2">
                    Edit Listing
                  </span>
                  <h2 className="fw-bold text-slate-800 mb-1">Update Product Details</h2>
                  <p className="text-muted small mb-0">Modify your gadget's details and photos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-outline-secondary btn-sm"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
              </div>

              {/* Success Alert */}
              {updateSuccess && (
                <div className="alert alert-success py-2 px-3 mb-3 small">
                  <strong>Success: </strong> {updateSuccess}
                </div>
              )}

              {/* Error Alert */}
              {updateError && (
                <div className="alert alert-danger py-2 px-3 mb-3 small">
                  <strong>Error: </strong> {updateError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} noValidate>
                {/* Title */}
                <div className="mb-3">
                  <label htmlFor="editTitle" className="form-label">
                    Product Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="editTitle"
                    disabled={isUpdating}
                    className={`form-control ${editErrors.title ? 'is-invalid' : ''}`}
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (editErrors.title) setEditErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                  />
                  {editErrors.title && <div className="field-error">{editErrors.title}</div>}
                </div>

                {/* Category & Subcategory */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label htmlFor="editCategory" className="form-label">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      id="editCategory"
                      disabled={isUpdating}
                      className={`form-select ${editErrors.category ? 'is-invalid' : ''}`}
                      value={editCategory}
                      onChange={handleEditCategoryChange}
                    >
                      <option value="">Select Category</option>
                      {Object.keys(PRODUCT_CATEGORIES).map((catKey) => (
                        <option key={catKey} value={catKey}>
                          {catKey}
                        </option>
                      ))}
                    </select>
                    {editErrors.category && <div className="field-error">{editErrors.category}</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="editSubcategory" className="form-label">
                      Subcategory <span className="text-danger">*</span>
                    </label>
                    <select
                      id="editSubcategory"
                      disabled={isUpdating || !editCategory}
                      className={`form-select ${editErrors.subcategory ? 'is-invalid' : ''}`}
                      value={editSubcategory}
                      onChange={(e) => {
                        setEditSubcategory(e.target.value);
                        if (editErrors.subcategory) setEditErrors((prev) => ({ ...prev, subcategory: undefined }));
                      }}
                    >
                      <option value="">
                        {editCategory ? 'Select Subcategory' : 'Select Category first'}
                      </option>
                      {editCategory &&
                        PRODUCT_CATEGORIES[editCategory]?.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                    </select>
                    {editErrors.subcategory && <div className="field-error">{editErrors.subcategory}</div>}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <label htmlFor="editPrice" className="form-label">
                    Price (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">₹</span>
                    <input
                      type="number"
                      id="editPrice"
                      disabled={isUpdating}
                      className={`form-control ${editErrors.price ? 'is-invalid' : ''}`}
                      value={editPrice}
                      onChange={(e) => {
                        setEditPrice(e.target.value);
                        if (editErrors.price) setEditErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                    />
                  </div>
                  {editErrors.price && <div className="field-error">{editErrors.price}</div>}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label htmlFor="editDescription" className="form-label">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="editDescription"
                    rows={4}
                    disabled={isUpdating}
                    className={`form-control ${editErrors.description ? 'is-invalid' : ''}`}
                    value={editDescription}
                    onChange={(e) => {
                      setEditDescription(e.target.value);
                      if (editErrors.description) setEditErrors((prev) => ({ ...prev, description: undefined }));
                    }}
                  />
                  {editErrors.description && <div className="field-error">{editErrors.description}</div>}
                </div>

                {/* Replace Images Section */}
                <div className="mb-4">
                  <label className="form-label d-flex justify-content-between align-items-center">
                    <span>Replace Images (Optional)</span>
                    <span className="small text-muted">
                      {newImages.length > 0 ? `${newImages.length}/5 new photos` : 'Keep existing images'}
                    </span>
                  </label>

                  <div className="border border-2 border-dashed rounded-3 p-3 text-center bg-light mb-3">
                    <p className="small text-muted mb-2">
                      Upload new photos only if you want to replace current listing images (minimum 2, maximum 5).
                    </p>
                    <label
                      className={`btn btn-outline-secondary btn-sm px-3 mb-0 ${isUpdating || newImages.length >= 5 ? 'disabled' : ''}`}
                      style={{ cursor: isUpdating || newImages.length >= 5 ? 'not-allowed' : 'pointer' }}
                    >
                      Select New Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="d-none"
                        onChange={handleNewImageChange}
                        disabled={isUpdating || newImages.length >= 5}
                      />
                    </label>
                  </div>

                  {editErrors.images && <div className="field-error mb-2">{editErrors.images}</div>}

                  {/* New Previews */}
                  {newImages.length > 0 && (
                    <div className="row g-2">
                      {newImages.map((img, idx) => (
                        <div key={idx} className="col-4 col-sm-3 col-md-2 position-relative">
                          <div className="border rounded-2 overflow-hidden position-relative" style={{ height: '80px' }}>
                            <img src={img.previewUrl} alt="New Preview" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                            {!isUpdating && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNewImage(idx)}
                                className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 m-1 rounded-circle"
                                style={{ width: '20px', height: '20px', fontSize: '10px' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Saving Changes...</span>
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setNewImages([]);
                    }}
                    className="btn btn-outline-secondary px-4"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* SweetAlert-Style Bootstrap Confirmation Modal: Mark as Sold */}
      {showMarkSoldModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div
                className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                style={{ width: '64px', height: '64px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '28px' }}
              >
                🏷️
              </div>
              <h4 className="fw-bold text-slate-800 mb-2">Mark as Sold?</h4>
              <p className="text-muted small mb-4">
                Are you sure you want to mark this item as <strong>SOLD</strong>? Once marked as sold, it cannot be purchased and will no longer appear in the marketplace.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1 py-2 fw-semibold border"
                  onClick={() => setShowMarkSoldModal(false)}
                  disabled={isMarkingSold}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning flex-grow-1 py-2 fw-semibold text-dark"
                  style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#ffffff' }}
                  onClick={handleConfirmMarkAsSold}
                  disabled={isMarkingSold}
                >
                  {isMarkingSold ? (
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Marking...</span>
                    </span>
                  ) : (
                    'Yes, Mark as Sold'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert-Style Bootstrap Confirmation Modal: Delete Listing */}
      {showDeleteModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div
                className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '28px' }}
              >
                🗑️
              </div>
              <h4 className="fw-bold text-slate-800 mb-2">Delete Listing?</h4>
              <p className="text-muted small mb-4">
                Are you sure you want to delete this listing? <strong>This action is permanent</strong> and will immediately delete all product details and photos from Cloudinary.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1 py-2 fw-semibold border"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger flex-grow-1 py-2 fw-semibold"
                  onClick={handleConfirmDeleteProduct}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Deleting...</span>
                    </span>
                  ) : (
                    'Yes, Delete It'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
