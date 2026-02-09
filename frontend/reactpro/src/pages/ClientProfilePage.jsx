import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const ClientProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);
  const [deactivateSuccess, setDeactivateSuccess] = useState(false);

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/clients/${id}/`);
      setClient(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Client not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this client');
      } else {
        setError('Failed to load client details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this client?')) {
      return;
    }

    setDeactivating(true);
    setDeactivateError(null);
    setDeactivateSuccess(false);

    try {
      await axiosInstance.post(`/clients/${id}/deactivate/`);
      setDeactivateSuccess(true);
      // Refresh client data
      setTimeout(() => {
        fetchClientDetails();
      }, 1500);
    } catch (err) {
      if (err.response?.status === 403) {
        setDeactivateError('You do not have permission to deactivate this client');
      } else if (err.response?.data?.detail) {
        setDeactivateError(err.response.data.detail);
      } else {
        setDeactivateError('Failed to deactivate client. Please try again.');
      }
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading client details...</div>;
  }

  if (error || !client) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          {error || 'Client not found'}
        </div>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          ← Back to Clients
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #f0f0f0',
          }}
        >
          <h1 style={{ margin: 0 }}>{client.full_name}</h1>
          <span
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              background:
                client.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
              color:
                client.status === 'ACTIVE' ? '#155724' : '#721c24',
            }}
          >
            {client.status}
          </span>
        </div>

        {deactivateSuccess && (
          <div
            style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            Client deactivated successfully! Refreshing...
          </div>
        )}

        {deactivateError && (
          <div
            style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {deactivateError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '30px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Full Name
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.full_name}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              National ID
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.national_id}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Phone
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.phone}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Email
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.email || 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Branch
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.branch || 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Registered Date
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {user?.role === 'CASHIER' && client.status === 'ACTIVE' && (
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: '20px' }}>
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              style={{
                padding: '10px 20px',
                background: deactivating ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: deactivating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {deactivating ? 'Deactivating...' : 'Deactivate Client'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
