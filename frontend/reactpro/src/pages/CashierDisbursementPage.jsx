import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoanDetail, disburseLoan } from '../api/loans';

const styles = {
  page: { maxWidth: 720, margin: '0 auto', padding: 16 },
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
  headerSub: { fontSize: 13, color: '#495057', marginTop: 6 },
  section: { padding: 16, borderBottom: '1px solid #dee2e6' },
  sectionTitle: { fontSize: 16, fontWeight: 900, margin: '0 0 12px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 },
  label: { display: 'block', fontSize: 13, fontWeight: 900, marginBottom: 8 },
  radioRow: { display: 'grid', gap: 10 },
  radioLine: { display: 'flex', alignItems: 'center', gap: 8 },
  input: {
    width: '100%',
    padding: 10,
    border: '1px solid #ced4da',
    borderRadius: 8,
    fontSize: 13,
    boxSizing: 'border-box',
  },
  hint: { fontSize: 12, color: '#6c757d', marginTop: 6 },
  submitBtn: (disabled, hover) => ({
    width: '100%',
    padding: '12px 14px',
    background: disabled ? '#adb5bd' : hover ? '#1e7e34' : '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 900,
  }),
  notes: {
    padding: 16,
    background: '#e7f1ff',
    borderTop: '1px solid #b8daff',
  },
  notesTitle: { fontWeight: 900, fontSize: 13, margin: '0 0 8px 0' },
  notesList: { margin: 0, paddingLeft: 18, fontSize: 12, color: '#343a40' },
};

const CashierDisbursementPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [disbursementData, setDisbursementData] = useState({
    disbursement_method: 'CASH',
    disbursement_reference: '',
  });

  const [hoverBackQueue, setHoverBackQueue] = useState(false);
  const [hoverBackDashboard, setHoverBackDashboard] = useState(false);
  const [hoverSubmit, setHoverSubmit] = useState(false);

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const data = await getLoanDetail(loanId);
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

  const handleDisburse = async (e) => {
    e.preventDefault();

    if (
      disbursementData.disbursement_method === 'BANK_TRANSFER' &&
      !disbursementData.disbursement_reference.trim()
    ) {
      setError('Transfer reference is required for bank transfers');
      return;
    }

    try {
      setProcessing(true);
      const data = await disburseLoan(loanId, disbursementData);
      setLoan(data);
      alert('Loan disbursed successfully! Schedule has been generated.');
      navigate('/cashier/loans');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disburse loan');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading loan details...</div>;

  return (
    <div style={styles.page}>
      <div style={{ ...styles.backWrap, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/cashier/loans')}
          style={styles.backBtn(hoverBackQueue)}
          onMouseEnter={() => setHoverBackQueue(true)}
          onMouseLeave={() => setHoverBackQueue(false)}
        >
          ← Back to Queue
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={styles.backBtn(hoverBackDashboard)}
          onMouseEnter={() => setHoverBackDashboard(true)}
          onMouseLeave={() => setHoverBackDashboard(false)}
        >
          ← Back to Dashboard
        </button>
      </div>

      {error && <div style={styles.alertError}>{error}</div>}

      {loan && (
        <div style={styles.card}>
          {/* Loan Summary */}
          <div style={styles.header}>
            <h1 style={styles.headerTitle}>Disburse Loan #{loan.id}</h1>
            <div style={styles.headerSub}>Client: {loan.client?.full_name}</div>
          </div>

          {/* Loan Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Loan Details</h2>
            <div style={styles.grid}>
              <div>
                <strong>Amount to Disburse:</strong> {loan.amount}
              </div>
              <div>
                <strong>Product:</strong> {loan.product?.name}
              </div>
              <div>
                <strong>Interest Rate:</strong> {loan.interest_rate}%
              </div>
              <div>
                <strong>Term:</strong> {loan.term_months} months
              </div>
              <div>
                <strong>Client Phone:</strong> {loan.client?.phone}
              </div>
              <div>
                <strong>Client Email:</strong> {loan.client?.email}
              </div>
            </div>
          </div>

          {/* Disbursement Form */}
          <form onSubmit={handleDisburse} style={styles.section}>
            <h2 style={styles.sectionTitle}>Disbursement Method</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Select Disbursement Method</label>
              <div style={styles.radioRow}>
                <label style={styles.radioLine}>
                  <input
                    type="radio"
                    value="CASH"
                    checked={disbursementData.disbursement_method === 'CASH'}
                    onChange={(e) =>
                      setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })
                    }
                  />
                  <span style={{ fontSize: 13 }}>Cash</span>
                </label>

                <label style={styles.radioLine}>
                  <input
                    type="radio"
                    value="BANK_TRANSFER"
                    checked={disbursementData.disbursement_method === 'BANK_TRANSFER'}
                    onChange={(e) =>
                      setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })
                    }
                  />
                  <span style={{ fontSize: 13 }}>Bank Transfer</span>
                </label>

                <label style={styles.radioLine}>
                  <input
                    type="radio"
                    value="SAVINGS_CREDIT"
                    checked={disbursementData.disbursement_method === 'SAVINGS_CREDIT'}
                    onChange={(e) =>
                      setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })
                    }
                  />
                  <span style={{ fontSize: 13 }}>Savings Credit</span>
                </label>
              </div>
            </div>

            {/* Reference field - only required for BANK_TRANSFER */}
            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>
                Reference / Receipt Number{' '}
                {disbursementData.disbursement_method === 'BANK_TRANSFER' && (
                  <span style={{ color: '#dc3545' }}>*</span>
                )}
              </label>

              <input
                type="text"
                value={disbursementData.disbursement_reference}
                onChange={(e) =>
                  setDisbursementData({ ...disbursementData, disbursement_reference: e.target.value })
                }
                style={styles.input}
                placeholder={
                  disbursementData.disbursement_method === 'CASH'
                    ? 'Optional: Receipt number'
                    : 'Required: Transfer reference (e.g., transaction ID)'
                }
              />

              <p style={styles.hint}>
                {disbursementData.disbursement_method === 'CASH' &&
                  'Optional: Enter receipt number if using receipt system'}
                {disbursementData.disbursement_method === 'BANK_TRANSFER' &&
                  'Required: Enter the bank transfer reference number or transaction ID'}
                {disbursementData.disbursement_method === 'SAVINGS_CREDIT' &&
                  'Optional: Internal savings transaction reference'}
              </p>
            </div>

            <button
              type="submit"
              disabled={processing}
              style={styles.submitBtn(processing, hoverSubmit)}
              onMouseEnter={() => setHoverSubmit(true)}
              onMouseLeave={() => setHoverSubmit(false)}
            >
              {processing ? 'Processing...' : 'Confirm Disbursement'}
            </button>
          </form>

          {/* Important Notes */}
          <div style={styles.notes}>
            <h3 style={styles.notesTitle}>Important:</h3>
            <ul style={styles.notesList}>
              <li>This action will set the loan to ACTIVE status</li>
              <li>Repayment schedule will be auto-generated</li>
              <li>Client will begin repayment obligations</li>
              <li>Bank Transfer requires a valid transfer reference</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierDisbursementPage;