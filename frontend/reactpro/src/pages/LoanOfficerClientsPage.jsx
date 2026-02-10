import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLoanOfficerActiveClients } from '../api/loans';

export const LoanOfficerClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLoanOfficerActiveClients();
        setClients(data);
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load clients.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.full_name || '').toLowerCase().includes(q));
  }, [clients, searchTerm]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading clients...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Loan Officer - Clients</h1>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 14px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            margin: '16px 0',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ margin: '16px 0', maxWidth: '420px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Search by Name</label>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search active clients..."
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #ddd' }}>
              Name
            </th>
            <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #ddd' }}>
              National ID
            </th>
            <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #ddd' }}>
              Phone
            </th>
            <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #ddd' }}>
              Status
            </th>
            <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No active clients found.
              </td>
            </tr>
          ) : (
            filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 15px', borderRight: '1px solid #ddd' }}>{c.full_name}</td>
                <td style={{ padding: '12px 15px', borderRight: '1px solid #ddd' }}>{c.national_id}</td>
                <td style={{ padding: '12px 15px', borderRight: '1px solid #ddd' }}>{c.phone}</td>
                <td style={{ padding: '12px 15px', borderRight: '1px solid #ddd' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: '#d4edda',
                      color: '#155724',
                    }}
                  >
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '12px 15px' }}>
                  <button
                    onClick={() => navigate(`/loan-officer/clients/${c.id}`)}
                    style={{
                      padding: '6px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

