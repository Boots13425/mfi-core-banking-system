// src/pages/SavingsProductsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import axiosInstance from "../api/axios";
import { fetchSavingsProducts } from "../api/savings";

export const SavingsProductsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // simple create form (optional)
  const [form, setForm] = useState({
    code: "",
    name: "",
    min_opening_balance: "0.00",
    min_balance: "0.00",
    interest_rate: "",
    withdrawal_requires_approval_above: "0.00",
    withdrawal_fee: "0.00",
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSavingsProducts();
      setProducts(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load savings products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await axiosInstance.post("/savings/products/", {
        ...form,
        interest_rate: form.interest_rate === "" ? null : form.interest_rate,
      });
      alert("Savings product created.");
      setForm({
        code: "",
        name: "",
        min_opening_balance: "0.00",
        min_balance: "0.00",
        interest_rate: "",
        withdrawal_requires_approval_above: "0.00",
        withdrawal_fee: "0.00",
        is_active: true,
      });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Failed to create product.");
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div style={{ padding: "20px" }}>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Savings Products</h1>
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
        </div>
      </div>

      {loading && <div>Loading...</div>}

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

      {/* Product list */}
      {!loading && (
        <div style={{ marginBottom: "18px" }}>
          {products.length === 0 ? (
            <div style={{ color: "#666" }}>No savings products found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #eee" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Code</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Min Open</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Min Bal</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Interest</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Approval Above</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Fee</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{p.code}</td>
                    <td style={{ padding: "8px" }}>{p.name}</td>
                    <td style={{ padding: "8px" }}>{p.min_opening_balance}</td>
                    <td style={{ padding: "8px" }}>{p.min_balance}</td>
                    <td style={{ padding: "8px" }}>{p.interest_rate ?? "-"}</td>
                    <td style={{ padding: "8px" }}>{p.withdrawal_requires_approval_above}</td>
                    <td style={{ padding: "8px" }}>{p.withdrawal_fee}</td>
                    <td style={{ padding: "8px" }}>{p.is_active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create product (optional but useful) */}
      <div style={{ border: "1px solid #eee", borderRadius: "6px", padding: "14px" }}>
        <h3 style={{ marginTop: 0 }}>Create Product</h3>

        <form onSubmit={handleCreate} style={{ display: "grid", gap: "10px", maxWidth: 520 }}>
          <label>
            Code
            <input
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              required
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>

          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label>
              Min Opening Balance
              <input
                value={form.min_opening_balance}
                onChange={(e) => setForm((s) => ({ ...s, min_opening_balance: e.target.value }))}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </label>

            <label>
              Min Balance
              <input
                value={form.min_balance}
                onChange={(e) => setForm((s) => ({ ...s, min_balance: e.target.value }))}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label>
              Interest Rate (optional)
              <input
                value={form.interest_rate}
                onChange={(e) => setForm((s) => ({ ...s, interest_rate: e.target.value }))}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </label>

            <label>
              Withdrawal Approval Above
              <input
                value={form.withdrawal_requires_approval_above}
                onChange={(e) =>
                  setForm((s) => ({ ...s, withdrawal_requires_approval_above: e.target.value }))
                }
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label>
              Withdrawal Fee
              <input
                value={form.withdrawal_fee}
                onChange={(e) => setForm((s) => ({ ...s, withdrawal_fee: e.target.value }))}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <button
            type="submit"
            style={{
              padding: "10px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Create Product
          </button>
        </form>
      </div>
    </div>
  );
};