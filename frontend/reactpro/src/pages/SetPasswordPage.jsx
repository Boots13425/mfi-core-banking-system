import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axios';

export const SetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('Invalid invite link');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/invite-set-password/', {
        uid,
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
        <h1>Success!</h1>
        <p>Your password has been set. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Set Password</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Setting...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};