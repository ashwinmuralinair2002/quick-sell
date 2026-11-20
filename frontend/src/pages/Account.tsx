import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface AddressItem {
  _id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface AddressFormData {
  fullName: string;
  phone: string;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface OrderItemSnapshot {
  product: string;
  title: string;
  price: number;
  image: string;
  seller: string;
}

interface OrderShippingSnapshot {
  fullName: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

interface UserOrder {
  _id: string;
  buyer: string;
  items: OrderItemSnapshot[];
  shippingAddress: OrderShippingSnapshot;
  itemCount: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const emptyAddressForm: AddressFormData = {
  fullName: '',
  phone: '',
  addressLine: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false
};

const Account: React.FC = () => {
  const { user, updateUser } = useAuth();

  // 1. Personal Information State
  const [profileName, setProfileName] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [savedName, setSavedName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 2. Change Password State (Two-step flow)
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 3. Addresses State
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  // Address Modal States
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormData, setAddressFormData] = useState<AddressFormData>(emptyAddressForm);
  const [addressFormErrors, setAddressFormErrors] = useState<Record<string, string>>({});
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);

  // Address Delete Confirmation Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState<boolean>(false);

  // 4. My Orders State
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);

  // Load User Profile
  const loadProfile = async () => {
    try {
      const response = await api.get<{ user: { name: string; email: string } }>('/api/users/profile');
      setProfileName(response.data.user.name);
      setSavedName(response.data.user.name);
      setProfileEmail(response.data.user.email);
    } catch {
      if (user) {
        setProfileName(user.name);
        setSavedName(user.name);
        setProfileEmail(user.email);
      }
    }
  };

  // Load Addresses
  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const response = await api.get<{ addresses: AddressItem[] }>('/api/addresses');
      setAddresses(response.data.addresses || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAddressError(err.response.data.message);
      } else {
        setAddressError('Failed to load saved addresses.');
      }
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Load My Orders
  const loadOrders = async () => {
    setIsLoadingOrders(true);
    setOrderError(null);
    try {
      const response = await api.get<{ orders: UserOrder[] }>('/api/orders/my-orders');
      setOrders(response.data.orders || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setOrderError(err.response.data.message);
      } else {
        setOrderError('Failed to load your orders.');
      }
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadAddresses();
    loadOrders();
  }, []);

  // 1. Submit Personal Information (PUT /api/users/profile)
  const handleStartEditName = () => {
    setIsEditingName(true);
    setNameError(null);
    setProfileError(null);
    setProfileSuccess(null);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setProfileName(savedName);
    setNameError(null);
  };

  const validateName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Full name cannot be empty.';
    }
    if (trimmed.length < 2) {
      return 'Full name must be at least 2 characters.';
    }
    // Only letters (including international/unicode alphabetic characters) and spaces
    const nameRegex = /^[\p{L}\s]+$/u;
    if (!nameRegex.test(trimmed)) {
      return 'Name can only contain alphabetic letters and spaces.';
    }
    return null;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setNameError(null);

    const validationError = validateName(profileName);
    if (validationError) {
      setNameError(validationError);
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const response = await api.put<{ message: string; user: { name: string; email: string } }>(
        '/api/users/profile',
        { name: profileName.trim() }
      );

      const updatedName = response.data.user.name;
      setProfileName(updatedName);
      setSavedName(updatedName);
      setIsEditingName(false);
      setProfileSuccess(response.data.message || 'Profile updated successfully!');
      updateUser({ name: updatedName });

      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setProfileError(err.response.data.message);
      } else {
        setProfileError('Failed to update profile.');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 2. Change Password Flow
  // Step 1: Verify Current Password (POST /api/users/verify-password)
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }

    setIsVerifyingPassword(true);

    try {
      await api.post<{ message: string }>('/api/users/verify-password', {
        currentPassword
      });

      // Verification succeeded: move to Step 2
      setPasswordStep(2);
      setPasswordError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setPasswordError(err.response.data.message);
      } else {
        setPasswordError('Failed to verify password. Please try again.');
      }
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Step 2: Validation & Submission (PUT /api/users/change-password)
  const isNewPasswordValid =
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await api.put<{ message: string }>('/api/users/change-password', {
        currentPassword,
        newPassword
      });

      setPasswordSuccess(response.data.message || 'Password changed successfully!');
      // Reset all fields and return to Step 1
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStep(1);

      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setPasswordError(err.response.data.message);
      } else {
        setPasswordError('Failed to change password. Please check your inputs.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleBackToStep1 = () => {
    setPasswordStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  // 3. Open Add/Edit Address Modal
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressFormData({
      ...emptyAddressForm,
      fullName: savedName || profileName || ''
    });
    setAddressFormErrors({});
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: AddressItem) => {
    setEditingAddressId(addr._id);
    setAddressFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine: addr.addressLine,
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault
    });
    setAddressFormErrors({});
    setShowAddressModal(true);
  };

  // Validate Address Form
  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Full Name: required, non-whitespace
    if (!addressFormData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    // Phone: strip permissible spaces and dashes, then verify exactly 10 digits
    const rawPhone = addressFormData.phone || '';
    const cleanPhone = rawPhone.replace(/[\s-]/g, '');
    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    // Address Line: required, non-whitespace
    if (!addressFormData.addressLine.trim()) {
      errors.addressLine = 'Street address is required';
    }

    // City: required, non-whitespace
    if (!addressFormData.city.trim()) {
      errors.city = 'City is required';
    }

    // State: required, non-whitespace
    if (!addressFormData.state.trim()) {
      errors.state = 'State is required';
    }

    // PIN Code: exactly 6 digits
    const cleanPincode = (addressFormData.pincode || '').trim();
    if (!cleanPincode) {
      errors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(cleanPincode)) {
      errors.pincode = 'PIN code must be exactly 6 digits';
    }

    setAddressFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Address (POST /api/addresses or PUT /api/addresses/:id)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    setIsSavingAddress(true);
    setAddressError(null);

    // Sanitize payload: trimmed fields, normalized phone and pincode
    const payload = {
      fullName: addressFormData.fullName.trim(),
      phone: addressFormData.phone.replace(/[\s-]/g, ''),
      addressLine: addressFormData.addressLine.trim(),
      landmark: addressFormData.landmark.trim(),
      city: addressFormData.city.trim(),
      state: addressFormData.state.trim(),
      pincode: addressFormData.pincode.trim(),
      isDefault: addressFormData.isDefault
    };

    try {
      if (editingAddressId) {
        // Edit Address
        await api.put(`/api/addresses/${editingAddressId}`, payload);
        setAddressSuccess('Address updated successfully!');
      } else {
        // Add Address
        await api.post('/api/addresses', payload);
        setAddressSuccess('New address added successfully!');
      }

      setShowAddressModal(false);
      await loadAddresses();
      setTimeout(() => setAddressSuccess(null), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAddressError(err.response.data.message);
      } else {
        setAddressError('Failed to save address.');
      }
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Set Default Address (PATCH /api/addresses/:id/default)
  const handleSetDefault = async (addressId: string) => {
    try {
      await api.patch(`/api/addresses/${addressId}/default`);
      setAddressSuccess('Default shipping address updated!');
      await loadAddresses();
      setTimeout(() => setAddressSuccess(null), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAddressError(err.response.data.message);
      } else {
        setAddressError('Failed to set default address.');
      }
    }
  };

  // Confirm Delete Address (DELETE /api/addresses/:id)
  const handleConfirmDeleteAddress = async () => {
    if (!deleteTargetId) return;

    setIsDeletingAddress(true);
    try {
      await api.delete(`/api/addresses/${deleteTargetId}`);
      setAddressSuccess('Address deleted successfully!');
      setDeleteTargetId(null);
      await loadAddresses();
      setTimeout(() => setAddressSuccess(null), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAddressError(err.response.data.message);
      } else {
        setAddressError('Failed to delete address.');
      }
      setDeleteTargetId(null);
    } finally {
      setIsDeletingAddress(false);
    }
  };

  // Helper formatting functions
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
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

        {/* Page Header */}
        <div className="mb-4">
          <h2 className="fw-bold text-slate-800 mb-1">My Account</h2>
          <p className="text-muted small">
            Manage your personal profile, account credentials, and shipping addresses.
          </p>
        </div>

        <div className="row g-4">
          {/* Left Column: Personal Information & Change Password */}
          <div className="col-12 col-lg-5">
            {/* 1. PERSONAL INFORMATION */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold text-slate-800 mb-3 d-flex align-items-center gap-2">
                <span>👤</span> Personal Information
              </h5>

              {profileSuccess && (
                <div className="alert alert-success py-2 px-3 small mb-3">
                  {profileSuccess}
                </div>
              )}

              {profileError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="profileName" className="form-label small fw-semibold">
                    Full Name
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      id="profileName"
                      className={`form-control ${nameError ? 'is-invalid' : ''} ${!isEditingName ? 'bg-light' : ''}`}
                      value={profileName}
                      disabled={!isEditingName || isUpdatingProfile}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                    />
                    {!isEditingName && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-3 fw-semibold"
                        onClick={handleStartEditName}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {nameError && (
                    <div className="text-danger small mt-1" style={{ fontSize: '0.8rem' }}>
                      {nameError}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="profileEmail" className="form-label small fw-semibold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="profileEmail"
                    className="form-control bg-light"
                    value={profileEmail}
                    disabled
                  />
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                    Email is linked to your authentication account and cannot be modified.
                  </span>
                </div>

                {isEditingName && (
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm px-4 fw-semibold"
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-4 fw-semibold"
                      onClick={handleCancelEditName}
                      disabled={isUpdatingProfile}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* 2. CHANGE PASSWORD */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                  <span>🔒</span> Change Password
                </h5>
                <span className="badge bg-light text-secondary border px-2 py-1 small">
                  Step {passwordStep} of 2
                </span>
              </div>

              {passwordSuccess && (
                <div className="alert alert-success py-2 px-3 small mb-3">
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  {passwordError}
                </div>
              )}

              {/* STEP 1: Verify Current Password */}
              {passwordStep === 1 && (
                <form onSubmit={handleVerifyCurrentPassword} noValidate autoComplete="off">
                  <p className="text-muted small mb-3">
                    To change your password, first enter your current password for identity verification.
                  </p>

                  <div className="mb-3">
                    <label htmlFor="currentPassword" className="form-label small fw-semibold">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      autoComplete="current-password"
                      className="form-control"
                      placeholder="Enter current password"
                      value={currentPassword}
                      disabled={isVerifyingPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4 fw-semibold"
                    disabled={!currentPassword.trim() || isVerifyingPassword}
                  >
                    {isVerifyingPassword ? 'Verifying...' : 'Update Password'}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter New Password */}
              {passwordStep === 2 && (
                <form onSubmit={handleChangePassword} noValidate autoComplete="off">
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                    <span className="small text-success fw-semibold d-inline-flex align-items-center gap-1">
                      <span>✓</span> Current password verified
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                      onClick={handleBackToStep1}
                      disabled={isUpdatingPassword}
                      style={{ fontSize: '0.8rem' }}
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label small fw-semibold">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      autoComplete="new-password"
                      className="form-control"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      disabled={isUpdatingPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                        Password must be at least 8 characters long.
                      </div>
                    )}
                    {newPassword.length > 0 && newPassword === currentPassword && (
                      <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                        New password cannot be the same as your current password.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label small fw-semibold">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      className="form-control"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      disabled={isUpdatingPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                        Passwords do not match.
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-3 fw-semibold"
                      onClick={handleBackToStep1}
                      disabled={isUpdatingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm px-4 fw-semibold"
                      disabled={!isNewPasswordValid || isUpdatingPassword}
                    >
                      {isUpdatingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Address Management */}
          <div className="col-12 col-lg-7">
            {/* 3. ADDRESS MANAGEMENT */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                  <span>📍</span> Saved Addresses
                </h5>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="btn btn-primary btn-sm px-3 fw-semibold d-inline-flex align-items-center gap-1"
                >
                  <span>+</span>
                  <span>Add New Address</span>
                </button>
              </div>

              <p className="text-muted small mb-3">
                Manage your delivery addresses for second-hand tech orders. A contact phone number is required for shipping logistics.
              </p>

              {addressSuccess && (
                <div className="alert alert-success py-2 px-3 small mb-3">
                  {addressSuccess}
                </div>
              )}

              {addressError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  {addressError}
                </div>
              )}

              {/* Loading State */}
              {isLoadingAddresses && (
                <div className="py-4 text-center">
                  <div className="spinner-border text-primary spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading addresses...</span>
                  </div>
                  <span className="ms-2 small text-muted">Loading addresses...</span>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingAddresses && addresses.length === 0 && (
                <div className="p-4 border rounded-3 text-center my-3 bg-light">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>📫</div>
                  <h6 className="fw-bold text-slate-800 mb-1">No Addresses Saved</h6>
                  <p className="text-muted small mb-3">
                    Add a delivery address now to enjoy fast and seamless checkout.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="btn btn-outline-primary btn-sm px-3"
                  >
                    Add Address
                  </button>
                </div>
              )}

              {/* Addresses List */}
              {!isLoadingAddresses && addresses.length > 0 && (
                <div className="d-flex flex-column gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`p-3 rounded-3 border position-relative ${
                        addr.isDefault ? 'border-primary bg-light bg-opacity-25' : 'bg-white'
                      }`}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-slate-800">{addr.fullName}</span>
                          {addr.isDefault && (
                            <span className="badge bg-primary px-2 py-1 small rounded-pill">
                              Default Address
                            </span>
                          )}
                        </div>
                        <span className="text-muted small">📞 {addr.phone}</span>
                      </div>

                      <div className="text-secondary small mb-2" style={{ lineHeight: 1.5 }}>
                        <div>{addr.addressLine}</div>
                        {addr.landmark && <div>Landmark: {addr.landmark}</div>}
                        <div>
                          {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 pt-2 border-top">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="btn btn-outline-secondary btn-sm px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(addr._id)}
                          className="btn btn-outline-danger btn-sm px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          🗑️ Delete
                        </button>
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr._id)}
                            className="btn btn-link btn-sm text-decoration-none p-0 ms-auto text-primary"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. MY ORDERS SECTION */}
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mt-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="fw-bold text-slate-800 mb-1 d-flex align-items-center gap-2">
                <span>📦</span> My Orders
              </h5>
              <p className="text-muted small mb-0">
                Track and review your purchases and order history. Click on any order row to view full details.
              </p>
            </div>
            {orders.length > 0 && (
              <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill small">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </span>
            )}
          </div>

          {/* Error Alert */}
          {orderError && (
            <div className="alert alert-danger py-2 px-3 small mb-3">
              {orderError}
            </div>
          )}

          {/* Loading State */}
          {isLoadingOrders && (
            <div className="py-4 text-center">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Loading orders...</span>
              </div>
              <span className="ms-2 small text-muted">Loading your order history...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingOrders && orders.length === 0 && (
            <div className="p-4 border rounded-3 text-center my-3 bg-light">
              <div className="mb-2" style={{ fontSize: '2.5rem' }}>🛍️</div>
              <h6 className="fw-bold text-slate-800 mb-1">No Orders Placed Yet</h6>
              <p className="text-muted small mb-3">
                You haven't purchased any items yet. Explore the marketplace for great hardware deals!
              </p>
              <Link to="/" className="btn btn-outline-primary btn-sm px-4 fw-semibold text-decoration-none">
                Browse Marketplace
              </Link>
            </div>
          )}

          {/* Orders Table */}
          {!isLoadingOrders && orders.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    <th scope="col" className="py-3 ps-3">Order ID</th>
                    <th scope="col" className="py-3">Order Date</th>
                    <th scope="col" className="py-3">Products</th>
                    <th scope="col" className="py-3">Total Amount</th>
                    <th scope="col" className="py-3">Order Status</th>
                    <th scope="col" className="py-3 pe-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const productSummary = order.items.map((i) => i.title).join(', ');

                    return (
                      <tr
                        key={order._id}
                        onClick={() => setSelectedOrder(order)}
                        style={{ cursor: 'pointer' }}
                        className="transition-all"
                      >
                        <td className="ps-3 py-3">
                          <span className="font-monospace fw-semibold text-primary small">
                            #{order._id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 small text-muted">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-3">
                          <div className="small fw-semibold text-slate-800 text-truncate" style={{ maxWidth: '280px' }} title={productSummary}>
                            {productSummary}
                          </div>
                          <span className="badge bg-light text-secondary border small" style={{ fontSize: '0.7rem' }}>
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="py-3 fw-bold text-dark small">
                          ₹{formatINR(order.grandTotal)}
                        </td>
                        <td className="py-3">
                          <span className={`badge rounded-pill px-2 py-1 small ${
                            order.status === 'placed'
                              ? 'bg-success bg-opacity-10 text-success'
                              : 'bg-secondary bg-opacity-10 text-secondary'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="pe-3 py-3 text-end">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm px-2 py-1"
                            style={{ fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Address Form Modal (Add & Edit) */}
      {showAddressModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-slate-800 mb-0">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddressModal(false)}
                  disabled={isSavingAddress}
                ></button>
              </div>

              <form onSubmit={handleSaveAddress} noValidate>
                <div className="row g-2 mb-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold mb-1">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${addressFormErrors.fullName ? 'is-invalid' : ''}`}
                      placeholder="Receiver's name"
                      value={addressFormData.fullName}
                      onChange={(e) => setAddressFormData((p) => ({ ...p, fullName: e.target.value }))}
                    />
                    {addressFormErrors.fullName && <div className="field-error">{addressFormErrors.fullName}</div>}
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold mb-1">
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`form-control form-control-sm ${addressFormErrors.phone ? 'is-invalid' : ''}`}
                      placeholder="10-digit mobile"
                      value={addressFormData.phone}
                      onChange={(e) => setAddressFormData((p) => ({ ...p, phone: e.target.value }))}
                    />
                    {addressFormErrors.phone && <div className="field-error">{addressFormErrors.phone}</div>}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold mb-1">
                    Address Line <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${addressFormErrors.addressLine ? 'is-invalid' : ''}`}
                    placeholder="House/Flat number, building, street, area"
                    value={addressFormData.addressLine}
                    onChange={(e) => setAddressFormData((p) => ({ ...p, addressLine: e.target.value }))}
                  />
                  {addressFormErrors.addressLine && <div className="field-error">{addressFormErrors.addressLine}</div>}
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Near park, school, etc."
                    value={addressFormData.landmark}
                    onChange={(e) => setAddressFormData((p) => ({ ...p, landmark: e.target.value }))}
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-semibold mb-1">
                      City <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${addressFormErrors.city ? 'is-invalid' : ''}`}
                      placeholder="City"
                      value={addressFormData.city}
                      onChange={(e) => setAddressFormData((p) => ({ ...p, city: e.target.value }))}
                    />
                    {addressFormErrors.city && <div className="field-error">{addressFormErrors.city}</div>}
                  </div>

                  <div className="col-4">
                    <label className="form-label small fw-semibold mb-1">
                      State <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${addressFormErrors.state ? 'is-invalid' : ''}`}
                      placeholder="State"
                      value={addressFormData.state}
                      onChange={(e) => setAddressFormData((p) => ({ ...p, state: e.target.value }))}
                    />
                    {addressFormErrors.state && <div className="field-error">{addressFormErrors.state}</div>}
                  </div>

                  <div className="col-4">
                    <label className="form-label small fw-semibold mb-1">
                      Pincode <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${addressFormErrors.pincode ? 'is-invalid' : ''}`}
                      placeholder="Pincode"
                      value={addressFormData.pincode}
                      onChange={(e) => setAddressFormData((p) => ({ ...p, pincode: e.target.value }))}
                    />
                    {addressFormErrors.pincode && <div className="field-error">{addressFormErrors.pincode}</div>}
                  </div>
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    id="isDefaultCheck"
                    className="form-check-input"
                    checked={addressFormData.isDefault}
                    onChange={(e) => setAddressFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                  />
                  <label htmlFor="isDefaultCheck" className="form-check-label small text-secondary">
                    Set as default delivery address
                  </label>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-light btn-sm flex-grow-1 border"
                    onClick={() => setShowAddressModal(false)}
                    disabled={isSavingAddress}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm flex-grow-1 fw-semibold"
                    disabled={isSavingAddress}
                  >
                    {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Address Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div
                className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                style={{ width: '56px', height: '56px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '24px' }}
              >
                🗑️
              </div>
              <h5 className="fw-bold text-slate-800 mb-2">Delete Address?</h5>
              <p className="text-muted small mb-4">
                Are you sure you want to remove this delivery address? If this was your default address, another address will be designated as default.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1 py-2 fw-semibold border btn-sm"
                  onClick={() => setDeleteTargetId(null)}
                  disabled={isDeletingAddress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger flex-grow-1 py-2 fw-semibold btn-sm"
                  onClick={handleConfirmDeleteAddress}
                  disabled={isDeletingAddress}
                >
                  {isDeletingAddress ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '720px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4">
              {/* Modal Header */}
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div>
                  <h5 className="fw-bold text-slate-800 mb-1">
                    Order Details
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted font-monospace">
                      ID: #{selectedOrder._id}
                    </span>
                    <span className="text-muted small">•</span>
                    <span className="small text-muted">
                      Placed on {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedOrder(null)}
                ></button>
              </div>

              {/* Order Status Banner */}
              <div className="p-2 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between bg-light border">
                <span className="small text-secondary fw-semibold">Status</span>
                <span className={`badge rounded-pill px-3 py-1 small ${
                  selectedOrder.status === 'placed'
                    ? 'bg-success bg-opacity-10 text-success'
                    : 'bg-secondary bg-opacity-10 text-secondary'
                }`}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>

              {/* Purchased Products List */}
              <div className="mb-4">
                <h6 className="fw-bold text-slate-800 mb-2 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Purchased Items ({selectedOrder.items.length})
                </h6>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-white"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-2 overflow-hidden bg-light flex-shrink-0"
                          style={{ width: '48px', height: '48px' }}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small" style={{ fontSize: '0.65rem' }}>
                              No img
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="fw-semibold text-slate-800 small text-truncate" style={{ maxWidth: '380px' }} title={item.title}>
                            {item.title}
                          </div>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary small" style={{ fontSize: '0.65rem' }}>
                            Verified Gadget
                          </span>
                        </div>
                      </div>
                      <div className="fw-bold text-primary small">
                        ₹{formatINR(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address & Pricing Breakdown Grid */}
              <div className="row g-3 mb-4">
                {/* Shipping Address */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100 border">
                    <h6 className="fw-bold text-slate-800 mb-2 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                      📍 Delivery Address
                    </h6>
                    <div className="small text-secondary" style={{ lineHeight: 1.6 }}>
                      <div className="fw-bold text-dark">{selectedOrder.shippingAddress.fullName}</div>
                      <div>📞 {selectedOrder.shippingAddress.phone}</div>
                      <div>{selectedOrder.shippingAddress.addressLine}</div>
                      {selectedOrder.shippingAddress.landmark && (
                        <div>Landmark: {selectedOrder.shippingAddress.landmark}</div>
                      )}
                      <div>
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} -{' '}
                        <strong>{selectedOrder.shippingAddress.pincode}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100 border">
                    <h6 className="fw-bold text-slate-800 mb-2 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                      🧾 Price Breakdown
                    </h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Items Purchased:</span>
                        <span className="fw-semibold text-dark">{selectedOrder.itemCount}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Subtotal:</span>
                        <span className="fw-semibold text-dark">₹{formatINR(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-muted">
                        <span>GST (18%):</span>
                        <span className="fw-semibold text-dark">₹{formatINR(selectedOrder.gstAmount)}</span>
                      </div>
                      <hr className="my-2 opacity-25" />
                      <div className="d-flex justify-content-between pt-1">
                        <span className="fw-bold text-slate-800">Grand Total:</span>
                        <span className="fw-bold text-primary fs-6">₹{formatINR(selectedOrder.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4 fw-semibold"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
