import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getBranchDailyPack } from "../api/reportsApi";

export default function BranchReportsPage() {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "BRANCH_MANAGER" && user.role !== "MANAGER") {
      setMsg("Only branch managers can access this page.");
      setMsgType("error");
      return;
    }
    load();
    // eslint-disable-next-line
  }, [user]);

  async function load() {
    setMsg("");
    try {
      const d = await getBranchDailyPack(date || undefined);
      setData(d);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load branch daily pack.");
      setMsgType("error");
    }
  }

  if (!user) return <div style={{ padding: 20 }}>Loading...</div>;

  if (user.role !== "BRANCH_MANAGER" && user.role !== "MANAGER") {
    return (
      <div style={{ padding: 20 }}>
        <h2>Unauthorized</h2>
        <p>Only branch managers can access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Branch Reports (Daily Pack)</h1>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          style={{ padding: "8px 14px", background: "#6c757d", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
        >
          ← Dashboard
        </button>
      </div>

      <p style={{ color: "#334155", marginBottom: 18 }}>
        View daily summaries for all cashiers in the branch and print the branch daily pack.
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
        <button onClick={load} style={btnStyle()}>Load</button>
        <button onClick={() => window.print()} style={btnStyle()} disabled={!data}>Print Branch Daily Pack</button>
      </div>

      {data && (
        <div style={{ marginTop: 16 }}>
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Branch Liquidity</h3>
            <Row label="Total Expected (All Tills)" value={data.branch_liquidity?.total_expected} />
            <Row label="Total Counted (Closed Tills)" value={data.branch_liquidity?.total_counted} />
            <Row label="Total Variance" value={data.branch_liquidity?.total_variance} />
          </div>

          <div style={{ ...panelStyle(), marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Cashier Sessions</h3>
            {(data.sessions || []).map((p) => (
              <div key={p.session.session_id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <Row label="Cashier" value={p.session.cashier_username} />
                <Row label="Status" value={p.session.status} />
                <Row label="Opening" value={p.session.opening_amount} />
                <Row label="Expected Closing" value={p.session.expected_closing_amount} />
                <Row label="Counted Closing" value={p.session.counted_closing_amount} />
                <Row label="Variance" value={p.session.variance_amount} />
              </div>
            ))}
            {(!data.sessions || data.sessions.length === 0) && <div>No sessions found for this day.</div>}
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