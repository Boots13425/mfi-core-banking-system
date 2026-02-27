import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

export const SuperAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ role: '', branch: '', is_active: '', search: '' });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'CASHIER',
    branch: '',
  });
  const navigate = useNavigate();

  const ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'CASHIER', 'AUDITOR', 'RECOVERY_OFFICER'];

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchBranches = async () => {
    try {
      const response = await axiosInstance.get('/admin/branches/');
      setBranches(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch branches');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (filters.search) params.append('search', filters.search);

      const response = await axiosInstance.get(`/admin/users/?${params.toString()}`);
      setUsers(response.data.results || response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const updateData = { ...formData };
        if (!updateData.branch) updateData.branch = null;
        await axiosInstance.patch(`/admin/users/${editingId}/`, updateData);
      } else {
        if (!formData.branch && formData.role !== 'SUPER_ADMIN') {
          setError('Non-super admin users must have a branch assigned');
          return;
        }
        await axiosInstance.post('/admin/users/', formData);
      }
      setFormData({ username: '', email: '', first_name: '', last_name: '', role: 'CASHIER', branch: '' });
      setShowForm(false);
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      branch: user.branch || '',
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleActivate = async (id) => {
    try {
      await axiosInstance.patch(`/admin/users/${id}/activate/`);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to activate user');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await axiosInstance.patch(`/admin/users/${id}/deactivate/`);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to deactivate user');
    }
  };

  const handlePasswordReset = async (id) => {
    try {
      setError('');
      await axiosInstance.post(`/admin/users/${id}/send_password_reset/`);
      // Simple UX feedback; could be replaced with a toast system if added later.
      alert('Password reset link sent successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send password reset link');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/super-admin')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Back to Admin
      </button>
      <h1>User Management</h1>
      {error && <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input type="text" name="search" placeholder="Search by name/email" value={filters.search} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <select name="role" value={filters.role} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <option value="">All Roles</option>
          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <select name="branch" value={filters.branch} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <option value="">All Branches</option>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select name="is_active" value={filters.is_active} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ username: '', email: '', first_name: '', last_name: '', role: 'CASHIER', branch: '' }); }} style={{ marginBottom: '15px', padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {showForm ? 'Cancel' : 'Invite New User'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>Username:</label>
            <input type="text" name="username" value={formData.username} onChange={handleInputChange} required disabled={!!editingId} style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>First Name:</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Last Name:</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Role:</label>
            <select name="role" value={formData.role} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}>
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Branch:</label>
            <select name="branch" value={formData.branch} onChange={handleInputChange} required={formData.role !== 'SUPER_ADMIN'} style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}>
              <option value="">Select Branch</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingId ? 'Update' : 'Invite'}
          </button>
        </form>
      )}

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Role</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Branch</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.first_name} {user.last_name}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.email}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.role}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.branch_name || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.is_active ? 'Active' : 'Inactive'}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <button
                    onClick={() => handleEdit(user)}
                    style={{ padding: '5px 10px', marginRight: '5px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePasswordReset(user.id)}
                    style={{ padding: '5px 10px', marginRight: '5px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Password Reset
                  </button>
                  {user.is_active ? (
                    <button onClick={() => handleDeactivate(user.id)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Deactivate</button>
                  ) : (
                    <button onClick={() => handleActivate(user.id)} style={{ padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};