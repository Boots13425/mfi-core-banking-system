import React, { useEffect, useState } from "react";
import { allocateCashToCashier } from "../api/cashApi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_MAIN_API || "/api";

const BRAND = {
  bg: "#F5FAFF",
  navy: "#0B1320",
  gold: "#D4AF37",
  border: "rgba(212,175,55,0.25)",
};

export default function CashAllocationPage() {
  const [cashiers, setCashiers] = useState([]);
  const [cashierId, setCashierId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // If you already have an endpoint for branch users, swap this.
    // This is a generic attempt: /api/branches/my/users/?role=CASHIER
    (async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_BASE}/branches/my/users/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { role: "CASHIER" },
        });
        setCashiers(res.data || []);
      } catch {
        // fallback: empty list
        setCashiers([]);
      }
    })();
  }, []);

  async function handleAllocate() {
    setMsg("");
    const v = Number(amount);
    if (!cashierId) return setMsg("Select a cashier.");
    if (!v || v <= 0) return setMsg("Enter a valid allocation amount.");

    try {
      const created = await allocateCashToCashier({
        cashier_id: Number(cashierId),
        opening_amount: v,
        note,
      });
      setAmount("");
      setNote("");
      setMsg(`Allocated session #${created.id} successfully.`);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Allocation failed.");
    }
  }

  return (
    <div style={{ background: BRAND.bg, minHeight: "100vh", padding: 18 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: "#fff", borderRadius: 14, border: `1px solid ${BRAND.border}`, padding: 16 }}>
        <h2 style={{ margin: 0, color: BRAND.navy }}>Cash Allocation</h2>
        <p style={{ marginTop: 6, color: "#334155" }}>
          Allocate opening drawer cash to a cashier. The cashier must confirm by counting cash to start the session.
        </p>

        {msg ? (
          <div style={{ padding: 12, border: `1px solid ${BRAND.border}`, borderRadius: 10, marginTop: 10 }}>
            {msg}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label style={labelStyle()}>Cashier</label>
            <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} style={inputStyle()}>
              <option value="">Select cashier</option>
              {cashiers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name ? `${u.first_name} ${u.last_name}` : u.username || u.email || `User#${u.id}`}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              If cashier list is empty, connect this page to your “branch users” endpoint.
            </div>
          </div>

          <div>
            <label style={labelStyle()}>Opening Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 200000" style={inputStyle()} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle()}>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any instruction..." style={inputStyle()} />
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={handleAllocate} style={btnStyle()}>
            Allocate
          </button>
        </div>
      </div>
    </div>
  );
}

function labelStyle() {
  return { display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    outline: "none",
  };
}

function btnStyle() {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#0B1320",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}