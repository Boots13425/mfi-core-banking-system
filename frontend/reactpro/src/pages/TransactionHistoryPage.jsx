import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const TransactionHistoryPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    fetchTransactionsAndClient();
  }, [clientId]);

  const fetchTransactionsAndClient = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch client name
      const clientResponse = await axiosInstance.get(`/clients/${clientId}/`);
      setClientName(clientResponse.data.full_name);

      // Fetch transactions
      try {
        const response = await axiosInstance.get(
          `/savings/transactions/?client_id=${clientId}`
        );
        setTransactions(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (err.response?.status === 404) {
          // Endpoint not available yet or no account
          setTransactions([]);
        } else {
          setError(
            err.response?.data?.detail ||
              'Failed to load transaction history.'
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to load client information.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading transactions...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Transaction History</h1>
          {clientName && (
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Client: <strong>{clientName}</strong>
            </p>
          )}
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
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <div
          style={{
            background: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#666',
          }}
        >
          <p>No transactions yet.</p>
          {user?.role === 'CASHIER' && (
            <button
              onClick={() => navigate(`/clients/${clientId}/deposit`)}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '15px',
              }}
            >
              Make a Deposit
            </button>
          )}
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
                Date
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                Amount
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '1px solid #ddd',
                }}
              >
                Transaction Type
              </th>
              <th
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                }}
              >
                Performed By
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr
                key={transaction.id || index}
                style={{ borderBottom: '1px solid #ddd' }}
              >
                <td
                  style={{
                    padding: '12px 15px',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  {new Date(transaction.created_at || transaction.date).toLocaleDateString()}
                </td>
                <td
                  style={{
                    padding: '12px 15px',
                    textAlign: 'right',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold',
                    color: '#28a745',
                  }}
                >
                  +${parseFloat(transaction.amount || 0).toFixed(2)}
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
                      background: '#e7f3ff',
                      color: '#0066cc',
                    }}
                  >
                    {transaction.type || transaction.transaction_type || 'Deposit'}
                  </span>
                </td>
                <td style={{ padding: '12px 15px' }}>
                  {transaction.performed_by_name ||
                    transaction.performed_by ||
                    'System'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
