import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

export const SuperAdminBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    region: '',
    phone: '',
    address: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/admin/branches/');
      setBranches(response.data.results || response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await axiosInstance.patch(`/admin/branches/${editingId}/`, formData);
      } else {
        await axiosInstance.post('/admin/branches/', formData);
      }
      setFormData({ name: '', code: '', region: '', phone: '', address: '' });
      setShowForm(false);
      setEditingId(null);
      await fetchBranches();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save branch');
    }
  };

  const handleEdit = (branch) => {
    setFormData(branch);
    setEditingId(branch.id);
    setShowForm(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axiosInstance.patch(`/admin/branches/${id}/toggle-active/`);
      await fetchBranches();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle branch');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await axiosInstance.delete(`/admin/branches/${id}/`);
        await fetchBranches();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete branch');
      }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/super-admin')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Back to Admin
      </button>
      <h1>Branch Management</h1>
      {error && <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}
      
      <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', code: '', region: '', phone: '', address: '' }); }} style={{ marginBottom: '15px', padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {showForm ? 'Cancel' : 'Add New Branch'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Code:</label>
            <input type="text" name="code" value={formData.code} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Region:</label>
            <input type="text" name="region" value={formData.region} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Phone:</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Address:</label>
            <textarea name="address" value={formData.address} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', minHeight: '100px' }} />
          </div>
          <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Code</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Region</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Phone</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Active</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map(branch => (
              <tr key={branch.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{branch.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{branch.code}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{branch.region}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{branch.phone}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{branch.is_active ? 'Yes' : 'No'}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <button onClick={() => handleEdit(branch)} style={{ padding: '5px 10px', marginRight: '5px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  <button onClick={() => handleToggleActive(branch.id, branch.is_active)} style={{ padding: '5px 10px', marginRight: '5px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Toggle</button>
                  <button onClick={() => handleDelete(branch.id)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};