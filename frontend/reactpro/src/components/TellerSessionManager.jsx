import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';

export const TellerSessionManager = ({ onSessionReady }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/teller-sessions/my_active/');
      setSession(res.data);
      // If session is ACTIVE, notify parent
      if (res.data.status === 'ACTIVE' && onSessionReady) {
        onSessionReady(res.data);
      }
    } catch (err) {
      // No active session yet; check for allocated sessions
      fetchAllocatedSession();
    }
  };

  const fetchAllocatedSession = async () => {
    try {
      const res = await axiosInstance.get('/teller-sessions/');
      const allocated = res.data.find((s) => s.status === 'ALLOCATED');
      if (allocated) {
        setSession(allocated);
      } else {
        setError('No allocated teller session. Contact your branch manager.');
      }
    } catch (err) {
      setError('Failed to load session information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleConfirmOpening = async () => {
    if (!countedAmount) {
      alert('Please enter the counted amount.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(`/teller-sessions/${session.id}/confirm_opening/`, {
        counted_opening_amount: countedAmount,
      });
      setSession(res.data);
      setShowConfirmModal(false);
      setCountedAmount('');
      // Notify parent that session is now active
      if (onSessionReady) {
        onSessionReady(res.data);
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to confirm opening amount.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Loading teller session...
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          padding: '16px',
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          marginBottom: '16px',
        }}
      >
        {error || 'No teller session found.'}
      </div>
    );
  }

  // Session is ACTIVE - all good, don't show anything
  if (session.status === 'ACTIVE') {
    return null;
  }

  // Session is ALLOCATED - show confirmation prompt
  if (session.status === 'ALLOCATED') {
    return (
      <>
        <div
          style={{
            padding: '16px',
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            color: '#856404',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Teller Session Pending Confirmation</strong>
            <br />
            Opening amount allocated: {session.opening_amount}
            <br />
            Count the cash in your drawer and confirm to start the session.
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            style={{
              padding: '10px 16px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              marginLeft: '16px',
            }}
          >
            Confirm Opening
          </button>
        </div>

        {showConfirmModal && (
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
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
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
                <strong>Confirm Opening Amount</strong>
                <button
                  onClick={() => setShowConfirmModal(false)}
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
              <div style={{ padding: '16px' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Allocated Amount:</strong> {session.opening_amount}
                </p>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                    Counted Amount (Cash in Drawer)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedAmount}
                    onChange={(e) => setCountedAmount(e.target.value)}
                    placeholder="Enter amount"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <button
                  onClick={handleConfirmOpening}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: submitting ? '#6c757d' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {submitting ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Session is CLOSED
  if (session.status === 'CLOSED') {
    return (
      <div
        style={{
          padding: '16px',
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
          marginBottom: '16px',
        }}
      >
        <strong>Teller Session Closed</strong>
        <br />
        Your session for today has been closed. Contact your branch manager to open a new session.
      </div>
    );
  }

  return null;
};
