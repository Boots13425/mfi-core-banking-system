import React, { useEffect, useMemo, useState } from "react";
import {
  getMyActiveSession,
  listMySessions,
  confirmSessionOpening,
  closeSession,
  listLedger,
} from "../api/cashApi";

const BRAND = {
  bg: "#F5FAFF",
  navy: "#0B1320",
  gold: "#D4AF37",
  border: "rgba(212,175,55,0.25)",
};

export default function TellerSessionPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [ledger, setLedger] = useState([]);

  const [countedOpen, setCountedOpen] = useState("");
  const [countedClose, setCountedClose] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [msg, setMsg] = useState("");

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const s = await listMySessions();
      setSessions(s);

      try {
        const a = await getMyActiveSession();
        setActive(a);

        const l = await listLedger({ session_id: a.id });
        setLedger(l);
      } catch (e) {
        setActive(null);
        setLedger([]);
      }
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const allocatedSessions = useMemo(
    () => sessions.filter((x) => x.status === "ALLOCATED"),
    [sessions]
  );

  async function handleConfirm(sessionId) {
    setMsg("");
    try {
      const v = Number(countedOpen);
      if (!v || v <= 0) {
        setMsg("Enter a valid counted opening amount.");
        return;
      }
      await confirmSessionOpening(sessionId, { counted_opening_amount: v });
      setCountedOpen("");
      await refresh();
      setMsg("Session confirmed and started.");
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to confirm opening.");
    }
  }

  async function handleClose(sessionId) {
    setMsg("");
    try {
      const v = Number(countedClose);
      if (v < 0 || Number.isNaN(v)) {
        setMsg("Enter a valid counted closing amount.");
        return;
      }
      await closeSession(sessionId, { counted_closing_amount: v, variance_note: varianceNote });
      setCountedClose("");
      setVarianceNote("");
      await refresh();
      setMsg("Session closed successfully.");
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to close session.");
    }
  }

  return (
    <div style={{ background: BRAND.bg, minHeight: "100vh", padding: 18 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ margin: 0, color: BRAND.navy }}>Cashier Session</h2>
        <p style={{ marginTop: 6, color: "#334155" }}>
          Start your session by counting your allocated cash. Close by counting cash and submitting reconciliation.
        </p>

        {msg ? (
          <div style={{ padding: 12, border: `1px solid ${BRAND.border}`, background: "#fff", borderRadius: 10, marginTop: 10 }}>
            {msg}
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 20 }}>Loading...</div>
        ) : (
          <>
            {/* ACTIVE SESSION */}
            <div style={{ marginTop: 18, padding: 16, background: "#fff", borderRadius: 14, border: `1px solid ${BRAND.border}` }}>
              <h3 style={{ margin: 0, color: BRAND.navy }}>Active Session</h3>
              {active ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
                    <Info label="Session ID" value={active.id} />
                    <Info label="Status" value={active.status} />
                    <Info label="Confirmed Opening" value={active.confirmed_opening_amount ?? "-"} />
                    <Info label="Expected Drawer Balance" value={active.expected_drawer_balance ?? "-"} />
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BRAND.border}` }}>
                    <h4 style={{ margin: 0, color: BRAND.navy }}>Close Session</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 200px", gap: 10, marginTop: 10 }}>
                      <input
                        value={countedClose}
                        onChange={(e) => setCountedClose(e.target.value)}
                        placeholder="Counted closing cash"
                        style={inputStyle()}
                      />
                      <input
                        value={varianceNote}
                        onChange={(e) => setVarianceNote(e.target.value)}
                        placeholder="Variance note (if any)"
                        style={inputStyle()}
                      />
                      <button onClick={() => handleClose(active.id)} style={btnStyle()}>
                        Close
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BRAND.border}` }}>
                    <h4 style={{ margin: 0, color: BRAND.navy }}>Session Ledger</h4>
                    <div style={{ overflowX: "auto", marginTop: 10 }}>
                      <table style={tableStyle()}>
                        <thead>
                          <tr>
                            <Th>Date</Th>
                            <Th>Type</Th>
                            <Th>Direction</Th>
                            <Th>Amount</Th>
                            <Th>Ref</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.length ? (
                            ledger.map((x) => (
                              <tr key={x.id}>
                                <Td>{new Date(x.created_at).toLocaleString()}</Td>
                                <Td>{x.event_type}</Td>
                                <Td>{x.direction}</Td>
                                <Td>{x.amount}</Td>
                                <Td>{x.reference_type ? `${x.reference_type}:${x.reference_id}` : "-"}</Td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <Td colSpan={5}>No entries yet.</Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 10, color: "#475569" }}>No active session. Confirm an allocation below.</div>
              )}
            </div>

            {/* ALLOCATIONS */}
            <div style={{ marginTop: 18, padding: 16, background: "#fff", borderRadius: 14, border: `1px solid ${BRAND.border}` }}>
              <h3 style={{ margin: 0, color: BRAND.navy }}>Allocated Sessions</h3>
              {allocatedSessions.length ? (
                <div style={{ marginTop: 10 }}>
                  {allocatedSessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 260px",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: BRAND.navy }}>Session #{s.id}</div>
                        <div style={{ color: "#475569", fontSize: 13 }}>Allocated opening: {s.opening_amount}</div>
                      </div>
                      <div style={{ color: "#334155" }}>Status: {s.status}</div>
                      <div style={{ color: "#334155" }}>Allocated at: {new Date(s.allocated_at).toLocaleString()}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                        <input
                          value={countedOpen}
                          onChange={(e) => setCountedOpen(e.target.value)}
                          placeholder="Counted opening"
                          style={inputStyle()}
                        />
                        <button onClick={() => handleConfirm(s.id)} style={btnStyle()}>
                          Confirm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#475569" }}>No allocated sessions.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, padding: 10 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 800, color: "#0B1320" }}>{value}</div>
    </div>
  );
}

function inputStyle() {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    outline: "none",
  };
}

function btnStyle() {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "#0B1320",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function tableStyle() {
  return {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  };
}

function Th({ children }) {
  return (
    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(15,23,42,0.12)", color: "#0B1320" }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} style={{ padding: 10, borderBottom: "1px solid rgba(15,23,42,0.08)", color: "#334155" }}>
      {children}
    </td>
  );
}