import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getClient, getKyc, saveKyc, verifyKyc, rejectKyc, submitKyc } from "../api/kyc";

export const ClientKycPage = () => {
  const { id } = useParams(); // client id
  const navigate = useNavigate();
  const { user } = useAuth();

  const canCapture = useMemo(() => user?.role === "CASHIER", [user]);
  const canVerify = useMemo(() => user?.role === "BRANCH_MANAGER", [user]);

  const [client, setClient] = useState(null);
  const [kyc, setKyc] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [rejectReason, setRejectReason] = useState("");

  // Keep all inputs controlled (never undefined/null)
  const [form, setForm] = useState({
    full_name: "",
    national_id: "",
    phone: "",
    email: "",
    address: "",
    region: "",
    id_type: "NATIONAL_ID",
    id_issue_date: "",
    id_expiry_date: "",
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const c = await getClient(id);

        // try load kyc (may not exist yet)
        let k = null;
        try {
          k = await getKyc(id);
        } catch (e) {
          k = null;
        }

        if (!mounted) return;

        setClient(c);
        setKyc(k);

        // Prefill from KYC first, else from Client
        setForm((prev) => ({
          ...prev,
          full_name: (k?.full_name ?? c?.full_name ?? ""),
          national_id: (k?.national_id ?? c?.national_id ?? ""),
          phone: (k?.phone ?? c?.phone ?? ""),
          email: (k?.email ?? c?.email ?? ""),
          address: (k?.address ?? c?.address ?? ""),
          region: (k?.region ?? ""),
          id_type: (k?.id_type ?? "NATIONAL_ID"),
          id_issue_date: (k?.id_issue_date ?? ""),
          id_expiry_date: (k?.id_expiry_date ?? ""),
        }));
      } catch (e) {
        setError("Failed to load client / KYC data.");
      } finally {
        setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!canCapture) {
      setError("Only CASHIER can capture/update KYC.");
      return;
    }

    try {
      setSaving(true);
      const updated = await saveKyc(id, form); // ✅ PATCH
      setKyc(updated);
      setSuccessMsg("KYC saved successfully.");
    } catch (e) {
      console.error(e);
      if (e?.response?.data) {
        const data = e.response.data;
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(String(data.detail));
        else {
          const msg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join("\n");
          setError(msg);
        }
      } else {
        setError("Failed to save KYC.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!canVerify) {
      setError("Only BRANCH_MANAGER can verify KYC.");
      return;
    }

    if (!window.confirm("Verify this client KYC now?")) return;

    try {
      setVerifying(true);
      const updated = await verifyKyc(id);
      setKyc(updated);
      setSuccessMsg("KYC verified successfully.");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Failed to verify KYC.");
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!canVerify) {
      setError("Only BRANCH_MANAGER can reject KYC.");
      return;
    }

    if (!rejectReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    try {
      setVerifying(true);
      const updated = await rejectKyc(id, { reason: rejectReason });
      setKyc(updated);
      setRejectReason("");
      setSuccessMsg("KYC rejected.");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Failed to reject KYC.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading KYC...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button
        onClick={() => navigate(`/clients/${id}`)}
        style={{
          padding: "8px 14px",
          background: "#6c757d",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        ← Back to Client Profile
      </button>

      <h1 style={{ marginTop: 0 }}>KYC Verification</h1>
      <div style={{ marginBottom: 18, color: "#444" }}>
        Client: <b>{client?.full_name}</b> | National ID: <b>{client?.national_id}</b>
      </div>

      {error && (
        <div
          style={{
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            color: "#721c24",
            padding: 12,
            borderRadius: 4,
            marginBottom: 18,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            color: "#155724",
            padding: 12,
            borderRadius: 4,
            marginBottom: 18,
          }}
        >
          {successMsg}
        </div>
      )}

      <div style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 6, padding: 18 }}>
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: kyc?.status === "VERIFIED" ? "#d4edda" : "#fff3cd",
              border: "1px solid #ddd",
              fontWeight: 700,
            }}
          >
            Status: {kyc?.status || "PENDING"}
          </span>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Full Name" name="full_name" value={form.full_name} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field label="National ID" name="national_id" value={form.national_id} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field label="Phone" name="phone" value={form.phone} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field label="Email" name="email" value={form.email} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field label="Region" name="region" value={form.region} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field label="Address" name="address" value={form.address} onChange={onChange} disabled={!canCapture || saving || verifying} />

            <div>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>ID Type</label>
              <select
                name="id_type"
                value={form.id_type}
                onChange={onChange}
                disabled={!canCapture || saving || verifying}
                style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="RESIDENCE_PERMIT">Residence Permit</option>
              </select>
            </div>

            <Field type="date" label="ID Issue Date" name="id_issue_date" value={form.id_issue_date} onChange={onChange} disabled={!canCapture || saving || verifying} />
            <Field type="date" label="ID Expiry Date" name="id_expiry_date" value={form.id_expiry_date} onChange={onChange} disabled={!canCapture || saving || verifying} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={!canCapture || saving || verifying}
              style={{
                padding: "10px 16px",
                background: !canCapture || saving ? "#6c757d" : "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: !canCapture || saving ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {saving ? "Saving..." : "Save KYC"}
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={!canVerify || verifying || saving || kyc?.status === "VERIFIED"}
              style={{
                padding: "10px 16px",
                background: !canVerify || verifying || kyc?.status === "VERIFIED" ? "#6c757d" : "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: !canVerify || verifying || kyc?.status === "VERIFIED" ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {kyc?.status === "VERIFIED" ? "Already Verified" : verifying ? "Verifying..." : "Verify KYC (Branch Manager)"}
            </button>
          </div>

          {canVerify && (
            <div style={{ marginTop: 18, padding: 12, border: "1px solid #eee", borderRadius: 6 }}>
              <b>Reject KYC</b>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
              />
              <button
                type="button"
                onClick={handleReject}
                disabled={verifying}
                style={{
                  marginTop: 10,
                  padding: "10px 16px",
                  background: verifying ? "#6c757d" : "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: verifying ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                {verifying ? "Working..." : "Reject"}
              </button>
            </div>
          )}

          {!canCapture && (
            <div style={{ marginTop: 12, color: "#666" }}>
              Note: Only <b>CASHIER</b> can capture/update KYC. Branch Manager verifies.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

function Field({ label, name, value, onChange, disabled, type = "text" }) {
  return (
    <div>
      <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}   // ✅ keeps it controlled
        onChange={onChange}
        disabled={disabled}
        style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 4 }}
      />
    </div>
  );
}
