import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Welcome, <strong>{user?.first_name || user?.username}</strong></p>
        <p>Role: <strong>{user?.role}</strong></p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => navigate('/super-admin')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Go to Super Admin Panel
          </button>
        )}

        {(user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER') && (
          <>
            <button
              onClick={() => navigate('/clients')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              View Clients
            </button>

            {user?.role === 'CASHIER' && (
              <button
                onClick={() => navigate('/clients/new')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Register New Client
              </button>
            )}
          </>
        )}
      </div>

      <button
        onClick={handleLogout}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
};