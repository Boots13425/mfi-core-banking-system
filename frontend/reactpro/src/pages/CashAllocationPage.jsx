import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { allocateCashToCashier, listMySessions } from '../api/cashApi';
import axiosInstance from '../api/axios';

export default function CashAllocationPage() {
  const { user } = useAuth();
  const [cashiers, setCashiers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashierId, setCashierId] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  useEffect(() => {
    if (user?.role !== 'BRANCH_MANAGER') {
      setMsg('Only branch managers can allocate cash.');
      setMsgType('error');
      setLoading(false);
      return;
    }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);

    try {
      const cashiersRes = await axiosInstance.get('/admin/users/branch_cashiers/');
      setCashiers(cashiersRes.data || []);
      const sessionsRes = await listMySessions();
      setSessions(sessionsRes || []);
    } catch (e) {
      setMsg(e?.response?.data?.detail || 'Failed to load cashiers and sessions.');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAllocate() {
    setMsg('');
    const v = Number(amount);
    if (!cashierId) {
      setMsg('Select a cashier.');
      setMsgType('error');
      return;
    }
    if (!v || v <= 0) {
      setMsg('Enter a valid allocation amount (must be > 0).');
      setMsgType('error');
      return;
    }
    try {
      const created = await allocateCashToCashier({
        cashier_id: Number(cashierId),
        opening_amount: v,
      });
      setAmount('');
      setCashierId('');
      setMsg('✓ Session #' + created.id + ' allocated successfully. Cashier must confirm opening amount.');
      setMsgType('success');
      await fetchData();
    } catch (e) {
      setMsg(e?.response?.data?.detail || 'Allocation failed.');
      setMsgType('error');
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (user?.role !== 'BRANCH_MANAGER') {
    return (
      <div style={{ padding: 20 }}>
        <h2>Unauthorized</h2>
        <p>Only branch managers can access this page.</p>
      </div>
    );
  }

  const allocatedSessions = sessions.filter((s) => s.status === 'ALLOCATED');
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Cash Allocation</h1>
        <button
          onClick={() => (window.location.href = "/dashboard")}
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
      <p style={{ color: "#334155", marginBottom: 18 }}>
        Allocate opening drawer cash to cashiers. They must confirm by counting cash to activate the session.
      </p>

      {msg && (
        <div
          style={{
            background: msgType === "success" ? "#d1fae5" : "#f8d7da",
            border: "1px solid " + (msgType === "success" ? "#10b981" : "#f5c6cb"),
            color: msgType === "success" ? "#059669" : "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "18px",
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={labelStyle()}>Cashier</label>
          <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} style={inputStyle()}>
            <option value="">Select cashier</option>
            {cashiers
              .filter((u) => u.is_active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name ? u.first_name + " " + u.last_name : u.username || u.email || "User#" + u.id}
                </option>
              ))}
          </select>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            Only active cashiers are shown.
          </div>
        </div>

        <div>
          <label style={labelStyle()}>Opening Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 200000" style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={handleAllocate} style={btnStyle()} disabled={!cashierId || !amount}>
          Allocate Cash
        </button>
      </div>

      {/* overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20, marginTop: 20 }}>
        <Card label="Active Sessions" count={activeSessions.length} color="#10b981" />
        <Card label="Pending Confirmation" count={allocatedSessions.length} color="#f59e0b" />
        <Card label="Closed Sessions" count={closedSessions.length} color="#6b7280" />
      </div>

      {/* allocated-pending sessions cards */}
      {allocatedSessions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #eee", padding: 16, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px 0", color: "#333" }}>Pending Confirmation ({allocatedSessions.length})</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {allocatedSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* active sessions */}
      {activeSessions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #eee", padding: 16, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px 0", color: "#333" }}>Active Sessions ({activeSessions.length})</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {activeSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* closed session table */}
      {closedSessions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #eee", padding: 16 }}>
          <h3 style={{ margin: "0 0 14px 0", color: "#333" }}>Closed Sessions ({closedSessions.length})</h3>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={tableHeaderStyle()}>ID</th>
                  <th style={tableHeaderStyle()}>Cashier</th>
                  <th style={tableHeaderStyle()}>Allocated By</th>
                  <th style={tableHeaderStyle()}>Allocated</th>
                  <th style={tableHeaderStyle()}>Expected</th>
                  <th style={tableHeaderStyle()}>Counted</th>
                  <th style={tableHeaderStyle()}>Variance</th>
                  <th style={tableHeaderStyle()}>Closed At</th>
                </tr>
              </thead>
              <tbody>
                {closedSessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={tableCellStyle()}>{s.id}</td>
                    <td style={tableCellStyle()}>{s.cashier?.username || s.cashier?.first_name}</td>
                    <td style={tableCellStyle()}>{s.allocated_by?.username || '-'}
                    </td>
                    <td style={tableCellStyle()}>{s.opening_amount}</td>
                    <td style={tableCellStyle()}>{s.expected_closing_amount ?? '-'}</td>
                    <td style={tableCellStyle()}>{s.counted_closing_amount ?? '-'}</td>
                    <td style={tableCellStyle()}>{s.variance_amount ?? '-'}</td>
                    <td style={tableCellStyle()}>{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // helper styles
  function labelStyle() {
    return { display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 };
  }

  function inputStyle() {
    return {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(15,23,42,0.14)",
      outline: "none",
      fontSize: 14,
    };
  }

  function btnStyle() {
    return {
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: "#0B1320",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 14,
    };
  }

  function tableHeaderStyle() {
    return { border: "1px solid #ddd", padding: "8px", textAlign: "left" };
  }

  function tableCellStyle() {
    return { border: "1px solid #ddd", padding: "8px" };
  }
}

// Card and SessionCard definitions
function Card({ label, count, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)", padding: 16 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
    </div>
  );
}

function SessionCard({ session, closed }) {
  const statusColor = session.status === "ALLOCATED" ? "#f59e0b" : session.status === "ACTIVE" ? "#10b981" : "#6b7280";
  let cashierName;
  if (session.cashier?.first_name) {
    cashierName = session.cashier.first_name + " " + session.cashier.last_name;
  } else {
    cashierName = session.cashier?.username || "Unknown";
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#f9fafb" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#333", marginBottom: 4 }}>
            Session #{session.id}
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 2 }}>
            Cashier: <strong>{cashierName}</strong>
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Opening Amount: <strong>{parseFloat(session.opening_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          {session.confirmed_opening_amount && (
            <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
              Confirmed: <strong>{parseFloat(session.confirmed_opening_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 6,
              background: statusColor,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {session.status}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
            {new Date(session.allocated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

