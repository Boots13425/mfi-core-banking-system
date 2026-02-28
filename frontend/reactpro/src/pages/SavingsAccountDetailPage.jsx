// src/pages/SavingsAccountDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canDeposit = user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER" || user?.role === "SUPER_ADMIN" || user?.role === "LOAN_OFFICER";
  const canWithdraw = user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER" || user?.role === "SUPER_ADMIN";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([fetchSavingsAccount(accountId), fetchSavingsTransactions(accountId)]);
      setAccount(a);
      setTxs(t);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load account.");
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
      await depositToSavingsAccount(accountId, { amount, narration: "Deposit" });
      alert("Deposit posted.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Deposit failed.");
    }
  };

  const doWithdraw = async () => {
    const amount = prompt("Enter withdrawal amount:");
    if (!amount) return;
    try {
      const res = await withdrawFromSavingsAccount(accountId, { amount, narration: "Withdrawal" });
      if (res?.status === "PENDING") alert("Withdrawal is pending approval (large amount).");
      else alert("Withdrawal posted.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Withdrawal failed.");
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Savings Account</h1>
          {account?.client ? (
            <button
              onClick={() => navigate(`/clients/${account.client}/savings`)}
              style={{
                padding: "8px 14px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              ← Client Savings
            </button>
          ) : (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "8px 14px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "10px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ border: "1px solid #eee", borderRadius: "6px", padding: "12px", marginBottom: "14px" }}>
        <div><b>Account #:</b> {account?.account_number}</div>
        <div><b>Product:</b> {account?.product_name}</div>
        <div><b>Status:</b> {account?.status}</div>
        <div><b>Balance:</b> {account?.balance}</div>

        <div style={{ marginTop: "10px" }}>
          <button
            onClick={doDeposit}
            disabled={!canDeposit || account?.status !== "ACTIVE"}
            style={{
              padding: "8px 12px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              marginRight: "8px",
            }}
          >
            Deposit
          </button>

          <button
            onClick={doWithdraw}
            disabled={!canWithdraw || account?.status !== "ACTIVE"}
            style={{
              padding: "8px 12px",
              background: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: "6px", padding: "12px" }}>
        <h3 style={{ marginTop: 0 }}>Transactions (latest)</h3>

        {txs.length === 0 ? (
          <div style={{ color: "#666" }}>No transactions found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #eee" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Type</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Amount</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Narration</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{new Date(t.created_at).toLocaleString()}</td>
                  <td style={{ padding: "8px" }}>{t.tx_type}</td>
                  <td style={{ padding: "8px" }}>{t.amount}</td>
                  <td style={{ padding: "8px" }}>{t.status}</td>
                  <td style={{ padding: "8px" }}>{t.narration || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};