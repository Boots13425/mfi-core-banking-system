import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmittedLoans } from '../api/loans';

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 16 },
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
    background: hover ? '#0056b3' : '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  }),
};

const BranchManagerLoanQueuePage = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // for button hover (keeps styling inline without CSS)
  const [hoverBtnId, setHoverBtnId] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const data = await getSubmittedLoans();
        setLoans(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load loans');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading submitted loans...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Loan Review Queue</h1>

      {error && <div style={styles.alertError}>{error}</div>}

      {loans.length === 0 ? (
        <div style={styles.empty}>No submitted loans awaiting review.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Loan ID</th>
                <th style={styles.th}>Client Name</th>
                <th style={styles.th}>Product</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                <th style={styles.th}>Submitted Date</th>
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
                  <td style={styles.td}>
                    {loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString() : ''}
                  </td>
                  <td style={styles.tdCenter}>
                    <button
                      onClick={() => navigate(`/branch-manager/loans/${loan.id}`)}
                      style={styles.button(hoverBtnId === loan.id)}
                      onMouseEnter={() => setHoverBtnId(loan.id)}
                      onMouseLeave={() => setHoverBtnId(null)}
                    >
                      Review
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

export default BranchManagerLoanQueuePage;