import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";

export const CashierSavingsClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axiosInstance.get("/clients/");
      const all = res.data?.results || res.data || [];
      // require ACTIVE status and approved KYC (backend enforces on create as well)
      const activeOnly = all.filter((c) => c.status === "ACTIVE" && c.kyc_status === "APPROVED");
      setClients(activeOnly);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Savings - Select Client</h1>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 14px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Dashboard
        </button>
      </div>

      {err && (
        <div
          style={{
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            color: "#721c24",
            padding: 10,
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          {err}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : clients.length === 0 ? (
        <div style={{ color: "#666" }}>
          No clients with ACTIVE status and APPROVED KYC found.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #eee" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Client</th>
              <th style={{ padding: 8, textAlign: "left" }}>Member #</th>
              <th style={{ padding: 8, textAlign: "left" }}>Status</th>
              <th style={{ padding: 8, textAlign: "left" }}>KYC</th>
              <th style={{ padding: 8, textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`}
                </td>
                <td style={{ padding: 8 }}>{c.member_number || "-"}</td>
                <td style={{ padding: 8 }}>{c.status}</td>
                <td style={{ padding: 8 }}>{c.kyc_status || '-'}</td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => navigate(`/clients/${c.id}/savings`)}
                    style={{
                      padding: "6px 10px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Open Savings
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};