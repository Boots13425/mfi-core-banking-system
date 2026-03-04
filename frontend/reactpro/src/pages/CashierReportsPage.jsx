import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getCashierDailyPack } from "../api/reportsApi";

export default function CashierReportsPage() {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "CASHIER" && user.role !== "TELLER") {
      setMsg("Only cashiers can access this page.");
      setMsgType("error");
      return;
    }
    load();
    // eslint-disable-next-line
  }, [user]);

  async function load() {
    setMsg("");
    try {
      const d = await getCashierDailyPack(date || undefined);
      setData(d);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load cashier daily pack.");
      setMsgType("error");
    }
  }

  if (!user) return <div style={{ padding: 20 }}>Loading...</div>;

  if (user.role !== "CASHIER" && user.role !== "TELLER") {
    return (
      <div style={{ padding: 20 }}>
        <h2>Unauthorized</h2>
        <p>Only cashiers can access this page.</p>
      </div>
    );
  }

  const session = data?.session;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>My Reports (Cashier)</h1>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          style={{ padding: "8px 14px", background: "#6c757d", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
        >
          ← Dashboard
        </button>
      </div>

      <p style={{ color: "#334155", marginBottom: 18 }}>
        This page generates your daily pack from your teller session and cash ledger entries (no manual Excel needed).
      </p>

      {msg && (
        <div
          style={{
            background: msgType === "success" ? "#d1fae5" : "#f8d7da",
            border: "1px solid " + (msgType === "success" ? "#10b981" : "#f5c6cb"),
            color: msgType === "success" ? "#059669" : "#721c24",
            padding: 10,
            borderRadius: 4,
            marginBottom: 18,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600 }}>Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 180 }}
        />
        <button onClick={load} style={btnStyle()}>
          Load
        </button>
        <button onClick={() => window.print()} style={btnStyle()} disabled={!session}>
          Print Daily Pack
        </button>
      </div>

      {!session && (
        <div style={{ marginTop: 16, padding: 12, background: "#fff3cd", borderRadius: 8 }}>
          {data?.message || "No teller session for this day."}
        </div>
      )}

      {session && (
        <div style={{ marginTop: 16 }}>
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Daily Cashbook Summary</h3>
            <Row label="Branch" value={session.branch_name} />
            <Row label="Cashier" value={session.cashier_username} />
            <Row label="Status" value={session.status} />
            <Row label="Opening Cash (Allocation)" value={session.opening_amount} />
            <Row label="Total Inflow" value={session.total_inflow} />
            <Row label="Total Outflow" value={session.total_outflow} />
            <Row label="Expected Closing" value={session.expected_closing_amount} />
            <Row label="Counted Closing" value={session.counted_closing_amount} />
            <Row label="Variance" value={session.variance_amount} />
            {session.variance_note ? <Row label="Variance Note" value={session.variance_note} /> : null}

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
              <h4 style={{ margin: "0 0 8px 0" }}>Breakdown</h4>
              <Row label="Savings Deposits (Cash)" value={session.breakdown?.savings_deposits_cash} />
              <Row label="Loan Repayments (Cash)" value={session.breakdown?.loan_repayments_cash} />
              <Row label="Savings Withdrawals (Cash)" value={session.breakdown?.savings_withdrawals_cash} />
              <Row label="Loan Disbursements (Cash)" value={session.breakdown?.loan_disbursements_cash} />
              <Row label="Reversals (Total)" value={session.breakdown?.reversals_total} />
            </div>
          </div>

          <div style={{ ...panelStyle(), marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Teller Transaction Listing</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    {["Time", "Type", "Dir", "Amount", "RefType", "RefID", "Narration"].map((h) => (
                      <th key={h} style={thStyle()}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.teller_listing || []).map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={tdStyle()}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={tdStyle()}>{r.event_type}</td>
                      <td style={tdStyle()}>{r.direction}</td>
                      <td style={tdStyle()}>{r.amount}</td>
                      <td style={tdStyle()}>{r.reference_type || "-"}</td>
                      <td style={tdStyle()}>{r.reference_id || "-"}</td>
                      <td style={tdStyle()}>{r.narration || "-"}</td>
                    </tr>
                  ))}
                  {(!data?.teller_listing || data.teller_listing.length === 0) && (
                    <tr>
                      <td style={tdStyle()} colSpan={7}>No transactions recorded for this day.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0" }}>
      <div style={{ color: "#334155" }}><b>{label}:</b></div>
      <div style={{ color: "#0f172a" }}>{value ?? "-"}</div>
    </div>
  );
}

function panelStyle() {
  return { background: "#fff", borderRadius: 6, border: "1px solid #eee", padding: 16 };
}

function btnStyle() {
  return { padding: "9px 14px", background: "#0d6efd", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 };
}

function thStyle() {
  return { textAlign: "left", padding: 8, fontSize: 13, borderBottom: "1px solid #eee" };
}

function tdStyle() {
  return { padding: 8, fontSize: 13 };
}