import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import axiosInstance from '../api/axios';
import ClientAvatar from '../components/ClientAvatar';
import {
  fetchSavingsAccount,
  fetchSavingsTransactions,
  depositToSavingsAccount,
  withdrawFromSavingsAccount,
} from "../api/savings";

export const SavingsAccountDetailPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { accountId } = useParams();

  const [account, setAccount] = useState(null);
  const [txs, setTxs] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canDeposit = ["CASHIER", "BRANCH_MANAGER", "SUPER_ADMIN", "LOAN_OFFICER"].includes(user?.role);
  const canWithdraw = ["CASHIER", "BRANCH_MANAGER", "SUPER_ADMIN"].includes(user?.role);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([fetchSavingsAccount(accountId), fetchSavingsTransactions(accountId)]);
      setAccount(a);
      setTxs(t);
      if (a?.client) {
        try {
          const res = await axiosInstance.get(`/clients/${a.client}/`);
          setClient(res.data);
        } catch (err) {
          setClient(null);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const doDeposit = async () => {
    const amount = prompt("Enter deposit amount:");
    if (!amount) return;
    try {
      await depositToSavingsAccount(accountId, { amount, narration: "Deposit", payment_method: 'CASH' });
      alert("Deposit posted.");
      await load();
    } catch (err) {
      alert(err?.response?.data?.detail || "Deposit failed.");
    }
  };

  const doWithdraw = async () => {
    const amount = prompt("Enter withdrawal amount:");
    if (!amount) return;
    try {
      const res = await withdrawFromSavingsAccount(accountId, { amount, narration: "Withdrawal", payment_method: 'CASH' });
      if (res?.status === "PENDING") alert("Withdrawal is pending approval (large amount).");
      else alert("Withdrawal posted.");
      await load();
    } catch (err) {
      alert(err?.response?.data?.detail || "Withdrawal failed.");
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate('/clients')} style={{ padding: 8 }}> Back to Clients</button>
        <h2 style={{ margin: 0 }}>Savings Account</h2>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/dashboard')} style={{ padding: 8 }}> Dashboard</button>
      </div>

      {error && <div style={{ background: '#f8d7da', padding: 10, borderRadius: 4 }}>{error}</div>}

      <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        {client?.photo_url && (
          <ClientAvatar photoUrl={client.photo_url} name={client?.full_name} size={70} />
        )}
        <div>
          <div><strong>Account #:</strong> {account?.account_number}</div>
          <div><strong>Product:</strong> {account?.product_name}</div>
          <div><strong>Status:</strong> {account?.status}</div>
          <div><strong>Balance:</strong> {account?.balance}</div>

          <div style={{ marginTop: 10 }}>
            <button onClick={doDeposit} disabled={!canDeposit || account?.status !== 'ACTIVE'} style={{ marginRight: 8 }}>Deposit</button>
            <button onClick={doWithdraw} disabled={!canWithdraw || account?.status !== 'ACTIVE'}>Withdraw</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Transactions (latest)</h3>
        {txs.length === 0 ? (
          <div style={{ color: '#666' }}>No transactions found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Date</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Amount</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Narration</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(t => (
                <tr key={t.id}>
                  <td style={{ padding: 8 }}>{new Date(t.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{t.tx_type}</td>
                  <td style={{ padding: 8 }}>{t.amount}</td>
                  <td style={{ padding: 8 }}>{t.status}</td>
                  <td style={{ padding: 8 }}>{t.narration || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
