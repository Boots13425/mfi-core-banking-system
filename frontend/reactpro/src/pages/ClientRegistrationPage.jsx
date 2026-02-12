import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const ClientRegistrationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const branchDisplay = useMemo(() => {
    if (!user) return '';
    // Try multiple shapes safely (depends on how your auth payload is built)
    if (typeof user.branch_display === 'string' && user.branch_display) return user.branch_display;
    if (typeof user.branch_name === 'string' && user.branch_name) return user.branch_name;
    if (typeof user.branch === 'string' && user.branch) return user.branch; // sometimes branch is already a label
    if (user.branch && typeof user.branch === 'object') {
      return user.branch.name || user.branch.branch_name || user.branch.title || String(user.branch);
    }
    return '';
  }, [user]);

  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    phone: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    if (!formData.national_id.trim()) {
      errors.national_id = 'National ID is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    // Ensure cashier has a branch (UX-friendly message; backend also enforces)
    if (user?.role === 'CASHIER' && !branchDisplay) {
      errors.branch = 'Your account is not assigned to a branch. Contact the super admin.';
    }
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/clients/', formData);
      setSuccess(true);
      setFormData({
        full_name: '',
        national_id: '',
        phone: '',
        email: '',
      });
      setValidationErrors({});

      setTimeout(() => {
        navigate(`/clients/${response.data.id}`);
      }, 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to register clients');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found (404). Is the backend running at http://127.0.0.1:8000?');
      } else if (err.response?.data?.detail) {
        setError(String(err.response.data.detail));
      } else if (err.response?.data) {
        try {
          const errorMessages = Object.entries(err.response.data)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) return `${field}: ${messages.join(', ')}`;
              return `${field}: ${String(messages)}`;
            })
            .join('\n');
          setError(errorMessages);
        } catch (e) {
          setError('Failed to register client. Server returned unexpected error shape.');
        }
      } else {
        setError('Failed to register client. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Register New Client</h1>

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
          Client registered successfully! Redirecting...
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
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Branch (Read-only) */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Branch *
          </label>
          <input
            type="text"
            value={branchDisplay || ''}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              border: validationErrors.branch ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              background: '#f8f9fa',
              color: '#333',
            }}
            placeholder="Your branch will appear here"
          />
          {validationErrors.branch && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {validationErrors.branch}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Full Name *
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: validationErrors.full_name ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Enter client's full name"
          />
          {validationErrors.full_name && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {validationErrors.full_name}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            National ID *
          </label>
          <input
            type="text"
            name="national_id"
            value={formData.national_id}
            onChange={handleChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: validationErrors.national_id ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Enter national ID"
          />
          {validationErrors.national_id && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {validationErrors.national_id}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Phone *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: validationErrors.phone ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Enter phone number"
          />
          {validationErrors.phone && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {validationErrors.phone}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: validationErrors.email ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Enter email (optional)"
          />
          {validationErrors.email && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {validationErrors.email}
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
            {loading ? 'Registering...' : 'Register Client'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
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
  );
};
