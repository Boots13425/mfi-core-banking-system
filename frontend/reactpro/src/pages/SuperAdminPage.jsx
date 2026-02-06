import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

export const SuperAdminPage = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/admin/health/');
      setHealthStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Super Admin Panel</h1>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>

      <div style={{ marginTop: '20px' }}>
        <h3>Admin Health Check</h3>
        <button
          onClick={checkHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Checking...' : 'Check Health'}
        </button>

        {error && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
            }}
          >
            {error}
          </div>
        )}

        {healthStatus && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
            }}
          >
            <strong>Status:</strong> {healthStatus.status}
            <br />
            <strong>Scope:</strong> {healthStatus.scope}
          </div>
        )}
      </div>
    </div>
  );
};