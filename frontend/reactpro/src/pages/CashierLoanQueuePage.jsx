import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovedLoans } from '../api/loans';

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 16 },
  backWrap: { marginBottom: 12 },
  backBtn: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 16 },
  alertError: {
    padding: 12,
    marginBottom: 16,
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 6,
  },
  empty: {
    padding: 16,
    background: '#f8f9fa',
    textAlign: 'center',
    borderRadius: 6,
    border: '1px solid #e9ecef',
    color: '#495057',
  },
  tableWrap: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  theadRow: { background: '#e9ecef' },
  th: {
    border: '1px solid #dee2e6',
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  td: { border: '1px solid #dee2e6', padding: '10px 12px' },
  tdRight: { border: '1px solid #dee2e6', padding: '10px 12px', textAlign: 'right' },
  tdCenter: { border: '1px solid #dee2e6', padding: '10px 12px', textAlign: 'center' },
  button: (hover) => ({
    padding: '6px 10px',
    background: hover ? '#1e7e34' : '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  }),
};

const CashierLoanQueuePage = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hoverBtnId, setHoverBtnId] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const data = await getApprovedLoans();
        setLoans(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load approved loans');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading approved loans...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.backWrap}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
      <h1 style={styles.title}>Approved Loans for Disbursement</h1>

      {error && <div style={styles.alertError}>{error}</div>}

      {loans.length === 0 ? (
        <div style={styles.empty}>No approved loans pending disbursement.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Loan ID</th>
                <th style={styles.th}>Client Name</th>
                <th style={styles.th}>Product</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td style={styles.td}>{loan.id}</td>
                  <td style={styles.td}>{loan.client_name}</td>
                  <td style={styles.td}>{loan.product_name}</td>
                  <td style={styles.tdRight}>{loan.amount}</td>
                  <td style={styles.td}>{loan.status}</td>
                  <td style={styles.tdCenter}>
                    <button
                      onClick={() => navigate(`/cashier/loans/${loan.id}/disburse`)}
                      style={styles.button(hoverBtnId === loan.id)}
                      onMouseEnter={() => setHoverBtnId(loan.id)}
                      onMouseLeave={() => setHoverBtnId(null)}
                    >
                      Disburse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CashierLoanQueuePage;