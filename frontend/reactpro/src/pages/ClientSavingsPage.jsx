// src/pages/ClientSavingsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import axiosInstance from "../api/axios";

import {
  fetchSavingsProducts,
  createSavingsAccount,
  fetchSavingsAccountsByClient,
  depositToSavingsAccount,
  withdrawFromSavingsAccount,
} from "../api/savings";

// component used by cashiers on this page
import { ClientSavingsSection } from "../components/ClientSavingsSection";
import { TellerSessionManager } from "../components/TellerSessionManager";
import ClientAvatar from '../components/ClientAvatar';

export const ClientSavingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openForm, setOpenForm] = useState({
    product_id: "",
    opening_deposit: "",
  });

  // when the selected product changes, pre‑populate opening deposit with the
  // product's minimum opening balance; the cashier can still edit the field.
  useEffect(() => {
    if (openForm.product_id) {
      const prod = products.find((p) => p.id === Number(openForm.product_id));
      if (prod) {
        setOpenForm((s) => ({
          ...s,
          opening_deposit: prod.min_opening_balance || "",
        }));
      }
    }
  }, [openForm.product_id, products]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientRes, prods, accs] = await Promise.all([
        axiosInstance.get(`/clients/${clientId}/`), // adjust if your endpoint differs
        fetchSavingsProducts(),
        fetchSavingsAccountsByClient(clientId),
      ]);
      setClient(clientRes.data);
      setProducts(prods);
      setAccounts(accs);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load client savings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  // Render a compact client savings section for cashiers (reusable component)
  // This is additive — it does not remove existing controls on this page.
  const renderCashierSavingsSection = () => {
    if (!client) return null;
    if (user?.role !== 'CASHIER') return null;

    // component imported at top; rendering directly avoids runtime `require` error
    return (
      <ClientSavingsSection
        clientId={clientId}
        clientStatus={client?.status}
        clientKycStatus={client?.kyc_status}
      />
    );
  };

  // IMPORTANT: backend enforces status & KYC; frontend mirrors logic for UX
  const isActiveClient =
    client?.status === "ACTIVE" && client?.kyc_status === "APPROVED";

  const canOpenAccount = user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER" || user?.role === "SUPER_ADMIN";
  const canDeposit = user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER" || user?.role === "SUPER_ADMIN" || user?.role === "LOAN_OFFICER";
  const canWithdraw = user?.role === "CASHIER" || user?.role === "BRANCH_MANAGER" || user?.role === "SUPER_ADMIN";

  const handleOpenAccount = async (e) => {
    e.preventDefault();
    if (!canOpenAccount) return;

    try {
      setError(null);
      await createSavingsAccount({
        client_id: Number(clientId),
        product_id: Number(openForm.product_id),
        opening_deposit: openForm.opening_deposit === "" ? undefined : openForm.opening_deposit,
      });
      alert("Savings account opened.");
      setOpenForm({ product_id: "", opening_deposit: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Failed to open savings account.");
    }
  };

  const doDeposit = async (accountId) => {
    const amount = prompt("Enter deposit amount:");
    if (!amount) return;
    try {
      await depositToSavingsAccount(accountId, { amount, narration: "Deposit", payment_method: 'CASH' });
      alert("Deposit posted.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Deposit failed.");
    }
  };

  const doWithdraw = async (accountId) => {
    const amount = prompt("Enter withdrawal amount:");
    if (!amount) return;
    try {
      const res = await withdrawFromSavingsAccount(accountId, { amount, narration: "Withdrawal", payment_method: 'CASH' });
      if (res?.status === "PENDING") {
        alert("Withdrawal is pending approval (large amount).");
      } else {
        alert("Withdrawal posted.");
      }
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
          <button
            onClick={() => navigate('/clients')}
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
            ← Back to Clients
          </button>

          <h1 style={{ margin: 0 }}>Client Savings</h1>

          <button
            onClick={() => navigate(`/dashboard`)}
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
        </div>
      </div>

      {/* Show teller session manager for cashiers */}
      {user?.role === 'CASHIER' && <TellerSessionManager />}

      {renderCashierSavingsSection()}

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

      <div style={{ marginBottom: "16px", border: "1px solid #eee", borderRadius: "6px", padding: "12px", display: 'flex', gap: 12, alignItems: 'center' }}>
        {client?.photo_url && (
          <div>
            <ClientAvatar
              photoUrl={client.photo_url}
              name={client?.full_name}
              size={70}
              onClick={() => window.open(client.photo_url, '_blank')}
            />
          </div>
        )}
        <div>
          <div><b>Client:</b> {client?.full_name || `${client?.first_name || ""} ${client?.last_name || ""}`}</div>
          <div><b>Status:</b> {client?.status}</div>
          {!isActiveClient && (
            <div style={{ marginTop: "8px", color: "#856404", background: "#fff3cd", border: "1px solid #ffeeba", padding: "10px", borderRadius: "4px" }}>
              Savings accounts can only be created for <b>ACTIVE</b> clients with <b>APPROVED KYC</b>.
            </div>
          )}
        </div>
      </div>

      {/* Open Account */}
      <div style={{ marginBottom: "16px", border: "1px solid #eee", borderRadius: "6px", padding: "12px" }}>
        <h3 style={{ marginTop: 0 }}>Open Savings Account</h3>

        {!canOpenAccount ? (
          <div style={{ color: "#666" }}>You do not have permission to open savings accounts.</div>
        ) : (
          <form onSubmit={handleOpenAccount} style={{ display: "grid", gap: "10px", maxWidth: 520 }}>
            <label>
              Savings Product
              <select
                value={openForm.product_id}
                onChange={(e) => setOpenForm((s) => ({ ...s, product_id: e.target.value }))}
                required
                disabled={!isActiveClient}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Opening Deposit
              <input
                value={openForm.opening_deposit}
                onChange={(e) => setOpenForm((s) => ({ ...s, opening_deposit: e.target.value }))}
                disabled={!isActiveClient}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                placeholder="e.g. 5000"
              />
            </label>

            <button
              type="submit"
              disabled={!isActiveClient}
              style={{
                padding: "10px 16px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Open Account
            </button>
          </form>
        )}
      </div>

      {/* Accounts list */}
      <div style={{ border: "1px solid #eee", borderRadius: "6px", padding: "12px" }}>
        <h3 style={{ marginTop: 0 }}>Savings Accounts</h3>

        {accounts.length === 0 ? (
          <div style={{ color: "#666" }}>No savings accounts found for this client.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #eee" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Account #</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Product</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Balance</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>
                    <button
                      onClick={() => navigate(`/savings/accounts/${a.id}`)}
                      style={{
                        padding: "6px 10px",
                        background: "#111",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {a.account_number}
                    </button>
                  </td>
                  <td style={{ padding: "8px" }}>{a.product_name}</td>
                  <td style={{ padding: "8px" }}>{a.status}</td>
                  <td style={{ padding: "8px" }}>{a.balance}</td>
                  <td style={{ padding: "8px" }}>
                    <button
                      onClick={() => doDeposit(a.id)}
                      disabled={!canDeposit || a.status !== "ACTIVE"}
                      style={{
                        padding: "6px 10px",
                        background: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        marginRight: "6px",
                      }}
                    >
                      Deposit
                    </button>

                    <button
                      onClick={() => doWithdraw(a.id)}
                      disabled={!canWithdraw || a.status !== "ACTIVE"}
                      style={{
                        padding: "6px 10px",
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: "10px", color: "#666", fontSize: "12px" }}>
          Note: withdrawals above the product threshold become <b>PENDING</b> and require Branch Manager approval.
        </div>
      </div>
    </div>
  );
};