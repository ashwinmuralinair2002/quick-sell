import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProductById, updateProduct, deleteProduct, clearSelectedProduct } from '../store/productSlice';
import { addToCart, removeFromCart } from '../store/cartSlice';

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

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { selectedProduct: product, isLoading, error: errorMessage } = useAppSelector(
    (state) => state.products
  );
  const cartItems = useAppSelector((state) => state.cart.items);
  const isInCart = Boolean(id && cartItems.some((item) => item._id === id));

  // Selected image index
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Cart Action Feedback States
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

  // Fetch product from Redux fetchProductById
  useEffect(() => {
    if (!id) return;

    // Reset selected product when navigating to avoid stale data
    dispatch(clearSelectedProduct());
    setSelectedImageIndex(0);

    // Fetch product details into Redux
    dispatch(fetchProductById(id));

    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [id, dispatch]);

  // Sync edit form fields when product is loaded / updated
  useEffect(() => {
    if (product) {
      setEditTitle(product.title);
      setEditDescription(product.description);
      setEditPrice(String(product.price));
      setEditCategory(product.category as CategoryName);
      setEditSubcategory(product.subcategory);
    }
  }, [product]);

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
    if (!product || !Array.isArray(product.images) || product.images.length === 0) {
      return [];
    }
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
        // Product is already in cart -> Remove from Cart via Redux thunk
        const response = await dispatch(removeFromCart(product._id)).unwrap();
        setCartActionSuccess(response.message || 'Product removed from your cart.');
      } else {
        // Product is not in cart -> Add to Cart via Redux thunk
        if (product.status === 'sold') {
          setCartActionError('This product has already been sold.');
          setIsCartActionLoading(false);
          return;
        }

        const response = await dispatch(addToCart(product._id)).unwrap();
        setCartActionSuccess(response.message || 'Product added to your cart!');
      }

      // Auto-clear success notification after 3 seconds
      setTimeout(() => {
        setCartActionSuccess(null);
      }, 3000);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setCartActionError(err);
      } else if (err instanceof Error) {
        setCartActionError(err.message);
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
      newErrors.title = 'Product title is required';
    } else if (editTitle.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!editDescription.trim()) {
      newErrors.description = 'Product description is required';
    } else if (editDescription.trim().length < 15) {
      newErrors.description = 'Description must be at least 15 characters long';
    }

    if (!editPrice.trim()) {
      newErrors.price = 'Selling price is required';
    } else {
      const parsedPrice = Number(editPrice);
      if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        newErrors.price = 'Please enter a valid positive selling price';
      }
    }

    if (!editCategory) {
      newErrors.category = 'Please select a main category';
    }

    if (!editSubcategory) {
      newErrors.subcategory = 'Please select a subcategory';
    }

    if (newImages.length > 0 && newImages.length < 2) {
      newErrors.images = 'If replacing photos, at least 2 images are required (maximum 5)';
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

      const resultAction = await dispatch(
        updateProduct({ id, data: formData })
      ).unwrap();

      setUpdateSuccess(resultAction.message || 'Product updated successfully!');
      setNewImages([]);

      setTimeout(() => {
        setIsEditing(false);
        setUpdateSuccess(null);
      }, 1000);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setUpdateError(err);
      } else if (err instanceof Error) {
        setUpdateError(err.message);
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
      await dispatch(
        updateProduct({ id, data: { status: 'sold' } })
      ).unwrap();

      setShowMarkSoldModal(false);
      setCartActionSuccess('Product marked as SOLD successfully!');

      setTimeout(() => {
        setCartActionSuccess(null);
      }, 3500);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setCartActionError(err);
      } else if (err instanceof Error) {
        setCartActionError(err.message);
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
      await dispatch(deleteProduct(id)).unwrap();
      setShowDeleteModal(false);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setCartActionError(err);
      } else if (err instanceof Error) {
        setCartActionError(err.message);
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

        {/* Global Action Alerts */}
        {cartActionSuccess && (
          <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3 small" role="alert">
            <div>
              <span>✅ </span>
              <strong>{cartActionSuccess}</strong>
            </div>
            {isInCart && (
              <Link to="/cart" className="alert-link small ms-2 fw-semibold">
                View Cart &rarr;
              </Link>
            )}
          </div>
        )}

        {cartActionError && (
          <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
            <span>⚠️ </span>
            {cartActionError}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading product details...</span>
            </div>
            <p className="text-muted small">Loading hardware specification & details...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && (errorMessage || !product) && (
          <div className="alert alert-danger py-4 px-4 text-center rounded-3 my-4">
            <h5 className="fw-bold mb-2">Unable to Load Product</h5>
            <p className="text-muted small mb-3">{errorMessage || 'The requested product could not be found or has been removed.'}</p>
            <button
              onClick={() => {
                if (id) dispatch(fetchProductById(id));
              }}
              className="btn btn-primary btn-sm px-4 fw-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Product Details Display (View Mode) */}
        {!isLoading && product && !isEditing && (
          <div className="row g-4 g-lg-5">
            {/* Left Column: Image Gallery */}
            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white p-3">
                {/* Main Featured Image with Zoom View Container */}
                <div
                  className="rounded-3 overflow-hidden position-relative bg-light d-flex align-items-center justify-content-center mb-3"
                  style={{ minHeight: '380px', maxHeight: '480px' }}
                >
                  {currentMainImage ? (
                    <img
                      src={currentMainImage}
                      alt={product.title}
                      className="img-fluid w-100"
                      style={{
                        objectFit: 'contain',
                        maxHeight: '480px',
                        transition: 'transform 0.25s ease'
                      }}
                    />
                  ) : (
                    <div className="text-muted py-5">No image available</div>
                  )}

                  {/* Status Overlay Badge */}
                  {isSold && (
                    <div
                      className="position-absolute top-0 start-0 m-3 badge bg-danger text-uppercase px-3 py-2 fw-bold shadow-sm"
                      style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}
                    >
                      Sold Out
                    </div>
                  )}

                  {/* Owner Indicator Overlay */}
                  {isOwner && (
                    <div
                      className="position-absolute top-0 end-0 m-3 badge px-3 py-2 fw-bold shadow-sm"
                      style={{
                        backgroundColor: '#ffc107',
                        color: '#000000',
                        fontSize: '0.75rem',
                        border: '1px solid #d39e00'
                      }}
                    >
                      Your Listing
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {imageUrls.length > 1 && (
                  <div className="d-flex gap-2 overflow-auto pb-2">
                    {imageUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`btn p-0 border-2 rounded-2 overflow-hidden flex-shrink-0 ${selectedImageIndex === idx ? 'border-primary' : 'border-light'
                          }`}
                        style={{ width: '70px', height: '70px' }}
                      >
                        <img
                          src={url}
                          alt={`${product.title} thumbnail ${idx + 1}`}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Product Metadata, Pricing, Actions & Seller Info */}
            <div className="col-12 col-lg-5">
              <div className="d-flex flex-column h-100">
                {/* Category & Subcategory Tags */}
                <div className="mb-2">
                  <span className="badge bg-light text-dark border px-2 py-1 small me-2">
                    {product.category}
                  </span>
                  <span className="badge bg-light text-secondary border px-2 py-1 small">
                    {product.subcategory}
                  </span>
                </div>

                {/* Product Title */}
                <h1 className="fw-bold text-slate-800 mb-2 h3">
                  {product.title}
                </h1>

                {/* Price Display */}
                <div className="price-tag mb-3 fs-2 fw-bold text-primary">
                  ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(product.price)}
                </div>

                {/* Owner Manage Bar (Edit, Mark as Sold, Delete) */}
                {isOwner && (
                  <div className="owner-action-panel p-3 rounded-3 mb-4 bg-warning bg-opacity-10 border border-warning">
                    <div className="small fw-semibold text-dark mb-2 d-flex align-items-center gap-1">
                      <span>⚙️</span> Manage Your Listing:
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {/* Edit Button */}
                      {!isSold && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setUpdateError(null);
                            setUpdateSuccess(null);
                          }}
                          className="btn btn-sm btn-outline-dark fw-semibold"
                        >
                          ✏️ Edit Listing
                        </button>
                      )}

                      {/* Mark as Sold Button */}
                      {!isSold && (
                        <button
                          type="button"
                          onClick={() => setShowMarkSoldModal(true)}
                          className="btn btn-sm btn-outline-success fw-semibold"
                          disabled={isMarkingSold}
                        >
                          🏷️ Mark as Sold
                        </button>
                      )}

                      {/* Delete Listing Button */}
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="btn btn-sm btn-outline-danger fw-semibold"
                        disabled={isDeleting}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Buyer Action: Add / Remove Cart */}
                {!isOwner && (
                  <div className="d-grid mb-4">
                    <button
                      type="button"
                      onClick={handleCartAction}
                      disabled={isCartActionLoading || (isSold && !isInCart)}
                      className={`btn py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${isInCart
                          ? 'btn-danger'
                          : isSold
                            ? 'btn-secondary disabled'
                            : 'btn-primary-custom'
                        }`}
                    >
                      {isCartActionLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Updating Cart...</span>
                        </>
                      ) : isInCart ? (
                        <>
                          <span>🛒</span>
                          <span>Remove from Cart</span>
                        </>
                      ) : isSold ? (
                        <span>Sold Out</span>
                      ) : (
                        <>
                          <span>🛒</span>
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Hardware Description Section */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                  <h5 className="fw-bold text-slate-800 mb-2">Device Description</h5>
                  <p
                    className="text-muted small mb-0"
                    style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}
                  >
                    {product.description}
                  </p>
                </div>

                {/* Verified Seller Information Card */}
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mt-auto">
                  <h6 className="fw-bold text-slate-800 mb-2 d-flex align-items-center gap-1">
                    <span>🛡️</span> Seller Information
                  </h6>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: '40px', height: '40px' }}
                    >
                      {product.seller && typeof product.seller === 'object' && product.seller.name
                        ? product.seller.name.charAt(0).toUpperCase()
                        : 'S'}
                    </div>
                    <div>
                      <div className="fw-semibold text-slate-800 small">
                        {product.seller && typeof product.seller === 'object' && product.seller.name
                          ? product.seller.name
                          : 'Verified Tech Enthusiast'}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        Member of QuickSell Marketplace
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Details Edit Form (Edit Mode) */}
        {!isLoading && product && isEditing && (
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white mx-auto" style={{ maxWidth: '780px' }}>
            <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
              <div>
                <h3 className="fw-bold text-slate-800 mb-1">Edit Product Listing</h3>
                <p className="text-muted small mb-0">Update specifications, pricing, and photo gallery.</p>
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={() => {
                  setIsEditing(false);
                  setNewImages([]);
                }}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>

            {/* Edit Success Message */}
            {updateSuccess && (
              <div className="alert alert-success py-2 px-3 small mb-3">
                {updateSuccess}
              </div>
            )}

            {/* Edit Error Alert */}
            {updateError && (
              <div className="alert alert-danger py-2 px-3 small mb-3">
                {updateError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate>
              {/* Product Title */}
              <div className="mb-3">
                <label htmlFor="editTitle" className="form-label small fw-semibold">
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

              {/* Category & Subcategory Row */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="editCategory" className="form-label small fw-semibold">
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
                  <label htmlFor="editSubcategory" className="form-label small fw-semibold">
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
                <label htmlFor="editPrice" className="form-label small fw-semibold">
                  Price (₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    id="editPrice"
                    disabled={isUpdating}
                    className={`form-control ${editErrors.price ? 'is-invalid' : ''}`}
                    min="1"
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
                <label htmlFor="editDescription" className="form-label small fw-semibold">
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
                <label className="form-label small fw-semibold d-flex justify-content-between align-items-center">
                  <span>Replace Images (Optional)</span>
                  <span className="small text-muted">Leave empty to keep existing photos</span>
                </label>

                <div className="border border-2 border-dashed rounded-3 p-3 text-center bg-light mb-2">
                  <label
                    className={`btn btn-outline-primary btn-sm px-3 mb-0 ${isUpdating || newImages.length >= 5 ? 'disabled' : ''}`}
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
                  <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    Selecting new photos will replace all existing photos on Cloudinary (min 2, max 5).
                  </div>
                </div>

                {editErrors.images && <div className="field-error mb-2">{editErrors.images}</div>}

                {/* Previews of newly selected images */}
                {newImages.length > 0 && (
                  <div className="row g-2 mt-1">
                    {newImages.map((img, index) => (
                      <div key={index} className="col-4 col-sm-3 col-md-2 position-relative">
                        <div className="border rounded-2 overflow-hidden position-relative bg-white" style={{ height: '70px' }}>
                          <img src={img.previewUrl} alt={`New preview ${index + 1}`} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                          {!isUpdating && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(index)}
                              className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
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

              {/* Form Buttons */}
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-4 fw-semibold"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setNewImages([]);
                  }}
                  className="btn btn-outline-secondary btn-sm px-3 fw-semibold"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Confirmation Modal 1: Mark as Sold */}
      {showMarkSoldModal && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050
          }}
        >
          <div className="card border-0 shadow-lg rounded-4 p-4 bg-white" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="text-center mb-3">
              <div className="display-5 mb-2">🏷️</div>
              <h5 className="fw-bold text-slate-800">Mark Product as Sold?</h5>
              <p className="text-muted small">
                Are you sure you want to mark "<strong>{product?.title}</strong>" as SOLD? This action will disable further inquiries and purchases.
              </p>
            </div>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={() => setShowMarkSoldModal(false)}
                disabled={isMarkingSold}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm px-3 fw-semibold"
                onClick={handleConfirmMarkAsSold}
                disabled={isMarkingSold}
              >
                {isMarkingSold ? 'Updating...' : 'Yes, Mark as Sold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Delete Listing */}
      {showDeleteModal && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050
          }}
        >
          <div className="card border-0 shadow-lg rounded-4 p-4 bg-white" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="text-center mb-3">
              <div className="display-5 mb-2">🗑️</div>
              <h5 className="fw-bold text-danger">Delete Product Listing?</h5>
              <p className="text-muted small">
                Are you sure you want to permanently delete "<strong>{product?.title}</strong>"? This action will remove the listing and its Cloudinary media assets. This cannot be undone.
              </p>
            </div>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm px-3 fw-semibold"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
