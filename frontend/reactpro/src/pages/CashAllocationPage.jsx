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
    setMsg('');
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
}

