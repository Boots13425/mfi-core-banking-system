import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listLoans } from "../api/loans";

const CashierLoanManagementClientsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState(null);

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background: "#fafafa",
        padding: 16,
        fontFamily: "Arial, sans-serif",
        color: "#333",
      },
      container: { maxWidth: 1100, margin: "0 auto" },
      topBar: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 14,
      },
      backBtn: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: 700,
      },
      titleWrap: { display: "flex", flexDirection: "column", gap: 4 },
      title: { margin: 0, fontSize: 18, fontWeight: 700 },
      subtitle: { margin: 0, color: "#777", fontSize: 13 },
      card: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      },
      error: {
        background: "#f8d7da",
        border: "1px solid #f5c6cb",
        color: "#721c24",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 12,
        fontSize: 13,
        fontWeight: 700,
      },
      tableWrap: { overflowX: "auto" },
      table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: 720,
      },
      th: {
        background: "#fafafa",
        textAlign: "left",
        padding: "8px 10px",
        borderBottom: "1px solid #ddd",
        fontSize: 12,
        color: "#666",
        fontWeight: 700,
        whiteSpace: "nowrap",
      },
      td: {
        padding: "8px 10px",
        borderBottom: "1px solid #eee",
        fontSize: 12,
        color: "#333",
        fontWeight: 600,
      },
      pill: {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fafafa",
        color: "#555",
        whiteSpace: "nowrap",
      },
      btn: {
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        fontWeight: 700,
        border: "1px solid #007bff",
        background: "#007bff",
        color: "#fff",
        fontSize: 12,
      },
      empty: {
        border: "1px dashed #ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        color: "#777",
        textAlign: "center",
      },
      small: { fontSize: 11, color: "#888", fontWeight: 600 },
    }),
    []
  );

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      const all = await listLoans();
      const active = (all || []).filter((l) => l.status === "ACTIVE");
      setLoans(active);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load active loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Loan Management</h1>
            <p style={styles.subtitle}>
              Select a client with an active (disbursed) loan to manage repayments.
            </p>
          </div>
          <div />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.card}>
          {loading ? (
            <>
              <p style={{ margin: 0, fontWeight: 800 }}>Loading active loans…</p>
              <p style={styles.small}>Please wait.</p>
            </>
          ) : loans.length === 0 ? (
            <div style={styles.empty}>No active loans found.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Client</th>
                    <th style={styles.th}>Loan ID</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => (
                    <tr key={l.id}>
                      <td style={styles.td}>{l.client_name || "—"}</td>
                      <td style={styles.td}>{l.id}</td>
                      <td style={styles.td}>{l.product_name || "—"}</td>
                      <td style={styles.td}>{formatCurrency(l.amount)}</td>
                      <td style={styles.td}>
                        <span style={styles.pill}>{l.status}</span>
                      </td>
                      <td style={styles.td}>{formatDate(l.created_at)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.btn}
                          onClick={() =>
                            navigate(`/clients/${l.client}/loans/${l.id}`)
                          }
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierLoanManagementClientsPage;

