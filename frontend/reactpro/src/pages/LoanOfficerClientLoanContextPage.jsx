import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createLoan,
  fetchClientLoanContext,
  fetchLoan,
  fetchLoanSchedule,
  recordRepayment,
} from '../api/loans';

const Badge = ({ text, bg, color }) => (
  <span
    style={{
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      background: bg,
      color,
    }}
  >
    {text}
  </span>
);

const ModalShell = ({ title, onClose, children, width = 720 }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '60px 16px',
      zIndex: 9999,
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        background: '#fff',
        borderRadius: '6px',
        border: '1px solid #ddd',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          background: '#f8f9fa',
        }}
      >
        <strong>{title}</strong>
        <button
          onClick={onClose}
          style={{
            padding: '6px 10px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  </div>
);

export const LoanOfficerClientLoanContextPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [showRepayment, setShowRepayment] = useState(false);

  const [loanDetails, setLoanDetails] = useState(null);
  const [schedule, setSchedule] = useState(null);

  const refreshContext = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientLoanContext(clientId);
      setContext(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load loan context.');
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const activeLoanId = context?.active_loan?.id;

  const riskBadge = useMemo(() => {
    const label = context?.risk?.label || 'OK';
    if (label === 'DELINQUENT') return { text: 'DELINQUENT', bg: '#f8d7da', color: '#721c24' };
    if (label === 'AT_RISK') return { text: 'AT RISK', bg: '#fff3cd', color: '#856404' };
    return { text: 'OK', bg: '#d4edda', color: '#155724' };
  }, [context]);

  const eligibleToCreateLoan = useMemo(() => {
    return !!context && !context.active_loan;
  }, [context]);

  const loadLoanDetails = async () => {
    if (!activeLoanId) return;
    const data = await fetchLoan(activeLoanId);
    setLoanDetails(data);
  };

  const loadSchedule = async () => {
    if (!activeLoanId) return;
    const data = await fetchLoanSchedule(activeLoanId);
    setSchedule(data);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading loan context...</div>;
  }

  if (error || !context) {
    return (
      <div style={{ padding: '20px', maxWidth: '760px', margin: '0 auto' }}>
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          {error || 'Unable to load context.'}
        </div>
        <button
          onClick={() => navigate('/loan-officer/clients')}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back to Clients
        </button>
      </div>
    );
  }

  const client = context.client;
  const kyc = client?.kyc_summary || {};

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <button
          onClick={() => navigate('/loan-officer/clients')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back to Clients
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Badge text={riskBadge.text} bg={riskBadge.bg} color={riskBadge.color} />
          {context?.risk?.max_days_overdue > 0 && (
            <span style={{ color: '#666', fontSize: '12px' }}>
              Max days overdue: <strong>{context.risk.max_days_overdue}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Client Summary */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>{client.full_name}</h1>
          <Badge text={client.status} bg="#d4edda" color="#155724" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Client Code</div>
            <div style={{ fontWeight: 'bold' }}>{client.client_number}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>National ID</div>
            <div style={{ fontWeight: 'bold' }}>{client.national_id || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Phone</div>
            <div style={{ fontWeight: 'bold' }}>{client.phone || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>KYC Summary (read-only)</div>
            <div style={{ fontWeight: 'bold' }}>
              {kyc.status ? `Status: ${kyc.status}` : 'No KYC record'}
              {kyc.rejection_reason ? ` (Reason: ${kyc.rejection_reason})` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Loan Overview */}
      <div style={{ marginTop: '16px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Loan Overview</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: '#666' }}>Loan status:</div>
          <Badge
            text={context.computed_state}
            bg={context.computed_state === 'Overdue' ? '#fff3cd' : context.computed_state === 'Active Loan' ? '#d1ecf1' : '#e2e3e5'}
            color={context.computed_state === 'Overdue' ? '#856404' : context.computed_state === 'Active Loan' ? '#0c5460' : '#383d41'}
          />
          {context.active_loan && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              Active Loan ID: <strong>{context.active_loan.id}</strong>
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {eligibleToCreateLoan && (
            <button
              onClick={() => setShowCreateLoan(true)}
              style={{
                padding: '10px 16px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Create Loan
            </button>
          )}

          {context.active_loan && (
            <>
              <button
                onClick={async () => {
                  await loadLoanDetails();
                  setShowLoanDetails(true);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                View Loan
              </button>
              <button
                onClick={async () => {
                  await loadSchedule();
                  setShowSchedule(true);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                View Schedule
              </button>
              <button
                onClick={() => setShowRepayment(true)}
                style={{
                  padding: '10px 16px',
                  background: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Record Repayment
              </button>
            </>
          )}

          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '12px', color: '#666', alignSelf: 'center' }}>
            {context.recovery_notes_placeholder?.note}
          </div>
        </div>
      </div>

      {/* Loan History */}
      <div style={{ marginTop: '16px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Loan History</h2>
        {context.loan_history.length === 0 ? (
          <div style={{ color: '#666' }}>No loans found for this client.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #eee' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Loan ID</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Principal</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Risk</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {context.loan_history.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{l.id}</td>
                  <td style={{ padding: '10px' }}>{l.status}</td>
                  <td style={{ padding: '10px' }}>{l.principal_amount}</td>
                  <td style={{ padding: '10px' }}>
                    {l.risk_label}
                    {l.max_days_overdue > 0 ? ` (${l.max_days_overdue}d)` : ''}
                  </td>
                  <td style={{ padding: '10px' }}>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Loan Modal */}
      {showCreateLoan && (
        <CreateLoanModal
          clientId={client.id}
          onClose={() => setShowCreateLoan(false)}
          onSuccess={async () => {
            setShowCreateLoan(false);
            await refreshContext();
          }}
        />
      )}

      {/* Loan Details Modal */}
      {showLoanDetails && (
        <ModalShell title={`Loan Details (ID ${activeLoanId})`} onClose={() => setShowLoanDetails(false)} width={920}>
          {!loanDetails ? (
            <div>Loading...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Principal</div>
                  <div style={{ fontWeight: 'bold' }}>{loanDetails.principal_amount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Interest Rate</div>
                  <div style={{ fontWeight: 'bold' }}>{loanDetails.interest_rate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Installments</div>
                  <div style={{ fontWeight: 'bold' }}>{loanDetails.number_of_installments}</div>
                </div>
              </div>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>
                Risk: <strong>{loanDetails.risk?.label}</strong>
                {loanDetails.risk?.max_days_overdue ? ` (max ${loanDetails.risk.max_days_overdue} days overdue)` : ''}
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <strong>Recent repayments</strong>
                {loanDetails.repayments?.length ? (
                  <ul>
                    {loanDetails.repayments.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        {r.payment_date}: {r.amount_paid} (by {r.recorded_by_username})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#666' }}>No repayments yet.</div>
                )}
              </div>
            </>
          )}
        </ModalShell>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <ModalShell title={`Repayment Schedule (Loan ${activeLoanId})`} onClose={() => setShowSchedule(false)} width={980}>
          {!schedule ? (
            <div>Loading...</div>
          ) : (
            <>
              <div style={{ marginBottom: '10px', color: '#666', fontSize: '12px' }}>
                Risk: <strong>{schedule.risk?.label}</strong>
                {schedule.risk?.max_days_overdue ? ` (max ${schedule.risk.max_days_overdue} days overdue)` : ''}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #eee' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Due Date</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Amount Due</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Amount Paid</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.installments.map((i) => (
                    <tr key={i.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{i.installment_number}</td>
                      <td style={{ padding: '10px' }}>{i.due_date}</td>
                      <td style={{ padding: '10px' }}>{i.amount_due}</td>
                      <td style={{ padding: '10px' }}>{i.amount_paid}</td>
                      <td style={{ padding: '10px' }}>{i.status}</td>
                      <td style={{ padding: '10px' }}>{i.days_overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </ModalShell>
      )}

      {/* Repayment Modal */}
      {showRepayment && context.active_loan && (
        <RecordRepaymentModal
          loanId={context.active_loan.id}
          onClose={() => setShowRepayment(false)}
          onSuccess={async () => {
            setShowRepayment(false);
            await refreshContext();
            // refresh schedule/details if open later
            setSchedule(null);
            setLoanDetails(null);
          }}
        />
      )}
    </div>
  );
};

const CreateLoanModal = ({ clientId, onClose, onSuccess }) => {
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10.00');
  const [installments, setInstallments] = useState('12');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [disbursementDate, setDisbursementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [firstDueDate, setFirstDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!principalAmount) return setError('Principal amount is required.');
    if (!firstDueDate) return setError('First due date is required.');
    setSaving(true);
    try {
      await createLoan({
        client_id: Number(clientId),
        principal_amount: principalAmount,
        interest_rate: interestRate,
        number_of_installments: Number(installments),
        repayment_frequency: frequency,
        disbursement_date: disbursementDate,
        first_due_date: firstDueDate,
      });
      await onSuccess();
    } catch (e2) {
      setError(e2?.response?.data?.detail || 'Failed to create loan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create Loan" onClose={onClose}>
      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Principal Amount *</label>
            <input value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} type="number" step="0.01" min="0" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Interest Rate (%)</label>
            <input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} type="number" step="0.01" min="0" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}># Installments *</label>
            <input value={installments} onChange={(e) => setInstallments(e.target.value)} type="number" min="1" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Repayment Frequency *</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Disbursement Date *</label>
            <input value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} type="date" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>First Due Date *</label>
            <input value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} type="date" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={saving} style={{ padding: '10px 16px', background: saving ? '#6c757d' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {saving ? 'Creating...' : 'Create Loan'}
          </button>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: '10px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const RecordRepaymentModal = ({ loanId, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!amount) return setError('Amount is required.');
    setSaving(true);
    try {
      await recordRepayment(loanId, { amount, payment_date: paymentDate, note: note || null });
      await onSuccess();
    } catch (e2) {
      setError(e2?.response?.data?.detail || 'Failed to record repayment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Record Repayment (Loan ${loanId})`} onClose={onClose}>
      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Amount *</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Payment Date *</label>
            <input value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} type="date" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ gridColumn: '1 / span 2' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Note / Reference (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={saving} style={{ padding: '10px 16px', background: saving ? '#6c757d' : '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {saving ? 'Recording...' : 'Record Repayment'}
          </button>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: '10px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

