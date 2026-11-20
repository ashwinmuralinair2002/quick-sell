import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

interface EditProductFormValues {
  title: string;
  category: CategoryName | '';
  subcategory: string;
  price: string;
  description: string;
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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // React Hook Form for Edit Product
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmitRHF,
    watch: watchEdit,
    setValue: setEditValue,
    reset: resetEditForm,
    clearErrors: clearEditErrors,
    formState: { errors: editErrors }
  } = useForm<EditProductFormValues>({
    defaultValues: {
      title: '',
      category: '',
      subcategory: '',
      price: '',
      description: ''
    },
    mode: 'onSubmit'
  });

  const selectedEditCategory = watchEdit('category');

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

  // Sync edit form fields and images when product is loaded / updated
  useEffect(() => {
    if (product) {
      resetEditForm({
        title: product.title,
        description: product.description,
        price: String(product.price),
        category: (product.category as CategoryName) || '',
        subcategory: product.subcategory || ''
      });
      // Extract existing image URLs
      const urls: string[] = Array.isArray(product.images)
        ? product.images
            .map((img) => (typeof img === 'string' ? img : img && typeof img.url === 'string' ? img.url : ''))
            .filter(Boolean)
        : [];
      setExistingImages(urls);
    }
  }, [product, resetEditForm]);

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

  // Reset edit form helper
  const handleCancelEdit = () => {
    setIsEditing(false);
    newImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setNewImages([]);
    setImageError(null);
    setUpdateError(null);
    setUpdateSuccess(null);
    if (product) {
      resetEditForm({
        title: product.title,
        description: product.description,
        price: String(product.price),
        category: (product.category as CategoryName) || '',
        subcategory: product.subcategory || ''
      });
      const urls: string[] = Array.isArray(product.images)
        ? product.images
            .map((img) => (typeof img === 'string' ? img : img && typeof img.url === 'string' ? img.url : ''))
            .filter(Boolean)
        : [];
      setExistingImages(urls);
    }
  };

  // Handle Edit Category Change
  const handleEditCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CategoryName | '';
    setEditValue('category', selected, { shouldValidate: true });
    setEditValue('subcategory', '', { shouldValidate: false });
    clearEditErrors('subcategory');
    if (updateError) setUpdateError(null);
  };

  // Handle New Image Selection for Edit
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const maxAllowed = 5;
    const totalCount = existingImages.length + newImages.length + selectedFiles.length;

    if (totalCount > maxAllowed) {
      setImageError(`You can upload a maximum of ${maxAllowed} images`);
      return;
    }

    const previews: ImagePreview[] = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setNewImages((prev) => [...prev, ...previews]);
    if (imageError) setImageError(null);
    if (updateError) setUpdateError(null);
    e.target.value = '';
  };

  // Handle Remove Existing Image (pending removal)
  const handleRemoveExistingImage = (idxToRemove: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    if (imageError) setImageError(null);
    if (updateError) setUpdateError(null);
  };

  // Handle Remove Newly Selected Image
  const handleRemoveNewImage = (idxToRemove: number) => {
    setNewImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      URL.revokeObjectURL(prev[idxToRemove].previewUrl);
      return updated;
    });
    if (imageError) setImageError(null);
    if (updateError) setUpdateError(null);
  };

  // Handle Edit Form Submission via React Hook Form
  const onEditSubmit = async (data: EditProductFormValues) => {
    setUpdateError(null);
    setUpdateSuccess(null);

    const totalImages = existingImages.length + newImages.length;
    if (totalImages < 2) {
      setImageError('At least two product images are required (maximum 5)');
      return;
    }
    if (totalImages > 5) {
      setImageError('You can upload a maximum of 5 images');
      return;
    }

    if (!id) return;
    setImageError(null);
    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('price', data.price.trim());
      formData.append('category', data.category);
      formData.append('subcategory', data.subcategory);

      // Append retained existing image URLs (both JSON string & repeated field for max compatibility)
      formData.append('existingImages', JSON.stringify(existingImages));
      existingImages.forEach((url) => {
        formData.append('existingImages', url);
      });

      // Append newly selected images if any
      if (newImages.length > 0) {
        newImages.forEach((img) => {
          formData.append('images', img.file);
        });
      }

      const resultAction = await dispatch(
        updateProduct({ id, data: formData })
      ).unwrap();

      setUpdateSuccess(resultAction.message || 'Product updated successfully!');
      newImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
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

            {/* Right Column: Product Information Card, Device Description & Seller Info */}
            <div className="col-12 col-lg-5">
              <div className="d-flex flex-column">
                {/* 1. Product Information Card */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-3">
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
                    <div className="owner-action-panel p-3 rounded-3 bg-warning bg-opacity-10 border border-warning">
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
                              setImageError(null);
                              if (product) {
                                resetEditForm({
                                  title: product.title,
                                  description: product.description,
                                  price: String(product.price),
                                  category: (product.category as CategoryName) || '',
                                  subcategory: product.subcategory || ''
                                });
                                const urls: string[] = Array.isArray(product.images)
                                  ? product.images
                                      .map((img) => (typeof img === 'string' ? img : img && typeof img.url === 'string' ? img.url : ''))
                                      .filter(Boolean)
                                  : [];
                                setExistingImages(urls);
                                setNewImages([]);
                              }
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

                  {/* Primary Buyer Action: Add / Remove Cart (Rendered inside Product Info card) */}
                  {!isOwner && (
                    <div className="d-grid mt-2">
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
                </div>

                {/* 2. Device Description Section */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-3">
                  <h5 className="fw-bold text-slate-800 mb-2">Device Description</h5>
                  <p
                    className="text-muted small mb-0"
                    style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}
                  >
                    {product.description}
                  </p>
                </div>

                {/* Verified Seller Information Card (Only displayed when viewer is not the listing owner) */}
                {!isOwner && (
                  <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
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
                        {product.seller && typeof product.seller === 'object' && product.seller.email && (
                          <div className="text-muted small d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                            <span>✉️</span> {product.seller.email}
                          </div>
                        )}
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          Member of QuickSell Marketplace
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                onClick={handleCancelEdit}
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

            <form onSubmit={handleEditSubmitRHF(onEditSubmit)} noValidate>
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
                  placeholder="e.g. Apple iPhone 14 Pro 128GB Deep Purple (With Bill & Box)"
                  {...registerEdit('title', {
                    required: 'Product title is required',
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) return 'Product title is required';
                      if (trimmed.length < 5) return 'Title must be at least 5 characters long';
                      if (!/[a-zA-Z]/.test(trimmed)) return 'Title must contain at least one letter';
                      return true;
                    },
                    onChange: () => {
                      if (updateError) setUpdateError(null);
                    }
                  })}
                />
                {editErrors.title && <div className="field-error">{editErrors.title.message}</div>}
              </div>

              {/* Category & Subcategory Row */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="editCategory" className="form-label small fw-semibold">
                    Category <span className="text-danger">*</span>
                  </label>
                  {(() => {
                    const { onChange, ...categoryRest } = registerEdit('category', {
                      required: 'Please select a main category',
                      validate: (value) => (value ? true : 'Please select a main category')
                    });
                    return (
                      <select
                        id="editCategory"
                        disabled={isUpdating}
                        className={`form-select ${editErrors.category ? 'is-invalid' : ''}`}
                        {...categoryRest}
                        onChange={(e) => {
                          onChange(e);
                          handleEditCategoryChange(e);
                        }}
                      >
                        <option value="">Select Category</option>
                        {Object.keys(PRODUCT_CATEGORIES).map((catKey) => (
                          <option key={catKey} value={catKey}>
                            {catKey}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  {editErrors.category && <div className="field-error">{editErrors.category.message}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="editSubcategory" className="form-label small fw-semibold">
                    Subcategory <span className="text-danger">*</span>
                  </label>
                  <select
                    id="editSubcategory"
                    disabled={isUpdating || !selectedEditCategory}
                    className={`form-select ${editErrors.subcategory ? 'is-invalid' : ''}`}
                    {...registerEdit('subcategory', {
                      required: 'Please select a subcategory',
                      validate: (value) => (value ? true : 'Please select a subcategory'),
                      onChange: () => {
                        if (updateError) setUpdateError(null);
                      }
                    })}
                  >
                    <option value="">
                      {selectedEditCategory ? 'Select Subcategory' : 'Select Category first'}
                    </option>
                    {selectedEditCategory &&
                      PRODUCT_CATEGORIES[selectedEditCategory as CategoryName]?.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                  </select>
                  {editErrors.subcategory && <div className="field-error">{editErrors.subcategory.message}</div>}
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
                    placeholder="Enter expected amount in INR"
                    min="1"
                    {...registerEdit('price', {
                      required: 'Selling price is required',
                      validate: (value) => {
                        if (!value || !value.toString().trim()) return 'Selling price is required';
                        const numPrice = Number(value);
                        if (Number.isNaN(numPrice) || numPrice <= 0) {
                          return 'Please enter a valid positive selling price';
                        }
                        return true;
                      },
                      onChange: () => {
                        if (updateError) setUpdateError(null);
                      }
                    })}
                  />
                </div>
                {editErrors.price && <div className="field-error">{editErrors.price.message}</div>}
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
                  placeholder="Mention key details such as device condition, battery health, purchase date, included accessories, or warranty..."
                  {...registerEdit('description', {
                    required: 'Product description is required',
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) return 'Product description is required';
                      if (trimmed.length < 15) return 'Description must be at least 15 characters long';
                      return true;
                    },
                    onChange: () => {
                      if (updateError) setUpdateError(null);
                    }
                  })}
                />
                {editErrors.description && <div className="field-error">{editErrors.description.message}</div>}
              </div>

              {/* Product Images Management Section */}
              <div className="mb-4">
                <label className="form-label small fw-semibold d-flex justify-content-between align-items-center">
                  <span>
                    Product Images <span className="text-danger">*</span>
                  </span>
                  <span className="small text-muted">
                    {`${existingImages.length + newImages.length}/5 selected (minimum 2 required)`}
                  </span>
                </label>

                {/* Upload Box */}
                <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-light mb-3">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>📷</div>
                  <p className="small text-muted mb-2">
                    Upload clear photos of your gadget from different angles.
                  </p>
                  <label
                    className={`btn btn-outline-primary btn-sm px-3 mb-0 ${isUpdating || existingImages.length + newImages.length >= 5 ? 'disabled' : ''}`}
                    style={{ cursor: isUpdating || existingImages.length + newImages.length >= 5 ? 'not-allowed' : 'pointer' }}
                  >
                    Choose Additional Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="d-none"
                      onChange={handleNewImageChange}
                      disabled={isUpdating || existingImages.length + newImages.length >= 5}
                    />
                  </label>
                  <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                    JPG, PNG, WebP up to 5MB each. Minimum 2, maximum 5 photos total.
                  </div>
                </div>

                {imageError && <div className="field-error mb-2">{imageError}</div>}

                {/* Existing Images Thumbnails */}
                {existingImages.length > 0 && (
                  <div className="mb-3">
                    <span className="small fw-semibold text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>
                      Current Images ({existingImages.length})
                    </span>
                    <div className="row g-2">
                      {existingImages.map((url, index) => (
                        <div key={index} className="col-4 col-sm-3 col-md-2 position-relative">
                          <div
                            className="border rounded-2 overflow-hidden position-relative bg-white"
                            style={{ height: '90px' }}
                          >
                            <img
                              src={url}
                              alt={`Current product ${index + 1}`}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                            {!isUpdating && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingImage(index)}
                                className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '22px', height: '22px', fontSize: '11px', lineHeight: 1 }}
                                title="Remove existing image"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <span className="small text-muted d-block text-center mt-1" style={{ fontSize: '0.7rem' }}>
                            {index === 0 && newImages.length === 0 ? 'Cover Photo' : `Image ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newly Selected Images Previews */}
                {newImages.length > 0 && (
                  <div>
                    <span className="small fw-semibold text-primary d-block mb-1" style={{ fontSize: '0.75rem' }}>
                      Newly Added Photos ({newImages.length})
                    </span>
                    <div className="row g-2">
                      {newImages.map((img, index) => (
                        <div key={index} className="col-4 col-sm-3 col-md-2 position-relative">
                          <div
                            className="border rounded-2 overflow-hidden position-relative bg-white"
                            style={{ height: '90px' }}
                          >
                            <img
                              src={img.previewUrl}
                              alt={`New Preview ${index + 1}`}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                            {!isUpdating && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNewImage(index)}
                                className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '22px', height: '22px', fontSize: '11px', lineHeight: 1 }}
                                title="Remove newly added image"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <span className="small text-muted d-block text-center mt-1" style={{ fontSize: '0.7rem' }}>
                            {`New ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
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
                  onClick={handleCancelEdit}
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
