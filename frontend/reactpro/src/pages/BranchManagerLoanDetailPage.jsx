import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBranchManagerLoanDetail,
  approveLoan,
  rejectLoan,
  requestLoanChanges,
} from '../api/loans';

const styles = {
  page: { maxWidth: 900, margin: '0 auto', padding: 16 },
  backWrap: { marginBottom: 14 },
  backBtn: (hover) => ({
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: hover ? '#0056b3' : '#007bff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  }),
  alertError: {
    padding: 12,
    marginBottom: 16,
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 6,
  },
  card: { background: '#fff', border: '1px solid #dee2e6', borderRadius: 10, overflow: 'hidden' },
  header: { padding: 16, background: '#f1f3f5', borderBottom: '1px solid #dee2e6' },
  headerTitle: { fontSize: 22, fontWeight: 900, margin: 0 },
  headerSub: { fontSize: 12, color: '#495057', marginTop: 6 },
  section: { padding: 16, borderBottom: '1px solid #dee2e6' },
  sectionTitle: { fontSize: 16, fontWeight: 900, margin: '0 0 12px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 },
  docItem: { padding: 12, background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8 },
  docTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  docMeta: { fontSize: 12, color: '#6c757d', marginTop: 3 },
  link: (hover) => ({
    color: hover ? '#0056b3' : '#007bff',
    textDecoration: hover ? 'underline' : 'none',
    fontSize: 12,
    fontWeight: 800,
  }),
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { border: '1px solid #dee2e6', padding: '8px 10px', textAlign: 'left', background: '#e9ecef' },
  td: { border: '1px solid #dee2e6', padding: '8px 10px' },
  tdBold: { border: '1px solid #dee2e6', padding: '8px 10px', fontWeight: 900 },
  remarks: { padding: 16, background: '#fff3cd', borderBottom: '1px solid #ffeeba' },
  actionsWrap: { padding: 16, background: '#f8f9fa', borderTop: '1px solid #dee2e6' },
  actionsRow: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  btn: (variant, hover) => {
    const base = {
      padding: '10px 14px',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 900,
    };

    const colors = {
      green: hover ? '#1e7e34' : '#28a745',
      red: hover ? '#bd2130' : '#dc3545',
      orange: hover ? '#cc6a00' : '#fd7e14',
      gray: hover ? '#5a6268' : '#6c757d',
    };

    return { ...base, background: colors[variant] || colors.gray };
  },
  formWrap: (tone) => ({
    padding: 16,
    background: tone === 'red' ? '#f8d7da' : '#fff3cd',
    borderTop: '1px solid #dee2e6',
  }),
  label: { display: 'block', fontSize: 13, fontWeight: 900, marginBottom: 6 },
  textarea: {
    width: '100%',
    padding: 10,
    border: '1px solid #ced4da',
    borderRadius: 8,
    fontSize: 13,
    boxSizing: 'border-box',
    resize: 'vertical',
  },
};

const BranchManagerLoanDetailPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionMode, setActionMode] = useState(null); // 'approve', 'reject', 'request-changes'
  const [remarks, setRemarks] = useState('');

  // hover states for inline styling
  const [hoverBack, setHoverBack] = useState(false);
  const [hoverLinkId, setHoverLinkId] = useState(null);
  const [hoverBtn, setHoverBtn] = useState(null);

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const data = await getBranchManagerLoanDetail(loanId);
        setLoan(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load loan details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [loanId]);

  const handleApprove = async () => {
    try {
      const data = await approveLoan(loanId);
      setLoan(data);
      setActionMode(null);
      alert('Loan approved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve loan');
    }
  };

  const handleReject = async () => {
    try {
      const data = await rejectLoan(loanId, remarks);
      setLoan(data);
      setActionMode(null);
      setRemarks('');
      alert('Loan rejected');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject loan');
    }
  };

  const handleRequestChanges = async () => {
    try {
      const data = await requestLoanChanges(loanId, remarks);
      setLoan(data);
      setActionMode(null);
      setRemarks('');
      alert('Changes requested from loan officer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request changes');
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading loan details...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.backWrap}>
        <button
          onClick={() => navigate('/branch-manager/loans')}
          style={styles.backBtn(hoverBack)}
          onMouseEnter={() => setHoverBack(true)}
          onMouseLeave={() => setHoverBack(false)}
        >
          ← Back to Queue
        </button>
      </div>

      {error && <div style={styles.alertError}>{error}</div>}

      {loan && (
        <div style={styles.card}>
          {/* Loan Status */}
          <div style={styles.header}>
            <h1 style={styles.headerTitle}>Loan #{loan.id}</h1>
            <div style={styles.headerSub}>
              Status: <strong>{loan.status}</strong>
            </div>
          </div>

          {/* Client & Loan Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Loan Details</h2>
            <div style={styles.grid}>
              <div>
                <strong>Client Name:</strong> {loan.client?.full_name}
              </div>
              <div>
                <strong>National ID:</strong> {loan.client?.national_id}
              </div>
              <div>
                <strong>Phone:</strong> {loan.client?.phone}
              </div>
              <div>
                <strong>Email:</strong> {loan.client?.email}
              </div>
              <div>
                <strong>KYC Status:</strong> {loan.client?.kyc_status}
              </div>
              <div>
                <strong>Product:</strong> {loan.product?.name}
              </div>
              <div>
                <strong>Amount:</strong> {loan.amount}
              </div>
              <div>
                <strong>Interest Rate:</strong> {loan.interest_rate}%
              </div>
              <div>
                <strong>Term:</strong> {loan.term_months} months
              </div>
              <div>
                <strong>Loan Officer:</strong> {loan.loan_officer_name}
              </div>
              <div>
                <strong>Submitted:</strong>{' '}
                {loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString() : ''}
              </div>
            </div>
          </div>

          {/* KYC Documents */}
          {loan.documents && loan.documents.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Loan Documents</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {loan.documents.map((doc) => (
                  <div key={doc.id} style={styles.docItem}>
                    <div style={styles.docTop}>
                      <div>
                        <strong>{doc.document_type_name}</strong>
                        {doc.label && <div style={styles.docMeta}>Label: {doc.label}</div>}
                        {doc.description && <div style={styles.docMeta}>{doc.description}</div>}
                        <div style={{ ...styles.docMeta, color: '#868e96' }}>
                          Uploaded:{' '}
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}
                        </div>
                      </div>

                      {doc.document_file_url && (
                        <a
                          href={doc.document_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.link(hoverLinkId === doc.id)}
                          onMouseEnter={() => setHoverLinkId(doc.id)}
                          onMouseLeave={() => setHoverLinkId(null)}
                        >
                          View File
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repayment Schedule */}
          {loan.schedule && loan.schedule.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Repayment Schedule (Preview)</h2>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Month</th>
                      <th style={styles.th}>Due Date</th>
                      <th style={styles.th}>Principal</th>
                      <th style={styles.th}>Interest</th>
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.schedule.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.month_number}</td>
                        <td style={styles.td}>
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : ''}
                        </td>
                        <td style={styles.td}>
                          {item.principal_due !== null && item.principal_due !== undefined
                            ? parseFloat(item.principal_due).toFixed(2)
                            : ''}
                        </td>
                        <td style={styles.td}>
                          {item.interest_due !== null && item.interest_due !== undefined
                            ? parseFloat(item.interest_due).toFixed(2)
                            : ''}
                        </td>
                        <td style={styles.tdBold}>
                          {item.principal_due !== null &&
                          item.principal_due !== undefined &&
                          item.interest_due !== null &&
                          item.interest_due !== undefined
                            ? (parseFloat(item.principal_due) + parseFloat(item.interest_due)).toFixed(2)
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Branch Manager Remarks */}
          {loan.bm_remarks && (
            <div style={styles.remarks}>
              <h3 style={{ fontWeight: 900, margin: '0 0 8px 0' }}>Branch Manager Remarks</h3>
              <p style={{ margin: 0, fontSize: 13 }}>{loan.bm_remarks}</p>
            </div>
          )}

          {/* Action Buttons */}
          {loan.status === 'SUBMITTED' && (
            <div style={styles.actionsWrap}>
              <div style={styles.actionsRow}>
                <button
                  onClick={handleApprove}
                  style={styles.btn('green', hoverBtn === 'approve')}
                  onMouseEnter={() => setHoverBtn('approve')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Approve Loan
                </button>

                <button
                  onClick={() => setActionMode('reject')}
                  style={styles.btn('red', hoverBtn === 'reject')}
                  onMouseEnter={() => setHoverBtn('reject')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Reject Loan
                </button>

                <button
                  onClick={() => setActionMode('request-changes')}
                  style={styles.btn('orange', hoverBtn === 'request')}
                  onMouseEnter={() => setHoverBtn('request')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Request Changes
                </button>
              </div>
            </div>
          )}

          {/* Action Forms */}
          {actionMode === 'reject' && (
            <div style={styles.formWrap('red')}>
              <h3 style={{ fontWeight: 900, margin: '0 0 12px 0' }}>Reject Loan</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Please provide reasons for rejection"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleReject}
                  style={styles.btn('red', hoverBtn === 'confirmReject')}
                  onMouseEnter={() => setHoverBtn('confirmReject')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setActionMode(null);
                    setRemarks('');
                  }}
                  style={styles.btn('gray', hoverBtn === 'cancelReject')}
                  onMouseEnter={() => setHoverBtn('cancelReject')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionMode === 'request-changes' && (
            <div style={styles.formWrap('orange')}>
              <h3 style={{ fontWeight: 900, margin: '0 0 12px 0' }}>Request Changes</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Please specify what changes are needed"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleRequestChanges}
                  style={styles.btn('orange', hoverBtn === 'confirmRequest')}
                  onMouseEnter={() => setHoverBtn('confirmRequest')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Send Back to Officer
                </button>
                <button
                  onClick={() => {
                    setActionMode(null);
                    setRemarks('');
                  }}
                  style={styles.btn('gray', hoverBtn === 'cancelRequest')}
                  onMouseEnter={() => setHoverBtn('cancelRequest')}
                  onMouseLeave={() => setHoverBtn(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchManagerLoanDetailPage;