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

  const cardBtn = (bg) => ({
    padding: '10px 16px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    minWidth: 180,
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: 6 }}>Dashboard</h1>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: 0 }}>
          Welcome, <strong>{user?.first_name || user?.username}</strong>
        </p>
        <p style={{ margin: 0 }}>
          Role: <strong>{user?.role}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {user?.role === 'SUPER_ADMIN' && (
          <button onClick={() => navigate('/super-admin')} style={cardBtn('#28a745')}>
            Go to Super Admin Panel
          </button>
        )}

        {(user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER') && (
          <>
            <button onClick={() => navigate('/clients')} style={cardBtn('#007bff')}>
              View Clients
            </button>

            {user?.role === 'CASHIER' && (
              <button onClick={() => navigate('/clients/new')} style={cardBtn('#28a745')}>
                Register New Client
              </button>
            )}
          </>
        )}

        {user?.role === 'LOAN_OFFICER' && (
          <button onClick={() => navigate('/loan-officer/clients')} style={cardBtn('#007bff')}>
            Loan Management
          </button>
        )}

        {/* ✅ NEW: Branch manager gets an obvious entry point to loan approvals */}
        {user?.role === 'BRANCH_MANAGER' && (
          <>
            <button onClick={() => navigate('/branch-manager/loans')} style={cardBtn('#111')}>
              Loan Approvals
            </button>
          </>
        )}

          {user?.role === 'CASHIER' && (
            <button onClick={() => navigate('/cashier/loans')} style={cardBtn('#111')}>
              Loan Approvals
            </button>
  )}
      </div>

      <button onClick={handleLogout} style={cardBtn('#dc3545')}>
        Logout
      </button>
    </div>
  );
};
