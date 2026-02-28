import React, { useEffect, useState } from 'react';
import {
  fetchSavingsProducts,
  fetchSavingsAccountsByClient,
  fetchSavingsTransactions,
  createSavingsAccount,
  depositToSavingsAccount,
  withdrawFromSavingsAccount,
} from '../api/savings';
import { useAuth } from '../auth/useAuth';

export const ClientSavingsSection = ({ clientId, clientStatus, clientKycStatus }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [activeAccount, setActiveAccount] = useState(null);

  const canOpenAccount =
    clientStatus === 'ACTIVE' &&
    clientKycStatus === 'APPROVED' &&
    (user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER' || user?.role === 'SUPER_ADMIN');
  const canDeposit =
    user?.role === 'LOAN_OFFICER' || user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER' || user?.role === 'SUPER_ADMIN';
  const canWithdraw = user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER' || user?.role === 'SUPER_ADMIN';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, accs] = await Promise.all([
        fetchSavingsProducts(),
        fetchSavingsAccountsByClient(clientId),
      ]);
      setProducts(prods);
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
        setActiveAccount(accs[0]);
        const txs = await fetchSavingsTransactions(accs[0].id);
        setTransactions(txs.slice(0, 10));
      } else {
        setSelectedAccountId(null);
        setActiveAccount(null);
        setTransactions([]);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load savings information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSelectAccount = async (account) => {
    setSelectedAccountId(account.id);
    setActiveAccount(account);
    const txs = await fetchSavingsTransactions(account.id);
    setTransactions(txs.slice(0, 10));
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading savings...</div>;
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '24px',
        marginTop: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0 }}>Savings</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canOpenAccount && (
            <button
              onClick={() => setShowOpenModal(true)}
              style={{
                padding: '8px 14px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Open Savings Account
            </button>
          )}
          {activeAccount && canDeposit && (
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                padding: '8px 14px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Deposit
            </button>
          )}
          {activeAccount && canWithdraw && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              style={{
                padding: '8px 14px',
                background: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Accounts table */}
      {accounts.length === 0 ? (
        <div style={{ color: '#666' }}>
          No savings accounts for this client.
          {canOpenAccount && ' Use "Open Savings Account" to create one.'}
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #eee',
            marginBottom: '16px',
          }}
        >
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Account #</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Balance</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{acc.account_number}</td>
                <td style={{ padding: '8px' }}>{acc.product_name}</td>
                <td style={{ padding: '8px' }}>{acc.status}</td>
                <td style={{ padding: '8px' }}>{acc.balance}</td>
                <td style={{ padding: '8px' }}>
                  <button
                    onClick={() => handleSelectAccount(acc)}
                    style={{
                      padding: '6px 10px',
                      background: selectedAccountId === acc.id ? '#6c757d' : '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {selectedAccountId === acc.id ? 'Selected' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Transactions table */}
      {activeAccount && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div style={{ color: '#666' }}>No transactions yet.</div>
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
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Amount</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px' }}>{tx.tx_type}</td>
                    <td style={{ padding: '8px' }}>{tx.amount}</td>
                    <td style={{ padding: '8px' }}>{tx.status}</td>
                    <td style={{ padding: '8px' }}>{tx.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {showOpenModal && (
        <SavingsModal title="Open Savings Account" onClose={() => setShowOpenModal(false)}>
          <OpenAccountForm
            products={products}
            clientId={clientId}
            onClose={() => setShowOpenModal(false)}
            onSuccess={loadData}
          />
        </SavingsModal>
      )}

      {showDepositModal && activeAccount && (
        <SavingsModal
          title={`Deposit into ${activeAccount.account_number}`}
          onClose={() => setShowDepositModal(false)}
        >
          <DepositWithdrawForm
            mode="deposit"
            account={activeAccount}
            onClose={() => setShowDepositModal(false)}
            onSuccess={loadData}
          />
        </SavingsModal>
      )}

      {showWithdrawModal && activeAccount && (
        <SavingsModal
          title={`Withdraw from ${activeAccount.account_number}`}
          onClose={() => setShowWithdrawModal(false)}
        >
          <DepositWithdrawForm
            mode="withdraw"
            account={activeAccount}
            onClose={() => setShowWithdrawModal(false)}
            onSuccess={loadData}
          />
        </SavingsModal>
      )}
    </div>
  );
};

const SavingsModal = ({ title, onClose, children }) => (
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
        maxWidth: '640px',
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

const OpenAccountForm = ({ products, clientId, onClose, onSuccess }) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [openingDeposit, setOpeningDeposit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createSavingsAccount({
        client_id: clientId,
        product_id: productId,
        opening_deposit: openingDeposit || '0',
      });
      await onSuccess();
      onClose();
    } catch (e2) {
      setError(e2?.response?.data?.detail || 'Failed to open savings account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
          Opening Deposit (optional)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={openingDeposit}
          onChange={(e) => setOpeningDeposit(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '10px 16px',
          background: saving ? '#6c757d' : '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {saving ? 'Opening...' : 'Open Account'}
      </button>
    </form>
  );
};

const DepositWithdrawForm = ({ mode, account, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!amount) {
      setError('Amount is required.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'deposit') {
        await depositToSavingsAccount(account.id, { amount, reference, narration });
      } else {
        await withdrawFromSavingsAccount(account.id, { amount, reference, narration });
      }
      await onSuccess();
      onClose();
    } catch (e2) {
      setError(e2?.response?.data?.detail || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Amount *</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Reference</label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Narration</label>
        <input
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '10px 16px',
          background: saving ? '#6c757d' : mode === 'deposit' ? '#007bff' : '#ffc107',
          color: mode === 'deposit' ? '#fff' : '#212529',
          border: 'none',
          borderRadius: '4px',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {saving ? 'Saving...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
      </button>
    </form>
  );
};

