import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { fetchPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api/savings';

export const SavingsWithdrawalApprovalsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingWithdrawals();
      setItems(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load pending withdrawals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id, type) => {
    try {
      if (type === 'approve') {
        await approveWithdrawal(id);
      } else {
        await rejectWithdrawal(id);
      }
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Operation failed.');
    }
  };

  if (user?.role !== 'BRANCH_MANAGER' && user?.role !== 'SUPER_ADMIN' ) {
    return (
      <div style={{ padding: '20px' }}>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Savings Withdrawal Approvals</h1>
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

      {loading && <div>Loading...</div>}
      {error && (
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div style={{ color: '#666' }}>No pending withdrawals.</div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #eee',
          }}
        >
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Client</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Account #</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Amount</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Requested By</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{item.client_name}</td>
                <td style={{ padding: '8px' }}>{item.account_number}</td>
                <td style={{ padding: '8px' }}>{item.amount}</td>
                <td style={{ padding: '8px' }}>{item.requested_by || '-'}</td>
                <td style={{ padding: '8px' }}>{new Date(item.created_at).toLocaleString()}</td>
                <td style={{ padding: '8px' }}>
                  <button
                    onClick={() => handleAction(item.id, 'approve')}
                    style={{
                      padding: '6px 10px',
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginRight: '6px',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'reject')}
                    style={{
                      padding: '6px 10px',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Reject
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

