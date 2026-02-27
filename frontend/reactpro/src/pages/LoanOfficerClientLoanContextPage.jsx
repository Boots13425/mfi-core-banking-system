// src/pages/LoanOfficerClientLoanContextPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getLoanContext,
  getLoanProducts,
  createLoan,
  uploadLoanDocument,
  uploadLoanDocumentsBulk,
  submitLoan,
  postRepayment,
} from "../api/loans";
import ClientAvatar from '../components/ClientAvatar';

const LoanOfficerClientLoanContextPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  // UI toggles
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [showRepayment, setShowRepayment] = useState(false);

  // Form states (NOTE: term_months)
  const [createFormData, setCreateFormData] = useState({
    product: "",
    amount: "",
    term_months: "",
    purpose: "",
  });

  const [uploadFormData, setUploadFormData] = useState({
    document_type: "",
    document_file: null,
    label: "",
    description: "",
  });

  const [requiredUploadFiles, setRequiredUploadFiles] = useState({});

  const [repaymentFormData, setRepaymentFormData] = useState({
    amount: "",
    payment_method: "CASH",
    payment_reference: "",
    notes: "",
  });

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background: "#fafafa",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        color: "#333",
      },
      container: {
        maxWidth: 1200,
        margin: "0 auto",
      },
      topBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 18,
      },
      backBtn: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: "bold",
      },
      titleWrap: { display: "flex", flexDirection: "column", gap: 4 },
      title: { margin: 0, fontSize: 20, fontWeight: 700 },
      subtitle: { margin: 0, color: "#999", fontSize: 13 },

      grid: {
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 16,
      },
      card: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      },
      cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 12,
      },
      cardTitle: {
        margin: 0,
        fontSize: 16,
        fontWeight: 700,
      },
      pill: {
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fafafa",
        color: "#666",
        whiteSpace: "nowrap",
      },

      infoRow: {
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid #eee",
      },
      label: { color: "#999", fontSize: 13, fontWeight: 700 },
      value: { fontSize: 14, fontWeight: 700 },

      error: {
        background: "#f8d7da",
        border: "1px solid #f5c6cb",
        color: "#721c24",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 14,
        fontWeight: 700,
      },
      successNote: {
        background: "#d4edda",
        border: "1px solid #c3e6cb",
        color: "#155724",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 14,
        fontWeight: 700,
      },

      sectionTitle: {
        marginTop: 0,
        marginBottom: 10,
        fontSize: 14,
        fontWeight: 700,
        color: "#333",
      },

      table: {
        width: "100%",
        borderCollapse: "collapse",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid #ddd",
      },
      th: {
        background: "#fafafa",
        textAlign: "left",
        padding: "10px 12px",
        borderBottom: "1px solid #ddd",
        fontSize: 12,
        color: "#666",
        fontWeight: 700,
      },
      td: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 13,
        fontWeight: 700,
        color: "#333",
        verticalAlign: "top",
      },
      link: { color: "#007bff", fontWeight: 700, cursor: "pointer" },

      actionsCol: { display: "flex", flexDirection: "column", gap: 10 },
      btn: {
        width: "100%",
        borderRadius: 8,
        padding: "10px 12px",
        cursor: "pointer",
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fff",
      },
      btnPrimary: {
        background: "#007bff",
        color: "#fff",
        border: "1px solid #007bff",
      },
      btnDanger: {
        background: "#dc3545",
        color: "#fff",
        border: "1px solid #dc3545",
      },
      btnMuted: {
        background: "#fafafa",
        color: "#333",
      },
      inlineBtn: {
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: 700,
        border: "1px solid #ddd",
        background: "#fff",
      },

      form: {
        marginTop: 12,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 14,
      },
      fieldGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      },
      field: { display: "flex", flexDirection: "column", gap: 6 },
      input: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
        outline: "none",
      },
      select: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
        outline: "none",
        background: "#fff",
      },
      textarea: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
        outline: "none",
        minHeight: 88,
        resize: "vertical",
      },
      formActions: {
        display: "flex",
        gap: 10,
        justifyContent: "flex-end",
        marginTop: 12,
        flexWrap: "wrap",
      },

      empty: {
        border: "1px dashed #ddd",
        background: "#fafafa",
        borderRadius: 8,
        padding: 14,
        color: "#999",
        fontWeight: 700,
      },

      small: { fontSize: 12, color: "#999", fontWeight: 700 },
    }),
    []
  );

  const statusPill = (text) => {
    const t = String(text || "").toUpperCase();
    let bg = "#fafafa";
    let bd = "#ddd";
    let color = "#666";

    if (t.includes("APPROV")) {
      bg = "#d4edda";
      bd = "#c3e6cb";
      color = "#155724";
    } else if (t.includes("REJECT") || t.includes("DECLIN")) {
      bg = "#f8d7da";
      bd = "#f5c6cb";
      color = "#721c24";
    } else if (t.includes("SUBMIT") || t.includes("PEND")) {
      bg = "#fff3cd";
      bd = "#ffeeba";
      color = "#856404";
    } else if (t.includes("ACTIVE")) {
      bg = "#d1ecf1";
      bd = "#bee5eb";
      color = "#0c5460";
    }
    return <span style={{ ...styles.pill, background: bg, borderColor: bd, color }}>{text}</span>;
  };

  const reloadContext = async () => {
    const contextData = await getLoanContext(clientId);
    setContext(contextData);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const contextData = await getLoanContext(clientId);
        setContext(contextData);

        const productsData = await getLoanProducts();
        setProducts(productsData);

        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load loan context");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      const data = {
        client: clientId,
        product: parseInt(createFormData.product, 10),
        amount: parseFloat(createFormData.amount),
        term_months: parseInt(createFormData.term_months, 10),
        purpose: createFormData.purpose || null,
      };

      await createLoan(data);
      setShowCreateLoan(false);
      setCreateFormData({ product: "", amount: "", term_months: "", purpose: "" });
      await reloadContext();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create loan");
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();

    if (!uploadFormData.document_file) {
      setError("Please select a file");
      return;
    }
    if (!context?.application_loan) {
      setError("No application loan found");
      return;
    }

    try {
      await uploadLoanDocument(context.application_loan.id, uploadFormData);
      setShowUploadDoc(false);
      setUploadFormData({ document_type: "", document_file: null, label: "", description: "" });
      await reloadContext();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload document");
    }
  };

  const handleUploadAllDocuments = async () => {
    if (!applicationLoan) {
      setError("No application loan found");
      return;
    }

    const selectedDocIds = Object.keys(requiredUploadFiles).filter(
      (id) => requiredUploadFiles[id]
    );

    if (selectedDocIds.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    try {
      const formData = new FormData();
      selectedDocIds.forEach((docId) => {
        formData.append(`file_${docId}`, requiredUploadFiles[docId]);
      });

      const response = await uploadLoanDocumentsBulk(applicationLoan.id, formData);

      if (response.errors && response.errors.length > 0) {
        setError(`Bulk upload completed with errors: ${response.errors.join(", ")}`);
      }

      setRequiredUploadFiles({});
      await reloadContext();

      if (!response.errors || response.errors.length === 0) {
        alert("Documents uploaded successfully");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload documents");
    }
  };

  const handleSubmitLoan = async () => {
    if (!context?.application_loan) {
      setError("No application loan found");
      return;
    }

    try {
      await submitLoan(context.application_loan.id);
      await reloadContext();
      alert("Loan submitted successfully");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit loan");
    }
  };

  const handlePostRepayment = async (e) => {
    e.preventDefault();

    if (!context?.active_loan) {
      setError("No active loan found");
      return;
    }

    try {
      const data = {
        amount: parseFloat(repaymentFormData.amount),
        payment_method: repaymentFormData.payment_method,
        payment_reference: repaymentFormData.payment_reference,
        notes: repaymentFormData.notes,
      };

      await postRepayment(context.active_loan.id, data);
      setShowRepayment(false);
      setRepaymentFormData({
        amount: "",
        payment_method: "CASH",
        payment_reference: "",
        notes: "",
      });

      await reloadContext();
      alert("Repayment posted successfully");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post repayment");
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <p style={{ margin: 0, fontWeight: 900 }}>Loading loan context…</p>
            <p style={{ marginTop: 6, ...styles.small }}>Please wait.</p>
          </div>
        </div>
      </div>
    );
  }

  const client = context?.client;
  const activeLoan = context?.active_loan;
  const applicationLoan = context?.application_loan;
  const loans = context?.loans || [];
  const hasDraft = loans.some((l) => l.status === 'DRAFT');
  const loanDocs = context?.uploaded_documents || [];
  const kycDocs = context?.kyc_documents || [];
  const kycStatus = context?.kyc_status;
  const hasMissingDocs = context?.missing_documents && context.missing_documents.length > 0;

  const manageableLoans = loans.filter(
    (l) => l.status === 'ACTIVE' || l.status === 'DISBURSED'
  );
  const latestManageableLoan = manageableLoans[0] || null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.backBtn} onClick={() => navigate("/loan-officer/clients")}>
              ← Back to Clients
            </button>
            <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
          </div>

          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Client Loan Context</h1>
            <p style={styles.subtitle}>
              View client profile, KYC documents, and manage loan workflow.
            </p>
          </div>

          <div />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Main Layout */}
        <div style={styles.grid}>
          {/* LEFT: Client + Loan info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Client Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Client Information</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {statusPill(client?.status || "UNKNOWN")}
                 {/*{statusPill(kycStatus || "KYC_UNKNOWN")} */} 
                </div>
              </div>

              <div>
                {client?.photo_url && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <ClientAvatar
                      photoUrl={client.photo_url}
                      name={client.full_name}
                      size={90}
                      onClick={() => window.open(client.photo_url, '_blank')}
                    />
                  </div>
                )}
                <div style={styles.infoRow}>
                  <div style={styles.label}>Name</div>
                  <div style={styles.value}>{client?.full_name || "—"}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.label}>National ID</div>
                  <div style={styles.value}>{client?.national_id || "—"}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.label}>Phone</div>
                  <div style={styles.value}>{client?.phone || "—"}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.label}>Email</div>
                  <div style={styles.value}>{client?.email || "—"}</div>
                </div>
              </div>
            </div>

            {/* KYC Documents */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>KYC Documents</h2>
                <span style={styles.pill}>{kycDocs.length} file(s)</span>
              </div>

              {kycDocs.length === 0 ? (
                <div style={styles.empty}>No KYC documents found for this client.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Uploaded</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td style={styles.td}>{doc.document_type || "—"}</td>
                        <td style={styles.td}>
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={styles.td}>
                          {doc.file_url ? (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.link}
                            >
                              View
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Loan Overview */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Loan Overview</h2>
                {activeLoan ? statusPill(activeLoan.status) : <span style={styles.pill}>No Active Loan</span>}
              </div>

              {!activeLoan ? (
                <div style={styles.empty}>
                  No active loan for this client yet. You can create one from the right panel.
                </div>
              ) : (
                <>
                  <div>
                    <div style={styles.infoRow}>
                      <div style={styles.label}>Product</div>
                      <div style={styles.value}>
                        {activeLoan.product_name || activeLoan.product?.name || "—"}
                      </div>
                    </div>
                    <div style={styles.infoRow}>
                      <div style={styles.label}>Amount</div>
                      <div style={styles.value}>{activeLoan.amount ?? "—"}</div>
                    </div>
                    <div style={styles.infoRow}>
                      <div style={styles.label}>Interest Rate</div>
                      <div style={styles.value}>
                        {activeLoan.interest_rate != null ? `${activeLoan.interest_rate}%` : "—"}
                      </div>
                    </div>
                    <div style={styles.infoRow}>
                      <div style={styles.label}>Term (Months)</div>
                      <div style={styles.value}>{activeLoan.term_months ?? "—"}</div>
                    </div>
                  </div>
{/*
                  <div style={{ marginTop: 14 }}>
                    <h3 style={styles.sectionTitle}>Loan Documents</h3>

                    {loanDocs.length === 0 ? (
                      <div style={styles.empty}>No loan documents uploaded yet.</div>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Type</th>
                            <th style={styles.th}>Label</th>
                            <th style={styles.th}>Uploaded</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loanDocs.map((doc) => (
                            <tr key={doc.id}>
                              <td style={styles.td}>{doc.document_type_name || "—"}</td>
                              <td style={styles.td}>{doc.label || "—"}</td>
                              <td style={styles.td}>
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "—"}
                              </td>
                              <td style={styles.td}>
                                {doc.file_url ? (
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={styles.link}
                                  >
                                    View
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  */}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Actions</h2>
                <span style={styles.pill}>Loan Officer</span>
              </div>

              <div style={styles.actionsCol}>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary, ...(hasDraft ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }}
                  disabled={hasDraft}
                  onClick={() => {
                    if (hasDraft) return;
                    setError(null);
                    setShowCreateLoan((v) => !v);
                    setShowUploadDoc(false);
                    setShowRepayment(false);
                  }}
                >
                  {showCreateLoan ? "Close Create Loan" : "Create Loan"}
                </button>

                <button
                  style={{ ...styles.btn, ...(applicationLoan ? styles.btnMuted : { opacity: 0.55, cursor: "not-allowed" }) }}
                  disabled={!applicationLoan}
                  onClick={() => {
                    setError(null);
                    setShowUploadDoc((v) => !v);
                    setShowCreateLoan(false);
                    setShowRepayment(false);
                  }}
                >
                  {showUploadDoc ? "Close Upload Document" : "Upload Loan Document"}
                </button>

                <button
                  style={{ ...styles.btn, ...(activeLoan ? styles.btnMuted : { opacity: 0.55, cursor: "not-allowed" }) }}
                  disabled={!activeLoan}
                  onClick={() => {
                    setError(null);
                    setShowRepayment((v) => !v);
                    setShowCreateLoan(false);
                    setShowUploadDoc(false);
                  }}
                >
                  {showRepayment ? "Close Repayment" : "Post Repayment"}
                </button>

                <button
                  style={{
                    ...styles.btn,
                    ...(latestManageableLoan
                      ? styles.btnMuted
                      : { opacity: 0.55, cursor: "not-allowed" }),
                  }}
                  disabled={!latestManageableLoan}
                  onClick={() => {
                    if (!latestManageableLoan) return;
                    navigate(
                      `/clients/${clientId}/loans/${latestManageableLoan.id}`
                    );
                  }}
                >
                  Manage Loan
                </button>

                <div>
                  <button
                    style={{
                      ...styles.btn,
                      ...(applicationLoan && !hasMissingDocs ? styles.btnDanger : { opacity: 0.55, cursor: "not-allowed" }),
                    }}
                    disabled={!applicationLoan || hasMissingDocs}
                    onClick={handleSubmitLoan}
                  >
                    Submit Loan (Send to Branch Manager)
                  </button>

                  {hasMissingDocs && (
                    <div style={{ marginTop: 8 }}>
                      <span style={styles.small}>Upload all required documents before submitting.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Loan Form */}
              {showCreateLoan && (
                <form style={styles.form} onSubmit={handleCreateLoan}>
                  <h3 style={styles.sectionTitle}>Create New Loan</h3>

                  <div style={styles.fieldGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Loan Product</label>
                      <select
                        style={styles.select}
                        value={createFormData.product}
                        onChange={(e) =>
                          setCreateFormData((p) => ({ ...p, product: e.target.value }))
                        }
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Amount</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        value={createFormData.amount}
                        onChange={(e) =>
                          setCreateFormData((p) => ({ ...p, amount: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Term (Months)</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={createFormData.term_months}
                        onChange={(e) =>
                          setCreateFormData((p) => ({ ...p, term_months: e.target.value }))
                        }
                        required
                      />
                      <span style={styles.small}>
                        Tip: Use the product’s standard term unless otherwise instructed.
                      </span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Purpose (Optional)</label>
                      <textarea
                        style={styles.textarea}
                        value={createFormData.purpose}
                        onChange={(e) =>
                          setCreateFormData((p) => ({ ...p, purpose: e.target.value }))
                        }
                        placeholder="Reason or purpose for the loan"
                      />
                    </div>                  </div>

                  <div style={styles.formActions}>
                    <button type="button" style={styles.inlineBtn} onClick={() => setShowCreateLoan(false)}>
                      Cancel
                    </button>
                    <button type="submit" style={{ ...styles.inlineBtn, ...styles.btnPrimary }}>
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Upload Document Form (Product-required documents) */}
              {showUploadDoc && (
                <div style={styles.form}>
                  <h3 style={styles.sectionTitle}>Required Loan Documents</h3>

                  {(!context?.required_documents || context.required_documents.length === 0) ? (
                    <div style={styles.empty}>No product-required documents configured for this loan product.</div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Document</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {context.required_documents.map((req) => {
                          const uploaded = loanDocs.find((d) => d.document_type_id === req.id);
                          return (
                            <tr key={req.id}>
                              <td style={styles.td}>{req.name || req.code || '—'}</td>
                              <td style={styles.td}>
                                <span style={{ ...styles.pill, borderColor: uploaded ? '#c3e6cb' : '#ddd', background: uploaded ? '#d4edda' : '#fafafa' }}>
                                  {uploaded ? 'Uploaded' : 'Missing'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {uploaded ? (
                                  <a href={uploaded.file_url} target="_blank" rel="noreferrer" style={styles.link}>
                                    View
                                  </a>
                                ) : (
                                  <input
                                    type="file"
                                    style={styles.input}
                                    onChange={(e) =>
                                      setRequiredUploadFiles((p) => ({ ...p, [req.id]: e.target.files?.[0] || null }))
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button 
                      type="button" 
                      style={{ ...styles.inlineBtn, ...styles.btnPrimary }}
                      onClick={handleUploadAllDocuments}
                      disabled={!applicationLoan || Object.values(requiredUploadFiles).every(f => !f)}
                    >
                      Upload All Documents
                    </button>
                    <button type="button" style={styles.inlineBtn} onClick={() => setShowUploadDoc(false)}>
                      Close
                    </button>
                    <span style={{ ...styles.small }}>
                      Uploads target the draft application loan.
                    </span>
                  </div>
                </div>
              )}

              {/* Repayment Form */}
              {showRepayment && (
                <form style={styles.form} onSubmit={handlePostRepayment}>
                  <h3 style={styles.sectionTitle}>Post Repayment</h3>

                  <div style={styles.fieldGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Amount</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        value={repaymentFormData.amount}
                        onChange={(e) =>
                          setRepaymentFormData((p) => ({ ...p, amount: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Payment Method</label>
                      <select
                        style={styles.select}
                        value={repaymentFormData.payment_method}
                        onChange={(e) =>
                          setRepaymentFormData((p) => ({ ...p, payment_method: e.target.value }))
                        }
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Reference</label>
                      <input
                        style={styles.input}
                        value={repaymentFormData.payment_reference}
                        onChange={(e) =>
                          setRepaymentFormData((p) => ({ ...p, payment_reference: e.target.value }))
                        }
                        placeholder="Optional transaction reference"
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Notes</label>
                      <textarea
                        style={styles.textarea}
                        value={repaymentFormData.notes}
                        onChange={(e) =>
                          setRepaymentFormData((p) => ({ ...p, notes: e.target.value }))
                        }
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>

                  <div style={styles.formActions}>
                    <button type="button" style={styles.inlineBtn} onClick={() => setShowRepayment(false)}>
                      Cancel
                    </button>
                    <button type="submit" style={{ ...styles.inlineBtn, ...styles.btnPrimary }}>
                      Post Repayment
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Loan History */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Loan History</h2>
                <span style={styles.pill}>{loans.length} record(s)</span>
              </div>

              {loans.length === 0 ? (
                <div style={styles.empty}>No previous loans recorded for this client.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Term</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((l) => (
                      <tr key={l.id}>
                        <td style={styles.td}>{statusPill(l.status)}</td>
                        <td style={styles.td}>{l.product_name ?? "—"}</td>
                        <td style={styles.td}>{l.amount ?? "—"}</td>
                        <td style={styles.td}>{l.term_months ?? "—"}</td>
                        <td style={styles.td}>
                          {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: 10 }}>
                <button style={styles.inlineBtn} onClick={() => reloadContext()}>
                  Refresh Data
                </button>
                <span style={{ marginLeft: 10, ...styles.small }}>
                  If another user updated this client, refresh to see changes.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />
      </div>
    </div>
  );
};

export default LoanOfficerClientLoanContextPage;
