import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const SavingsAccountPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openingAccount, setOpeningAccount] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openError, setOpenError] = useState(null);
  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    fetchAccountAndClient();
  }, [clientId]);

  const fetchAccountAndClient = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch client details for KYC status
      const clientResponse = await axiosInstance.get(`/clients/${clientId}/`);
      setClientData(clientResponse.data);

      // Try to fetch savings account
      try {
        const accountResponse = await axiosInstance.get(`/savings/${clientId}/`);
        setAccount(accountResponse.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // Account doesn't exist yet, which is OK
          setAccount(null);
        } else {
          setError(
            err.response?.data?.detail ||
              'Failed to load savings account details.'
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to load client or account data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccount = async () => {
    setOpeningAccount(true);
    setOpenError(null);
    setOpenSuccess(false);

    try {
      const response = await axiosInstance.post('/savings/', {
        client_id: clientId,
      });
      setOpenSuccess(true);
      setAccount(response.data);
      // Refresh data after 2 seconds
      setTimeout(() => {
        fetchAccountAndClient();
      }, 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setOpenError('You do not have permission to open a savings account');
      } else if (err.response?.status === 400) {
        setOpenError(
          err.response.data?.detail ||
            'Cannot open account. Check client status and KYC verification.'
        );
      } else {
        setOpenError(
          err.response?.data?.detail || 'Failed to open savings account.'
        );
      }
    } finally {
      setOpeningAccount(false);
    }
  };

  const canOpenAccount =
    user?.role === 'CASHIER' &&
    !account &&
    clientData?.status === 'ACTIVE' &&
    clientData?.kyc?.status === 'VERIFIED';

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading savings account...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
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
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Client
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
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
          ← Back to Client
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '30px',
        }}
      >
        <h1 style={{ marginBottom: '30px' }}>Savings Account</h1>

        {openSuccess && (
          <div
            style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            Savings account opened successfully! Refreshing...
          </div>
        )}

        {openError && (
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
            {openError}
          </div>
        )}

        {!account ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
              No savings account yet.
            </p>

            {canOpenAccount ? (
              <button
                onClick={handleOpenAccount}
                disabled={openingAccount}
                style={{
                  padding: '10px 20px',
                  background: openingAccount ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: openingAccount ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {openingAccount ? 'Opening Account...' : 'Open Savings Account'}
              </button>
            ) : (
              <div style={{ fontSize: '14px', color: '#666' }}>
                <p style={{ marginBottom: '10px' }}>
                  Cannot open account. Requirements:
                </p>
                <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                  <li>
                    Client Status:{' '}
                    <strong>
                      {clientData?.status === 'ACTIVE' ? '✓' : '✗'} ACTIVE
                    </strong>
                  </li>
                  <li>
                    KYC Status:{' '}
                    <strong>
                      {clientData?.kyc?.status === 'VERIFIED'
                        ? '✓'
                        : '✗'}{' '}
                      VERIFIED
                    </strong>
                  </li>
                  <li>
                    Role:{' '}
                    <strong>
                      {user?.role === 'CASHIER' ? '✓' : '✗'} CASHIER
                    </strong>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '30px',
                marginBottom: '30px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '5px',
                  }}
                >
                  Account Number
                </label>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {account.account_number || 'N/A'}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '5px',
                  }}
                >
                  Current Balance
                </label>
                <p
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#28a745',
                  }}
                >
                  ${parseFloat(account.balance || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '5px',
                  }}
                >
                  Client Name
                </label>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {clientData?.full_name || 'N/A'}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '5px',
                  }}
                >
                  Account Status
                </label>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {account.status || 'ACTIVE'}
                </p>
              </div>
            </div>

            {user?.role === 'CASHIER' && (
              <div
                style={{
                  borderTop: '2px solid #f0f0f0',
                  paddingTop: '20px',
                  display: 'flex',
                  gap: '10px',
                }}
              >
                <button
                  onClick={() => navigate(`/clients/${clientId}/deposit`)}
                  style={{
                    padding: '10px 20px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Deposit Funds
                </button>
                <button
                  onClick={() =>
                    navigate(`/clients/${clientId}/transactions`)
                  }
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
                  View Transactions
                </button>
              </div>
            )}

            {user?.role !== 'CASHIER' && (
              <div style={{ paddingTop: '20px' }}>
                <button
                  onClick={() =>
                    navigate(`/clients/${clientId}/transactions`)
                  }
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
                  View Transactions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
