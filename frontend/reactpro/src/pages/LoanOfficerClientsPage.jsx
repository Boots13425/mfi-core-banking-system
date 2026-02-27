import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/http";

export default function LoanOfficerClientsPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiFetch("/api/loan-officer/clients");
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to load clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => {
      const name = (c.full_name || "").toLowerCase();
      const nationalId = (c.national_id || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(s) || nationalId.includes(s) || phone.includes(s);
    });
  }, [clients, q]);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#fff",
              fontWeight: 700,
            }}
          >
            ← Back to Dashboard
          </button>
          <h2 style={{ margin: 0 }}>Loan Officer – Clients</h2>
        </div>
        <button
          onClick={load}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
            background: "#fff",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name / national ID / phone..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff3f3", border: "1px solid #ffd2d2" }}>
          <strong>Error:</strong> {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 18 }}>Loading clients...</div>
      ) : (
        <div style={{ marginTop: 18, background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>National ID</th>
                <th style={th}>Phone</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{c.full_name || "—"}</td>
                  <td style={tdMono}>{c.national_id || "—"}</td>
                  <td style={tdMono}>{c.phone || "—"}</td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: "1px solid #ddd",
                        background: c.status === "ACTIVE" ? "#f0fff4" : "#fff8e1",
                      }}
                    >
                      {c.status || "—"}
                    </span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/loan-officer/clients/${c.id}/loan-context`)}
                      style={btnPrimary}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td style={{ padding: 16 }} colSpan={5}>
                    No clients found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: "12px 14px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 13,
  borderBottom: "1px solid #eee",
};

const td = {
  padding: "12px 14px",
  fontSize: 14,
};

const tdMono = {
  padding: "12px 14px",
  fontSize: 13,
  fontFamily: "monospace",
};

const btnPrimary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #111",
  cursor: "pointer",
  background: "#111",
  color: "#fff",
};
