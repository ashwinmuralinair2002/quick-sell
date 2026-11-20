import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 p-4 mx-auto" style={{ maxWidth: '600px', borderRadius: '16px' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="brand-badge mb-0">
            <span>⚡ QuickSell</span>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm px-3">
            Sign Out
          </button>
        </div>

        <h2 className="mb-2">Welcome to QuickSell!</h2>
        <p className="text-muted">You are securely signed in.</p>

        <div className="p-3 bg-light rounded mt-3 mb-4">
          <h6 className="fw-bold mb-2">User Details</h6>
          <div><strong>Name:</strong> {user?.name}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>User ID:</strong> {user?.id}</div>
        </div>

        <div className="alert alert-info mb-0">
          Marketplace browse and product features are coming next.
        </div>
      </div>
    </div>
  );
};

export default Home;
