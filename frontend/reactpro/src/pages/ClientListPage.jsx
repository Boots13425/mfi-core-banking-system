import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const ClientListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/clients/');
      setClients(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view clients');
      } else {
        setError('Failed to load clients. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? client.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading clients...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Clients</h1>
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

        {user?.role === 'LOAN_OFFICER' && (
          <button
            onClick={() => navigate('/clients/new')}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            + Register New Client
          </button>
        )}
      </div>

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

      <div
        style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Search by Name
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
          }}
        >
          {clients.length === 0 ? 'No clients found.' : 'No clients match your filters.'}
        </div>
      ) : (
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
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                National ID
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                Phone
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                Status
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr
                key={client.id}
                style={{
                  borderBottom: '1px solid #ddd',
                  ':hover': { background: '#f9f9f9' },
                }}
              >
                <td
                  style={{
                    padding: '12px 15px',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  {client.full_name}
                </td>
                <td
                  style={{
                    padding: '12px 15px',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  {client.national_id}
                </td>
                <td
                  style={{
                    padding: '12px 15px',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  {client.phone}
                </td>
                <td
                  style={{
                    padding: '12px 15px',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background:
                        client.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                      color:
                        client.status === 'ACTIVE' ? '#155724' : '#721c24',
                    }}
                  >
                    {client.status}
                  </span>
                </td>
                <td style={{ padding: '12px 15px' }}>
                  <button
                    onClick={() => navigate(`/clients/${client.id}`)}
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
