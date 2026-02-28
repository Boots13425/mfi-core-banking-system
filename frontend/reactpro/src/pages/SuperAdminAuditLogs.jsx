import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

export const SuperAdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ action: '', actor: '', date_from: '', date_to: '' });
  const navigate = useNavigate();

  const ACTIONS = [
    'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_TOGGLED',
    'USER_INVITED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED', 'USER_BRANCH_CHANGED',
    'PASSWORD_SET_VIA_INVITE',
    'CASH_ALLOCATED',
    'SESSION_CLOSED'
  ];

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.actor) params.append('actor', filters.actor);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await axiosInstance.get(`/admin/audit-logs/?${params.toString()}`);
      setLogs(response.data.results || response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/super-admin')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Back to Admin
      </button>
      <h1>Audit Logs</h1>
      {error && <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select name="action" value={filters.action} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <option value="">All Actions</option>
          {ACTIONS.map(action => <option key={action} value={action}>{action}</option>)}
        </select>
        <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
      </div>

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Actor</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Action</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Summary</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{log.actor_username || 'System'}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{log.action_display}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{log.summary}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};