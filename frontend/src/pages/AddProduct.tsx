import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAppDispatch } from '../store/hooks';
import { createProduct } from '../store/productSlice';

// Exact categories and subcategories aligned with backend Product model
const PRODUCT_CATEGORIES = {
  Mobiles: ['Smartphones', 'Tablets', 'Feature Phones'],
  Wearables: ['Smartwatches', 'Fitness Bands', 'Smart Rings'],
  Audio: ['Headphones', 'Earbuds', 'Speakers', 'Microphones'],
  Computers: ['Laptops', 'Desktops', 'Monitors', 'PC Components'],
  Accessories: ['Keyboards', 'Mice', 'Chargers & Cables', 'Storage Devices', 'Adapters & Hubs'],
  Cameras: ['DSLR Cameras', 'Mirrorless Cameras', 'Action Cameras', 'Camera Lenses']
} as const;

type CategoryName = keyof typeof PRODUCT_CATEGORIES;

interface FormErrors {
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

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<CategoryName | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  // Loading and Server Response State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Main Category Change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CategoryName | '';
    setCategory(selected);
    setSubcategory(''); // Reset subcategory when main category changes
    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
    if (errors.subcategory) setErrors((prev) => ({ ...prev, subcategory: undefined }));
    if (serverError) setServerError(null);
  };

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const maxAllowed = 5;

    if (images.length + selectedFiles.length > maxAllowed) {
      setErrors((prev) => ({
        ...prev,
        images: `You can upload a maximum of ${maxAllowed} images`
      }));
      return;
    }

    const newPreviews: ImagePreview[] = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setImages((prev) => [...prev, ...newPreviews]);
    if (errors.images) setErrors((prev) => ({ ...prev, images: undefined }));
    if (serverError) setServerError(null);
    // Reset file input value so same files can be re-selected if needed
    e.target.value = '';
  };

  // Remove Selected Image
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return updated;
    });
  };

  // Validate Form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Product title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Description must be at least 15 characters long';
    }

    const numPrice = Number(price);
    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (Number.isNaN(numPrice) || numPrice <= 0) {
      newErrors.price = 'Price must be a positive number greater than 0';
    }

    if (!category) {
      newErrors.category = 'Please select a main category';
    }

    if (!subcategory) {
      newErrors.subcategory = 'Please select a subcategory';
    }

    if (images.length < 2) {
      newErrors.images = 'At least two product images are required (maximum 5)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission with Real Backend Integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData payload
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', price.trim());
      formData.append('category', category);
      formData.append('subcategory', subcategory);

      // Append each image using repeated 'images' field name for Multer
      images.forEach((img) => {
        formData.append('images', img.file);
      });

      // Submit to backend via Redux action createProduct
      const resultAction = await dispatch(createProduct(formData)).unwrap();

      setSuccessMessage(resultAction.message || 'Product created successfully!');

      // Navigate to homepage after brief delay so user sees success confirmation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1200);

    } catch (err: unknown) {
      if (typeof err === 'string') {
        setServerError(err);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Failed to create product listing. Please check your connection and try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="homepage-wrapper">
      <Navbar />

      <main className="container py-4">
        <div className="mx-auto" style={{ maxWidth: '720px' }}>
          {/* Breadcrumb / Back button */}
          <div className="mb-3">
            <Link to="/" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
              <span>←</span> Back to Marketplace
            </Link>
          </div>

          {/* Form Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
            <div className="mb-4">
              <span className="badge-tech-tag bg-primary bg-opacity-10 text-primary mb-2">
                Sell Your Device
              </span>
              <h2 className="fw-bold text-slate-800 mb-1">Post a Product Listing</h2>
              <p className="text-muted small">
                Fill in the details to list your pre-owned gadget on QuickSell.
              </p>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
              <div className="alert alert-success d-flex align-items-center justify-content-between py-3 mb-4" role="alert">
                <div className="d-flex align-items-center gap-2">
                  <span>✅</span>
                  <div>
                    <strong>{successMessage}</strong> Redirecting to marketplace...
                  </div>
                </div>
              </div>
            )}

            {/* Server Error Alert */}
            {serverError && (
              <div className="alert alert-danger py-2 px-3 mb-4 text-start" role="alert" style={{ fontSize: '0.875rem' }}>
                <strong>Error: </strong> {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Product Title */}
              <div className="mb-3">
                <label htmlFor="title" className="form-label">
                  Product Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  disabled={isSubmitting}
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="e.g. Apple iPhone 14 Pro 128GB Deep Purple (With Bill & Box)"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                    if (serverError) setServerError(null);
                  }}
                />
                {errors.title && <div className="field-error">{errors.title}</div>}
              </div>

              {/* Category & Subcategory Row */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="category" className="form-label">
                    Main Category <span className="text-danger">*</span>
                  </label>
                  <select
                    id="category"
                    disabled={isSubmitting}
                    className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                    value={category}
                    onChange={handleCategoryChange}
                  >
                    <option value="">Select Category</option>
                    {Object.keys(PRODUCT_CATEGORIES).map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {catKey}
                      </option>
                    ))}
                  </select>
                  {errors.category && <div className="field-error">{errors.category}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="subcategory" className="form-label">
                    Subcategory <span className="text-danger">*</span>
                  </label>
                  <select
                    id="subcategory"
                    disabled={isSubmitting || !category}
                    className={`form-select ${errors.subcategory ? 'is-invalid' : ''}`}
                    value={subcategory}
                    onChange={(e) => {
                      setSubcategory(e.target.value);
                      if (errors.subcategory) setErrors((prev) => ({ ...prev, subcategory: undefined }));
                      if (serverError) setServerError(null);
                    }}
                  >
                    <option value="">
                      {category ? 'Select Subcategory' : 'Select Category first'}
                    </option>
                    {category &&
                      PRODUCT_CATEGORIES[category]?.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                  </select>
                  {errors.subcategory && <div className="field-error">{errors.subcategory}</div>}
                </div>
              </div>

              {/* Price */}
              <div className="mb-3">
                <label htmlFor="price" className="form-label">
                  Selling Price (₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    id="price"
                    disabled={isSubmitting}
                    className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                    placeholder="Enter expected amount in INR"
                    min="1"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                      if (serverError) setServerError(null);
                    }}
                  />
                </div>
                {errors.price && <div className="field-error">{errors.price}</div>}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="form-label">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  id="description"
                  rows={4}
                  disabled={isSubmitting}
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  placeholder="Mention key details such as device condition, battery health, purchase date, included accessories, or warranty..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                    if (serverError) setServerError(null);
                  }}
                />
                {errors.description && <div className="field-error">{errors.description}</div>}
              </div>

              {/* Image Upload Section */}
              <div className="mb-4">
                <label className="form-label d-flex justify-content-between align-items-center">
                  <span>
                    Product Images <span className="text-danger">*</span>
                  </span>
                  <span className="small text-muted">
                    {images.length}/5 selected (minimum 2 required)
                  </span>
                </label>

                {/* Upload Box */}
                <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-light mb-3">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>📷</div>
                  <p className="small text-muted mb-2">
                    Upload clear photos of your gadget from different angles.
                  </p>
                  <label
                    className={`btn btn-outline-primary btn-sm px-3 mb-0 ${isSubmitting || images.length >= 5 ? 'disabled' : ''}`}
                    style={{ cursor: isSubmitting || images.length >= 5 ? 'not-allowed' : 'pointer' }}
                  >
                    Choose Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="d-none"
                      onChange={handleImageChange}
                      disabled={isSubmitting || images.length >= 5}
                    />
                  </label>
                  <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                    JPG, PNG, WebP up to 5MB each. Minimum 2, maximum 5 photos.
                  </div>
                </div>

                {errors.images && <div className="field-error mb-2">{errors.images}</div>}

                {/* Image Previews Grid */}
                {images.length > 0 && (
                  <div className="row g-2">
                    {images.map((img, index) => (
                      <div key={index} className="col-4 col-sm-3 col-md-2 position-relative">
                        <div
                          className="border rounded-2 overflow-hidden position-relative bg-white"
                          style={{ height: '90px' }}
                        >
                          <img
                            src={img.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                          {!isSubmitting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '22px', height: '22px', fontSize: '11px', lineHeight: 1 }}
                              title="Remove image"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <span className="small text-muted d-block text-center mt-1" style={{ fontSize: '0.7rem' }}>
                          {index === 0 ? 'Cover Photo' : `Photo ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="d-flex gap-2 pt-2">
                <button
                  type="submit"
                  className="btn btn-primary-custom flex-grow-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Uploading & Listing Product...</span>
                    </span>
                  ) : (
                    'Post Listing'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn btn-outline-secondary px-4"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddProduct;
