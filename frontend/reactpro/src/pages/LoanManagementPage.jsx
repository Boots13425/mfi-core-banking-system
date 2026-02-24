import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getLoanDetail, postRepayment } from "../api/loans";
import { useAuth } from "../auth/useAuth";

const LoanManagementPage = () => {
  const { clientId, loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "CASH",
    payment_reference: "",
    payment_date: new Date().toISOString().slice(0, 10),
  });

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background: "#fafafa",
        padding: 16,
        fontFamily: "Arial, sans-serif",
        color: "#333",
      },
      container: {
        maxWidth: 1200,
        margin: "0 auto",
      },
      topBar: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 16,
      },
      backBtn: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: 700,
      },
      titleWrap: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
      title: { margin: 0, fontSize: 18, fontWeight: 700 },
      subtitle: { margin: 0, color: "#777", fontSize: 13 },
      headerGrid: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.5fr)",
        gap: 12,
        marginBottom: 16,
      },
      card: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      },
      cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
        flexWrap: "wrap",
      },
      cardTitle: { margin: 0, fontSize: 15, fontWeight: 700 },
      pill: {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fafafa",
        color: "#555",
        whiteSpace: "nowrap",
      },
      label: { fontSize: 12, color: "#888", fontWeight: 700 },
      value: { fontSize: 14, fontWeight: 700 },
      infoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
      },
      infoItem: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
      },
      badge: (bg, color, borderColor) => ({
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color,
        border: `1px solid ${borderColor}`,
      }),
      tabs: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        borderBottom: "1px solid #ddd",
        marginBottom: 12,
      },
      tab: (active) => ({
        padding: "8px 12px",
        borderRadius: "8px 8px 0 0",
        border: active ? "1px solid #ddd" : "1px solid transparent",
        borderBottom: active ? "1px solid #fff" : "1px solid transparent",
        background: active ? "#fff" : "transparent",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
      }),
      tableWrap: {
        overflowX: "auto",
      },
      table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: 600,
      },
      th: {
        background: "#fafafa",
        textAlign: "left",
        padding: "8px 10px",
        borderBottom: "1px solid #ddd",
        fontSize: 12,
        color: "#666",
        fontWeight: 700,
        whiteSpace: "nowrap",
      },
      td: {
        padding: "8px 10px",
        borderBottom: "1px solid #eee",
        fontSize: 12,
        color: "#333",
        fontWeight: 600,
      },
      overdueRow: {
        background: "#fff5f5",
      },
      btn: {
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fff",
        fontSize: 12,
      },
      btnPrimary: {
        background: "#007bff",
        color: "#fff",
        borderColor: "#007bff",
      },
      btnGhost: {
        background: "#f8f9fa",
        color: "#333",
      },
      error: {
        background: "#f8d7da",
        border: "1px solid #f5c6cb",
        color: "#721c24",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 12,
        fontSize: 13,
        fontWeight: 700,
      },
      empty: {
        border: "1px dashed #ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        color: "#777",
        textAlign: "center",
      },
      modalBackdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      },
      modal: {
        background: "#fff",
        borderRadius: 10,
        maxWidth: 420,
        width: "100%",
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      },
      modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      },
      modalTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
      field: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 },
      input: {
        borderRadius: 8,
        border: "1px solid #ddd",
        padding: "8px 10px",
        fontSize: 13,
        outline: "none",
      },
      select: {
        borderRadius: 8,
        border: "1px solid #ddd",
        padding: "8px 10px",
        fontSize: 13,
        outline: "none",
        background: "#fff",
      },
      modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 6,
        flexWrap: "wrap",
      },
      small: { fontSize: 11, color: "#888", fontWeight: 600 },
    }),
    []
  );

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const data = await getLoanDetail(loanId);
      setLoan(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load loan details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  const schedule = loan?.schedule || [];
  const repayments = loan?.repayments || [];

  const today = new Date();

  const computed = useMemo(() => {
    if (!loan) {
      return {
        totalLoanAmount: 0,
        totalPaid: 0,
        remainingBalance: 0,
        monthlyInstallment: 0,
        nextDueDate: null,
        daysOverdue: 0,
        riskStatus: "Healthy",
        riskColor: "#28a745",
        riskBorder: "#c3e6cb",
      };
    }

    let totalPaid = 0;
    let totalDue = 0;
    let remainingBalance = 0;
    let nextDueDate = null;
    let maxDaysOverdue = 0;

    schedule.forEach((inst) => {
      const instTotalDue =
        Number(inst.principal_due || 0) +
        Number(inst.interest_due || 0) +
        Number(inst.penalty || 0);
      const instTotalPaid =
        Number(inst.principal_paid || 0) +
        Number(inst.interest_paid || 0) +
        Number(inst.penalty_paid || 0);
      const instRemaining = instTotalDue - instTotalPaid;

      totalDue += instTotalDue;
      totalPaid += instTotalPaid;
      remainingBalance += Math.max(instRemaining, 0);

      const due = inst.due_date ? new Date(inst.due_date) : null;
      if (!inst.is_paid && instRemaining > 0 && due) {
        if (!nextDueDate || due < nextDueDate) {
          nextDueDate = due;
        }

        if (due < today) {
          const diffMs = today.getTime() - due.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > maxDaysOverdue) {
            maxDaysOverdue = diffDays;
          }
        }
      }
    });

    const monthlyInstallment =
      schedule.length > 0
        ? Number(schedule[0].principal_due || 0) +
          Number(schedule[0].interest_due || 0) +
          Number(schedule[0].penalty || 0)
        : 0;

    let riskStatus = "Healthy";
    let riskColor = "#28a745";
    let riskBorder = "#c3e6cb";

    if (maxDaysOverdue > 0) {
      if (maxDaysOverdue <= 7) {
        riskStatus = "Warning";
        riskColor = "#856404";
        riskBorder = "#ffeeba";
      } else if (maxDaysOverdue <= 30) {
        riskStatus = "At Risk";
        riskColor = "#8a6d3b";
        riskBorder = "#f0ad4e";
      } else {
        riskStatus = "High Risk";
        riskColor = "#721c24";
        riskBorder = "#f5c6cb";
      }
    }

    return {
      totalLoanAmount: Number(loan.amount || 0),
      totalPaid,
      remainingBalance,
      monthlyInstallment,
      nextDueDate,
      daysOverdue: maxDaysOverdue,
      riskStatus,
      riskColor,
      riskBorder,
    };
  }, [loan, schedule, today]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDate = (value) => {
    if (!value) return "—";
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  const getRiskBadge = () => {
    const { riskStatus, riskColor, riskBorder } = computed;
    let bg = "#d4edda";
    if (riskStatus === "Warning") {
      bg = "#fff3cd";
    } else if (riskStatus === "At Risk") {
      bg = "#ffe5d0";
    } else if (riskStatus === "High Risk") {
      bg = "#f8d7da";
    }
    return (
      <span style={styles.badge(bg, riskColor, riskBorder)}>
        {riskStatus}
      </span>
    );
  };

  const getScheduleStatus = (inst) => {
    const instTotalDue =
      Number(inst.principal_due || 0) +
      Number(inst.interest_due || 0) +
      Number(inst.penalty || 0);
    const instTotalPaid =
      Number(inst.principal_paid || 0) +
      Number(inst.interest_paid || 0) +
      Number(inst.penalty_paid || 0);
    const instRemaining = instTotalDue - instTotalPaid;
    const due = inst.due_date ? new Date(inst.due_date) : null;

    if (inst.is_paid || instRemaining <= 0.0001) {
      return "Paid";
    }

    if (due) {
      if (due < today && instRemaining > 0) {
        return "Overdue";
      }
      if (due >= today && instTotalPaid > 0 && instRemaining > 0) {
        return "Partial";
      }
      if (due >= today && instTotalPaid === 0) {
        return "Upcoming";
      }
    }

    return "Upcoming";
  };

  const openPaymentModal = (inst) => {
    const instTotalDue =
      Number(inst.principal_due || 0) +
      Number(inst.interest_due || 0) +
      Number(inst.penalty || 0);
    const instTotalPaid =
      Number(inst.principal_paid || 0) +
      Number(inst.interest_paid || 0) +
      Number(inst.penalty_paid || 0);
    const instRemaining = Math.max(instTotalDue - instTotalPaid, 0);
    if (instRemaining <= 0.0001 || inst.is_paid) {
      return;
    }

    setPaymentTarget(inst);
    setPaymentForm((prev) => ({
      ...prev,
      amount: instRemaining ? String(instRemaining.toFixed(2)) : "",
      payment_method: "CASH",
      payment_reference: "",
      payment_date: new Date().toISOString().slice(0, 10),
    }));
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!loan) return;
    try {
      const payload = {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference,
        // backend uses server time; we keep date for display only
      };
      await postRepayment(loan.id, payload);
      setShowPaymentModal(false);
      setPaymentTarget(null);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record repayment");
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <p style={{ margin: 0, fontWeight: 800 }}>Loading loan...</p>
            <p style={styles.small}>Please wait while we fetch the latest data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.card}>
            <p style={{ margin: 0, fontWeight: 800 }}>Loan not found</p>
            <p style={styles.small}>This loan could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  const { totalLoanAmount, totalPaid, remainingBalance, monthlyInstallment, nextDueDate, daysOverdue } =
    computed;

  const client = loan.client;
  const product = loan.product;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button
            style={styles.backBtn}
            onClick={() => {
              if (user?.role === "CASHIER") {
                navigate("/cashier/loan-management");
                return;
              }
              navigate(`/loan-officer/clients/${clientId}/loan-context`);
            }}
          >
            ← Back
          </button>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Loan Management</h1>
            <p style={styles.subtitle}>
              Quickly review loan health, manage repayments, and see history.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {getRiskBadge()}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.headerGrid}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Client & Loan</h2>
              <span style={styles.pill}>{loan.status}</span>
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.label}>Client</span>
                <span style={styles.value}>{client?.full_name || "—"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Loan Product</span>
                <span style={styles.value}>{product?.name || "—"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Loan Amount</span>
                <span style={styles.value}>{formatCurrency(totalLoanAmount)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Term (months)</span>
                <span style={styles.value}>{loan.term_months ?? "—"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Interest Rate</span>
                <span style={styles.value}>
                  {loan.interest_rate != null ? `${loan.interest_rate}%` : "—"}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Next Due Date</span>
                <span style={styles.value}>{formatDate(nextDueDate)}</span>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Risk & Health</h2>
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.label}>Risk Status</span>
                {getRiskBadge()}
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Total Paid</span>
                <span style={styles.value}>{formatCurrency(totalPaid)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Remaining Balance</span>
                <span style={styles.value}>{formatCurrency(remainingBalance)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Days Overdue</span>
                <span style={styles.value}>{daysOverdue || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.tabs}>
            <button
              type="button"
              style={styles.tab(activeTab === "overview")}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              style={styles.tab(activeTab === "schedule")}
              onClick={() => setActiveTab("schedule")}
            >
              Repayment Schedule
            </button>
            <button
              type="button"
              style={styles.tab(activeTab === "history")}
              onClick={() => setActiveTab("history")}
            >
              Repayment History
            </button>
          </div>

          {activeTab === "overview" && (
            <div>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Total Loan Amount</span>
                  <span style={styles.value}>
                    {formatCurrency(totalLoanAmount)}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Total Paid</span>
                  <span style={styles.value}>{formatCurrency(totalPaid)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Remaining Balance</span>
                  <span style={styles.value}>
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Monthly Installment</span>
                  <span style={styles.value}>
                    {formatCurrency(monthlyInstallment)}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Next Due Date</span>
                  <span style={styles.value}>{formatDate(nextDueDate)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Days Overdue</span>
                  <span style={styles.value}>{daysOverdue || 0}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Risk Status</span>
                  {getRiskBadge()}
                </div>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div>
              {schedule.length === 0 ? (
                <div style={styles.empty}>
                  No repayment schedule has been generated for this loan yet.
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Month</th>
                        <th style={styles.th}>Due Date</th>
                        <th style={styles.th}>Amount Due</th>
                        <th style={styles.th}>Amount Paid</th>
                        <th style={styles.th}>Remaining</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((inst) => {
                        const instTotalDue =
                          Number(inst.principal_due || 0) +
                          Number(inst.interest_due || 0) +
                          Number(inst.penalty || 0);
                        const instTotalPaid =
                          Number(inst.principal_paid || 0) +
                          Number(inst.interest_paid || 0) +
                          Number(inst.penalty_paid || 0);
                        const instRemaining = Math.max(
                          instTotalDue - instTotalPaid,
                          0
                        );
                        const status = getScheduleStatus(inst);
                        const isOverdue = status === "Overdue";
                        const canRecordPayment =
                          loan.status === "ACTIVE" &&
                          status !== "Paid" &&
                          instRemaining > 0.0001;

                        return (
                          <tr
                            key={inst.id}
                            style={isOverdue ? styles.overdueRow : undefined}
                          >
                            <td style={styles.td}>{inst.month_number}</td>
                            <td style={styles.td}>
                              {formatDate(inst.due_date)}
                            </td>
                            <td style={styles.td}>
                              {formatCurrency(instTotalDue)}
                            </td>
                            <td style={styles.td}>
                              {formatCurrency(instTotalPaid)}
                            </td>
                            <td style={styles.td}>
                              {formatCurrency(instRemaining)}
                            </td>
                            <td style={styles.td}>{status}</td>
                            <td style={styles.td}>
                              <button
                                type="button"
                                style={{
                                  ...styles.btn,
                                  ...styles.btnPrimary,
                                  ...(!canRecordPayment
                                    ? { opacity: 0.5, cursor: "not-allowed" }
                                    : {}),
                                }}
                                disabled={!canRecordPayment}
                                onClick={() => {
                                  if (!canRecordPayment) return;
                                  openPaymentModal(inst);
                                }}
                              >
                                Record Payment
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {repayments.length === 0 ? (
                <div style={styles.empty}>No repayments recorded yet.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Method</th>
                        <th style={styles.th}>Reference</th>
                        <th style={styles.th}>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repayments.map((tx) => (
                        <tr key={tx.id}>
                          <td style={styles.td}>{formatDate(tx.paid_at)}</td>
                          <td style={styles.td}>
                            {formatCurrency(tx.amount)}
                          </td>
                          <td style={styles.td}>{tx.payment_method}</td>
                          <td style={styles.td}>
                            {tx.payment_reference || "—"}
                          </td>
                          <td style={styles.td}>
                            {tx.recorded_by_name || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowPaymentModal(false)}>
          <div
            style={styles.modal}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <form onSubmit={handleSubmitPayment}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Record Payment</h3>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnGhost }}
                  onClick={() => setShowPaymentModal(false)}
                >
                  ✕
                </button>
              </div>
              {paymentTarget && (
                <p style={styles.small}>
                  Month {paymentTarget.month_number} • Due{" "}
                  {formatDate(paymentTarget.due_date)}
                </p>
              )}
              <div style={styles.field}>
                <label style={styles.label}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  style={styles.input}
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Method</label>
                <select
                  style={styles.select}
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      payment_method: e.target.value,
                    }))
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CHECK">Cheque</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Reference</label>
                <input
                  type="text"
                  style={styles.input}
                  value={paymentForm.payment_reference}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      payment_reference: e.target.value,
                    }))
                  }
                  placeholder="Optional transaction reference"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Date</label>
                <input
                  type="date"
                  style={styles.input}
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      payment_date: e.target.value,
                    }))
                  }
                />
                <span style={styles.small}>
                  Date is for your reference; the system uses server time for posting.
                </span>
              </div>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnGhost }}
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagementPage;

