import React from 'react';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>403 - Unauthorized</h1>
      <p>You don't have permission to access this page.</p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
};