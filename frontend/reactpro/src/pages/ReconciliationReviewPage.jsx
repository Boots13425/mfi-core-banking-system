import React, { useEffect, useState } from "react";
import { cashApi, reviewSession } from "../api/cashApi";

const BRAND = {
  bg: "#F5FAFF",
  navy: "#0B1320",
  border: "rgba(212,175,55,0.25)",
};

export default function ReconciliationReviewPage() {
  const [sessions, setSessions] = useState([]);
  const [msg, setMsg] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  async function refresh() {
    setMsg("");
    try {
      const res = await cashApi.get("/cash/sessions/");
      setSessions(res.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load sessions.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleReview(sessionId) {
    setMsg("");
    try {
      await reviewSession(sessionId, { reviewed: true, review_note: reviewNote });
      setReviewNote("");
      await refresh();
      setMsg("Reviewed successfully.");
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Review failed.");
    }
  }

  const closed = sessions.filter((s) => s.status === "CLOSED");

  return (
    <div style={{ background: BRAND.bg, minHeight: "100vh", padding: 18 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ margin: 0, color: BRAND.navy }}>Reconciliation Review</h2>
        <p style={{ marginTop: 6, color: "#334155" }}>
          Review closed teller sessions. Variance = counted closing - expected closing.
        </p>

        {msg ? (
          <div style={{ padding: 12, background: "#fff", borderRadius: 10, border: `1px solid ${BRAND.border}` }}>
            {msg}
          </div>
        ) : null}

        <div style={{ marginTop: 14, background: "#fff", borderRadius: 14, border: `1px solid ${BRAND.border}`, padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 10, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Review note</div>
              <input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional review note..."
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={tableStyle()}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Cashier</Th>
                  <Th>Opening</Th>
                  <Th>Expected Close</Th>
                  <Th>Counted Close</Th>
                  <Th>Variance</Th>
                  <Th>Reviewed</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {closed.length ? (
                  closed.map((s) => (
                    <tr key={s.id}>
                      <Td>#{s.id}</Td>
                      <Td>{String(s.cashier)}</Td>
                      <Td>{s.confirmed_opening_amount ?? "-"}</Td>
                      <Td>{s.expected_closing_amount ?? "-"}</Td>
                      <Td>{s.counted_closing_amount ?? "-"}</Td>
                      <Td style={{ fontWeight: 800 }}>{s.variance_amount ?? "-"}</Td>
                      <Td>{s.reviewed_by ? "YES" : "NO"}</Td>
                      <Td>
                        <button onClick={() => handleReview(s.id)} style={btnStyle()}>
                          Review
                        </button>
                      </Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <Td colSpan={8}>No closed sessions yet.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
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
    padding: "8px 10px",
    borderRadius: 10,
    border: "none",
    background: "#0B1320",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function tableStyle() {
  return { width: "100%", borderCollapse: "collapse", fontSize: 13 };
}

function Th({ children }) {
  return (
    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(15,23,42,0.12)", color: "#0B1320" }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, style }) {
  return (
    <td colSpan={colSpan} style={{ padding: 10, borderBottom: "1px solid rgba(15,23,42,0.08)", color: "#334155", ...style }}>
      {children}
    </td>
  );
}