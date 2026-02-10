import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const DepositPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    fetchClientName();
  }, [clientId]);

  const fetchClientName = async () => {
    try {
      const response = await axiosInstance.get(`/clients/${clientId}/`);
      setClientName(response.data.full_name);
    } catch (err) {
      console.error('Failed to load client name');
    }
  };

  const validateForm = () => {
    setValidationError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setValidationError('Amount must be greater than 0');
      return false;
    }
    if (parseFloat(amount) > 999999999.99) {
      setValidationError('Amount is too large');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/savings/deposit/', {
        client_id: clientId,
        amount: parseFloat(amount),
      });

      setSuccess(true);
      setAmount('');
      setValidationError(null);

      // Redirect to savings account after 2 seconds
      setTimeout(() => {
        navigate(`/clients/${clientId}/savings`);
      }, 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to deposit funds');
      } else if (err.response?.status === 400) {
        setError(
          err.response.data?.detail ||
            'Cannot deposit. Check account status and amount.'
        );
      } else if (err.response?.status === 404) {
        setError(
          'Savings account or deposit endpoint not found. Please check your account.'
        );
      } else {
        setError(
          err.response?.data?.detail || 'Failed to deposit funds. Try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(`/clients/${clientId}/savings`)}
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
          ← Back to Savings Account
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
        <h1 style={{ marginBottom: '10px' }}>Deposit Funds</h1>
        {clientName && (
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Client: <strong>{clientName}</strong>
          </p>
        )}

        {success && (
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
            Deposit successful! Redirecting...
          </div>
        )}

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              Deposit Amount *
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '10px',
                  background: '#f0f0f0',
                  borderRadius: '4px 0 0 4px',
                  fontWeight: 'bold',
                }}
              >
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (validationError) {
                    setValidationError(null);
                  }
                }}
                disabled={loading}
                placeholder="0.00"
                style={{
                  flex: 1,
                  padding: '10px',
                  border:
                    validationError &&
                    amount &&
                    parseFloat(amount) <= 0
                      ? '2px solid #dc3545'
                      : '1px solid #ddd',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {validationError && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                {validationError}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/clients/${clientId}/savings`)}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
